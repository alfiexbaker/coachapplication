/**
 * Booking CRUD Service
 *
 * Handles basic CRUD operations for bookings: create, read, update, cancel.
 * Manages draft state and direct booking creation with validation.
 *
 * Uses an in-memory Map<string, Booking> cache with 30s TTL (same pattern as
 * BaseService) to avoid redundant reads from storage. All write operations
 * invalidate the cache so the next read re-populates from storage.
 *
 * API Integration Notes:
 * - Bookings are persisted via apiClient (AsyncStorage in dev, API in prod)
 * - Draft state is kept in memory for the booking flow wizard
 */

import { Booking } from '@/constants/app-types';
import { availabilityService } from '../availability-service';
import { notificationService } from '../notification-service';
import { apiClient } from '../api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationTriggers } from '../notification-trigger';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { type Result, type ServiceError, ok, err, notFound, validationError, storageError } from '@/types/result';

const logger = createLogger('BookingCrudService');

/** Maximum age (ms) before cache is considered stale. */
const CACHE_MAX_AGE = 30_000;

export type BookingDraft = {
  sessionType?: string;
  participants?: number;
  duration?: number;
  date?: string;
  slot?: string;
  locationOption?: string;
  locationText?: string;
  notes?: string;
  childId?: string;
  childIds?: string[];
  price?: number;
  totalPrice?: number;
  coachId?: string;
  coachName?: string;
  athleteId?: string;
  athleteName?: string;
  objectives?: string[];
};

export interface CreateBookingParams {
  coachId: string;
  coachName: string;
  athleteIds: string[]; // Array of athlete IDs (supports multiple athletes)
  athleteNames: string[]; // Array of athlete names matching athleteIds
  bookedById: string;
  bookedByName: string;
  scheduledAt: string; // ISO date string with time
  duration: number;
  location: string;
  service: string;
  serviceType: string;
  objectives?: string[];
  price?: number; // Base price per athlete
  notes?: string;
  sessionInviteId?: string; // Link to session invite if created from one
  skipAvailabilityValidation?: boolean; // Skip slot validation (used by invite acceptance flow)
}

class BookingCrudService {
  private draft: BookingDraft = {};

  // ---------------------------------------------------------------------------
  // In-memory cache (mirrors BaseService pattern)
  // ---------------------------------------------------------------------------

  /** ID-indexed cache for O(1) lookups. `null` means cache is cold / invalidated. */
  private _cache: Map<string, Booking> | null = null;
  private _cacheTimestamp = 0;

  /**
   * Returns the ID-indexed cache, lazily loading from storage on first access
   * or when the cache has exceeded its TTL.
   */
  private async getCache(): Promise<Map<string, Booking>> {
    const now = Date.now();
    if (this._cache === null || now - this._cacheTimestamp > CACHE_MAX_AGE) {
      const data = await this.loadFromStorage();
      this._cache = new Map(data.map((item) => [item.id, item]));
      this._cacheTimestamp = now;
    }
    return this._cache;
  }

  /** Invalidate the in-memory cache. Called after every write operation. */
  private invalidateCache(): void {
    this._cache = null;
    this._cacheTimestamp = 0;
  }

  /** Load all bookings from storage. */
  private async loadFromStorage(): Promise<Booking[]> {
    try {
      return await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    } catch (error) {
      logger.error('Failed to load bookings from storage', error);
      return [];
    }
  }

