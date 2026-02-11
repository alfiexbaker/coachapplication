"use strict";
/**
 * Consent Service
 *
 * Handles consent management for coaches to view athlete consent status.
 * Provides methods for fetching and filtering consent data across the roster.
 *
 * API Integration Notes:
 * - GET /api/coaches/:id/consents - Get all athlete consents
 * - GET /api/coaches/:id/consents/:athleteId - Get single athlete consent
 * - GET /api/coaches/:id/consents/filter?type=PHOTO - Filter by consent type
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.consentService = exports.CONSENT_TYPE_DESCRIPTIONS = exports.CONSENT_TYPE_ICONS = exports.CONSENT_TYPE_LABELS = void 0;
const safety_service_1 = require("./safety-service");
const roster_service_1 = require("./roster-service");
const user_service_1 = require("./user-service");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('ConsentService');
async function resolveUserName(userId, fallback = '') {
    const userResult = await user_service_1.userService.getUserById(userId);
    if (!userResult.success) {
        return fallback;
    }
    return userResult.data.name?.trim() || fallback;
}
const CONSENT_TYPES = ['PHOTO', 'VIDEO', 'SOCIAL_MEDIA', 'EMERGENCY_TREATMENT'];
/**
 * Labels for consent types
 */
exports.CONSENT_TYPE_LABELS = {
    PHOTO: 'Photo',
    VIDEO: 'Video',
    SOCIAL_MEDIA: 'Social Media',
    EMERGENCY_TREATMENT: 'Emergency Treatment',
};
/**
 * Icons for consent types (Ionicons names)
 */
exports.CONSENT_TYPE_ICONS = {
    PHOTO: 'camera-outline',
    VIDEO: 'videocam-outline',
    SOCIAL_MEDIA: 'share-social-outline',
    EMERGENCY_TREATMENT: 'medkit-outline',
};
/**
 * Descriptions for consent types
 */
