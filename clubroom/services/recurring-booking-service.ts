import {
  RecurringBooking,
  RecurrenceFrequency,
  RecurringBookingStatus,
  CreateRecurringBookingParams,
  GeneratedBookingSummary,
} from '@/constants/types';
import { getDayName } from '@/constants/booking-types';
import type { Booking } from '@/constants/app-types';
import { storageService } from './storage-service';
import { notificationService } from './notification-service';
import { bookingService } from './booking-service';
import { createLogger } from '@/utils/logger';

// Re-export getDayName for consumers that imported it from here
export { getDayName };

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('RecurringBookingService');

/**
 * Get display label for frequency
 */
export function getFrequencyLabel(frequency: RecurrenceFrequency): string {
  switch (frequency) {
    case 'WEEKLY':
      return 'Every week';
    case 'BIWEEKLY':
      return 'Every 2 weeks';
    case 'MONTHLY':
      return 'Every month';
    default:
      return frequency;
  }
}

/**
 * Get display label for status
 */
export function getStatusLabel(status: RecurringBookingStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'PAUSED':
      return 'Paused';
    case 'CANCELLED':
      return 'Cancelled';
    case 'EXPIRED':
      return 'Expired';
    default:
      return status;
  }
}

/**
 * Result type for service operations
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Service for managing recurring booking subscriptions
 */
class RecurringBookingService {
  /**
   * Get all recurring bookings from storage
   */
  async list(): Promise<RecurringBooking[]> {
    return storageService.getItem<RecurringBooking[]>(STORAGE_KEYS.RECURRING_BOOKINGS, []);
  }

  /**
   * Get a specific recurring booking by ID
   * @param id - The recurring booking ID
   */
  async getById(id: string): Promise<RecurringBooking | undefined> {
    const bookings = await this.list();
    return bookings.find((b) => b.id === id);
  }

