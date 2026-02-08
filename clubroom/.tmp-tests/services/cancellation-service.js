"use strict";
/**
 * Cancellation Service
 *
 * Handles booking cancellation records, no-show tracking, and policy retrieval.
 * Works alongside scheduling-rules-service for refund calculations.
 *
 * USER STORY:
 * "As a coach, I want to track cancellations and no-shows so I can
 * identify patterns and adjust my policies accordingly."
 *
 * "As a parent, I want a clear cancellation process that tells me
 * my refund amount before I confirm."
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancellationService = void 0;
const api_client_1 = require("./api-client");
const scheduling_rules_service_1 = require("@/services/scheduling-rules-service");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("@/services/event-bus");
const result_1 = require("@/types/result");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('CancellationService');
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function loadRecords() {
    try {
        return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CANCELLATION_RECORDS, []);
    }
    catch (error) {
        logger.error('Failed to load cancellation records', error);
        return [];
    }
}
async function saveRecords(records) {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CANCELLATION_RECORDS, records);
}
async function loadNoShowCounts() {
    try {
        return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.NO_SHOW_COUNTS, {});
    }
    catch (error) {
        logger.error('Failed to load no-show counts', error);
        return {};
    }
}
async function loadNoShowRecords() {
    try {
        return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.NO_SHOW_RECORDS, []);
    }
    catch (error) {
        logger.error('Failed to load no-show records', error);
        return [];
    }
}
async function saveNoShowRecords(records) {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NO_SHOW_RECORDS, records);
}
async function saveNoShowCounts(counts) {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NO_SHOW_COUNTS, counts);
}
// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
exports.cancellationService = {
    /**
     * Get the cancellation policy for a coach.
     * Delegates to schedulingRulesService.
     */
    async getCancellationPolicy(coachId) {
        try {
            return await scheduling_rules_service_1.schedulingRulesService.getCancellationPolicy(coachId);
        }
        catch (error) {
            logger.error('Failed to get cancellation policy', error);
            return null;
        }
    },
    /**
     * Save / update a cancellation policy for a coach.
     * Stores under STORAGE_KEYS.CANCELLATION_POLICIES via schedulingRulesService.
     */
    async saveCancellationPolicy(coachId, policy) {
        try {
            await scheduling_rules_service_1.schedulingRulesService.setCancellationPolicy(coachId, policy.preset, policy.customTiers);
            logger.debug('Cancellation policy saved', { coachId, preset: policy.preset });
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to save cancellation policy', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to save cancellation policy'));
        }
    },
    /**
     * Cancel a booking and record the cancellation.
     */
    async cancelBooking(bookingId, cancelledBy, details) {
        const records = await loadRecords();
        const record = {
            id: `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            bookingId,
            cancelledBy: cancelledBy,
            cancelledAt: new Date().toISOString(),
            reason: details.reason,
            reasonCategory: details.reason,
            note: details.note ?? '',
            refundAmount: details.refundCalculation?.netRefundAmount ?? 0,
            refundPercentage: details.refundCalculation?.refundPercentage ?? 0,
            hoursBeforeSession: details.refundCalculation?.hoursUntilSession ?? 0,
            coachId: details.coachId ?? '',
            familyId: details.familyId,
        };
        records.push(record);
        await saveRecords(records);
        logger.info('Booking cancelled', {
            bookingId,
            cancelledBy,
            reason: details.reason,
            refundAmount: record.refundAmount,
        });
        return record;
    },
    /**
     * Get all cancellation records, optionally filtered by coachId.
     */
    async getCancellationRecords(coachId) {
        const records = await loadRecords();
        if (!coachId)
            return records;
        return records.filter((r) => r.coachId === coachId);
    },
    /**
     * Get a single cancellation record by booking ID.
     */
    async getCancellationByBooking(bookingId) {
        const records = await loadRecords();
        return records.find((r) => r.bookingId === bookingId) ?? null;
    },
    /**
     * Get the no-show count for a family.
     */
    async getNoShowCount(familyId) {
        const counts = await loadNoShowCounts();
        return counts[familyId] ?? 0;
    },
    /**
     * Increment the no-show counter for a family.
     */
    async incrementNoShow(familyId) {
        const counts = await loadNoShowCounts();
        counts[familyId] = (counts[familyId] ?? 0) + 1;
        await saveNoShowCounts(counts);
        logger.warn('No-show recorded', { familyId, total: counts[familyId] });
    },
    /**
     * Reset no-show count for a family (e.g. after a grace period).
     */
    async resetNoShowCount(familyId) {
        const counts = await loadNoShowCounts();
        delete counts[familyId];
        await saveNoShowCounts(counts);
        logger.info('No-show count reset', { familyId });
    },
    /**
     * Get the default cancellation tiers for a preset policy.
     * Used when a coach is setting up their policy for the first time.
     */
    getDefaultPolicy(preset) {
        switch (preset) {
            case 'flexible':
                return [
                    { minHoursBefore: 0, maxHoursBefore: 2, refundPercent: 50, label: 'Less than 2 hours' },
                    { minHoursBefore: 2, maxHoursBefore: 12, refundPercent: 75, label: '2-12 hours before' },
                    { minHoursBefore: 12, maxHoursBefore: null, refundPercent: 100, label: '12+ hours before' },
                ];
            case 'standard':
                return [
                    { minHoursBefore: 0, maxHoursBefore: 4, refundPercent: 0, label: 'Less than 4 hours' },
                    { minHoursBefore: 4, maxHoursBefore: 24, refundPercent: 50, label: '4-24 hours before' },
                    { minHoursBefore: 24, maxHoursBefore: null, refundPercent: 100, label: '24+ hours before' },
                ];
            case 'strict':
                return [
                    { minHoursBefore: 0, maxHoursBefore: 24, refundPercent: 0, label: 'Less than 24 hours' },
                    { minHoursBefore: 24, maxHoursBefore: 48, refundPercent: 50, label: '24-48 hours before' },
                    { minHoursBefore: 48, maxHoursBefore: null, refundPercent: 100, label: '48+ hours before' },
                ];
            default:
                return this.getDefaultPolicy('standard');
        }
    },
    /**
     * Determine which cancellation tier applies given how many hours remain.
     * Returns null if no tier matches (shouldn't happen with well-formed tiers).
     */
    getPolicyTier(policy, hoursUntilSession) {
        for (const tier of policy.tiers) {
            const matchesMin = hoursUntilSession >= tier.minHoursBefore;
            const matchesMax = tier.maxHoursBefore === null || hoursUntilSession < tier.maxHoursBefore;
            if (matchesMin && matchesMax) {
                return tier;
            }
        }
        return null;
    },
    /**
     * Get cancellation stats for a coach (for analytics).
     */
    async getCancellationStats(coachId) {
        const records = await loadRecords();
        const coachRecords = records.filter((r) => r.coachId === coachId);
        const byCoach = coachRecords.filter((r) => r.cancelledBy === 'coach').length;
        const byParent = coachRecords.filter((r) => r.cancelledBy === 'parent').length;
        // Count reasons
        const reasonCounts = {};
        for (const r of coachRecords) {
            reasonCounts[r.reasonCategory] = (reasonCounts[r.reasonCategory] ?? 0) + 1;
        }
        const topReasons = Object.entries(reasonCounts)
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        const avgHours = coachRecords.length > 0
            ? coachRecords.reduce((sum, r) => sum + r.hoursBeforeSession, 0) / coachRecords.length
            : 0;
        return {
            totalCancellations: coachRecords.length,
            byCoach,
            byParent,
            topReasons,
            avgHoursBeforeSession: Math.round(avgHours * 10) / 10,
        };
    },
    // ---------------------------------------------------------------------------
    // No-Show Record Methods
    // ---------------------------------------------------------------------------
    /**
     * Record a no-show with a structured category.
     * Persists a full NoShowRecord, increments the family counter, and emits an event.
     */
    async recordNoShow(params) {
        const record = {
            id: `noshow_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            bookingId: params.bookingId,
            coachId: params.coachId,
            familyId: params.familyId,
            athleteId: params.athleteId,
            athleteName: params.athleteName,
            category: params.category,
            note: params.note,
            sessionDate: params.sessionDate,
            markedAt: new Date().toISOString(),
        };
        try {
            const records = await loadNoShowRecords();
            records.push(record);
            await saveNoShowRecords(records);
            // Increment the family-level counter
            await this.incrementNoShow(params.familyId);
            // Emit event
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.NO_SHOW_RECORDED, {
                bookingId: params.bookingId,
                coachId: params.coachId,
                familyId: params.familyId,
                category: params.category,
            });
            logger.info('No-show recorded', {
                bookingId: params.bookingId,
                athleteName: params.athleteName,
                category: params.category,
            });
            return (0, result_1.ok)(record);
        }
        catch (error) {
            logger.error('Failed to record no-show', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to record no-show'));
        }
    },
    /**
     * Get all no-show records for a coach.
     */
    async getNoShowRecords(coachId) {
        const records = await loadNoShowRecords();
        return records.filter((r) => r.coachId === coachId);
    },
    /**
     * Get all no-show records for a family.
     */
    async getNoShowRecordsForFamily(familyId) {
        const records = await loadNoShowRecords();
        return records.filter((r) => r.familyId === familyId);
    },
};
