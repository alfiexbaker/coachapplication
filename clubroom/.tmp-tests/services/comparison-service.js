"use strict";
/**
 * Comparison Service
 *
 * Provides functionality for comparing coaches side-by-side:
 * - Add/remove coaches to comparison list
 * - Get comparison data for selected coaches
 * - Persist comparison state across sessions
 * - Maximum 3 coaches for comparison
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparisonService = void 0;
const api_client_1 = require("./api-client");
const discover_service_1 = require("./discover-service");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('ComparisonService');
const MAX_COACHES = 3;
/**
 * Transform a CoachProfile to CoachComparison format
 */
function transformToComparison(coach) {
    const joinedDate = new Date(coach.joinedDate);
    const now = new Date();
    const yearsExperience = Math.max(0, Math.floor((now.getTime() - joinedDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
    // Calculate next availability and slots this week
    const nextAvailability = coach.nextAvailability;
    const nextSlotDate = nextAvailability ? new Date(nextAvailability) : null;
    const isThisWeek = nextSlotDate
        ? nextSlotDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000
        : false;
    return {
        coachId: coach.id,
        name: coach.fullName,
        avatar: coach.profilePhotoUrl,
        rating: coach.rating.average,
        reviewCount: coach.rating.reviewCount,
        price: {
            min: coach.priceRange.minUsd,
            max: coach.priceRange.maxUsd,
            currency: 'USD',
        },
        specialties: coach.footballFocuses,
        sessionTypes: coach.sessionFormats,
        availability: {
            nextSlot: nextAvailability,
            slotsThisWeek: isThisWeek ? Math.floor(Math.random() * 5) + 1 : 0, // Mock slots
        },
        totalSessions: coach.totalSessions,
        distanceMiles: coach.distanceMiles,
        languages: coach.languages?.map((l) => l.name) ?? ['English'],
        yearsExperience,
        badges: coach.badges.map((b) => ({
            label: b.label,
            tone: b.tone ?? 'default',
        })),
        shortBio: coach.shortBio,
    };
}
class ComparisonService {
    constructor() {
        this.selectedCoachIds = [];
        this.initialized = false;
    }
    /**
     * Initialize the service by loading persisted state
     */
    async initialize() {
        try {
            if (this.initialized)
                return (0, result_1.ok)(undefined);
            this.selectedCoachIds = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COMPARISON_SELECTED_COACHES, []);
            this.initialized = true;
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to initialize comparison service', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to initialize comparison service'));
        }
    }
    /**
     * Get comparison data for specific coach IDs
     */
    async getComparisonData(coachIds) {
        try {
            const comparisons = [];
            for (const coachId of coachIds) {
                const coachResult = await discover_service_1.discoverService.getCoachById(coachId);
                if (!coachResult.success) {
                    logger.warn('Failed to load coach for comparison', { coachId, error: coachResult.error });
                    continue;
                }
                if (coachResult.data) {
                    comparisons.push(transformToComparison(coachResult.data));
                }
            }
            return (0, result_1.ok)(comparisons);
        }
        catch (error) {
            logger.error('Failed to get comparison data', { coachIds, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to get comparison data'));
        }
    }
    /**
     * Add a coach to the comparison list
     */
    async addToComparison(coachId) {
        try {
            const initResult = await this.initialize();
            if (!initResult.success)
                return initResult;
            // Check if already in comparison
            if (this.selectedCoachIds.includes(coachId)) {
                return (0, result_1.ok)({
                    success: false,
                    message: 'Coach is already in your comparison list',
                    currentCount: this.selectedCoachIds.length,
                    maxCount: MAX_COACHES,
                });
            }
            // Check if max limit reached
            if (this.selectedCoachIds.length >= MAX_COACHES) {
                return (0, result_1.ok)({
                    success: false,
                    message: `Maximum ${MAX_COACHES} coaches can be compared at once`,
                    currentCount: this.selectedCoachIds.length,
                    maxCount: MAX_COACHES,
                });
            }
            // Verify coach exists
            const coachResult = await discover_service_1.discoverService.getCoachById(coachId);
            if (!coachResult.success) {
                return (0, result_1.err)(coachResult.error);
            }
            if (!coachResult.data) {
                return (0, result_1.ok)({
                    success: false,
                    message: 'Coach not found',
                    currentCount: this.selectedCoachIds.length,
                    maxCount: MAX_COACHES,
                });
            }
            // Add to comparison
            this.selectedCoachIds.push(coachId);
            await this.persistState();
            return (0, result_1.ok)({
                success: true,
                message: `${coachResult.data.fullName} added to comparison`,
                currentCount: this.selectedCoachIds.length,
                maxCount: MAX_COACHES,
            });
        }
        catch (error) {
            logger.error('Failed to add coach to comparison', { coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update comparison list'));
        }
    }
    /**
     * Remove a coach from the comparison list
     */
    async removeFromComparison(coachId) {
        try {
            const initResult = await this.initialize();
            if (!initResult.success)
                return initResult;
            this.selectedCoachIds = this.selectedCoachIds.filter((id) => id !== coachId);
            await this.persistState();
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to remove coach from comparison', { coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update comparison list'));
        }
    }
    /**
     * Get the current comparison list (coach IDs only)
     */
    async getComparisonList() {
        try {
            const initResult = await this.initialize();
            if (!initResult.success)
                return initResult;
            return (0, result_1.ok)([...this.selectedCoachIds]);
        }
        catch (error) {
            logger.error('Failed to get comparison list', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to load comparison list'));
        }
    }
    /**
     * Get full comparison state including coach data
     */
    async getComparisonState() {
        try {
            const initResult = await this.initialize();
            if (!initResult.success)
                return initResult;
            const coachesResult = await this.getComparisonData(this.selectedCoachIds);
            if (!coachesResult.success)
                return coachesResult;
            return (0, result_1.ok)({
                selectedCoachIds: [...this.selectedCoachIds],
                coaches: coachesResult.data,
                maxCoaches: MAX_COACHES,
                highlightCriteria: null,
            });
        }
        catch (error) {
            logger.error('Failed to get comparison state', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to load comparison state'));
        }
    }
    /**
     * Clear all coaches from comparison
     */
    async clearComparison() {
        try {
            this.selectedCoachIds = [];
            await this.persistState();
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to clear comparison', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to clear comparison list'));
        }
    }
    /**
     * Check if a coach is in the comparison list
     */
    async isInComparison(coachId) {
        try {
            const initResult = await this.initialize();
            if (!initResult.success)
                return initResult;
            return (0, result_1.ok)(this.selectedCoachIds.includes(coachId));
        }
        catch (error) {
            logger.error('Failed to check comparison membership', { coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to check comparison status'));
        }
    }
    /**
     * Get the count of coaches in comparison
     */
    async getComparisonCount() {
        try {
            const initResult = await this.initialize();
            if (!initResult.success)
                return initResult;
            return (0, result_1.ok)(this.selectedCoachIds.length);
        }
        catch (error) {
            logger.error('Failed to get comparison count', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to load comparison count'));
        }
    }
    /**
     * Check if comparison list can accept more coaches
     */
    async canAddMore() {
        try {
            const initResult = await this.initialize();
            if (!initResult.success)
                return initResult;
            return (0, result_1.ok)(this.selectedCoachIds.length < MAX_COACHES);
        }
        catch (error) {
            logger.error('Failed to check comparison capacity', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to check comparison capacity'));
        }
    }
    /**
     * Get the maximum number of coaches allowed
     */
    getMaxCoaches() {
        return MAX_COACHES;
    }
    /**
     * Determine the best value for a specific criteria across coaches
     */
    getBestValue(coaches, criteria) {
        if (coaches.length === 0)
            return null;
        switch (criteria) {
            case 'PRICE': {
                // Best price = lowest minimum price
                const best = coaches.reduce((prev, curr) => curr.price.min < prev.price.min ? curr : prev);
                return best.coachId;
            }
            case 'RATING': {
                // Best rating = highest rating
                const best = coaches.reduce((prev, curr) => curr.rating > prev.rating ? curr : prev);
                return best.coachId;
            }
            case 'EXPERIENCE': {
                // Best experience = most sessions
                const best = coaches.reduce((prev, curr) => curr.totalSessions > prev.totalSessions ? curr : prev);
                return best.coachId;
            }
            case 'AVAILABILITY': {
                // Best availability = soonest next slot
                const withSlots = coaches.filter((c) => c.availability.nextSlot);
                if (withSlots.length === 0)
                    return null;
                const best = withSlots.reduce((prev, curr) => {
                    const prevDate = prev.availability.nextSlot
                        ? new Date(prev.availability.nextSlot).getTime()
                        : Infinity;
                    const currDate = curr.availability.nextSlot
                        ? new Date(curr.availability.nextSlot).getTime()
                        : Infinity;
                    return currDate < prevDate ? curr : prev;
                });
                return best.coachId;
            }
            default:
                return null;
        }
    }
    /**
     * Persist current state to storage
     */
    async persistState() {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COMPARISON_SELECTED_COACHES, this.selectedCoachIds);
    }
    /**
     * Reset service state (for testing)
     */
    async reset() {
        try {
            this.selectedCoachIds = [];
            this.initialized = false;
            await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.COMPARISON_SELECTED_COACHES);
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to reset comparison service', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to reset comparison service'));
        }
    }
}
exports.comparisonService = new ComparisonService();