  /**
   * Create a new recurring booking subscription
   * @param params - The parameters for creating the recurring booking
   */
  async createRecurring(
    params: CreateRecurringBookingParams
  ): Promise<ServiceResult<RecurringBooking>> {
    try {
      const now = new Date().toISOString();

      const newRecurring: RecurringBooking = {
        id: `recurring_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: params.userId,
        userName: params.userName,
        coachId: params.coachId,
        coachName: params.coachName,
        coachPhotoUrl: params.coachPhotoUrl,
        athleteId: params.athleteId,
        athleteName: params.athleteName,
        dayOfWeek: params.dayOfWeek,
        time: params.time,
        duration: params.duration,
        location: params.location,
        sessionType: params.sessionType,
        frequency: params.frequency,
        startDate: params.startDate,
        endDate: params.endDate,
        status: 'ACTIVE',
        pricePerSession: params.pricePerSession,
        notes: params.notes,
        createdAt: now,
        updatedAt: now,
        generatedBookingIds: [],
        sessionsCompleted: 0,
      };

      // Calculate sessions remaining if end date is set
      if (params.endDate) {
        newRecurring.sessionsRemaining = this.calculateSessionsRemaining(
          params.startDate,
          params.endDate,
          params.frequency
        );
      }

      const bookings = await this.list();
      const updated = [...bookings, newRecurring];
      await storageService.setItem(STORAGE_KEYS.RECURRING_BOOKINGS, updated);

      logger.info('recurring_booking_created', {
        id: newRecurring.id,
        userId: params.userId,
        coachId: params.coachId,
        frequency: params.frequency,
      });

      // Send notification to coach
      await notificationService.create({
        id: `notif_recurring_${Date.now()}`,
        type: 'booking',
        title: 'New Recurring Booking',
        body: `${params.userName} subscribed to ${getFrequencyLabel(params.frequency).toLowerCase()} sessions`,
        recipientId: params.coachId,
        recipientRole: 'coach',
        timeLabel: 'Just now',
        read: false,
      });

      return { success: true, data: newRecurring };
    } catch (error) {
      logger.error('recurring_booking_create_failed', { error, params });
      return {
        success: false,
        error: 'Failed to create recurring booking. Please try again.',
      };
    }
  }

  /**
   * Get all recurring bookings for a specific user
   * @param userId - The user ID
   */
  async getUserRecurringBookings(userId: string): Promise<RecurringBooking[]> {
    const bookings = await this.list();
    return bookings.filter((b) => b.userId === userId);
  }

  /**
   * Get all recurring bookings for a specific coach
   * @param coachId - The coach ID
   */
  async getCoachRecurringBookings(coachId: string): Promise<RecurringBooking[]> {
    const bookings = await this.list();
    return bookings.filter((b) => b.coachId === coachId);
  }

  /**
   * Get active recurring bookings for a user
   * @param userId - The user ID
   */
  async getActiveUserRecurringBookings(userId: string): Promise<RecurringBooking[]> {
    const bookings = await this.getUserRecurringBookings(userId);
    return bookings.filter((b) => b.status === 'ACTIVE');
  }

  /**
   * Get active recurring bookings for a coach
   * @param coachId - The coach ID
   */
  async getActiveCoachRecurringBookings(coachId: string): Promise<RecurringBooking[]> {
    const bookings = await this.getCoachRecurringBookings(coachId);
    return bookings.filter((b) => b.status === 'ACTIVE');
  }

  /**
   * Cancel a recurring booking subscription
   * @param recurringId - The recurring booking ID
   * @param reason - Optional cancellation reason
   */
  async cancelRecurring(
    recurringId: string,
    reason?: string
  ): Promise<ServiceResult<RecurringBooking>> {
    try {
      const bookings = await this.list();
      const index = bookings.findIndex((b) => b.id === recurringId);

      if (index === -1) {
        return { success: false, error: 'Recurring booking not found.' };
      }

      const booking = bookings[index];

      if (booking.status === 'CANCELLED') {
        return { success: false, error: 'This subscription is already cancelled.' };
      }

      const now = new Date().toISOString();
      const updated: RecurringBooking = {
        ...booking,
        status: 'CANCELLED',
        cancelledAt: now,
        cancellationReason: reason,
        updatedAt: now,
      };

      bookings[index] = updated;
      await storageService.setItem(STORAGE_KEYS.RECURRING_BOOKINGS, bookings);

      logger.info('recurring_booking_cancelled', {
        id: recurringId,
        userId: booking.userId,
        coachId: booking.coachId,
        reason,
      });

      // Notify coach of cancellation
      await notificationService.create({
        id: `notif_recurring_cancel_${Date.now()}`,
        type: 'booking',
        title: 'Recurring Booking Cancelled',
        body: `${booking.userName} cancelled their ${getFrequencyLabel(booking.frequency).toLowerCase()} subscription`,
        recipientId: booking.coachId,
        recipientRole: 'coach',
        timeLabel: 'Just now',
        read: false,
      });

      return { success: true, data: updated };
    } catch (error) {
      logger.error('recurring_booking_cancel_failed', { error, recurringId });
      return {
        success: false,
        error: 'Failed to cancel recurring booking. Please try again.',
      };
    }
  }

  /**
   * Pause a recurring booking subscription
   * @param recurringId - The recurring booking ID
   * @param reason - Optional pause reason
   */
  async pauseRecurring(
    recurringId: string,
    reason?: string
  ): Promise<ServiceResult<RecurringBooking>> {
    try {
      const bookings = await this.list();
      const index = bookings.findIndex((b) => b.id === recurringId);

      if (index === -1) {
        return { success: false, error: 'Recurring booking not found.' };
      }

      const booking = bookings[index];

      if (booking.status !== 'ACTIVE') {
        return {
          success: false,
          error: `Cannot pause a subscription that is ${booking.status.toLowerCase()}.`,
        };
      }

      const now = new Date().toISOString();
      const updated: RecurringBooking = {
        ...booking,
        status: 'PAUSED',
        pausedAt: now,
        pauseReason: reason,
        updatedAt: now,
      };

      bookings[index] = updated;
      await storageService.setItem(STORAGE_KEYS.RECURRING_BOOKINGS, bookings);

      logger.info('recurring_booking_paused', {
        id: recurringId,
        userId: booking.userId,
        coachId: booking.coachId,
        reason,
      });

      // Notify coach of pause
      await notificationService.create({
        id: `notif_recurring_pause_${Date.now()}`,
        type: 'booking',
        title: 'Recurring Booking Paused',
        body: `${booking.userName} paused their ${getFrequencyLabel(booking.frequency).toLowerCase()} subscription`,
        recipientId: booking.coachId,
        recipientRole: 'coach',
        timeLabel: 'Just now',
        read: false,
      });

      return { success: true, data: updated };
    } catch (error) {
      logger.error('recurring_booking_pause_failed', { error, recurringId });
      return {
        success: false,
        error: 'Failed to pause recurring booking. Please try again.',
      };
    }
  }

  /**
   * Resume a paused recurring booking subscription
   * @param recurringId - The recurring booking ID
   */
  async resumeRecurring(recurringId: string): Promise<ServiceResult<RecurringBooking>> {
    try {
      const bookings = await this.list();
      const index = bookings.findIndex((b) => b.id === recurringId);

      if (index === -1) {
        return { success: false, error: 'Recurring booking not found.' };
      }

      const booking = bookings[index];

      if (booking.status !== 'PAUSED') {
        return {
          success: false,
          error: `Cannot resume a subscription that is ${booking.status.toLowerCase()}.`,
        };
      }

      const now = new Date().toISOString();
      const updated: RecurringBooking = {
        ...booking,
        status: 'ACTIVE',
        pausedAt: undefined,
        pauseReason: undefined,
        updatedAt: now,
      };

      bookings[index] = updated;
      await storageService.setItem(STORAGE_KEYS.RECURRING_BOOKINGS, bookings);

      logger.info('recurring_booking_resumed', {
        id: recurringId,
        userId: booking.userId,
        coachId: booking.coachId,
      });

      // Notify coach of resume
      await notificationService.create({
        id: `notif_recurring_resume_${Date.now()}`,
        type: 'booking',
        title: 'Recurring Booking Resumed',
        body: `${booking.userName} resumed their ${getFrequencyLabel(booking.frequency).toLowerCase()} subscription`,
        recipientId: booking.coachId,
        recipientRole: 'coach',
        timeLabel: 'Just now',
        read: false,
      });

      return { success: true, data: updated };
    } catch (error) {
      logger.error('recurring_booking_resume_failed', { error, recurringId });
      return {
        success: false,
        error: 'Failed to resume recurring booking. Please try again.',
      };
    }
  }

  /**
   * Generate upcoming bookings from a recurring subscription
   * Creates actual booking entries for the next N occurrences
   * @param recurringId - The recurring booking ID
   * @param count - Number of bookings to generate (default: 4)
   */
  async generateUpcomingBookings(
    recurringId: string,
    count: number = 4
  ): Promise<ServiceResult<GeneratedBookingSummary[]>> {
    try {
      const recurring = await this.getById(recurringId);

      if (!recurring) {
        return { success: false, error: 'Recurring booking not found.' };
      }

      if (recurring.status !== 'ACTIVE') {
        return {
          success: false,
          error: `Cannot generate bookings for a ${recurring.status.toLowerCase()} subscription.`,
        };
      }

      const generatedBookings: GeneratedBookingSummary[] = [];
      const now = new Date();
      let currentDate = new Date(Math.max(new Date(recurring.startDate).getTime(), now.getTime()));

      // Find the next occurrence of the day of week
      while (currentDate.getDay() !== recurring.dayOfWeek) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // If we're past today's time for this day, move to next occurrence
      const [hours, minutes] = recurring.time.split(':').map(Number);
      const todayAtTime = new Date(currentDate);
      todayAtTime.setHours(hours, minutes, 0, 0);

      if (currentDate.getDay() === now.getDay() && now > todayAtTime) {
        currentDate = this.getNextOccurrence(currentDate, recurring.frequency);
      }

      for (let i = 0; i < count; i++) {
        // Check if we've passed the end date
        if (recurring.endDate && currentDate > new Date(recurring.endDate)) {
          break;
        }

        const scheduledAt = new Date(currentDate);
        scheduledAt.setHours(hours, minutes, 0, 0);

        const bookingId = `booking_gen_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;

        const booking = {
          id: bookingId,
          recurringBookingId: recurringId,
          coachId: recurring.coachId,
          coachName: recurring.coachName,
          athleteId: recurring.athleteId || recurring.userId,
          athleteName: recurring.athleteName || recurring.userName,
          bookedById: recurring.userId,
          bookedByName: recurring.userName,
          scheduledAt: scheduledAt.toISOString(),
          duration: recurring.duration,
          location: recurring.location,
          service: recurring.sessionType,
          serviceType: recurring.sessionType,
          status: 'CONFIRMED' as const,
          notes: recurring.notes || '',
          price: recurring.pricePerSession,
          createdAt: new Date().toISOString(),
          isRecurringGenerated: true,
        };

        // Store the generated booking through bookingService (centralized storage)
        await bookingService.saveBookingDirect(booking as Booking);

        generatedBookings.push({
          bookingId,
          recurringBookingId: recurringId,
          scheduledAt: scheduledAt.toISOString(),
          status: 'CONFIRMED',
        });

        // Move to next occurrence
        currentDate = this.getNextOccurrence(currentDate, recurring.frequency);
      }

      // Update the recurring booking with generated booking IDs
      if (generatedBookings.length > 0) {
        const bookings = await this.list();
        const index = bookings.findIndex((b) => b.id === recurringId);
        if (index !== -1) {
          bookings[index].generatedBookingIds = [
            ...bookings[index].generatedBookingIds,
            ...generatedBookings.map((g) => g.bookingId),
          ];
          bookings[index].updatedAt = new Date().toISOString();
          await storageService.setItem(STORAGE_KEYS.RECURRING_BOOKINGS, bookings);
        }
      }

      logger.info('bookings_generated', {
        recurringId,
        count: generatedBookings.length,
      });

      return { success: true, data: generatedBookings };
    } catch (error) {
      logger.error('generate_bookings_failed', { error, recurringId });
      return {
        success: false,
        error: 'Failed to generate bookings. Please try again.',
      };
    }
  }