  /** Save all bookings to storage and invalidate cache. */
  private async saveToStorage(bookings: Booking[]): Promise<Result<void, ServiceError>> {
    try {
      await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);
      this.invalidateCache();
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to save bookings to storage', error);
      return err(storageError(`Failed to save bookings: ${String(error)}`));
    }
  }

  // ---------------------------------------------------------------------------
  // Draft methods
  // ---------------------------------------------------------------------------

  getDraft() {
    return this.draft;
  }

  updateDraft(patch: Partial<BookingDraft>) {
    this.draft = { ...this.draft, ...patch };
  }

  resetDraft() {
    this.draft = {};
  }

  // ---------------------------------------------------------------------------
  // Read methods (use cache)
  // ---------------------------------------------------------------------------

  async list(): Promise<Booking[]> {
    try {
      const cache = await this.getCache();
      return Array.from(cache.values());
    } catch (error) {
      logger.error('Failed to list bookings', error);
      return [];
    }
  }

  /**
   * Get a single booking by ID.
   * Uses the O(1) cache lookup instead of scanning the full list.
   */
  async getBooking(id: string): Promise<Booking | null> {
    try {
      const cache = await this.getCache();
      return cache.get(id) ?? null;
    } catch (error) {
      logger.error('Failed to get booking', error);
      return null;
    }
  }

  /**
   * Get a specific booking by ID.
   * Uses the O(1) cache lookup instead of scanning the full list.
   */
  async getById(id: string): Promise<Booking | undefined> {
    try {
      const cache = await this.getCache();
      return cache.get(id);
    } catch (error) {
      logger.error('Failed to get booking by id', error);
      return undefined;
    }
  }

  // ---------------------------------------------------------------------------
  // Write methods (invalidate cache after every write)
  // ---------------------------------------------------------------------------

  /**
   * Update a booking with partial fields
   */
  async updateBooking(id: string, updates: Partial<Booking>): Promise<Result<Booking, ServiceError>> {
    const bookings = await this.loadFromStorage();
    const index = bookings.findIndex((b) => b.id === id);
    if (index === -1) return err(notFound('Booking', id));

    const updated = { ...bookings[index], ...updates };
    bookings[index] = updated;
    await this.saveToStorage(bookings);
    return ok(updated);
  }

  async updateStatus(id: string, status: Booking['status']) {
    const bookings = await this.loadFromStorage();
    const updated = bookings.map((b) => (b.id === id ? { ...b, status } : b));
    await this.saveToStorage(updated);
    return updated.find((b) => b.id === id);
  }

  async cancel(id: string, reason: string, cancelledBy: 'coach' | 'parent' = 'parent') {
    const bookings = await this.loadFromStorage();
    const booking = bookings.find((b) => b.id === id);
    const updated = bookings.map((b) =>
      b.id === id ? { ...b, status: 'CANCELLED' as const, cancellationReason: reason } : b
    );
    await this.saveToStorage(updated);

    // Notify the other party about the cancellation
    if (booking) {
      const date = booking.scheduledAt
        ? new Date(booking.scheduledAt).toLocaleDateString('en-GB', {
            month: 'short',
            day: 'numeric',
          })
        : 'upcoming date';

      if (cancelledBy === 'parent') {
        // Notify coach when parent cancels
        await notificationTriggers.bookingCancelled('Parent', date, 'coach', booking.coachId);
      } else {
        // Notify parent when coach cancels
        await notificationTriggers.bookingCancelled(booking.coachName || 'Coach', date, 'parent', booking.bookedById);
      }

      // Emit typed event for cross-service reactions
      emitTyped(ServiceEvents.BOOKING_CANCELLED, {
        bookingId: id,
        userId: booking.bookedById ?? booking.athleteId ?? '',
        coachId: booking.coachId,
        reason,
        cancelledBy,
      });
    }

    return updated.find((b) => b.id === id);
  }

  /**
   * Validate booking against coach availability
   * Returns { valid: true } if slot is available, otherwise { valid: false, reason: string }
   */
  async validateBooking(
    coachId: string,
    date: string,
    startTime: string,
    durationMinutes: number = 60
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const slots = await availabilityService.getAvailableSlots(coachId, date, date, durationMinutes);

      // Find matching slot
      const matchingSlot = slots.find(
        (slot) => slot.date === date && slot.startTime === startTime
      );

      if (!matchingSlot) {
        return { valid: false, reason: 'This time slot is not within the coach\'s available hours.' };
      }

      if (!matchingSlot.isAvailable) {
        return { valid: false, reason: 'This time slot is already fully booked.' };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Validation error', error);
      return { valid: false, reason: 'Unable to validate availability. Please try again.' };
    }
  }

  /**
   * Create a new booking with validation and notifications
   */
  async createBooking(params: CreateBookingParams): Promise<Result<Booking, ServiceError>> {
    const {
      coachId,
      coachName,
      athleteIds,
      athleteNames,
      bookedById,
      bookedByName,
      scheduledAt,
      duration,
      location,
      service,
      serviceType,
      objectives,
      price,
      notes,
      sessionInviteId,
    } = params;

    // Extract date and time from scheduledAt
    const date = scheduledAt.split('T')[0];
    const time = scheduledAt.split('T')[1]?.substring(0, 5) || '10:00';

    // Validate against availability (skip when booking is created from an accepted invite)
    if (!params.skipAvailabilityValidation) {
      const validation = await this.validateBooking(coachId, date, time, duration);
      if (!validation.valid) {
        return err(validationError(validation.reason || 'Booking validation failed'));
      }
    }

    // Calculate total price (base price * number of athletes)
    const basePrice = price || 0;
    const totalPrice = basePrice * athleteIds.length;
    const isSharedSession = athleteIds.length > 1;

    // Create the booking
    const newBooking = {
      id: apiClient.generateId('booking'),
      coachId,
      coachName,
      athleteIds,
      athleteId: athleteIds[0], // Backwards compatibility: first athlete
      athleteName: athleteNames.join(', '), // Combined names for display
      bookedById,
      scheduledAt,
      status: 'CONFIRMED',
      duration,
      location,
      service,
      serviceType,
      objectives: objectives || [],
      price: totalPrice,
      isSharedSession,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      sessionInviteId, // Link to session invite if created from one
    };

    // Save to bookings storage
    try {
      const bookings = await this.loadFromStorage();
      bookings.push(newBooking as Booking);
      await this.saveToStorage(bookings);

      // Create notifications for coach and parent
      await this.createBookingNotifications(newBooking as Booking, bookedByName);

      // Trigger notification for coach
      const formattedDateTime = new Date(scheduledAt).toLocaleDateString('en-GB', {
        month: 'short', day: 'numeric',
      });
      await notificationTriggers.bookingConfirmed(coachName, formattedDateTime, coachId);

      // Emit typed event for cross-service reactions
      emitTyped(ServiceEvents.BOOKING_CREATED, {
        bookingId: newBooking.id,
        userId: bookedById,
        coachId,
        coachName,
        athleteIds,
        athleteName: athleteNames.join(', '),
        scheduledAt,
        service,
        price: totalPrice,
      });

      return ok(newBooking as Booking);
    } catch (error) {
      logger.error('Failed to create booking', error);
      return err(storageError('Failed to save booking. Please try again.'));
    }
  }

  /**
   * Create notifications for a new booking
   */
  async createBookingNotifications(booking: Booking, bookedByName: string): Promise<void> {
    const scheduledDate = new Date(booking.scheduledAt);
    const formattedDate = scheduledDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = scheduledDate.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Notification for coach: New booking received
    await notificationService.create({
      id: apiClient.generateId('notif-coach'),
      type: 'booking',
      title: 'New Booking Request',
      body: `${bookedByName} has booked a ${booking.service} session for ${booking.athleteName} on ${formattedDate} at ${formattedTime}.`,
      timeLabel: 'Just now',
      read: false,
    });

    // Notification for parent: Booking confirmed
    await notificationService.create({
      id: apiClient.generateId('notif-parent'),
      type: 'booking',
      title: 'Booking Confirmed',
      body: `Your session with Coach ${booking.coachName} for ${booking.athleteName} is confirmed for ${formattedDate} at ${formattedTime}.`,
      timeLabel: 'Just now',
      read: false,
    });
  }

  /**
   * Create a booking from the current draft state
   * This method now routes through createBooking() for consistency
   * Note: Draft bookings skip availability validation since they're legacy flow
   */
  async createFromDraft(): Promise<Result<Booking, ServiceError>> {
    const draft = this.draft;

    // Validate required draft fields
    if (!draft.coachId || !draft.coachName) {
      return err(validationError('Cannot create booking: missing coach information'));
    }
    if (!draft.athleteId || !draft.athleteName) {
      return err(validationError('Cannot create booking: missing athlete information'));
    }

    const scheduledAt = `${draft.date || toDateStr(new Date())}T${draft.slot || '10:00'}:00`;

    // Create booking through the centralized createBooking method
    // Note: We use saveBookingDirect to bypass validation for draft flow (legacy compatibility)
    const booking = {
      id: apiClient.generateId('draft'),
      coachId: draft.coachId,
      coachName: draft.coachName,
      athleteIds: draft.childIds || [draft.athleteId!],
      athleteId: draft.athleteId!, // Backwards compatibility
      athleteName: draft.athleteName!,
      bookedById: draft.athleteId!, // Use athleteId as bookedById (parent booking for their child)
      scheduledAt,
      status: 'PENDING' as const,
      duration: draft.duration || 60,
      location: draft.locationText || 'Coach preferred venue',
      service: draft.sessionType || '1-on-1',
      serviceType: draft.sessionType || '1-on-1',
      objectives: draft.objectives || [],
      price: draft.price || 0,
      notes: draft.notes || '',
      createdAt: new Date().toISOString(),
      isSharedSession: (draft.childIds?.length || 1) > 1,
    };

    // Save directly to bypass validation (draft flow is legacy)
    const result = await this.saveBookingDirect(booking);

    if (!result.success) {
      return err(storageError(result.error || 'Failed to create booking from draft'));
    }

    // Notify coach of new booking
    const formattedDate = draft.date
      ? new Date(draft.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
      : 'upcoming date';

    await notificationService.notifyCoachNewBooking({
      coachId: booking.coachId,
      parentName: 'Parent',
      childName: booking.athleteName,
      date: formattedDate,
      bookingId: booking.id,
    });

    this.resetDraft();
    return ok(booking as Booking);
  }

  /**
   * Create multiple bookings at once for a multi-week series.
   * Skips per-slot availability validation (caller is responsible).
   * Each booking gets the provided seriesId and its index within the series.
   */
  async createMultipleBookings(
    bookings: Booking[]
  ): Promise<Result<Booking[], ServiceError>> {
    try {
      const existing = await this.loadFromStorage();
      existing.push(...bookings);
      await this.saveToStorage(existing);

      // Emit events for each booking
      for (const booking of bookings) {
        emitTyped(ServiceEvents.BOOKING_CREATED, {
          bookingId: booking.id,
          userId: booking.bookedById ?? '',
          coachId: booking.coachId,
          coachName: booking.coachName,
          athleteIds: booking.athleteIds,
          athleteName: booking.athleteName,
          scheduledAt: booking.scheduledAt,
          service: booking.service,
          price: booking.price,
        });
      }

      logger.info(`Created ${bookings.length} bookings in batch`);
      return ok(bookings);
    } catch (error) {
      logger.error('Failed to create multiple bookings', error);
      return err(storageError('Failed to create bookings batch'));
    }
  }

  /**
   * Save a booking directly without validation (for internal service use only)
   * Used by recurringBookingService and other trusted callers
   */
  async saveBookingDirect(booking: Booking): Promise<{ success: boolean; error?: string }> {
    try {
      const bookings = await this.loadFromStorage();
      bookings.push(booking);
      await this.saveToStorage(bookings);
      return { success: true };
    } catch (error) {
      logger.error('Failed to save booking directly', error);
      return { success: false, error: 'Failed to save booking' };
    }
  }
}

export const bookingCrudService = new BookingCrudService();
