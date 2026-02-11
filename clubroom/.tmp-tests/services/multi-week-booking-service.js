"use strict";
/**
 * Multi-Week Booking Service
 *
 * Manages BookingSeries — groups of bookings created together when a parent
 * books multiple weeks at once. Coordinates with BookingCrudService for
 * individual booking creation and stores series metadata for grouping.
 *
 * Follows the same cache + Result<T> patterns as other services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.multiWeekBookingService = void 0;
const api_client_1 = require("./api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("@/services/event-bus");
const result_1 = require("@/types/result");
const booking_crud_service_1 = require("./booking/booking-crud-service");
const logger = (0, logger_1.createLogger)('MultiWeekBookingService');
/** Maximum age (ms) before cache is considered stale. */
const CACHE_MAX_AGE = 30000;
class MultiWeekBookingService {
    constructor() {
        // ---------------------------------------------------------------------------
        // In-memory cache (mirrors BaseService pattern)
        // ---------------------------------------------------------------------------
        this._cache = null;
        this._cacheTimestamp = 0;
    }
    async getCache() {
        const now = Date.now();
        if (this._cache === null || now - this._cacheTimestamp > CACHE_MAX_AGE) {
            const data = await this.loadFromStorage();
            this._cache = new Map(data.map((item) => [item.id, item]));
            this._cacheTimestamp = now;
        }
        return this._cache;
    }
    invalidateCache() {
        this._cache = null;
        this._cacheTimestamp = 0;
    }
    async loadFromStorage() {
        try {
            return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKING_SERIES, []);
        }
        catch (error) {
            logger.error('Failed to load booking series from storage', error);
            return [];
        }
    }
    async saveToStorage(series) {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKING_SERIES, series);
        this.invalidateCache();
    }
    // ---------------------------------------------------------------------------
    // Create
    // ---------------------------------------------------------------------------
    /**
     * Create a multi-week booking series.
     * Creates N individual bookings and a BookingSeries record linking them.
     */
    async createSeries(params) {
        const { createdById, createdByName, coachId, coachName, athleteIds, athleteNames, sessionType, focus, pricePerSession, selectedWeeks, startTime, duration, location, patternLabel, sessionInviteId, notes, } = params;
        // Validate
        if (selectedWeeks.length === 0) {
            return (0, result_1.err)((0, result_1.validationError)('At least one week must be selected'));
        }
        if (!coachId || !createdById) {
            return (0, result_1.err)((0, result_1.validationError)('Coach and creator IDs are required'));
        }
        if (athleteIds.length === 0) {
            return (0, result_1.err)((0, result_1.validationError)('At least one athlete must be specified'));
        }
        const seriesId = api_client_1.apiClient.generateId('series');
        const totalCost = (pricePerSession ?? 0) * selectedWeeks.length;
        const bookingIds = [];
        // Create individual bookings for each week
        for (let i = 0; i < selectedWeeks.length; i++) {
            const weekDate = selectedWeeks[i];
            const scheduledAt = `${weekDate}T${startTime}:00`;
            const booking = {
                id: api_client_1.apiClient.generateId('booking'),
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
                objectives: focus ? [focus] : [],
                price: pricePerSession ?? 0,
                notes: notes ?? '',
                createdAt: new Date().toISOString(),
                isSharedSession: athleteIds.length > 1,
                sessionInviteId,
                seriesId,
                seriesIndex: i,
            };
            const saveResult = await booking_crud_service_1.bookingCrudService.saveBookingDirect(booking);
            if (!saveResult.success) {
                logger.error(`Failed to create booking ${i + 1}/${selectedWeeks.length}`, saveResult.error);
                return (0, result_1.err)((0, result_1.storageError)(`Failed to create booking for week ${weekDate}`));
            }
            bookingIds.push(booking.id);
        }
        // Create the series record
        const series = {
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
            const allSeries = await this.loadFromStorage();
            allSeries.push(series);
            await this.saveToStorage(allSeries);
            // Emit series created event
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SERIES_CREATED, {
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
            return (0, result_1.ok)(series);
        }
        catch (error) {
            logger.error('Failed to save booking series', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to save booking series'));
        }
    }
    // ---------------------------------------------------------------------------
    // Read
    // ---------------------------------------------------------------------------
    /**
     * Get a series by ID.
     */
    async getSeriesById(id) {
        try {
            const cache = await this.getCache();
            const series = cache.get(id);
            if (!series) {
                return (0, result_1.err)((0, result_1.notFound)('BookingSeries', id));
            }
            return (0, result_1.ok)(series);
        }
        catch (error) {
            logger.error('Failed to get series by id', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to retrieve booking series'));
        }
    }
    /**
     * Get all series for a user (as creator).
     */
    async getSeriesForUser(userId) {
        try {
            const cache = await this.getCache();
            const results = Array.from(cache.values()).filter((s) => s.createdById === userId);
            return (0, result_1.ok)(results);
        }
        catch (error) {
            logger.error('Failed to get series for user', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to retrieve user series'));
        }
    }
    /**
     * Get all series for a coach.
     */
    async getSeriesForCoach(coachId) {
        try {
            const cache = await this.getCache();
            const results = Array.from(cache.values()).filter((s) => s.coachId === coachId);
            return (0, result_1.ok)(results);
        }
        catch (error) {
            logger.error('Failed to get series for coach', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to retrieve coach series'));
        }
    }
    // ---------------------------------------------------------------------------
    // Update / Cancel
    // ---------------------------------------------------------------------------
    /**
     * Cancel an entire series, cancelling all associated bookings.
     */
    async cancelSeries(seriesId, reason) {
        const allSeries = await this.loadFromStorage();
        const index = allSeries.findIndex((s) => s.id === seriesId);
        if (index === -1) {
            return (0, result_1.err)((0, result_1.notFound)('BookingSeries', seriesId));
        }
        const series = allSeries[index];
        // Cancel each individual booking
        for (const bookingId of series.bookingIds) {
            try {
                await booking_crud_service_1.bookingCrudService.cancel(bookingId, reason ?? 'Series cancelled');
            }
            catch (error) {
                logger.error(`Failed to cancel booking ${bookingId} in series`, error);
            }
        }
        // Update series status
        const updatedSeries = {
            ...series,
            status: 'CANCELLED',
        };
        allSeries[index] = updatedSeries;
        await this.saveToStorage(allSeries);
        // Emit series updated event
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SERIES_UPDATED, {
            seriesId,
            status: 'CANCELLED',
            changes: { reason },
        });
        logger.info('Series cancelled', { seriesId, reason });
        return (0, result_1.ok)(updatedSeries);
    }
    /**
     * Update series status (e.g. when a booking completes or cancels individually).
     */
    async updateSeriesStatus(seriesId) {
        const allSeries = await this.loadFromStorage();
        const index = allSeries.findIndex((s) => s.id === seriesId);
        if (index === -1) {
            return (0, result_1.err)((0, result_1.notFound)('BookingSeries', seriesId));
        }
        const series = allSeries[index];
        // Check status of all bookings in the series
        let completedCount = 0;
        let cancelledCount = 0;
        for (const bookingId of series.bookingIds) {
            const booking = await booking_crud_service_1.bookingCrudService.getBooking(bookingId);
            if (booking?.status === 'COMPLETED')
                completedCount++;
            if (booking?.status === 'CANCELLED')
                cancelledCount++;
        }
        const totalBookings = series.bookingIds.length;
        let newStatus = series.status;
        if (cancelledCount === totalBookings) {
            newStatus = 'CANCELLED';
        }
        else if (completedCount === totalBookings) {
            newStatus = 'COMPLETED';
        }
        else if (completedCount > 0 || cancelledCount > 0) {
            newStatus = 'PARTIAL';
        }
        if (newStatus !== series.status) {
            const updatedSeries = { ...series, status: newStatus };
            allSeries[index] = updatedSeries;
            await this.saveToStorage(allSeries);
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SERIES_UPDATED, {
                seriesId,
                status: newStatus,
                changes: { completedCount, cancelledCount },
            });
            return (0, result_1.ok)(updatedSeries);
        }
        return (0, result_1.ok)(series);
    }
}
exports.multiWeekBookingService = new MultiWeekBookingService();
