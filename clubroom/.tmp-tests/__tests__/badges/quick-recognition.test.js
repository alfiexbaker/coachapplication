"use strict";
/**
 * Quick Recognition Tests
 *
 * Tests for recognition templates and quick recognition award flow.
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
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const recognition_templates_1 = require("../../constants/recognition-templates");
const badge_service_1 = require("../../services/badge-service");
const api_client_1 = require("../../services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("../../services/event-bus");
const rid = () => Math.random().toString(36).slice(2, 10);
(0, node_test_1.describe)('recognition templates', () => {
    (0, node_test_1.default)('all 16 templates have unique IDs', () => {
        strict_1.default.equal(recognition_templates_1.RECOGNITION_TEMPLATES.length, 16);
        const ids = recognition_templates_1.RECOGNITION_TEMPLATES.map((t) => t.id);
        const uniqueIds = new Set(ids);
        strict_1.default.equal(uniqueIds.size, 16, 'Template IDs must be unique');
    });
    (0, node_test_1.default)('each category has exactly 4 templates', () => {
        const categories = ['technical', 'physical', 'psychological', 'social'];
        for (const cat of categories) {
            const templates = (0, recognition_templates_1.getTemplatesForCategory)(cat);
            strict_1.default.equal(templates.length, 4, `${cat} should have 4 templates`);
        }
    });
    (0, node_test_1.default)('every template has non-empty label and message', () => {
        for (const t of recognition_templates_1.RECOGNITION_TEMPLATES) {
            strict_1.default.ok(t.label.length > 0, `Template ${t.id} label is empty`);
            strict_1.default.ok(t.message.length > 0, `Template ${t.id} message is empty`);
        }
    });
    (0, node_test_1.default)('getTemplatesForCategory returns correct category', () => {
        const techTemplates = (0, recognition_templates_1.getTemplatesForCategory)('technical');
        strict_1.default.ok(techTemplates.every((t) => t.category === 'technical'));
    });
});
(0, node_test_1.describe)('findBadgeForCategory', () => {
    (0, node_test_1.default)('returns a badge definition for each category', () => {
        const categories = ['technical', 'physical', 'psychological', 'social'];
        for (const cat of categories) {
            const badge = badge_service_1.badgeService.findBadgeForCategory(cat);
            strict_1.default.ok(badge, `No badge found for category: ${cat}`);
            strict_1.default.equal(badge.category, cat);
        }
    });
});
(0, node_test_1.describe)('quick recognition award flow', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BADGE_AWARDS, []);
        event_bus_1.eventBus.clearAll();
    });
    (0, node_test_1.default)('awarding via template produces correct badge award', async () => {
        const template = (0, recognition_templates_1.getTemplatesForCategory)('technical')[0];
        const badge = badge_service_1.badgeService.findBadgeForCategory(template.category);
        strict_1.default.ok(badge);
        const athleteId = `athlete_${rid()}`;
        const coachId = `coach_${rid()}`;
        const sessionId = `session_${rid()}`;
        const result = await badge_service_1.badgeService.awardBadge({
            badgeId: badge.id,
            athleteId,
            coachId,
            sessionId,
            reason: template.message,
            visibility: 'supporters',
            overrideCooldown: false,
        });
        strict_1.default.ok(result.success, 'Award should succeed');
        strict_1.default.equal(result.data.reason, template.message);
        strict_1.default.equal(result.data.badgeId, badge.id);
        strict_1.default.equal(result.data.visibility, 'supporters');
        strict_1.default.equal(result.data.athleteId, athleteId);
        strict_1.default.equal(result.data.coachId, coachId);
        strict_1.default.equal(result.data.sessionId, sessionId);
    });
    (0, node_test_1.default)('custom note is included when provided', async () => {
        const template = (0, recognition_templates_1.getTemplatesForCategory)('social')[0];
        const badge = badge_service_1.badgeService.findBadgeForCategory(template.category);
        strict_1.default.ok(badge);
        const athleteId = `athlete_${rid()}`;
        const result = await badge_service_1.badgeService.awardBadge({
            badgeId: badge.id,
            athleteId,
            coachId: `coach_${rid()}`,
            reason: template.message,
            note: 'Excellent leadership during rondos',
            visibility: 'supporters',
            overrideCooldown: false,
        });
        strict_1.default.ok(result.success);
        strict_1.default.equal(result.data.note, 'Excellent leadership during rondos');
    });
    (0, node_test_1.default)('cooldown error is surfaced on second award within 7 days', async () => {
        const badge = badge_service_1.badgeService.findBadgeForCategory('physical');
        strict_1.default.ok(badge);
        const athleteId = `athlete_${rid()}`;
        const coachId = `coach_${rid()}`;
        // First award
        const first = await badge_service_1.badgeService.awardBadge({
            badgeId: badge.id,
            athleteId,
            coachId,
            reason: 'Great work rate.',
            visibility: 'supporters',
            overrideCooldown: false,
        });
        strict_1.default.ok(first.success);
        // Second award — should hit cooldown
        const second = await badge_service_1.badgeService.awardBadge({
            badgeId: badge.id,
            athleteId,
            coachId,
            reason: 'Strong performance.',
            visibility: 'supporters',
            overrideCooldown: false,
        });
        strict_1.default.ok(!second.success, 'Second award should fail due to cooldown');
        strict_1.default.ok(second.error.message.includes('Cooldown'));
    });
    (0, node_test_1.default)('BADGE_EARNED event fires on successful award', async () => {
        const badge = badge_service_1.badgeService.findBadgeForCategory('psychological');
        strict_1.default.ok(badge);
        let emitted = false;
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.BADGE_EARNED, () => {
            emitted = true;
        });
        const result = await badge_service_1.badgeService.awardBadge({
            badgeId: badge.id,
            athleteId: `athlete_${rid()}`,
            coachId: `coach_${rid()}`,
            reason: 'Showed great focus.',
            visibility: 'supporters',
            overrideCooldown: false,
        });
        strict_1.default.ok(result.success);
        strict_1.default.ok(emitted, 'BADGE_EARNED event should have been emitted');
    });
});
