/**
 * Multi-Week Booking Service
 *
 * Manages BookingSeries — groups of bookings created together when a parent
 * books multiple weeks at once. Coordinates with BookingCrudService for
 * individual booking creation and stores mock-mode series metadata in memory.
 *
 * Follows the same cache + Result<T> patterns as other services.
 */

import { apiClient } from './api-client';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { bookingAuthorityService } from '@/services/booking/booking-authority-service';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  validationError,
  storageError,
} from '@/types/result';
import type { BookingSeries } from '@/constants/session-types';
import type { Booking } from '@/constants/app-types';
import { bookingCrudService } from './booking/booking-crud-service';
const logger = createLogger('MultiWeekBookingService');

/** Maximum age (ms) before cache is considered stale. */
const CACHE_MAX_AGE = 30_000;

let mockBookingSeriesStore: BookingSeries[] = [];

function cloneSeries(series: BookingSeries): BookingSeries {
  return {
    ...series,
    bookingIds: [...(series.bookingIds ?? [])],
    athleteIds: [...(series.athleteIds ?? [])],
    athleteNames: [...(series.athleteNames ?? [])],
    selectedWeeks: [...(series.selectedWeeks ?? [])],
  };
}

interface ApiSeriesLike {
  id: string;
  bookingIds: string[];
  bookedByUserId: string;
  coachUserId: string;
  athleteIds: string[];
  serviceType?: string | null;
  objectives?: string[];
  priceMinor?: number | null;
  totalPriceMinor?: number | null;
  scheduledDates?: string[];
  patternLabel?: string | null;
  location?: string | null;
  createdAt: string;
  status: BookingSeries['status'];
}
export interface CreateSeriesParams {
  createdById: string;
  createdByName: string;
  coachId: string;
  coachName: string;
  athleteIds: string[];
  athleteNames: string[];
  sessionType: string;
  focus?: string;
  pricePerSession?: number;
  /** ISO date strings for each selected week */
  selectedWeeks: string[];
  /** Start time in HH:mm format for each session */
  startTime: string;
  /** Duration in minutes */
  duration: number;
  location: string;
  patternLabel: string;
  sessionInviteId?: string;
  sessionSource?: 'direct' | 'event' | 'group';
  sessionSourceEntityId?: string;
  clubId?: string;
  actingAs?: 'self' | 'club';
  ownerCoachId?: string;
  assigneeCoachId?: string;
  createdByUserId?: string;
  createdByRole?: Booking['createdByRole'];
  notes?: string;
}
function mapApiSeriesToBookingSeries(
  apiSeries: ApiSeriesLike,
  fallback: Partial<BookingSeries> = {},
): BookingSeries {
  const selectedWeeks =
    apiSeries.scheduledDates?.map((scheduledAt) => scheduledAt.slice(0, 10)) ??
    fallback.selectedWeeks ??
    [];
  const pricePerSession =
    typeof apiSeries.priceMinor === 'number'
      ? apiSeries.priceMinor / 100
      : fallback.pricePerSession;
  return {
    id: apiSeries.id,
    bookingIds: apiSeries.bookingIds,
    createdById: fallback.createdById ?? apiSeries.bookedByUserId,
    createdByName: fallback.createdByName ?? apiSeries.bookedByUserId,
    coachId: fallback.coachId ?? apiSeries.coachUserId,
    coachName: fallback.coachName ?? apiSeries.coachUserId,
    athleteIds: fallback.athleteIds ?? apiSeries.athleteIds,
    athleteNames: fallback.athleteNames ?? apiSeries.athleteIds,
    sessionType: fallback.sessionType ?? apiSeries.serviceType ?? 'one_to_one',
    focus: fallback.focus ?? apiSeries.objectives?.[0],
    pricePerSession,
    selectedWeeks,
    totalCost:
      typeof apiSeries.totalPriceMinor === 'number'
        ? apiSeries.totalPriceMinor / 100
        : (pricePerSession ?? 0) * apiSeries.bookingIds.length,
    patternLabel:
      fallback.patternLabel ??
      apiSeries.patternLabel ??
      (selectedWeeks.length > 0 ? `${selectedWeeks.length} sessions` : 'Booking series'),
    location: fallback.location ?? apiSeries.location ?? 'TBD',
    sessionInviteId: fallback.sessionInviteId,
    createdAt: apiSeries.createdAt,
    status: apiSeries.status,
  };
}
class MultiWeekBookingService {
  // ---------------------------------------------------------------------------
  // In-memory cache (mirrors BaseService pattern)
  // ---------------------------------------------------------------------------

