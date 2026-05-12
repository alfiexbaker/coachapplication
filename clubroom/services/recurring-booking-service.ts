import {
  RecurringBooking,
  RecurrenceFrequency,
  RecurringBookingStatus,
  CreateRecurringBookingParams,
  GeneratedBookingSummary,
} from '@/constants/types';
import { getDayName } from '@/constants/booking-types';
import type { Booking } from '@/constants/app-types';
import { apiClient } from './api-client';
import { generateId } from '@/utils/generate-id';
import { notificationService } from './notification-service';
import { bookingService } from './booking-service';
import { bookingAuthorityService } from './booking/booking-authority-service';
import { userService } from './user-service';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from './event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  validationError,
  storageError,
} from '@/types/result';
// Re-export getDayName for consumers that imported it from here
export { getDayName };

const logger = createLogger('RecurringBookingService');
const API_MODE_RECURRING_AUTHORITY_MESSAGE =
  'Recurring booking plans require backend series authority in API mode.';

interface ApiSeriesLike {
  id: string;
  coachUserId: string;
  bookedByUserId: string;
  athleteIds: string[];
  frequency: RecurrenceFrequency | 'CUSTOM';
  status: 'ACTIVE' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  bookingIds: string[];
  scheduledDates?: string[];
  durationMinutes?: number | null;
  location?: string | null;
  serviceType?: string | null;
  priceMinor?: number | null;
  patternLabel?: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapSeriesStatusToRecurringStatus(
  status: ApiSeriesLike['status'],
): RecurringBookingStatus {
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'COMPLETED') return 'EXPIRED';
  return 'ACTIVE';
}

function mapApiSeriesToRecurringBooking(series: ApiSeriesLike): RecurringBooking {
  const scheduledDates = series.scheduledDates ?? [];
  const firstScheduledAt = scheduledDates[0] ?? series.startDate;
  const firstDate = new Date(firstScheduledAt);
  const frequency: RecurrenceFrequency =
    series.frequency === 'WEEKLY' ||
    series.frequency === 'BIWEEKLY' ||
    series.frequency === 'MONTHLY'
      ? series.frequency
      : 'WEEKLY';
  const dayOfWeek = (Number.isNaN(firstDate.getTime()) ? 0 : firstDate.getDay()) as
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6;

  return {
    id: series.id,
    userId: series.bookedByUserId,
    coachId: series.coachUserId,
    athleteId: series.athleteIds[0],
    dayOfWeek,
    time: Number.isNaN(firstDate.getTime()) ? '00:00' : firstDate.toISOString().slice(11, 16),
    duration: series.durationMinutes ?? 60,
    location: series.location ?? 'TBD',
    sessionType: series.serviceType ?? 'one_to_one',
    frequency,
    startDate: series.startDate,
    endDate: series.endDate,
    status: mapSeriesStatusToRecurringStatus(series.status),
    pricePerSession:
      typeof series.priceMinor === 'number' ? Math.round(series.priceMinor) / 100 : undefined,
    notes: series.patternLabel ?? undefined,
    createdAt: series.createdAt,
    updatedAt: series.updatedAt,
    generatedBookingIds: series.bookingIds,
    sessionsCompleted: 0,
  };
}

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) return fallback;
  return userResult.data.name || fallback;
}

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
 * Service for managing recurring booking subscriptions
 */
class RecurringBookingService {
  private getApiModeAuthorityError(operation: string): ServiceError | null {
    if (apiClient.isMockMode) {
      return null;
    }
    logger.warn('recurring_booking_api_mode_blocked', { operation });
    return validationError(API_MODE_RECURRING_AUTHORITY_MESSAGE);
  }

  private async listValue(): Promise<RecurringBooking[]> {
    return apiClient.get<RecurringBooking[]>(STORAGE_KEYS.RECURRING_BOOKINGS, []);
  }