  /**
   * Update a recurring booking's details
   * @param recurringId - The recurring booking ID
   * @param updates - Partial updates to apply
   */
  async updateRecurring(
    recurringId: string,
    updates: Partial<Pick<RecurringBooking, 'time' | 'duration' | 'location' | 'notes' | 'endDate'>>
  ): Promise<ServiceResult<RecurringBooking>> {
    try {
      const bookings = await this.list();
      const index = bookings.findIndex((b) => b.id === recurringId);

      if (index === -1) {
        return { success: false, error: 'Recurring booking not found.' };
      }

      const booking = bookings[index];

      if (booking.status === 'CANCELLED') {
        return { success: false, error: 'Cannot update a cancelled subscription.' };
      }

      const now = new Date().toISOString();
      const updated: RecurringBooking = {
        ...booking,
        ...updates,
        updatedAt: now,
      };

      // Recalculate sessions remaining if end date changed
      if (updates.endDate !== undefined) {
        if (updates.endDate) {
          updated.sessionsRemaining = this.calculateSessionsRemaining(
            booking.startDate,
            updates.endDate,
            booking.frequency
          );
        } else {
          updated.sessionsRemaining = undefined;
        }
      }

      bookings[index] = updated;
      await storageService.setItem(STORAGE_KEYS.RECURRING_BOOKINGS, bookings);

      logger.info('recurring_booking_updated', {
        id: recurringId,
        updates,
      });

      return { success: true, data: updated };
    } catch (error) {
      logger.error('recurring_booking_update_failed', { error, recurringId });
      return {
        success: false,
        error: 'Failed to update recurring booking. Please try again.',
      };
    }
  }

