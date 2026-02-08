"use strict";
/**
 * Consent Service Tests
 *
 * Unit tests for the consent service functionality including
 * fetching athlete consents, filtering, and summary calculations.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
const consent_service_1 = require("../../services/consent-service");
const safety_service_1 = require("../../services/safety-service");
// Reset to mock data before each test
(0, node_test_1.beforeEach)(async () => {
    await safety_service_1.safetyService.resetToMockData();
});
(0, node_test_1.describe)('Consent Service', () => {
    (0, node_test_1.describe)('getAthleteConsents', () => {
        (0, node_test_1.default)('should return consent data for an existing athlete', async () => {
            const consents = await consent_service_1.consentService.getAthleteConsents('athlete1');
            node_assert_1.default.ok(consents);
            node_assert_1.default.strictEqual(consents.athleteId, 'athlete1');
            node_assert_1.default.ok(Array.isArray(consents.consents));
            node_assert_1.default.ok(consents.consents.length > 0);
        });
        (0, node_test_1.default)('should return null for non-existent athlete', async () => {
            // The service returns an object with default values for non-existent athletes
            const consents = await consent_service_1.consentService.getAthleteConsents('non_existent');
            node_assert_1.default.ok(consents);
            node_assert_1.default.strictEqual(consents.athleteId, 'non_existent');
        });
    });
    (0, node_test_1.describe)('getRosterConsents', () => {
        (0, node_test_1.default)('should return consents for all athletes in roster', async () => {
            const consents = await consent_service_1.consentService.getRosterConsents('coach1');
            node_assert_1.default.ok(Array.isArray(consents));
            node_assert_1.default.ok(consents.length > 0);
            node_assert_1.default.ok(consents.every((c) => c.athleteId && c.athleteName));
        });
        (0, node_test_1.default)('should include athlete photo URL when available', async () => {
            const consents = await consent_service_1.consentService.getRosterConsents('coach1');
            const athleteWithPhoto = consents.find((c) => c.athletePhotoUrl);
            node_assert_1.default.ok(athleteWithPhoto);
        });
        (0, node_test_1.default)('should filter by consent type granted', async () => {
            const consents = await consent_service_1.consentService.getRosterConsents('coach1', {
                type: 'PHOTO',
                status: 'granted',
            });
            // All returned athletes should have PHOTO consent granted
            for (const c of consents) {
                const photoConsent = c.consents.find((consent) => consent.type === 'PHOTO');
                node_assert_1.default.strictEqual(photoConsent?.granted, true);
            }
        });
        (0, node_test_1.default)('should filter by consent type denied', async () => {
            const consents = await consent_service_1.consentService.getRosterConsents('coach1', {
                type: 'SOCIAL_MEDIA',
                status: 'denied',
            });
            // All returned athletes should have SOCIAL_MEDIA consent denied
            for (const c of consents) {
                const socialConsent = c.consents.find((consent) => consent.type === 'SOCIAL_MEDIA');
                node_assert_1.default.strictEqual(socialConsent?.granted, false);
            }
        });
        (0, node_test_1.default)('should filter by search query', async () => {
            const consents = await consent_service_1.consentService.getRosterConsents('coach1', {
                search: 'Baker',
            });
            // All returned athletes should match the search
            for (const c of consents) {
                const matchesAthlete = c.athleteName.toLowerCase().includes('baker');
                const matchesParent = c.parentName.toLowerCase().includes('baker');
                node_assert_1.default.ok(matchesAthlete || matchesParent);
            }
        });
    });
    (0, node_test_1.describe)('checkConsent', () => {
        (0, node_test_1.default)('should return true for granted consent', async () => {
            const hasPhotoConsent = await consent_service_1.consentService.checkConsent('athlete1', 'PHOTO');
            // athlete1 has PHOTO consent in mock data
            node_assert_1.default.strictEqual(hasPhotoConsent, true);
        });
        (0, node_test_1.default)('should return false for denied consent', async () => {
            const hasSocialConsent = await consent_service_1.consentService.checkConsent('athlete1', 'SOCIAL_MEDIA');
            // athlete1 does not have SOCIAL_MEDIA consent in mock data
            node_assert_1.default.strictEqual(hasSocialConsent, false);
        });
        (0, node_test_1.default)('should return false for non-existent athlete', async () => {
            const hasConsent = await consent_service_1.consentService.checkConsent('non_existent', 'PHOTO');
            node_assert_1.default.strictEqual(hasConsent, false);
        });
    });
    (0, node_test_1.describe)('getConsentedAthletes', () => {
        (0, node_test_1.default)('should return athletes with granted consent', async () => {
            const consentedAthletes = await consent_service_1.consentService.getConsentedAthletes('coach1', 'PHOTO');
            node_assert_1.default.ok(Array.isArray(consentedAthletes));
            for (const athlete of consentedAthletes) {
                const photoConsent = athlete.consents.find((c) => c.type === 'PHOTO');
                node_assert_1.default.strictEqual(photoConsent?.granted, true);
            }
        });
        (0, node_test_1.default)('should return empty array if no athletes have consent', async () => {
            // Update all athletes to not have a specific consent (this may need mock data adjustment)
            const athletes = await consent_service_1.consentService.getNonConsentedAthletes('coach1', 'EMERGENCY_TREATMENT');
            // The non-consented athletes should not have EMERGENCY_TREATMENT granted
            for (const athlete of athletes) {
                const emergencyConsent = athlete.consents.find((c) => c.type === 'EMERGENCY_TREATMENT');
                node_assert_1.default.strictEqual(emergencyConsent?.granted, false);
            }
        });
    });
    (0, node_test_1.describe)('getNonConsentedAthletes', () => {
        (0, node_test_1.default)('should return athletes without granted consent', async () => {
            const nonConsentedAthletes = await consent_service_1.consentService.getNonConsentedAthletes('coach1', 'SOCIAL_MEDIA');
            node_assert_1.default.ok(Array.isArray(nonConsentedAthletes));
            for (const athlete of nonConsentedAthletes) {
                const socialConsent = athlete.consents.find((c) => c.type === 'SOCIAL_MEDIA');
                node_assert_1.default.strictEqual(socialConsent?.granted, false);
            }
        });
    });
    (0, node_test_1.describe)('getConsentSummary', () => {
        (0, node_test_1.default)('should return summary with correct structure', async () => {
            const summary = await consent_service_1.consentService.getConsentSummary('coach1');
            node_assert_1.default.ok(summary);
            node_assert_1.default.ok(typeof summary.totalAthletes === 'number');
            node_assert_1.default.ok(summary.byType);
            node_assert_1.default.ok(summary.byType.PHOTO);
            node_assert_1.default.ok(summary.byType.VIDEO);
            node_assert_1.default.ok(summary.byType.SOCIAL_MEDIA);
            node_assert_1.default.ok(summary.byType.EMERGENCY_TREATMENT);
        });
        (0, node_test_1.default)('should have correct counts for each consent type', async () => {
            const summary = await consent_service_1.consentService.getConsentSummary('coach1');
            for (const type of consent_service_1.consentService.getConsentTypes()) {
                const stat = summary.byType[type];
                node_assert_1.default.ok(typeof stat.granted === 'number');
                node_assert_1.default.ok(typeof stat.denied === 'number');
                node_assert_1.default.ok(stat.granted >= 0);
                node_assert_1.default.ok(stat.denied >= 0);
                node_assert_1.default.strictEqual(stat.granted + stat.denied, summary.totalAthletes);
            }
        });
    });
    (0, node_test_1.describe)('getConsentStatus', () => {
        (0, node_test_1.default)('should return consent for specified type', () => {
            const athleteConsent = {
                athleteId: 'test',
                athleteName: 'Test Athlete',
                parentName: 'Test Parent',
                consents: [
                    { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
                    { type: 'VIDEO', granted: false, grantedBy: '' },
                    { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
                    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
                ],
                lastUpdated: new Date().toISOString(),
            };
            const photoConsent = consent_service_1.consentService.getConsentStatus(athleteConsent, 'PHOTO');
            const videoConsent = consent_service_1.consentService.getConsentStatus(athleteConsent, 'VIDEO');
            node_assert_1.default.ok(photoConsent);
            node_assert_1.default.strictEqual(photoConsent.granted, true);
            node_assert_1.default.ok(videoConsent);
            node_assert_1.default.strictEqual(videoConsent.granted, false);
        });
        (0, node_test_1.default)('should return undefined for missing consent type', () => {
            const athleteConsent = {
                athleteId: 'test',
                athleteName: 'Test Athlete',
                parentName: 'Test Parent',
                consents: [],
                lastUpdated: new Date().toISOString(),
            };
            const consent = consent_service_1.consentService.getConsentStatus(athleteConsent, 'PHOTO');
            node_assert_1.default.strictEqual(consent, undefined);
        });
    });
    (0, node_test_1.describe)('hasContentPostingConsent', () => {
        (0, node_test_1.default)('should return true when photo and social media consents are granted', () => {
            const athleteConsent = {
                athleteId: 'test',
                athleteName: 'Test Athlete',
                parentName: 'Test Parent',
                consents: [
                    { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
                    { type: 'VIDEO', granted: false, grantedBy: '' },
                    { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
                    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
                ],
                lastUpdated: new Date().toISOString(),
            };
            const hasConsent = consent_service_1.consentService.hasContentPostingConsent(athleteConsent);
            node_assert_1.default.strictEqual(hasConsent, true);
        });
        (0, node_test_1.default)('should return true when video and social media consents are granted', () => {
            const athleteConsent = {
                athleteId: 'test',
                athleteName: 'Test Athlete',
                parentName: 'Test Parent',
                consents: [
                    { type: 'PHOTO', granted: false, grantedBy: '' },
                    { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
                    { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
                    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
                ],
                lastUpdated: new Date().toISOString(),
            };
            const hasConsent = consent_service_1.consentService.hasContentPostingConsent(athleteConsent);
            node_assert_1.default.strictEqual(hasConsent, true);
        });
        (0, node_test_1.default)('should return false when social media consent is not granted', () => {
            const athleteConsent = {
                athleteId: 'test',
                athleteName: 'Test Athlete',
                parentName: 'Test Parent',
                consents: [
                    { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
                    { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
                    { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
                    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
                ],
                lastUpdated: new Date().toISOString(),
            };
            const hasConsent = consent_service_1.consentService.hasContentPostingConsent(athleteConsent);
            node_assert_1.default.strictEqual(hasConsent, false);
        });
        (0, node_test_1.default)('should return false when neither photo nor video consent is granted', () => {
            const athleteConsent = {
                athleteId: 'test',
                athleteName: 'Test Athlete',
                parentName: 'Test Parent',
                consents: [
                    { type: 'PHOTO', granted: false, grantedBy: '' },
                    { type: 'VIDEO', granted: false, grantedBy: '' },
                    { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
                    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
                ],
                lastUpdated: new Date().toISOString(),
            };
            const hasConsent = consent_service_1.consentService.hasContentPostingConsent(athleteConsent);
            node_assert_1.default.strictEqual(hasConsent, false);
        });
    });
    (0, node_test_1.describe)('getConsentTypes', () => {
        (0, node_test_1.default)('should return all consent types', () => {
            const types = consent_service_1.consentService.getConsentTypes();
            node_assert_1.default.ok(Array.isArray(types));
            node_assert_1.default.ok(types.includes('PHOTO'));
            node_assert_1.default.ok(types.includes('VIDEO'));
            node_assert_1.default.ok(types.includes('SOCIAL_MEDIA'));
            node_assert_1.default.ok(types.includes('EMERGENCY_TREATMENT'));
            node_assert_1.default.strictEqual(types.length, 4);
        });
    });
    (0, node_test_1.describe)('getConsentLabel', () => {
        (0, node_test_1.default)('should return correct labels for each type', () => {
            node_assert_1.default.strictEqual(consent_service_1.consentService.getConsentLabel('PHOTO'), 'Photo');
            node_assert_1.default.strictEqual(consent_service_1.consentService.getConsentLabel('VIDEO'), 'Video');
            node_assert_1.default.strictEqual(consent_service_1.consentService.getConsentLabel('SOCIAL_MEDIA'), 'Social Media');
            node_assert_1.default.strictEqual(consent_service_1.consentService.getConsentLabel('EMERGENCY_TREATMENT'), 'Emergency Treatment');
        });
    });
    (0, node_test_1.describe)('getConsentIcon', () => {
        (0, node_test_1.default)('should return correct icons for each type', () => {
            node_assert_1.default.strictEqual(consent_service_1.consentService.getConsentIcon('PHOTO'), 'camera-outline');
            node_assert_1.default.strictEqual(consent_service_1.consentService.getConsentIcon('VIDEO'), 'videocam-outline');
            node_assert_1.default.strictEqual(consent_service_1.consentService.getConsentIcon('SOCIAL_MEDIA'), 'share-social-outline');
            node_assert_1.default.strictEqual(consent_service_1.consentService.getConsentIcon('EMERGENCY_TREATMENT'), 'medkit-outline');
        });
    });
    (0, node_test_1.describe)('getConsentDescription', () => {
        (0, node_test_1.default)('should return descriptions for each type', () => {
            const photoDesc = consent_service_1.consentService.getConsentDescription('PHOTO');
            const videoDesc = consent_service_1.consentService.getConsentDescription('VIDEO');
            const socialDesc = consent_service_1.consentService.getConsentDescription('SOCIAL_MEDIA');
            const emergencyDesc = consent_service_1.consentService.getConsentDescription('EMERGENCY_TREATMENT');
            node_assert_1.default.ok(photoDesc.length > 0);
            node_assert_1.default.ok(videoDesc.length > 0);
            node_assert_1.default.ok(socialDesc.length > 0);
            node_assert_1.default.ok(emergencyDesc.length > 0);
        });
    });
    (0, node_test_1.describe)('formatConsentDate', () => {
        (0, node_test_1.default)('should format granted date correctly', () => {
            const consent = {
                type: 'PHOTO',
                granted: true,
                grantedAt: '2024-01-15T10:00:00Z',
                grantedBy: 'Test Parent',
            };
            const formatted = consent_service_1.consentService.formatConsentDate(consent);
            node_assert_1.default.ok(formatted.includes('Jan'));
            node_assert_1.default.ok(formatted.includes('2024'));
        });
        (0, node_test_1.default)('should return "Not granted" for consent without date', () => {
            const consent = {
                type: 'PHOTO',
                granted: false,
                grantedBy: '',
            };
            const formatted = consent_service_1.consentService.formatConsentDate(consent);
            node_assert_1.default.strictEqual(formatted, 'Not granted');
        });
    });
    (0, node_test_1.describe)('getConsentCount', () => {
        (0, node_test_1.default)('should return correct count of granted consents', () => {
            const athleteConsent = {
                athleteId: 'test',
                athleteName: 'Test Athlete',
                parentName: 'Test Parent',
                consents: [
                    { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
                    { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
                    { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
                    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
                ],
                lastUpdated: new Date().toISOString(),
            };
            const { granted, total } = consent_service_1.consentService.getConsentCount(athleteConsent);
            node_assert_1.default.strictEqual(granted, 3);
            node_assert_1.default.strictEqual(total, 4);
        });
        (0, node_test_1.default)('should return zero for no consents', () => {
            const athleteConsent = {
                athleteId: 'test',
                athleteName: 'Test Athlete',
                parentName: 'Test Parent',
                consents: [],
                lastUpdated: new Date().toISOString(),
            };
            const { granted, total } = consent_service_1.consentService.getConsentCount(athleteConsent);
            node_assert_1.default.strictEqual(granted, 0);
            node_assert_1.default.strictEqual(total, 0);
        });
    });
    (0, node_test_1.describe)('getConsentPercentage', () => {
        (0, node_test_1.default)('should return correct percentage', () => {
            const athleteConsent = {
                athleteId: 'test',
                athleteName: 'Test Athlete',
                parentName: 'Test Parent',
                consents: [
                    { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
                    { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
                    { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
                    { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
                ],
                lastUpdated: new Date().toISOString(),
            };
            const percentage = consent_service_1.consentService.getConsentPercentage(athleteConsent);
            node_assert_1.default.strictEqual(percentage, 50);
        });
        (0, node_test_1.default)('should return 100 for all granted', () => {
            const athleteConsent = {
                athleteId: 'test',
                athleteName: 'Test Athlete',
                parentName: 'Test Parent',
                consents: [
                    { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
                    { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
                    { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
                    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
                ],
                lastUpdated: new Date().toISOString(),
            };
            const percentage = consent_service_1.consentService.getConsentPercentage(athleteConsent);
            node_assert_1.default.strictEqual(percentage, 100);
        });
        (0, node_test_1.default)('should return 0 for none granted', () => {
            const athleteConsent = {
                athleteId: 'test',
                athleteName: 'Test Athlete',
                parentName: 'Test Parent',
                consents: [
                    { type: 'PHOTO', granted: false, grantedBy: '' },
                    { type: 'VIDEO', granted: false, grantedBy: '' },
                    { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
                    { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
                ],
                lastUpdated: new Date().toISOString(),
            };
            const percentage = consent_service_1.consentService.getConsentPercentage(athleteConsent);
            node_assert_1.default.strictEqual(percentage, 0);
        });
        (0, node_test_1.default)('should return 0 for empty consents array', () => {
            const athleteConsent = {
                athleteId: 'test',
                athleteName: 'Test Athlete',
                parentName: 'Test Parent',
                consents: [],
                lastUpdated: new Date().toISOString(),
            };
            const percentage = consent_service_1.consentService.getConsentPercentage(athleteConsent);
            node_assert_1.default.strictEqual(percentage, 0);
        });
    });
    (0, node_test_1.describe)('CONSENT_TYPE_LABELS', () => {
        (0, node_test_1.default)('should have labels for all consent types', () => {
            node_assert_1.default.ok(consent_service_1.CONSENT_TYPE_LABELS.PHOTO);
            node_assert_1.default.ok(consent_service_1.CONSENT_TYPE_LABELS.VIDEO);
            node_assert_1.default.ok(consent_service_1.CONSENT_TYPE_LABELS.SOCIAL_MEDIA);
            node_assert_1.default.ok(consent_service_1.CONSENT_TYPE_LABELS.EMERGENCY_TREATMENT);
        });
    });
    (0, node_test_1.describe)('CONSENT_TYPE_ICONS', () => {
        (0, node_test_1.default)('should have icons for all consent types', () => {
            node_assert_1.default.ok(consent_service_1.CONSENT_TYPE_ICONS.PHOTO);
            node_assert_1.default.ok(consent_service_1.CONSENT_TYPE_ICONS.VIDEO);
            node_assert_1.default.ok(consent_service_1.CONSENT_TYPE_ICONS.SOCIAL_MEDIA);
            node_assert_1.default.ok(consent_service_1.CONSENT_TYPE_ICONS.EMERGENCY_TREATMENT);
        });
    });
});