  private buildInitialSeriesWeeks(params: CreateRecurringBookingParams): string[] {
    const occurrenceDates: string[] = [];
    const maxOccurrences = 52;
    const defaultOpenEndedOccurrences = 4;
    const endDate = params.endDate ? new Date(params.endDate) : null;
    let currentDate = new Date(params.startDate);
    const [hours = 0, minutes = 0] = params.time.split(':').map(Number);

    while (currentDate.getDay() !== params.dayOfWeek) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    while (occurrenceDates.length < maxOccurrences) {
      const occurrence = new Date(currentDate);
      occurrence.setHours(hours, minutes, 0, 0);
      if (endDate && occurrence > endDate) {
        break;
      }
      occurrenceDates.push(occurrence.toISOString().slice(0, 10));
      if (!endDate && occurrenceDates.length >= defaultOpenEndedOccurrences) {
        break;
      }
      currentDate = this.getNextOccurrence(currentDate, params.frequency);
    }

    return occurrenceDates;
  }

  private async cancelFutureGeneratedBookings(
    recurring: RecurringBooking,
    reason?: string,
  ): Promise<number> {
    if (recurring.generatedBookingIds.length === 0) {
      return 0;
    }

    const bookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const now = Date.now();
    let cancelledCount = 0;

    const updatedBookings = bookings.map((booking) => {
      if (
        booking.recurringBookingId !== recurring.id ||
        !recurring.generatedBookingIds.includes(booking.id) ||
        booking.status === 'CANCELLED' ||
        booking.status === 'COMPLETED'
      ) {
        return booking;
      }

      const scheduledAtMs = new Date(booking.scheduledAt).getTime();
      if (!Number.isFinite(scheduledAtMs) || scheduledAtMs < now) {
        return booking;
      }

      cancelledCount += 1;
      emitTyped(ServiceEvents.BOOKING_CANCELLED, {
        bookingId: booking.id,
        userId: booking.bookedById || recurring.userId,
        coachId: booking.coachId,
        reason,
        cancelledBy: 'parent',
      });

      return {
        ...booking,
        status: 'CANCELLED' as const,
        cancellationReason: reason || 'Recurring plan cancelled',
        cancelledAt: new Date().toISOString(),
      };
    });

    if (cancelledCount > 0) {
      await apiClient.set(STORAGE_KEYS.BOOKINGS, updatedBookings);
    }

    return cancelledCount;
  }

  /**
   * Get all recurring bookings from storage
   */
  async list(): Promise<Result<RecurringBooking[], ServiceError>> {
    try {
      if (!apiClient.isMockMode) {
        const apiResult = await bookingAuthorityService.listBookingSeries();
        if (!apiResult.success) {
          return err(apiResult.error);
        }
        return ok(apiResult.data.map(mapApiSeriesToRecurringBooking));
      }
      return ok(await this.listValue());
    } catch (error) {
      logger.error('Failed to list recurring bookings', { error });
      return err(storageError('Failed to load recurring bookings'));
    }
  }

  /**
   * Get a specific recurring booking by ID
   * @param id - The recurring booking ID
   */
  async getById(id: string): Promise<Result<RecurringBooking | undefined, ServiceError>> {
    try {
      if (!apiClient.isMockMode) {
        const apiResult = await bookingAuthorityService.getBookingSeries(id);
        if (!apiResult.success) {
          return err(apiResult.error);
        }
        return ok(mapApiSeriesToRecurringBooking(apiResult.data));
      }
      const bookings = await this.listValue();
      return ok(bookings.find((b) => b.id === id));
    } catch (error) {
      logger.error('Failed to get recurring booking', { id, error });
      return err(storageError('Failed to load recurring booking'));
    }
  }

