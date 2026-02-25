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
import { verificationService } from '../verification-service';
import { notificationService } from '../notification-service';
import { apiClient } from '../api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationTriggers } from '../notification-trigger';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { blockService } from '@/services/block-service';
import { progressAttendanceService } from '@/services/progress/progress-attendance-service';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  validationError,
  storageError,
} from '@/types/result';

const logger = createLogger('BookingCrudService');
// Safeguarding: DBS verification required by default (fail-closed).
// Only explicit 'false' or '0' disables enforcement (dev/testing only).
const ENFORCE_DBS_SAFEGUARDING_GATE =
  process.env.EXPO_PUBLIC_ENFORCE_DBS_SAFEGUARDING_GATE !== 'false' &&
  process.env.EXPO_PUBLIC_ENFORCE_DBS_SAFEGUARDING_GATE !== '0';

/** Maximum age (ms) before cache is considered stale. */
const CACHE_MAX_AGE = 30_000;

export type BookingDraft = {
  sessionType?: string;
  sessionTypeLabel?: string;
  sessionTemplateId?: string;
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
  sessionTemplateId?: string;
  sessionTemplateName?: string;
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
  async updateBooking(
    id: string,
    updates: Partial<Booking>,
  ): Promise<Result<Booking, ServiceError>> {
    const bookings = await this.loadFromStorage();
    const index = bookings.findIndex((b) => b.id === id);
    if (index === -1) return err(notFound('Booking', id));

    const previous = bookings[index];
    const updated = { ...previous, ...updates };
    bookings[index] = updated;
    const saveResult = await this.saveToStorage(bookings);
    if (!saveResult.success) {
      return err(saveResult.error);
    }

    if (previous.status !== 'COMPLETED' && updated.status === 'COMPLETED') {
      const ingestionResult = await progressAttendanceService.upsertCompletedBookingSessions(updated);
      if (!ingestionResult.success) {
        logger.error('Failed to ingest completed booking after status transition', {
          bookingId: updated.id,
          error: ingestionResult.error,
        });
      }
    }

    return ok(updated);
  }

  async updateStatus(id: string, status: Booking['status']) {
    const bookings = await this.loadFromStorage();
    const index = bookings.findIndex((booking) => booking.id === id);
    if (index === -1) {
      return undefined;
    }

    const previousStatus = bookings[index].status;
    bookings[index] = { ...bookings[index], status };
    const saveResult = await this.saveToStorage(bookings);
    if (!saveResult.success) {
      logger.error('Failed to update booking status', {
        bookingId: id,
        status,
        error: saveResult.error.message,
      });
      return undefined;
    }

    const updatedBooking = bookings[index];
    if (previousStatus !== 'COMPLETED' && updatedBooking.status === 'COMPLETED') {
      const ingestionResult =
        await progressAttendanceService.upsertCompletedBookingSessions(updatedBooking);
      if (!ingestionResult.success) {
        logger.error('Failed to ingest completed booking from updateStatus', {
          bookingId: updatedBooking.id,
          error: ingestionResult.error,
        });
      }
    }

    return updatedBooking;
  }

  async cancel(id: string, reason: string, cancelledBy: 'coach' | 'parent' = 'parent') {
    const bookings = await this.loadFromStorage();
    const booking = bookings.find((b) => b.id === id);
    if (!booking) {
      logger.warn('Booking not found for cancellation', { bookingId: id, cancelledBy });
      return undefined;
    }

    const sessionStart = new Date(booking.scheduledAt).getTime();
    if (!Number.isFinite(sessionStart) || sessionStart <= Date.now()) {
      logger.warn('Cancellation blocked for past booking', { bookingId: id, cancelledBy });
      return undefined;
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      logger.warn('Cancellation blocked for non-active booking', {
        bookingId: id,
        status: booking.status,
        cancelledBy,
      });
      return undefined;
    }

    const updated = bookings.map((b) =>
      b.id === id ? { ...b, status: 'CANCELLED' as const, cancellationReason: reason } : b,
    );
    const saveResult = await this.saveToStorage(updated);
    if (!saveResult.success) {
      logger.error('Failed to cancel booking', {
        bookingId: id,
        reason,
        cancelledBy,
        error: saveResult.error.message,
      });
      return undefined;
    }

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
        await notificationTriggers.bookingCancelled(
          booking.coachName || 'Coach',
          date,
          'parent',
          booking.bookedById,
        );
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
   * DBS safeguarding gate — fail-closed.
   * If any athlete differs from the booker (parent booking for child),
   * the coach must have a VERIFIED and non-expired background check.
   */
  private async validateDbsGate(
    coachId: string,
    athleteIds: string[],
    bookedById: string,
  ): Promise<Result<void, ServiceError>> {
    if (!ENFORCE_DBS_SAFEGUARDING_GATE) {
      logger.warn('DBS safeguarding gate DISABLED — not for production use', { coachId });
      return ok(undefined);
    }

    if (!bookedById || athleteIds.length === 0) {
      return ok(undefined);
    }

    const hasMinorAthlete = athleteIds.some((id) => id !== bookedById);
    if (!hasMinorAthlete) return ok(undefined);

    const verificationResult = await verificationService.getStatus(coachId);
    if (!verificationResult.success) {
      return err(
        validationError(
          'Unable to verify coach background check status. Booking blocked for safety.',
        ),
      );
    }

    const bg = verificationResult.data.backgroundCheck;
    if (bg.status !== 'VERIFIED') {
      return err(
        validationError(
          'This coach has not completed a DBS background check. A verified DBS is required for sessions with under-18 athletes.',
        ),
      );
    }

    if (bg.expiresAt && new Date(bg.expiresAt) < new Date()) {
      return err(
        validationError(
          "This coach's DBS background check has expired. An up-to-date DBS is required for sessions with under-18 athletes.",
        ),
      );
    }

    return ok(undefined);
  }

  /**
   * Validate booking against coach availability
   * Returns { valid: true } if slot is available, otherwise { valid: false, reason: string }
   */
  async validateBooking(
    coachId: string,
    date: string,
    startTime: string,
    durationMinutes: number = 60,
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const slots = await availabilityService.getAvailableSlots(
        coachId,
        date,
        date,
        durationMinutes,
      );

      // Find matching slot
      const matchingSlot = slots.find((slot) => slot.date === date && slot.startTime === startTime);

      if (!matchingSlot) {
        return {
          valid: false,
          reason: "This time slot is not within the coach's available hours.",
        };
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
      sessionTemplateId,
      sessionTemplateName,
      objectives,
      price,
      notes,
      sessionInviteId,
    } = params;

    if (!scheduledAt) {
      return err(validationError('Scheduled date/time is required'));
    }

    // Check if coach/booker have blocked each other
    const blockedResult = await blockService.isBlocked(coachId, bookedById);
    if (blockedResult.success && blockedResult.data) {
      logger.warn('Booking blocked due to block relationship', { coachId, bookedById });
      emitTyped(ServiceEvents.USER_ACTION_BLOCKED, {
        blockerId: bookedById,
        blockedId: coachId,
        action: 'create_booking',
        timestamp: new Date().toISOString(),
      });
      return err({
        code: 'CONFLICT',
        message: 'Cannot create booking with this user',
      });
    }

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

    // DBS safeguarding gate (fail-closed)
    const dbsResult = await this.validateDbsGate(coachId, athleteIds, bookedById);
    if (!dbsResult.success) return dbsResult;

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
      athleteNames,
      athleteId: athleteIds[0], // Backwards compatibility: first athlete
      bookedById,
      bookedByName,
      scheduledAt,
      status: 'CONFIRMED',
      duration,
      location,
      service,
      serviceType,
      ...(sessionTemplateId ? { sessionTemplateId } : {}),
      ...(sessionTemplateName ? { sessionTemplateName } : {}),
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
      const saveResult = await this.saveToStorage(bookings);
      if (!saveResult.success) {
        return err(saveResult.error);
      }

      // Create notifications for coach and parent
      await this.createBookingNotifications(
        newBooking as Booking,
        bookedByName,
        athleteNames.join(', '),
      );

      // Trigger notification for coach
      const formattedDateTime = new Date(scheduledAt).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
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
  async createBookingNotifications(
    booking: Booking,
    bookedByName: string,
    athleteDisplayName = 'Athlete',
  ): Promise<void> {
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
      notificationType: 'BOOKING_RECEIVED',
      title: 'New Booking Request',
      body: `${bookedByName} has booked a ${booking.service} session for ${athleteDisplayName} on ${formattedDate} at ${formattedTime}.`,
      timeLabel: 'Just now',
      read: false,
      recipientId: booking.coachId,
      recipientRole: 'coach',
      deepLink: `/bookings/${booking.id}`,
      data: { bookingId: booking.id },
    });

    // Notification for parent: Booking confirmed
    await notificationService.create({
      id: apiClient.generateId('notif-parent'),
      type: 'booking',
      notificationType: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed',
      body: `Your session with Coach ${booking.coachName} for ${athleteDisplayName} is confirmed for ${formattedDate} at ${formattedTime}.`,
      timeLabel: 'Just now',
      read: false,
      recipientId: booking.bookedById,
      recipientRole: 'parent',
      deepLink: `/bookings/${booking.id}`,
      data: { bookingId: booking.id },
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
      bookedById: draft.athleteId!, // Use athleteId as bookedById (parent booking for their child)
      scheduledAt,
      status: 'PENDING' as const,
      duration: draft.duration || 60,
      location: draft.locationText || 'Coach preferred venue',
      service: draft.sessionTypeLabel || draft.sessionType || 'Session',
      serviceType: draft.sessionType || '1-to-1',
      ...(draft.sessionTemplateId ? { sessionTemplateId: draft.sessionTemplateId } : {}),
      objectives: draft.objectives || [],
      price: draft.price || 0,
      notes: draft.notes || '',
      createdAt: new Date().toISOString(),
      isSharedSession: (draft.childIds?.length || 1) > 1,
    };

    // DBS safeguarding gate (fail-closed)
    const dbsResult = await this.validateDbsGate(
      booking.coachId,
      booking.athleteIds,
      booking.bookedById ?? '',
    );
    if (!dbsResult.success) return dbsResult;

    // Save directly (draft flow skips availability validation only, not DBS)
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
      childName: draft.athleteName || 'Athlete',
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
  async createMultipleBookings(bookings: Booking[]): Promise<Result<Booking[], ServiceError>> {
    try {
      // DBS safeguarding gate for each booking in batch
      for (const booking of bookings) {
        const dbsResult = await this.validateDbsGate(
          booking.coachId,
          booking.athleteIds ?? [],
          booking.bookedById ?? '',
        );
        if (!dbsResult.success) return err(dbsResult.error);
      }

      const existing = await this.loadFromStorage();
      existing.push(...bookings);
      const saveResult = await this.saveToStorage(existing);
      if (!saveResult.success) {
        return err(saveResult.error);
      }

      // Emit events for each booking
      for (const booking of bookings) {
        emitTyped(ServiceEvents.BOOKING_CREATED, {
          bookingId: booking.id,
          userId: booking.bookedById ?? '',
          coachId: booking.coachId,
          coachName: booking.coachName,
          athleteIds: booking.athleteIds,
          athleteName: booking.athleteIds?.length
            ? booking.athleteIds.length === 1
              ? booking.athleteIds[0]
              : `${booking.athleteIds.length} athletes`
            : undefined,
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
      const saveResult = await this.saveToStorage(bookings);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error.message };
      }
      return { success: true };
    } catch (error) {
      logger.error('Failed to save booking directly', error);
      return { success: false, error: 'Failed to save booking' };
    }
  }
}

export const bookingCrudService = new BookingCrudService();