  private _cache: Map<string, BookingSeries> | null = null;
  private _cacheTimestamp = 0;
  private async getCache(): Promise<Map<string, BookingSeries>> {
    const now = Date.now();
    if (this._cache === null || now - this._cacheTimestamp > CACHE_MAX_AGE) {
      const data = await this.loadFromMockState();
      this._cache = new Map(data.map((item) => [item.id, item]));
      this._cacheTimestamp = now;
    }
    return this._cache;
  }
  private invalidateCache(): void {
    this._cache = null;
    this._cacheTimestamp = 0;
  }
  private async loadFromMockState(): Promise<BookingSeries[]> {
    return mockBookingSeriesStore.map(cloneSeries);
  }
  private async saveToMockState(series: BookingSeries[]): Promise<void> {
    mockBookingSeriesStore = series.map(cloneSeries);
    this.invalidateCache();
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  /**
   * Create a multi-week booking series.
   * Creates N individual bookings and a BookingSeries record linking them.
   */
  async createSeries(params: CreateSeriesParams): Promise<Result<BookingSeries, ServiceError>> {
    const {
      createdById,
      createdByName,
      coachId,
      coachName,
      athleteIds,
      athleteNames,
      sessionType,
      focus,
      pricePerSession,
      selectedWeeks,
      startTime,
      duration,
      location,
      patternLabel,
      sessionInviteId,
      sessionSource,
      sessionSourceEntityId,
      clubId,
      actingAs,
      ownerCoachId,
      assigneeCoachId,
      createdByUserId,
      createdByRole,
      notes,
    } = params;

    // Validate
    if (selectedWeeks.length === 0) {
      return err(validationError('At least one week must be selected'));
    }
    if (!coachId || !createdById) {
      return err(validationError('Coach and creator IDs are required'));
    }
    if (athleteIds.length === 0) {
      return err(validationError('At least one athlete must be specified'));
    }
    if (!apiClient.isMockMode) {
      const apiResult = await bookingAuthorityService.createBookingSeries({
        coachId,
        athleteIds,
        bookedById: createdById,
        selectedWeeks,
        startTime,
        duration,
        location,
        sessionType,
        focus,
        notes,
        pricePerSession,
        patternLabel,
      });
      if (!apiResult.success) {
        return err(apiResult.error);
      }
      const series = mapApiSeriesToBookingSeries(apiResult.data.series, {
        createdById,
        createdByName,
        coachId,
        coachName,
        athleteIds,
        athleteNames,
        sessionType,
        focus,
        pricePerSession,
        selectedWeeks,
        patternLabel,
        location,
        sessionInviteId,
      });
      emitTyped(ServiceEvents.SERIES_CREATED, {
        seriesId: series.id,
        coachId,
        coachName,
        createdById,
        bookingIds: series.bookingIds,
        weekCount: series.bookingIds.length,
        totalCost: series.totalCost,
        location,
      });
      logger.info('Series created via API authority', {
        seriesId: series.id,
        weekCount: series.bookingIds.length,
        totalCost: series.totalCost,
      });
      return ok(series);
    }
    const seriesId = apiClient.generateId('series');
    const totalCost = (pricePerSession ?? 0) * selectedWeeks.length;

    // Create individual bookings for each week
    const bookingsToCreate = selectedWeeks.map((weekDate, i) => {
      const scheduledAt = `${weekDate}T${startTime}:00`;
      const booking: Booking = {
        id: apiClient.generateId('booking'),
        coachId,
        coachName,
        athleteIds,
        athleteId: athleteIds[0],
        bookedById: createdById,
        scheduledAt,
        status: 'CONFIRMED',
        duration,
        location,
        service: sessionType,
        serviceType: sessionType,
        ...(sessionSource
          ? {
              sessionSource,
            }
          : {}),
        ...(sessionSourceEntityId
          ? {
              sessionSourceEntityId,
            }
          : {}),
        ...(clubId
          ? {
              clubId,
            }
          : {}),
        ...(actingAs
          ? {
              actingAs,
            }
          : {}),
        ...(ownerCoachId
          ? {
              ownerCoachId,
            }
          : {}),
        ...(assigneeCoachId
          ? {
              assigneeCoachId,
            }
          : {}),
        ...(createdByUserId
          ? {
              createdByUserId,
            }
          : {}),
        ...(createdByRole
          ? {
              createdByRole,
            }
          : {}),
        objectives: focus ? [focus] : [],
        price: pricePerSession ?? 0,
        notes: notes ?? '',
        createdAt: new Date().toISOString(),
        isSharedSession: athleteIds.length > 1,
        sessionInviteId,
        seriesId,
        seriesIndex: i,
      };
      return { booking, weekDate, weekNumber: i + 1 };
    });
    const saveResults = await Promise.all(
      bookingsToCreate.map(({ booking }) => bookingCrudService.saveBookingDirect(booking)),
    );
    const failedSaveIndex = saveResults.findIndex((result) => !result.success);
    if (failedSaveIndex >= 0) {
      const failedSave = saveResults[failedSaveIndex];
      const failedBooking = bookingsToCreate[failedSaveIndex];
      if (!failedSave.success) {
        logger.error(
          `Failed to create booking ${failedBooking.weekNumber}/${selectedWeeks.length}`,
          failedSave.error,
        );
        return err(storageError(`Failed to create booking for week ${failedBooking.weekDate}`));
      }
    }
    const bookingIds = bookingsToCreate.map(({ booking }) => booking.id);

    // Create the series record
    const series: BookingSeries = {
      id: seriesId,
      bookingIds,
      createdById,
      createdByName,
      coachId,
      coachName,
      athleteIds,
      athleteNames,
      sessionType,
      focus,
      pricePerSession,
      selectedWeeks,
      totalCost,
      patternLabel,
      location,
      sessionInviteId,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
    };
    try {
      const allSeries = await this.loadFromMockState();
      allSeries.push(series);
      await this.saveToMockState(allSeries);

      // Emit series created event
      emitTyped(ServiceEvents.SERIES_CREATED, {
        seriesId: series.id,
        coachId,
        coachName,
        createdById,
        bookingIds,
        weekCount: selectedWeeks.length,
        totalCost,
        location,
      });
      logger.info('Series created', {
        seriesId: series.id,
        weekCount: selectedWeeks.length,
        totalCost,
      });
      return ok(series);
    } catch (error) {
      logger.error('Failed to save booking series', error);
      return err(storageError('Failed to save booking series'));
    }
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /**
   * Get a series by ID.
   */
  async getSeriesById(id: string): Promise<Result<BookingSeries, ServiceError>> {
    try {
      if (!apiClient.isMockMode) {
        const apiResult = await bookingAuthorityService.getBookingSeries(id);
        if (!apiResult.success) {
          return err(apiResult.error);
        }
        return ok(mapApiSeriesToBookingSeries(apiResult.data));
      }
      const cache = await this.getCache();
      const series = cache.get(id);
      if (!series) {
        return err(notFound('BookingSeries', id));
      }
      return ok(series);
    } catch (error) {
      logger.error('Failed to get series by id', error);
      return err(storageError('Failed to retrieve booking series'));
    }
  }

  /**
   * Get all series for a user (as creator).
   */
  async getSeriesForUser(userId: string): Promise<Result<BookingSeries[], ServiceError>> {
    try {
      if (!apiClient.isMockMode) {
        const apiResult = await bookingAuthorityService.listBookingSeries();
        if (!apiResult.success) {
          return err(apiResult.error);
        }
        return ok(
          apiResult.data.flatMap((series) =>
            series.bookedByUserId === userId ? [mapApiSeriesToBookingSeries(series)] : [],
          ),
        );
      }
      const cache = await this.getCache();
      const results = Array.from(cache.values()).filter((s) => s.createdById === userId);
      return ok(results);
    } catch (error) {
      logger.error('Failed to get series for user', error);
      return err(storageError('Failed to retrieve user series'));
    }
  }

  /**
   * Get all series for a coach.
   */
  async getSeriesForCoach(coachId: string): Promise<Result<BookingSeries[], ServiceError>> {
    try {
      if (!apiClient.isMockMode) {
        const apiResult = await bookingAuthorityService.listBookingSeries();
        if (!apiResult.success) {
          return err(apiResult.error);
        }
        return ok(
          apiResult.data.flatMap((series) =>
            series.coachUserId === coachId ? [mapApiSeriesToBookingSeries(series)] : [],
          ),
        );
      }
      const cache = await this.getCache();
      const results = Array.from(cache.values()).filter((s) => s.coachId === coachId);
      return ok(results);
    } catch (error) {
      logger.error('Failed to get series for coach', error);
      return err(storageError('Failed to retrieve coach series'));
    }
  }

  // ---------------------------------------------------------------------------
  // Update / Cancel
  // ---------------------------------------------------------------------------

  /**
   * Cancel an entire series, cancelling all associated bookings.
   */
  async cancelSeries(
    seriesId: string,
    reason?: string,
  ): Promise<Result<BookingSeries, ServiceError>> {
    if (!apiClient.isMockMode) {
      const apiResult = await bookingAuthorityService.cancelBookingSeries(seriesId, {
        reason: reason ?? 'Series cancelled',
      });
      if (!apiResult.success) {
        return err(apiResult.error);
      }
      const series = mapApiSeriesToBookingSeries(apiResult.data.series);
      emitTyped(ServiceEvents.SERIES_UPDATED, {
        seriesId,
        status: series.status,
        changes: {
          reason,
        },
      });
      return ok(series);
    }
    const allSeries = await this.loadFromMockState();
    const index = allSeries.findIndex((s) => s.id === seriesId);
    if (index === -1) {
      return err(notFound('BookingSeries', seriesId));
    }
    const series = allSeries[index];

    // Cancel each individual booking
    const cancellationResults = await Promise.all(
      series.bookingIds.map(async (bookingId) => ({
        bookingId,
        booking: await bookingCrudService.cancel(
          bookingId,
          reason ?? 'Series cancelled',
          'parent',
          {
            allowPastBooking: true,
          },
        ),
      })),
    );
    const failedCancellation = cancellationResults.find((result) => !result.booking);
    if (failedCancellation) {
      logger.error('Failed to cancel booking in series', {
        bookingId: failedCancellation.bookingId,
        seriesId,
        reason,
      });
      return err(
        storageError(`Failed to cancel booking ${failedCancellation.bookingId} in series`),
      );
    }

    // Update series status
    const updatedSeries: BookingSeries = {
      ...series,
      status: 'CANCELLED',
    };
    allSeries[index] = updatedSeries;
    await this.saveToMockState(allSeries);

    // Emit series updated event
    emitTyped(ServiceEvents.SERIES_UPDATED, {
      seriesId,
      status: 'CANCELLED',
      changes: {
        reason,
      },
    });
    logger.info('Series cancelled', {
      seriesId,
      reason,
    });
    return ok(updatedSeries);
  }

  /**
   * Update series status (e.g. when a booking completes or cancels individually).
   */
  async updateSeriesStatus(seriesId: string): Promise<Result<BookingSeries, ServiceError>> {
    if (!apiClient.isMockMode) {
      return this.getSeriesById(seriesId);
    }
    const allSeries = await this.loadFromMockState();
    const index = allSeries.findIndex((s) => s.id === seriesId);
    if (index === -1) {
      return err(notFound('BookingSeries', seriesId));
    }
    const series = allSeries[index];

    // Check status of all bookings in the series
    const bookings = await Promise.all(
      series.bookingIds.map((bookingId) => bookingCrudService.getBooking(bookingId)),
    );
    const completedCount = bookings.filter((booking) => booking?.status === 'COMPLETED').length;
    const cancelledCount = bookings.filter((booking) => booking?.status === 'CANCELLED').length;
    const totalBookings = series.bookingIds.length;
    let newStatus: BookingSeries['status'] = series.status;
    if (cancelledCount === totalBookings) {
      newStatus = 'CANCELLED';
    } else if (completedCount === totalBookings) {
      newStatus = 'COMPLETED';
    } else if (completedCount > 0 || cancelledCount > 0) {
      newStatus = 'PARTIAL';
    }
    if (newStatus !== series.status) {
      const updatedSeries: BookingSeries = {
        ...series,
        status: newStatus,
      };
      allSeries[index] = updatedSeries;
      await this.saveToMockState(allSeries);
      emitTyped(ServiceEvents.SERIES_UPDATED, {
        seriesId,
        status: newStatus,
        changes: {
          completedCount,
          cancelledCount,
        },
      });
      return ok(updatedSeries);
    }
    return ok(series);
  }
}
export const multiWeekBookingService = new MultiWeekBookingService();