  /**
   * Create a new recurring booking subscription
   * @param params - The parameters for creating the recurring booking
   */
  async createRecurring(
    params: CreateRecurringBookingParams,
  ): Promise<Result<RecurringBooking, ServiceError>> {
    try {
      if (!apiClient.isMockMode) {
        const selectedWeeks = this.buildInitialSeriesWeeks(params);
        if (selectedWeeks.length === 0) {
          return err(validationError('Recurring plan needs at least one future session.'));
        }

        const apiResult = await bookingAuthorityService.createBookingSeries({
          coachId: params.coachId,
          athleteIds: [params.athleteId ?? params.userId],
          bookedById: params.userId,
          selectedWeeks,
          startTime: params.time,
          duration: params.duration,
          location: params.location,
          sessionType: params.sessionType,
          frequency: params.frequency,
          notes: params.notes,
          pricePerSession: params.pricePerSession,
          patternLabel: `${getFrequencyLabel(params.frequency)} recurring plan`,
        });
        if (!apiResult.success) {
          return err(apiResult.error);
        }

        const recurring = mapApiSeriesToRecurringBooking(apiResult.data.series);
        logger.info('recurring_booking_created_via_api_series', {
          id: recurring.id,
          userId: params.userId,
          coachId: params.coachId,
          frequency: params.frequency,
          generatedBookingCount: recurring.generatedBookingIds.length,
        });
        emitTyped(ServiceEvents.RECURRING_CREATED, {
          recurringId: recurring.id,
          userId: recurring.userId,
          coachId: recurring.coachId,
          frequency: recurring.frequency,
          status: recurring.status,
        });
        return ok(recurring);
      }
      const now = new Date().toISOString();

      const newRecurring: RecurringBooking = {
        id: generateId('recurring'),
        userId: params.userId,
        coachId: params.coachId,
        athleteId: params.athleteId,
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
        actingAs: params.actingAs,
        commercialMode: params.commercialMode,
        ownerCoachId: params.ownerCoachId,
        assigneeCoachId: params.assigneeCoachId,
        createdByUserId: params.createdByUserId,
        createdByRole: params.createdByRole,
        clubId: params.clubId,
      };

      // Calculate sessions remaining if end date is set
      if (params.endDate) {
        newRecurring.sessionsRemaining = this.calculateSessionsRemaining(
          params.startDate,
          params.endDate,
          params.frequency,
        );
      }

      const bookings = await this.listValue();
      const updated = [...bookings, newRecurring];
      await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, updated);

      logger.info('recurring_booking_created', {
        id: newRecurring.id,
        userId: params.userId,
        coachId: params.coachId,
        frequency: params.frequency,
      });
      emitTyped(ServiceEvents.RECURRING_CREATED, {
        recurringId: newRecurring.id,
        userId: newRecurring.userId,
        coachId: newRecurring.coachId,
        frequency: newRecurring.frequency,
        status: newRecurring.status,
      });

      // Send notification to coach
      const requesterName = await resolveUserName(params.userId, 'A user');
      const notifyResult = await notificationService.create({
        id: `notif_recurring_${Date.now()}`,
        type: 'booking',
        title: 'New Recurring Booking',
        body: `${requesterName} subscribed to ${getFrequencyLabel(params.frequency).toLowerCase()} sessions`,
        recipientId: params.coachId,
        recipientRole: 'coach',
        timeLabel: 'Just now',
        read: false,
      });
      if (!notifyResult.success) {
        logger.warn('Failed to create recurring booking notification', {
          error: notifyResult.error,
        });
      }

      return ok(newRecurring);
    } catch (error) {
      logger.error('recurring_booking_create_failed', { error, params });
      return err(storageError('Failed to create recurring booking. Please try again.'));
    }
  }

  /**
   * Get all recurring bookings for a specific user
   * @param userId - The user ID
   */
  async getUserRecurringBookings(
    userId: string,
  ): Promise<Result<RecurringBooking[], ServiceError>> {
    try {
      if (!apiClient.isMockMode) {
        const bookingsResult = await this.list();
        if (!bookingsResult.success) {
          return bookingsResult;
        }
        return ok(bookingsResult.data.filter((booking) => booking.userId === userId));
      }
      const bookings = await this.listValue();
      return ok(bookings.filter((b) => b.userId === userId));
    } catch (error) {
      logger.error('Failed to get user recurring bookings', { userId, error });
      return err(storageError('Failed to load recurring bookings'));
    }
  }

  /**
   * Get all recurring bookings for a specific coach
   * @param coachId - The coach ID
   */
  async getCoachRecurringBookings(
    coachId: string,
  ): Promise<Result<RecurringBooking[], ServiceError>> {
    try {
      if (!apiClient.isMockMode) {
        const bookingsResult = await this.list();
        if (!bookingsResult.success) {
          return bookingsResult;
        }
        return ok(bookingsResult.data.filter((booking) => booking.coachId === coachId));
      }
      const bookings = await this.listValue();
      return ok(bookings.filter((b) => b.coachId === coachId));
    } catch (error) {
      logger.error('Failed to get coach recurring bookings', { coachId, error });
      return err(storageError('Failed to load recurring bookings'));
    }
  }

  /**
   * Get active recurring bookings for a user
   * @param userId - The user ID
   */
  async getActiveUserRecurringBookings(
    userId: string,
  ): Promise<Result<RecurringBooking[], ServiceError>> {
    const bookingsResult = await this.getUserRecurringBookings(userId);
    if (!bookingsResult.success) {
      return bookingsResult;
    }
    return ok(bookingsResult.data.filter((b) => b.status === 'ACTIVE'));
  }

  /**
   * Get active recurring bookings for a coach
   * @param coachId - The coach ID
   */
  async getActiveCoachRecurringBookings(
    coachId: string,
  ): Promise<Result<RecurringBooking[], ServiceError>> {
    const bookingsResult = await this.getCoachRecurringBookings(coachId);
    if (!bookingsResult.success) {
      return bookingsResult;
    }
    return ok(bookingsResult.data.filter((b) => b.status === 'ACTIVE'));
  }

  /**
   * Cancel a recurring booking subscription
   * @param recurringId - The recurring booking ID
   * @param reason - Optional cancellation reason
   */
  async cancelRecurring(
    recurringId: string,
    reason?: string,
  ): Promise<Result<RecurringBooking, ServiceError>> {
    try {
      if (!apiClient.isMockMode) {
        const apiResult = await bookingAuthorityService.cancelBookingSeries(recurringId, {
          reason: reason ?? 'Recurring plan cancelled',
        });
        if (!apiResult.success) {
          return err(apiResult.error);
        }
        const recurring = mapApiSeriesToRecurringBooking(apiResult.data.series);
        logger.info('recurring_booking_cancelled_via_api_series', {
          id: recurringId,
          userId: recurring.userId,
          coachId: recurring.coachId,
          reason,
          generatedBookingCount: recurring.generatedBookingIds.length,
        });
        emitTyped(ServiceEvents.RECURRING_CANCELLED, {
          recurringId: recurring.id,
          userId: recurring.userId,
          coachId: recurring.coachId,
          reason,
        });
        return ok(recurring);
      }
      const bookings = await this.listValue();
      const index = bookings.findIndex((b) => b.id === recurringId);

      if (index === -1) {
        return err(notFound('Recurring booking', recurringId));
      }

      const booking = bookings[index];

      if (booking.status === 'CANCELLED') {
        return err(validationError('This subscription is already cancelled.'));
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
      await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, bookings);
      const cancelledGeneratedCount = await this.cancelFutureGeneratedBookings(updated, reason);

      logger.info('recurring_booking_cancelled', {
        id: recurringId,
        userId: booking.userId,
        coachId: booking.coachId,
        reason,
        cancelledGeneratedCount,
      });
      emitTyped(ServiceEvents.RECURRING_CANCELLED, {
        recurringId: updated.id,
        userId: updated.userId,
        coachId: updated.coachId,
        reason,
      });

      // Notify coach of cancellation
      const userName = await resolveUserName(booking.userId, 'A user');
      const notifyResult = await notificationService.create({
        id: `notif_recurring_cancel_${Date.now()}`,
        type: 'booking',
        title: 'Recurring Booking Cancelled',
        body: `${userName} cancelled their ${getFrequencyLabel(booking.frequency).toLowerCase()} subscription`,
        recipientId: booking.coachId,
        recipientRole: 'coach',
        timeLabel: 'Just now',
        read: false,
      });
      if (!notifyResult.success) {
        logger.warn('Failed to create recurring cancel notification', {
          error: notifyResult.error,
        });
      }

      return ok(updated);
    } catch (error) {
      logger.error('recurring_booking_cancel_failed', { error, recurringId });
      return err(storageError('Failed to cancel recurring booking. Please try again.'));
    }
  }

  /**
   * Pause a recurring booking subscription
   * @param recurringId - The recurring booking ID
   * @param reason - Optional pause reason
   */
  async pauseRecurring(
    recurringId: string,
    reason?: string,
  ): Promise<Result<RecurringBooking, ServiceError>> {
    try {
      const authorityError = this.getApiModeAuthorityError('pauseRecurring');
      if (authorityError) {
        return err(authorityError);
      }
      const bookings = await this.listValue();
      const index = bookings.findIndex((b) => b.id === recurringId);

      if (index === -1) {
        return err(notFound('Recurring booking', recurringId));
      }

      const booking = bookings[index];

      if (booking.status !== 'ACTIVE') {
        return err(
          validationError(`Cannot pause a subscription that is ${booking.status.toLowerCase()}.`),
        );
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
      await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, bookings);

      logger.info('recurring_booking_paused', {
        id: recurringId,
        userId: booking.userId,
        coachId: booking.coachId,
        reason,
      });

      // Notify coach of pause
      const userName = await resolveUserName(booking.userId, 'A user');
      const notifyResult = await notificationService.create({
        id: `notif_recurring_pause_${Date.now()}`,
        type: 'booking',
        title: 'Recurring Booking Paused',
        body: `${userName} paused their ${getFrequencyLabel(booking.frequency).toLowerCase()} subscription`,
        recipientId: booking.coachId,
        recipientRole: 'coach',
        timeLabel: 'Just now',
        read: false,
      });
      if (!notifyResult.success) {
        logger.warn('Failed to create recurring pause notification', { error: notifyResult.error });
      }

      return ok(updated);
    } catch (error) {
      logger.error('recurring_booking_pause_failed', { error, recurringId });
      return err(storageError('Failed to pause recurring booking. Please try again.'));
    }
  }

  /**
   * Resume a paused recurring booking subscription
   * @param recurringId - The recurring booking ID
   */
  async resumeRecurring(recurringId: string): Promise<Result<RecurringBooking, ServiceError>> {
    try {
      const authorityError = this.getApiModeAuthorityError('resumeRecurring');
      if (authorityError) {
        return err(authorityError);
      }
      const bookings = await this.listValue();
      const index = bookings.findIndex((b) => b.id === recurringId);

      if (index === -1) {
        return err(notFound('Recurring booking', recurringId));
      }

      const booking = bookings[index];

      if (booking.status !== 'PAUSED') {
        return err(
          validationError(`Cannot resume a subscription that is ${booking.status.toLowerCase()}.`),
        );
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
      await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, bookings);

      logger.info('recurring_booking_resumed', {
        id: recurringId,
        userId: booking.userId,
        coachId: booking.coachId,
      });

      // Notify coach of resume
      const userName = await resolveUserName(booking.userId, 'A user');
      const notifyResult = await notificationService.create({
        id: `notif_recurring_resume_${Date.now()}`,
        type: 'booking',
        title: 'Recurring Booking Resumed',
        body: `${userName} resumed their ${getFrequencyLabel(booking.frequency).toLowerCase()} subscription`,
        recipientId: booking.coachId,
        recipientRole: 'coach',
        timeLabel: 'Just now',
        read: false,
      });
      if (!notifyResult.success) {
        logger.warn('Failed to create recurring resume notification', {
          error: notifyResult.error,
        });
      }

      return ok(updated);
    } catch (error) {
      logger.error('recurring_booking_resume_failed', { error, recurringId });
      return err(storageError('Failed to resume recurring booking. Please try again.'));
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
    count: number = 4,
  ): Promise<Result<GeneratedBookingSummary[], ServiceError>> {
    try {
      const authorityError = this.getApiModeAuthorityError('generateUpcomingBookings');
      if (authorityError) {
        return err(authorityError);
      }
      const recurringResult = await this.getById(recurringId);
      if (!recurringResult.success) {
        return recurringResult;
      }
      const recurring = recurringResult.data;

      if (!recurring) {
        return err(notFound('Recurring booking', recurringId));
      }

      if (recurring.status !== 'ACTIVE') {
        return err(
          validationError(
            `Cannot generate bookings for a ${recurring.status.toLowerCase()} subscription.`,
          ),
        );
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

        const bookingId = generateId('booking_gen');
        const [coachName, athleteName, bookedByName] = await Promise.all([
          resolveUserName(recurring.coachId, 'Coach'),
          resolveUserName(recurring.athleteId || recurring.userId, 'Athlete'),
          resolveUserName(recurring.userId, 'Parent'),
        ]);

        const booking = {
          id: bookingId,
          recurringBookingId: recurringId,
          coachId: recurring.coachId,
          clubId: recurring.clubId,
          actingAs: recurring.actingAs,
          ownerCoachId: recurring.ownerCoachId,
          assigneeCoachId: recurring.assigneeCoachId,
          createdByUserId: recurring.createdByUserId,
          createdByRole: recurring.createdByRole,
          coachName,
          athleteIds: [recurring.athleteId || recurring.userId],
          athleteNames: [athleteName],
          athleteId: recurring.athleteId || recurring.userId,
          athleteName,
          bookedById: recurring.userId,
          bookedByName,
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
        const bookings = await this.listValue();
        const index = bookings.findIndex((b) => b.id === recurringId);
        if (index !== -1) {
          bookings[index].generatedBookingIds = [
            ...bookings[index].generatedBookingIds,
            ...generatedBookings.map((g) => g.bookingId),
          ];
          bookings[index].updatedAt = new Date().toISOString();
          await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, bookings);
        }
      }

      logger.info('bookings_generated', {
        recurringId,
        count: generatedBookings.length,
      });

      return ok(generatedBookings);
    } catch (error) {
      logger.error('generate_bookings_failed', { error, recurringId });
      return err(storageError('Failed to generate bookings. Please try again.'));
    }
  }

  /**
   * Update a recurring booking's details
   * @param recurringId - The recurring booking ID
   * @param updates - Partial updates to apply
   */
  async updateRecurring(
    recurringId: string,
    updates: Partial<
      Pick<RecurringBooking, 'time' | 'duration' | 'location' | 'notes' | 'endDate'>
    >,
  ): Promise<Result<RecurringBooking, ServiceError>> {
    try {
      const authorityError = this.getApiModeAuthorityError('updateRecurring');
      if (authorityError) {
        return err(authorityError);
      }
      const bookings = await this.listValue();
      const index = bookings.findIndex((b) => b.id === recurringId);

      if (index === -1) {
        return err(notFound('Recurring booking', recurringId));
      }

      const booking = bookings[index];

      if (booking.status === 'CANCELLED') {
        return err(validationError('Cannot update a cancelled subscription.'));
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
            booking.frequency,
          );
        } else {
          updated.sessionsRemaining = undefined;
        }
      }

      bookings[index] = updated;
      await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, bookings);

      logger.info('recurring_booking_updated', {
        id: recurringId,
        updates,
      });

      return ok(updated);
    } catch (error) {
      logger.error('recurring_booking_update_failed', { error, recurringId });
      return err(storageError('Failed to update recurring booking. Please try again.'));
    }
  }

  /**
   * Mark a session as completed and update the recurring booking stats
   * @param recurringId - The recurring booking ID
   */
  async markSessionCompleted(recurringId: string): Promise<Result<RecurringBooking, ServiceError>> {
    try {
      const authorityError = this.getApiModeAuthorityError('markSessionCompleted');
      if (authorityError) {
        return err(authorityError);
      }
      const bookings = await this.listValue();
      const index = bookings.findIndex((b) => b.id === recurringId);

      if (index === -1) {
        return err(notFound('Recurring booking', recurringId));
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
      await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, bookings);

      logger.info('recurring_session_completed', {
        id: recurringId,
        sessionsCompleted: updated.sessionsCompleted,
        sessionsRemaining: updated.sessionsRemaining,
      });

      return ok(updated);
    } catch (error) {
      logger.error('mark_session_completed_failed', { error, recurringId });
      return err(storageError('Failed to mark session as completed. Please try again.'));
    }
  }

  /**
   * Delete a recurring booking (admin use only)
   * @param recurringId - The recurring booking ID
   */
  async deleteRecurring(recurringId: string): Promise<Result<void, ServiceError>> {
    try {
      const authorityError = this.getApiModeAuthorityError('deleteRecurring');
      if (authorityError) {
        return err(authorityError);
      }
      const bookings = await this.listValue();
      const filtered = bookings.filter((b) => b.id !== recurringId);

      if (filtered.length === bookings.length) {
        return err(notFound('Recurring booking', recurringId));
      }

      await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, filtered);

      logger.info('recurring_booking_deleted', { id: recurringId });

      return ok(undefined);
    } catch (error) {
      logger.error('recurring_booking_delete_failed', { error, recurringId });
      return err(storageError('Failed to delete recurring booking. Please try again.'));
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
    frequency: RecurrenceFrequency,
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
          (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        return Math.max(1, months);
      default:
        return 0;
    }
  }

  /**
   * Check for and expire any recurring bookings past their end date
   */
  async checkAndExpireBookings(): Promise<Result<void, ServiceError>> {
    try {
      const authorityError = this.getApiModeAuthorityError('checkAndExpireBookings');
      if (authorityError) {
        return err(authorityError);
      }
      const bookings = await this.listValue();
      const now = new Date();
      let updated = false;

      const updatedBookings = bookings.map((booking) => {
        if (booking.status === 'ACTIVE' && booking.endDate && new Date(booking.endDate) < now) {
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
        await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, updatedBookings);
        logger.info('expired_bookings_updated');
      }
      return ok(undefined);
    } catch (error) {
      logger.error('check_expire_bookings_failed', { error });
      return err(storageError('Failed to check and expire recurring bookings'));
    }
  }

  /**
   * Seed demo data for testing
   */
  async seedDemoData(): Promise<Result<void, ServiceError>> {
    const authorityError = this.getApiModeAuthorityError('seedDemoData');
    if (authorityError) {
      return err(authorityError);
    }

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7); // Started a week ago

    const demoBookings: RecurringBooking[] = [
      {
        id: 'recurring_demo_1',
        userId: 'user_1',
        coachId: 'coach1',
        athleteId: 'athlete_1',
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
        coachId: 'coach_2',
        dayOfWeek: 5, // Friday
        time: '10:00',
        duration: 90,
        location: 'Southgate Academy',
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
        coachId: 'coach1',
        athleteId: 'athlete_2',
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

    try {
      await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, demoBookings);
      logger.info('demo_recurring_bookings_seeded', { count: demoBookings.length });
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to seed recurring demo data', { error });
      return err(storageError('Failed to seed recurring demo data'));
    }
  }

  /**
   * Clear all recurring bookings (for testing)
   */
  async clearAll(): Promise<Result<void, ServiceError>> {
    try {
      const authorityError = this.getApiModeAuthorityError('clearAll');
      if (authorityError) {
        return err(authorityError);
      }
      await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, []);
      logger.info('recurring_bookings_cleared');
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to clear recurring bookings', { error });
      return err(storageError('Failed to clear recurring bookings'));
    }
  }
}

export const recurringBookingService = new RecurringBookingService();
