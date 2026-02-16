"use strict";
/**
 * Sprint 7B - Trial Session Service
 *
 * Manages trial session offerings for coaches:
 * - CRUD operations for trial offerings
 * - Checks whether a family has already used their trial
 * - Tracks trial-to-regular booking conversions
 *
 * All data is persisted via apiClient (AsyncStorage in mock mode).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.trialService = void 0;
const api_client_1 = require("@/services/api-client");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('TrialService');
const storage_keys_1 = require("@/constants/storage-keys");
// ============================================================================
// Service
// ============================================================================
class TrialService {
    // --------------------------------------------------------------------------
    // Trial Offering CRUD
    // --------------------------------------------------------------------------
    /**
     * Get a coach's trial offering (if one exists).
     */
    async getTrialOffering(coachId) {
        logger.info('Getting trial offering', { coachId });
        const offerings = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.TRIAL_OFFERINGS, []);
        return offerings.find((o) => o.coachId === coachId) ?? null;
    }
    /**
     * Create or update a trial offering for a coach.
     */
    async upsertTrialOffering(coachId, input) {
        logger.info('Upserting trial offering', { coachId, enabled: input.enabled });
        const offerings = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.TRIAL_OFFERINGS, []);
        const existingIndex = offerings.findIndex((o) => o.coachId === coachId);
        const now = new Date().toISOString();
        let offering;
        if (existingIndex >= 0) {
            // Update existing
            offering = {
                ...offerings[existingIndex],
                ...input,
                updatedAt: now,
            };
            offerings[existingIndex] = offering;
        }
        else {
            // Create new
            offering = {
                id: api_client_1.apiClient.generateId('trial'),
                coachId,
                ...input,
                createdAt: now,
                updatedAt: now,
            };
            offerings.push(offering);
        }
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.TRIAL_OFFERINGS, offerings);
        logger.success('Trial offering saved', { id: offering.id });
        return offering;
    }
    /**
     * Delete a trial offering for a coach.
     */
    async deleteTrialOffering(coachId) {
        logger.info('Deleting trial offering', { coachId });
        const offerings = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.TRIAL_OFFERINGS, []);
        const filtered = offerings.filter((o) => o.coachId !== coachId);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.TRIAL_OFFERINGS, filtered);
        logger.success('Trial offering deleted', { coachId });
    }
    /**
     * Get all enabled trial offerings (for discovery).
     */
    async getActiveTrialOfferings() {
        logger.info('Getting active trial offerings');
        const offerings = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.TRIAL_OFFERINGS, []);
        return offerings.filter((o) => o.enabled);
    }
    // --------------------------------------------------------------------------
    // Trial Usage Tracking
    // --------------------------------------------------------------------------
    /**
     * Record that a family used a trial session with a specific coach.
     */
    async recordTrialUsage(coachId, parentId, bookingId, familyId) {
        logger.info('Recording trial usage', { coachId, parentId, bookingId });
        const usage = {
            id: api_client_1.apiClient.generateId('tu'),
            coachId,
            parentId,
            familyId,
            bookingId,
            usedAt: new Date().toISOString(),
        };
        const usages = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.TRIAL_USAGES, []);
        usages.push(usage);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.TRIAL_USAGES, usages);
        logger.success('Trial usage recorded', { id: usage.id });
        return usage;
    }
    /**
     * Check if a family/parent has already used a trial with a specific coach.
     * Returns the number of trials already used.
     */
    async getTrialUsageCount(coachId, parentId) {
        logger.info('Checking trial usage', { coachId, parentId });
        const usages = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.TRIAL_USAGES, []);
        return usages.filter((u) => u.coachId === coachId && u.parentId === parentId).length;
    }
    /**
     * Check if a family is eligible for a trial with a specific coach.
     * Takes the offering's limitPerFamily into account.
     */
    async isTrialEligible(coachId, parentId) {
        const offering = await this.getTrialOffering(coachId);
        if (!offering || !offering.enabled) {
            return false;
        }
        const usageCount = await this.getTrialUsageCount(coachId, parentId);
        return usageCount < offering.limitPerFamily;
    }
    /**
     * Get all trial usages for a coach (for analytics).
     */
    async getCoachTrialUsages(coachId) {
        const usages = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.TRIAL_USAGES, []);
        return usages.filter((u) => u.coachId === coachId);
    }
    // --------------------------------------------------------------------------
    // Trial Conversion Tracking
    // --------------------------------------------------------------------------
    /**
     * Record a trial-to-regular booking conversion.
     */
    async recordConversion(coachId, parentId, trialBookingId, regularBookingId) {
        logger.info('Recording trial conversion', {
            coachId,
            parentId,
            trialBookingId,
            regularBookingId,
        });
        const conversion = {
            id: api_client_1.apiClient.generateId('tc'),
            coachId,
            parentId,
            trialBookingId,
            regularBookingId,
            convertedAt: new Date().toISOString(),
        };
        const conversions = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.TRIAL_CONVERSIONS, []);
        conversions.push(conversion);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.TRIAL_CONVERSIONS, conversions);
        logger.success('Trial conversion recorded', { id: conversion.id });
        return conversion;
    }
    /**
     * Get conversion data for a coach.
     */
    async getCoachConversions(coachId) {
        const conversions = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.TRIAL_CONVERSIONS, []);
        return conversions.filter((c) => c.coachId === coachId);
    }
    /**
     * Get conversion rate for a coach (conversions / total trials).
     * Returns a number between 0 and 1.
     */
    async getConversionRate(coachId) {
        const [usages, conversions] = await Promise.all([
            this.getCoachTrialUsages(coachId),
            this.getCoachConversions(coachId),
        ]);
        if (usages.length === 0)
            return 0;
        return conversions.length / usages.length;
    }
    /**
     * Check if a specific trial booking has been converted to a regular booking.
     */
    async isTrialConverted(trialBookingId) {
        const conversions = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.TRIAL_CONVERSIONS, []);
        return conversions.some((c) => c.trialBookingId === trialBookingId);
    }
}
// ============================================================================
// Singleton Export
// ============================================================================
exports.trialService = new TrialService();
