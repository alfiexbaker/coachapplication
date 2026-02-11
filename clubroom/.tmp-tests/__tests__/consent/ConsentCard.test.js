"use strict";
/**
 * ConsentCard Component Tests
 *
 * Unit tests for the ConsentCard component
 * testing rendering, data display, and consent status indicators.
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
// Mock athlete consent data for tests
const createMockConsent = (overrides = {}) => ({
    athleteId: 'test_athlete',
    consents: [
        { type: 'PHOTO', granted: true, grantedBy: 'Test Parent', grantedAt: '2024-01-15T10:00:00Z' },
        { type: 'VIDEO', granted: true, grantedBy: 'Test Parent', grantedAt: '2024-01-15T10:00:00Z' },
        { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
        { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Test Parent', grantedAt: '2024-01-15T10:00:00Z' },
    ],
    lastUpdated: '2024-01-15T10:00:00Z',
    ...overrides,
});
(0, node_test_1.describe)('ConsentCard', () => {
    (0, node_test_1.describe)('Consent Count Display', () => {
        (0, node_test_1.default)('should calculate correct granted count', () => {
            const athleteConsent = createMockConsent();
            const { granted, total } = consent_service_1.consentService.getConsentCount(athleteConsent);
            node_assert_1.default.strictEqual(granted, 3);
            node_assert_1.default.strictEqual(total, 4);
        });
        (0, node_test_1.default)('should handle all consents granted', () => {
            const athleteConsent = createMockConsent({
                consents: [
                    { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
                    { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
                    { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
                    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
                ],
            });
            const { granted, total } = consent_service_1.consentService.getConsentCount(athleteConsent);
            node_assert_1.default.strictEqual(granted, 4);
            node_assert_1.default.strictEqual(total, 4);
        });
        (0, node_test_1.default)('should handle no consents granted', () => {
            const athleteConsent = createMockConsent({
                consents: [
                    { type: 'PHOTO', granted: false, grantedBy: '' },
                    { type: 'VIDEO', granted: false, grantedBy: '' },
                    { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
                    { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
                ],
            });
            const { granted, total } = consent_service_1.consentService.getConsentCount(athleteConsent);
            node_assert_1.default.strictEqual(granted, 0);
            node_assert_1.default.strictEqual(total, 4);
        });
    });
    (0, node_test_1.describe)('Consent Percentage', () => {
        (0, node_test_1.default)('should calculate 75% for 3 of 4 consents', () => {
            const athleteConsent = createMockConsent();
            const percentage = consent_service_1.consentService.getConsentPercentage(athleteConsent);
            node_assert_1.default.strictEqual(percentage, 75);
        });
        (0, node_test_1.default)('should calculate 100% for all consents', () => {
            const athleteConsent = createMockConsent({
                consents: [
                    { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
                    { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
                    { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
                    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
                ],
            });
            const percentage = consent_service_1.consentService.getConsentPercentage(athleteConsent);
            node_assert_1.default.strictEqual(percentage, 100);
        });
        (0, node_test_1.default)('should calculate 0% for no consents', () => {
            const athleteConsent = createMockConsent({
                consents: [
                    { type: 'PHOTO', granted: false, grantedBy: '' },
                    { type: 'VIDEO', granted: false, grantedBy: '' },
                    { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
                    { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
                ],
            });
            const percentage = consent_service_1.consentService.getConsentPercentage(athleteConsent);
            node_assert_1.default.strictEqual(percentage, 0);
        });
    });
    (0, node_test_1.describe)('Content Posting Consent', () => {
        (0, node_test_1.default)('should return true when photo and social media are granted', () => {
            const athleteConsent = createMockConsent({
                consents: [
                    { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
                    { type: 'VIDEO', granted: false, grantedBy: '' },
                    { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
                    { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
                ],
            });
            const hasConsent = consent_service_1.consentService.hasContentPostingConsent(athleteConsent);
            node_assert_1.default.strictEqual(hasConsent, true);
        });
        (0, node_test_1.default)('should return true when video and social media are granted', () => {
            const athleteConsent = createMockConsent({
                consents: [
                    { type: 'PHOTO', granted: false, grantedBy: '' },
                    { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
                    { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
                    { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
                ],
            });
            const hasConsent = consent_service_1.consentService.hasContentPostingConsent(athleteConsent);
            node_assert_1.default.strictEqual(hasConsent, true);
        });
        (0, node_test_1.default)('should return false when social media is not granted', () => {
            const athleteConsent = createMockConsent({
                consents: [
                    { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
                    { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
                    { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
                    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
                ],
            });
            const hasConsent = consent_service_1.consentService.hasContentPostingConsent(athleteConsent);
            node_assert_1.default.strictEqual(hasConsent, false);
        });
        (0, node_test_1.default)('should return false when neither photo nor video is granted', () => {
            const athleteConsent = createMockConsent({
                consents: [
                    { type: 'PHOTO', granted: false, grantedBy: '' },
                    { type: 'VIDEO', granted: false, grantedBy: '' },
                    { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
                    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
                ],
            });
            const hasConsent = consent_service_1.consentService.hasContentPostingConsent(athleteConsent);
            node_assert_1.default.strictEqual(hasConsent, false);
        });
    });
    (0, node_test_1.describe)('Status Label Logic', () => {
        (0, node_test_1.default)('should identify 100% consent', () => {
            const athleteConsent = createMockConsent({
                consents: [
                    { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
                    { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
                    { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
                    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
                ],
            });
            const percentage = consent_service_1.consentService.getConsentPercentage(athleteConsent);
            node_assert_1.default.strictEqual(percentage === 100, true);
        });
        (0, node_test_1.default)('should identify partial consent (50%+)', () => {
            const athleteConsent = createMockConsent({
                consents: [
                    { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
                    { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
                    { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
                    { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
                ],
            });
            const percentage = consent_service_1.consentService.getConsentPercentage(athleteConsent);
            node_assert_1.default.strictEqual(percentage >= 50 && percentage < 100, true);
        });
        (0, node_test_1.default)('should identify limited consent (< 50%)', () => {
            const athleteConsent = createMockConsent({
                consents: [
                    { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
                    { type: 'VIDEO', granted: false, grantedBy: '' },
                    { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
                    { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
                ],
            });
            const percentage = consent_service_1.consentService.getConsentPercentage(athleteConsent);
            node_assert_1.default.strictEqual(percentage > 0 && percentage < 50, true);
        });
        (0, node_test_1.default)('should identify no consent', () => {
            const athleteConsent = createMockConsent({
                consents: [
                    { type: 'PHOTO', granted: false, grantedBy: '' },
                    { type: 'VIDEO', granted: false, grantedBy: '' },
                    { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
                    { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
                ],
            });
            const percentage = consent_service_1.consentService.getConsentPercentage(athleteConsent);
            node_assert_1.default.strictEqual(percentage === 0, true);
        });
    });
    (0, node_test_1.describe)('Athlete Data Display', () => {
        (0, node_test_1.default)('should have athlete id available', () => {
            const athleteConsent = createMockConsent();
            node_assert_1.default.strictEqual(athleteConsent.athleteId, 'test_athlete');
        });
        (0, node_test_1.default)('should have last updated timestamp', () => {
            const athleteConsent = createMockConsent();
            node_assert_1.default.ok(athleteConsent.lastUpdated);
        });
        (0, node_test_1.default)('should generate initials from athlete id', () => {
            const athleteConsent = createMockConsent();
            const initials = athleteConsent.athleteId.slice(0, 2).toUpperCase();
            node_assert_1.default.strictEqual(initials, 'TE');
        });
    });
    (0, node_test_1.describe)('Consent Grid Data', () => {
        (0, node_test_1.default)('should have all consent types', () => {
            const athleteConsent = createMockConsent();
            const consentTypes = ['PHOTO', 'VIDEO', 'SOCIAL_MEDIA', 'EMERGENCY_TREATMENT'];
            for (const type of consentTypes) {
                const consent = athleteConsent.consents.find((c) => c.type === type);
                node_assert_1.default.ok(consent, `Missing consent type: ${type}`);
            }
        });
        (0, node_test_1.default)('should have correct granted status for each type', () => {
            const athleteConsent = createMockConsent();
            const photoConsent = athleteConsent.consents.find((c) => c.type === 'PHOTO');
            const socialConsent = athleteConsent.consents.find((c) => c.type === 'SOCIAL_MEDIA');
            node_assert_1.default.strictEqual(photoConsent?.granted, true);
            node_assert_1.default.strictEqual(socialConsent?.granted, false);
        });
    });
    (0, node_test_1.describe)('Consent Detail Data', () => {
        (0, node_test_1.default)('should have grantedBy for granted consents', () => {
            const athleteConsent = createMockConsent();
            const photoConsent = athleteConsent.consents.find((c) => c.type === 'PHOTO');
            node_assert_1.default.ok(photoConsent?.grantedBy);
            node_assert_1.default.strictEqual(photoConsent?.grantedBy, 'Test Parent');
        });
        (0, node_test_1.default)('should have grantedAt date for granted consents', () => {
            const athleteConsent = createMockConsent();
            const photoConsent = athleteConsent.consents.find((c) => c.type === 'PHOTO');
            node_assert_1.default.ok(photoConsent?.grantedAt);
        });
        (0, node_test_1.default)('should format consent date correctly', () => {
            const consent = {
                type: 'PHOTO',
                granted: true,
                grantedAt: '2024-01-15T10:00:00Z',
                grantedBy: 'Parent',
            };
            const formatted = consent_service_1.consentService.formatConsentDate(consent);
            node_assert_1.default.ok(formatted.includes('Jan'));
            node_assert_1.default.ok(formatted.includes('2024'));
        });
    });
    (0, node_test_1.describe)('Consent Type Labels and Icons', () => {
        (0, node_test_1.default)('should have correct label for photo consent', () => {
            const label = consent_service_1.consentService.getConsentLabel('PHOTO');
            node_assert_1.default.strictEqual(label, 'Photo');
        });
        (0, node_test_1.default)('should have correct icon for video consent', () => {
            const icon = consent_service_1.consentService.getConsentIcon('VIDEO');
            node_assert_1.default.strictEqual(icon, 'videocam-outline');
        });
        (0, node_test_1.default)('should have correct label for social media consent', () => {
            const label = consent_service_1.consentService.getConsentLabel('SOCIAL_MEDIA');
            node_assert_1.default.strictEqual(label, 'Social Media');
        });
        (0, node_test_1.default)('should have correct label for emergency treatment consent', () => {
            const label = consent_service_1.consentService.getConsentLabel('EMERGENCY_TREATMENT');
            node_assert_1.default.strictEqual(label, 'Emergency Treatment');
        });
    });
});