  /**
   * Mark a session as completed and update the recurring booking stats
   * @param recurringId - The recurring booking ID
   */
  async markSessionCompleted(recurringId: string): Promise<ServiceResult<RecurringBooking>> {
    try {
      const bookings = await this.list();
      const index = bookings.findIndex((b) => b.id === recurringId);

      if (index === -1) {
        return { success: false, error: 'Recurring booking not found.' };
      }

      const booking = bookings[index];
      const now = new Date().toISOString();

      const updated: RecurringBooking = {
        ...booking,
        sessionsCompleted: booking.sessionsCompleted + 1,
        sessionsRemaining:
          booking.sessionsRemaining !== undefined
            ? Math.max(0, booking.sessionsRemaining - 1)
            : undefined,
        updatedAt: now,
      };

      // Check if subscription has expired (no more sessions remaining)
      if (updated.sessionsRemaining === 0) {
        updated.status = 'EXPIRED';
      }

      bookings[index] = updated;
      await storageService.setItem(STORAGE_KEYS.RECURRING_BOOKINGS, bookings);

      logger.info('recurring_session_completed', {
        id: recurringId,
        sessionsCompleted: updated.sessionsCompleted,
        sessionsRemaining: updated.sessionsRemaining,
      });

      return { success: true, data: updated };
    } catch (error) {
      logger.error('mark_session_completed_failed', { error, recurringId });
      return {
        success: false,
        error: 'Failed to mark session as completed. Please try again.',
      };
    }
  }

  /**
   * Delete a recurring booking (admin use only)
   * @param recurringId - The recurring booking ID
   */
  async deleteRecurring(recurringId: string): Promise<ServiceResult<void>> {
    try {
      const bookings = await this.list();
      const filtered = bookings.filter((b) => b.id !== recurringId);

      if (filtered.length === bookings.length) {
        return { success: false, error: 'Recurring booking not found.' };
      }

      await storageService.setItem(STORAGE_KEYS.RECURRING_BOOKINGS, filtered);

      logger.info('recurring_booking_deleted', { id: recurringId });

      return { success: true };
    } catch (error) {
      logger.error('recurring_booking_delete_failed', { error, recurringId });
      return {
        success: false,
        error: 'Failed to delete recurring booking. Please try again.',
      };
    }
  }

