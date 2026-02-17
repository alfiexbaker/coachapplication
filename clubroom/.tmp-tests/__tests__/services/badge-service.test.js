"use strict";
/**
 * Badge Service Tests
 *
 * Tests for badge definitions, awards, awardBadge, markSeenByParent,
 * markAllSeenByParent, getUnseenBadgeCount, progression, streak info.
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
const badge_service_1 = require("../../services/badge-service");
const api_client_1 = require("../../services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("../../services/event-bus");
const rid = () => Math.random().toString(36).slice(2, 10);
(0, node_test_1.describe)('badgeService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BADGE_AWARDS, []);
        event_bus_1.eventBus.clearAll();
    });
    // ---------------------------------------------------------------------------
    // listDefinitions
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('listDefinitions', () => {
        (0, node_test_1.default)('returns badge catalog', async () => {
            const defs = await badge_service_1.badgeService.listDefinitions();
            strict_1.default.ok(Array.isArray(defs));
            strict_1.default.ok(defs.length > 0);
        });
    });
    // ---------------------------------------------------------------------------
    // listAwards
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('listAwards', () => {
        (0, node_test_1.default)('returns merged awards sorted by date desc', async () => {
            const awards = await badge_service_1.badgeService.listAwards();
            strict_1.default.ok(Array.isArray(awards));
            // Check sort order
            for (let i = 1; i < awards.length; i++) {
                strict_1.default.ok(new Date(awards[i - 1].awardedAt).getTime() >=
                    new Date(awards[i].awardedAt).getTime());
            }
        });
    });
    // ---------------------------------------------------------------------------
    // awardBadge
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('awardBadge', () => {
        (0, node_test_1.default)('creates award and emits BADGE_EARNED event', async () => {
            let emitted = false;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.BADGE_EARNED, () => {
                emitted = true;
            });
            const defs = await badge_service_1.badgeService.listDefinitions();
            const badgeId = defs[0].id;
            const athleteId = `ath_${rid()}`;
            const result = await badge_service_1.badgeService.awardBadge({
                badgeId,
                athleteId,
                athleteName: 'Test Athlete',
                coachId: `coach_${rid()}`,
                coachName: 'Test Coach',
                reason: 'Great work',
                overrideCooldown: true,
                overrideNote: 'Test override',
            });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.id);
                strict_1.default.equal(result.data.athleteId, athleteId);
                strict_1.default.equal(result.data.reason, 'Great work');
            }
            strict_1.default.equal(emitted, true);
        });
        (0, node_test_1.default)('respects cooldown — blocks repeat award within 7 days', async () => {
            const defs = await badge_service_1.badgeService.listDefinitions();
            const badgeId = defs[0].id;
            const athleteId = `ath_${rid()}`;
            // First award
            await badge_service_1.badgeService.awardBadge({
                badgeId,
                athleteId,
                coachId: `c_${rid()}`,
                reason: 'First',
                overrideCooldown: true,
                overrideNote: 'Allow',
            });
            // Second award — should be blocked by cooldown
            const result = await badge_service_1.badgeService.awardBadge({
                badgeId: defs.length > 1 ? defs[1].id : badgeId,
                athleteId,
                coachId: `c_${rid()}`,
                reason: 'Second',
            });
            strict_1.default.strictEqual(result.success, false);
        });
        (0, node_test_1.default)('cooldown override requires note', async () => {
            const defs = await badge_service_1.badgeService.listDefinitions();
            const badgeId = defs[0].id;
            const athleteId = `ath_${rid()}`;
            // First award
            await badge_service_1.badgeService.awardBadge({
                badgeId,
                athleteId,
                coachId: `c_${rid()}`,
                reason: 'First',
                overrideCooldown: true,
                overrideNote: 'Allow',
            });
            // Override without note
            const result = await badge_service_1.badgeService.awardBadge({
                badgeId: defs.length > 1 ? defs[1].id : badgeId,
                athleteId,
                coachId: `c_${rid()}`,
                reason: 'Override',
                overrideCooldown: true,
                overrideNote: '',
            });
            strict_1.default.strictEqual(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // listAwardsForAthlete
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('listAwardsForAthlete', () => {
        (0, node_test_1.default)('filters by athlete id', async () => {
            const defs = await badge_service_1.badgeService.listDefinitions();
            const athleteId = `ath_${rid()}`;
            await badge_service_1.badgeService.awardBadge({
                badgeId: defs[0].id,
                athleteId,
                coachId: `c_${rid()}`,
                reason: 'Test',
                overrideCooldown: true,
                overrideNote: 'Test',
            });
            const awards = await badge_service_1.badgeService.listAwardsForAthlete(athleteId);
            strict_1.default.ok(awards.length >= 1);
            for (const a of awards) {
                strict_1.default.equal(a.athleteId, athleteId);
            }
        });
    });
    // ---------------------------------------------------------------------------
    // markSeenByParent
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('markSeenByParent', () => {
        (0, node_test_1.default)('marks award as seen', async () => {
            const defs = await badge_service_1.badgeService.listDefinitions();
            const athleteId = `ath_${rid()}`;
            const awarded = await badge_service_1.badgeService.awardBadge({
                badgeId: defs[0].id,
                athleteId,
                coachId: `c_${rid()}`,
                reason: 'Good',
                overrideCooldown: true,
                overrideNote: 'Test',
            });
            if (!awarded.success)
                return;
            const result = await badge_service_1.badgeService.markSeenByParent(awarded.data.id);
            strict_1.default.ok(result);
            strict_1.default.equal(result.seenByParent, true);
        });
        (0, node_test_1.default)('returns undefined for unknown award', async () => {
            const result = await badge_service_1.badgeService.markSeenByParent(`unknown_${rid()}`);
            strict_1.default.equal(result, undefined);
        });
    });
    // ---------------------------------------------------------------------------
    // getUnseenBadgeCount
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getUnseenBadgeCount', () => {
        (0, node_test_1.default)('counts unseen badges', async () => {
            const defs = await badge_service_1.badgeService.listDefinitions();
            const athleteId = `ath_${rid()}`;
            await badge_service_1.badgeService.awardBadge({
                badgeId: defs[0].id,
                athleteId,
                coachId: `c_${rid()}`,
                reason: 'Test',
                visibility: 'athlete',
                overrideCooldown: true,
                overrideNote: 'Test',
            });
            const count = await badge_service_1.badgeService.getUnseenBadgeCount(athleteId);
            strict_1.default.ok(count >= 1);
        });
    });
    // ---------------------------------------------------------------------------
    // getTierName + getCategoryInfo
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getTierName', () => {
        (0, node_test_1.default)('returns tier display names', () => {
            strict_1.default.equal(typeof badge_service_1.badgeService.getTierName(1), 'string');
            strict_1.default.equal(typeof badge_service_1.badgeService.getTierName(2), 'string');
            strict_1.default.equal(typeof badge_service_1.badgeService.getTierName(3), 'string');
        });
    });
    (0, node_test_1.describe)('getCategoryInfo', () => {
        (0, node_test_1.default)('returns label and icon for category', () => {
            const info = badge_service_1.badgeService.getCategoryInfo('technical');
            strict_1.default.ok(info.label);
            strict_1.default.ok(info.icon);
        });
    });
    // ---------------------------------------------------------------------------
    // getStreakInfo
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getStreakInfo', () => {
        (0, node_test_1.default)('returns streak data for athlete', async () => {
            const info = await badge_service_1.badgeService.getStreakInfo(`ath_${rid()}`);
            strict_1.default.ok(typeof info.currentStreak === 'number');
            strict_1.default.ok(typeof info.nextMilestone === 'number');
            strict_1.default.ok(typeof info.streakLabel === 'string');
        });
    });
});
