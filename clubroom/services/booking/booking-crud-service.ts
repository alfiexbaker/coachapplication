/**
 * Booking CRUD Service
 *
 * Handles basic CRUD operations for bookings: create, read, update, cancel.
 * Manages draft state and direct booking creation with validation.
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
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { type Result, type ServiceError, ok, err, notFound, validationError, storageError } from '@/types/result';

const logger = createLogger('BookingCrudService');

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
}

class BookingCrudService {
  private draft: BookingDraft = {};

  getDraft() {
    return this.draft;
  }

  updateDraft(patch: Partial<BookingDraft>) {
    this.draft = { ...this.draft, ...patch };
  }

  resetDraft() {
    this.draft = {};
  }

  async list(): Promise<Booking[]> {
    try {
      return await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    } catch (error) {
      logger.error('Failed to list bookings', error);
      return [];
    }
  }

  /**
   * Get a single booking by ID
   */
  async getBooking(id: string): Promise<Booking | null> {
    const bookings = await this.list();
    const booking = bookings.find((b) => b.id === id);
    if (booking) return booking;

    // Also check session bookings
    try {
      const sessionBookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
      if (sessionBookings.length > 0) {
        const sessionBooking = sessionBookings.find((b) => b.id === id);
        if (sessionBooking) {
          return {
            id: sessionBooking.id,
            coachId: sessionBooking.coachId,
            coachName: sessionBooking.coachName,
            athleteId: sessionBooking.athleteId,
            athleteName: sessionBooking.athleteName,
            scheduledAt: sessionBooking.scheduledAt,
            location: sessionBooking.location,
            service: sessionBooking.service,
            status: sessionBooking.status,
            price: sessionBooking.price || 35,
          } as Booking;
        }
      }
    } catch (error) {
      logger.error('Failed to check session bookings', error);
    }

    return null;
  }

  /**
   * Get a specific booking by ID
   */
  async getById(id: string): Promise<Booking | undefined> {
    const bookings = await this.list();
    return bookings.find((b) => b.id === id);
  }

  /**
   * Update a booking with partial fields
   */
  async updateBooking(id: string, updates: Partial<Booking>): Promise<Result<Booking, ServiceError>> {
    const bookings = await this.list();
    const index = bookings.findIndex((b) => b.id === id);
    if (index === -1) return err(notFound('Booking', id));

    const updated = { ...bookings[index], ...updates };
    bookings[index] = updated;
    await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);
    return ok(updated);
  }

  async updateStatus(id: string, status: Booking['status']) {
    const bookings = await this.list();
    const updated = bookings.map((b) => (b.id === id ? { ...b, status } : b));
    await apiClient.set(STORAGE_KEYS.BOOKINGS, updated);
    return updated.find((b) => b.id === id);
  }

  async cancel(id: string, reason: string, cancelledBy: 'coach' | 'parent' = 'parent') {
    const bookings = await this.list();
    const booking = bookings.find((b) => b.id === id);
    const updated = bookings.map((b) =>
      b.id === id ? { ...b, status: 'CANCELLED', cancellationReason: reason } : b
    );
    await apiClient.set(STORAGE_KEYS.BOOKINGS, updated);

    // Notify the other party about the cancellation
    if (booking) {
      const date = booking.scheduledAt
        ? new Date(booking.scheduledAt).toLocaleDateString('en-US', {
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
  async createBooking(params: CreateBookingParams): Promise<{ success: boolean; booking?: Booking; error?: string }> {
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

    // Validate against availability
    const validation = await this.validateBooking(coachId, date, time, duration);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Calculate total price (base price * number of athletes)
    const basePrice = price || 0;
    const totalPrice = basePrice * athleteIds.length;
    const isSharedSession = athleteIds.length > 1;

    // Create the booking
    const newBooking = {
      id: `booking-${Date.now()}`,
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

    // Save to session bookings storage
    try {
      const bookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
      bookings.push(newBooking as Booking);
      await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);

      // Create notifications for coach and parent
      await this.createBookingNotifications(newBooking as Booking, bookedByName);

      // Trigger notification for coach
      const formattedDateTime = new Date(scheduledAt).toLocaleDateString('en-US', {
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

      return { success: true, booking: newBooking as Booking };
    } catch (error) {
      logger.error('Failed to create booking', error);
      return { success: false, error: 'Failed to save booking. Please try again.' };
    }
  }

  /**
   * Create notifications for a new booking
   */
  async createBookingNotifications(booking: Booking, bookedByName: string): Promise<void> {
    const scheduledDate = new Date(booking.scheduledAt);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Notification for coach: New booking received
    await notificationService.create({
      id: `notif-coach-${Date.now()}`,
      type: 'booking',
      title: 'New Booking Request',
      body: `${bookedByName} has booked a ${booking.service} session for ${booking.athleteName} on ${formattedDate} at ${formattedTime}.`,
      timeLabel: 'Just now',
      read: false,
    });

    // Notification for parent: Booking confirmed
    await notificationService.create({
      id: `notif-parent-${Date.now() + 1}`,
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

    const scheduledAt = `${draft.date || new Date().toISOString().split('T')[0]}T${draft.slot || '10:00'}:00`;

    // Create booking through the centralized createBooking method
    // Note: We use saveBookingDirect to bypass validation for draft flow (legacy compatibility)
    const booking = {
      id: `draft_${Date.now()}`,
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
      ? new Date(draft.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
   * Save a booking directly without validation (for internal service use only)
   * Used by recurringBookingService and other trusted callers
   */
  async saveBookingDirect(booking: Booking): Promise<{ success: boolean; error?: string }> {
    try {
      const bookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
      bookings.push(booking);
      await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);
      return { success: true };
    } catch (error) {
      logger.error('Failed to save booking directly', error);
      return { success: false, error: 'Failed to save booking' };
    }
  }
}

export const bookingCrudService = new BookingCrudService();