  /**
   * Get the next occurrence date based on frequency
   */
  private getNextOccurrence(currentDate: Date, frequency: RecurrenceFrequency): Date {
    const next = new Date(currentDate);

    switch (frequency) {
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }

  /**
   * Calculate the number of sessions between two dates based on frequency
   */
  private calculateSessionsRemaining(
    startDate: string,
    endDate: string,
    frequency: RecurrenceFrequency
  ): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (frequency) {
      case 'WEEKLY':
        return Math.ceil(diffDays / 7);
      case 'BIWEEKLY':
        return Math.ceil(diffDays / 14);
      case 'MONTHLY':
        const months =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());
        return Math.max(1, months);
      default:
        return 0;
    }
  }

  /**
   * Check for and expire any recurring bookings past their end date
   */
  async checkAndExpireBookings(): Promise<void> {
    try {
      const bookings = await this.list();
      const now = new Date();
      let updated = false;

      const updatedBookings = bookings.map((booking) => {
        if (
          booking.status === 'ACTIVE' &&
          booking.endDate &&
          new Date(booking.endDate) < now
        ) {
          updated = true;
          return {
            ...booking,
            status: 'EXPIRED' as RecurringBookingStatus,
            updatedAt: now.toISOString(),
          };
        }
        return booking;
      });

      if (updated) {
        await storageService.setItem(STORAGE_KEYS.RECURRING_BOOKINGS, updatedBookings);
        logger.info('expired_bookings_updated');
      }
    } catch (error) {
      logger.error('check_expire_bookings_failed', { error });
    }
  }

  /**
   * Seed demo data for testing
   */
  async seedDemoData(): Promise<void> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7); // Started a week ago

    const demoBookings: RecurringBooking[] = [
      {
        id: 'recurring_demo_1',
        userId: 'user_1',
        userName: 'Tom Baker',
        coachId: 'coach1',
        coachName: 'Sarah Mitchell',
        coachPhotoUrl: 'https://i.pravatar.cc/100?u=sarah',
        athleteId: 'athlete_1',
        athleteName: 'Tom Baker Jr.',
        dayOfWeek: 2, // Tuesday
        time: '16:00',
        duration: 60,
        location: 'Central Park Field',
        sessionType: '1-on-1 Training',
        frequency: 'WEEKLY',
        startDate: startDate.toISOString(),
        status: 'ACTIVE',
        pricePerSession: 75,
        createdAt: startDate.toISOString(),
        updatedAt: now.toISOString(),
        generatedBookingIds: [],
        sessionsCompleted: 1,
      },
      {
        id: 'recurring_demo_2',
        userId: 'user_1',
        userName: 'Tom Baker',
        coachId: 'coach_2',
        coachName: 'Marcus Thompson',
        coachPhotoUrl: 'https://i.pravatar.cc/100?u=marcus',
        dayOfWeek: 5, // Friday
        time: '10:00',
        duration: 90,
        location: 'Elite Sports Academy',
        sessionType: 'Group Training',
        frequency: 'BIWEEKLY',
        startDate: startDate.toISOString(),
        endDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
        status: 'ACTIVE',
        pricePerSession: 45,
        notes: 'Focus on dribbling skills',
        createdAt: startDate.toISOString(),
        updatedAt: now.toISOString(),
        generatedBookingIds: [],
        sessionsCompleted: 0,
        sessionsRemaining: 6,
      },
      {
        id: 'recurring_demo_3',
        userId: 'user_2',
        userName: 'Jane Wilson',
        coachId: 'coach1',
        coachName: 'Sarah Mitchell',
        coachPhotoUrl: 'https://i.pravatar.cc/100?u=sarah',
        athleteId: 'athlete_2',
        athleteName: 'Emma Wilson',
        dayOfWeek: 4, // Thursday
        time: '15:30',
        duration: 60,
        location: 'Community Sports Center',
        sessionType: '1-on-1 Training',
        frequency: 'MONTHLY',
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PAUSED',
        pausedAt: now.toISOString(),
        pauseReason: 'Family vacation',
        pricePerSession: 80,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: now.toISOString(),
        generatedBookingIds: [],
        sessionsCompleted: 1,
      },
    ];

    await storageService.setItem(STORAGE_KEYS.RECURRING_BOOKINGS, demoBookings);
    logger.info('demo_recurring_bookings_seeded', { count: demoBookings.length });
  }

  /**
   * Clear all recurring bookings (for testing)
   */
  async clearAll(): Promise<void> {
    await storageService.setItem(STORAGE_KEYS.RECURRING_BOOKINGS, []);
    logger.info('recurring_bookings_cleared');
  }
}

export const recurringBookingService = new RecurringBookingService();