exports.CONSENT_TYPE_DESCRIPTIONS = {
    PHOTO: 'Permission to take and use photos',
    VIDEO: 'Permission to record and use video',
    SOCIAL_MEDIA: 'Permission to share on social media',
    EMERGENCY_TREATMENT: 'Permission for emergency medical treatment',
};
class ConsentService {
    /**
     * Get consent status for a single athlete
     */
    async getAthleteConsents(athleteId, coachId) {
        try {
            const emergencyInfoResult = await safety_service_1.safetyService.getEmergencyInfo(athleteId);
            if (!emergencyInfoResult.success) {
                return (0, result_1.err)(emergencyInfoResult.error);
            }
            const emergencyInfo = emergencyInfoResult.data;
            if (coachId) {
                await roster_service_1.rosterService.getRoster(coachId);
            }
            return (0, result_1.ok)({
                athleteId,
                consents: emergencyInfo.consents,
                lastUpdated: emergencyInfo.updatedAt,
            });
        }
        catch (error) {
            logger.error('Failed to get athlete consents', { athleteId, coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load athlete consents'));
        }
    }
    /**
     * Get all athletes' consent status for a coach's roster
     */
    async getRosterConsents(coachId, filters) {
        try {
            // Get all athletes from roster
            const roster = await roster_service_1.rosterService.getRoster(coachId);
            // Get consent data for each athlete
            const consentsPromises = roster.map(async (entry) => {
                const emergencyInfoResult = await safety_service_1.safetyService.getEmergencyInfo(entry.athleteId);
                if (emergencyInfoResult.success) {
                    const emergencyInfo = emergencyInfoResult.data;
                    return {
                        athleteId: entry.athleteId,
                        consents: emergencyInfo.consents,
                        lastUpdated: emergencyInfo.updatedAt,
                    };
                }
                // Return default consents if no emergency info exists
                return {
                    athleteId: entry.athleteId,
                    consents: CONSENT_TYPES.map((type) => ({
                        type,
                        granted: false,
                        grantedBy: '',
                    })),
                    lastUpdated: new Date().toISOString(),
                };
            });
            let athleteConsents = await Promise.all(consentsPromises);
            // Apply filters
            if (filters?.search) {
                const search = filters.search.toLowerCase();
                const matchingAthleteIds = new Set();
                await Promise.all(roster.map(async (entry) => {
                    const [athleteName, parentName] = await Promise.all([
                        resolveUserName(entry.athleteId),
                        resolveUserName(entry.parentId),
                    ]);
                    const matches = entry.athleteId.toLowerCase().includes(search) ||
                        athleteName.toLowerCase().includes(search) ||
                        parentName.toLowerCase().includes(search);
                    if (matches) {
                        matchingAthleteIds.add(entry.athleteId);
                    }
                }));
                athleteConsents = athleteConsents.filter((ac) => matchingAthleteIds.has(ac.athleteId));
            }
            if (filters?.type && filters?.status && filters.status !== 'all') {
                const isGranted = filters.status === 'granted';
                athleteConsents = athleteConsents.filter((ac) => {
                    const consent = ac.consents.find((c) => c.type === filters.type);
                    return consent?.granted === isGranted;
                });
            }
            return (0, result_1.ok)(athleteConsents);
        }
        catch (error) {
            logger.error('Failed to get roster consents', { coachId, filters, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load roster consents'));
        }
    }
    /**
     * Check if an athlete has a specific consent
     */
    async checkConsent(athleteId, type) {
        try {
            const consentResult = await safety_service_1.safetyService.getConsent(athleteId, type);
            if (!consentResult.success) {
                return (0, result_1.err)(consentResult.error);
            }
            return (0, result_1.ok)(consentResult.data?.granted ?? false);
        }
        catch (error) {
            logger.error('Failed to check consent', { athleteId, type, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to check consent'));
        }
    }
    /**
     * Get all athletes who have granted a specific consent type
     */
    async getConsentedAthletes(coachId, type) {
        try {
            const allConsentsResult = await this.getRosterConsents(coachId);
            if (!allConsentsResult.success) {
                return allConsentsResult;
            }
            return (0, result_1.ok)(allConsentsResult.data.filter((ac) => {
                const consent = ac.consents.find((c) => c.type === type);
                return consent?.granted === true;
            }));
        }
        catch (error) {
            logger.error('Failed to get consented athletes', { coachId, type, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load consented athletes'));
        }
    }
    /**
     * Get all athletes who have NOT granted a specific consent type
     */
    async getNonConsentedAthletes(coachId, type) {
        try {
            const allConsentsResult = await this.getRosterConsents(coachId);
            if (!allConsentsResult.success) {
                return allConsentsResult;
            }
            return (0, result_1.ok)(allConsentsResult.data.filter((ac) => {
                const consent = ac.consents.find((c) => c.type === type);
                return consent?.granted === false;
            }));
        }
        catch (error) {
            logger.error('Failed to get non-consented athletes', { coachId, type, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load non-consented athletes'));
        }
    }
    /**
     * Get consent summary/statistics for a coach's roster
     */
    async getConsentSummary(coachId) {
        try {
            const allConsentsResult = await this.getRosterConsents(coachId);
            if (!allConsentsResult.success) {
                return allConsentsResult;
            }
            const allConsents = allConsentsResult.data;
            const totalAthletes = allConsents.length;
            const byType = {
                PHOTO: { granted: 0, denied: 0 },
                VIDEO: { granted: 0, denied: 0 },
                SOCIAL_MEDIA: { granted: 0, denied: 0 },
                EMERGENCY_TREATMENT: { granted: 0, denied: 0 },
            };
            for (const ac of allConsents) {
                for (const consent of ac.consents) {
                    if (consent.granted) {
                        byType[consent.type].granted++;
                    }
                    else {
                        byType[consent.type].denied++;
                    }
                }
            }
            return (0, result_1.ok)({
                totalAthletes,
                byType,
            });
        }
        catch (error) {
            logger.error('Failed to get consent summary', { coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load consent summary'));
        }
    }
    /**
     * Get the consent status for an athlete for a specific type
     */
    getConsentStatus(athleteConsent, type) {
        return athleteConsent.consents.find((c) => c.type === type);
    }
    /**
     * Check if all required consents are granted for content posting
     * (Photo OR Video) AND Social Media
     */
    hasContentPostingConsent(athleteConsent) {
        const photoConsent = this.getConsentStatus(athleteConsent, 'PHOTO');
        const videoConsent = this.getConsentStatus(athleteConsent, 'VIDEO');
        const socialConsent = this.getConsentStatus(athleteConsent, 'SOCIAL_MEDIA');
        const hasMediaConsent = photoConsent?.granted || videoConsent?.granted;
        const hasSocialConsent = socialConsent?.granted;
        return Boolean(hasMediaConsent && hasSocialConsent);
    }
    /**
     * Get all consent types
     */
    getConsentTypes() {
        return [...CONSENT_TYPES];
    }
    /**
     * Get label for a consent type
     */
    getConsentLabel(type) {
        return exports.CONSENT_TYPE_LABELS[type];
    }
    /**
     * Get icon name for a consent type
     */
    getConsentIcon(type) {
        return exports.CONSENT_TYPE_ICONS[type];
    }
    /**
     * Get description for a consent type
     */
    getConsentDescription(type) {
        return exports.CONSENT_TYPE_DESCRIPTIONS[type];
    }
    /**
     * Format consent granted date for display
     */
    formatConsentDate(consent) {
        if (!consent.grantedAt) {
            return 'Not granted';
        }
        return new Date(consent.grantedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }
    /**
     * Get consent count for an athlete (granted / total)
     */
    getConsentCount(athleteConsent) {
        const total = athleteConsent.consents.length;
        const granted = athleteConsent.consents.filter((c) => c.granted).length;
        return { granted, total };
    }
    /**
     * Get consent percentage for an athlete
     */
    getConsentPercentage(athleteConsent) {
        const { granted, total } = this.getConsentCount(athleteConsent);
        if (total === 0)
            return 0;
        return Math.round((granted / total) * 100);
    }
}
exports.consentService = new ConsentService();
