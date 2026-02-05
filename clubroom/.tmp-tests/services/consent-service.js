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
            const emergencyInfo = await safety_service_1.safetyService.getEmergencyInfo(athleteId);
            // Get athlete name from roster if coachId provided
            let athleteName = 'Unknown';
            let parentName = 'Unknown';
            let athletePhotoUrl;
            if (coachId) {
                const roster = await roster_service_1.rosterService.getRoster(coachId);
                const entry = roster.find((r) => r.athleteId === athleteId);
                if (entry) {
                    athleteName = entry.athleteName;
                    parentName = entry.parentName;
                    athletePhotoUrl = entry.athletePhotoUrl;
                }
            }
            return {
                athleteId,
                athleteName,
                athletePhotoUrl,
                parentName,
                consents: emergencyInfo.consents,
                lastUpdated: emergencyInfo.updatedAt,
            };
        }
        catch {
            return null;
        }
    }
    /**
     * Get all athletes' consent status for a coach's roster
     */
    async getRosterConsents(coachId, filters) {
        // Get all athletes from roster
        const roster = await roster_service_1.rosterService.getRoster(coachId);
        // Get consent data for each athlete
        const consentsPromises = roster.map(async (entry) => {
            try {
                const emergencyInfo = await safety_service_1.safetyService.getEmergencyInfo(entry.athleteId);
                return {
                    athleteId: entry.athleteId,
                    athleteName: entry.athleteName,
                    athletePhotoUrl: entry.athletePhotoUrl,
                    parentName: entry.parentName,
                    consents: emergencyInfo.consents,
                    lastUpdated: emergencyInfo.updatedAt,
                };
            }
            catch {
                // Return default consents if no emergency info exists
                return {
                    athleteId: entry.athleteId,
                    athleteName: entry.athleteName,
                    athletePhotoUrl: entry.athletePhotoUrl,
                    parentName: entry.parentName,
                    consents: CONSENT_TYPES.map((type) => ({
                        type,
                        granted: false,
                        grantedBy: '',
                    })),
                    lastUpdated: new Date().toISOString(),
                };
            }
        });
        let athleteConsents = await Promise.all(consentsPromises);
        // Apply filters
        if (filters?.search) {
            const search = filters.search.toLowerCase();
            athleteConsents = athleteConsents.filter((ac) => ac.athleteName.toLowerCase().includes(search) ||
                ac.parentName.toLowerCase().includes(search));
        }
        if (filters?.type && filters?.status && filters.status !== 'all') {
            const isGranted = filters.status === 'granted';
            athleteConsents = athleteConsents.filter((ac) => {
                const consent = ac.consents.find((c) => c.type === filters.type);
                return consent?.granted === isGranted;
            });
        }
        return athleteConsents;
    }
    /**
     * Check if an athlete has a specific consent
     */
    async checkConsent(athleteId, type) {
        const consent = await safety_service_1.safetyService.getConsent(athleteId, type);
        return consent?.granted ?? false;
    }
    /**
     * Get all athletes who have granted a specific consent type
     */
    async getConsentedAthletes(coachId, type) {
        const allConsents = await this.getRosterConsents(coachId);
        return allConsents.filter((ac) => {
            const consent = ac.consents.find((c) => c.type === type);
            return consent?.granted === true;
        });
    }
    /**
     * Get all athletes who have NOT granted a specific consent type
     */
    async getNonConsentedAthletes(coachId, type) {
        const allConsents = await this.getRosterConsents(coachId);
        return allConsents.filter((ac) => {
            const consent = ac.consents.find((c) => c.type === type);
            return consent?.granted === false;
        });
    }
    /**
     * Get consent summary/statistics for a coach's roster
     */
    async getConsentSummary(coachId) {
        const allConsents = await this.getRosterConsents(coachId);
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
        return {
            totalAthletes,
            byType,
        };
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
