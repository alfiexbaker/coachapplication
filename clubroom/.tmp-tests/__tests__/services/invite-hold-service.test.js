"use strict";
/**
 * Invite Hold Service Tests
 *
 * Tests for slot hold management during pending invites.
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
const invite_hold_service_1 = require("../../services/invite-hold-service");
(0, node_test_1.describe)('inviteHoldService', () => {
    (0, node_test_1.describe)('createHolds', () => {
        (0, node_test_1.default)('creates hold records for slots', async () => {
            const holds = await invite_hold_service_1.inviteHoldService.createHolds('coach_hold_1', 'inv_hold_1', [{ date: '2026-06-15', startTime: '09:00', endTime: '10:00' }], new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
            strict_1.default.ok(Array.isArray(holds));
            strict_1.default.ok(holds.length >= 1);
            strict_1.default.equal(holds[0].coachId, 'coach_hold_1');
        });
    });
    (0, node_test_1.describe)('getActiveHolds', () => {
        (0, node_test_1.default)('returns array of holds for coach', async () => {
            const holds = await invite_hold_service_1.inviteHoldService.getActiveHolds('coach_hold_1');
            strict_1.default.ok(Array.isArray(holds));
        });
    });
    (0, node_test_1.describe)('isSlotHeld', () => {
        (0, node_test_1.default)('returns boolean', async () => {
            const result = await invite_hold_service_1.inviteHoldService.isSlotHeld('coach_1', '2026-06-15', '09:00');
            strict_1.default.equal(typeof result, 'boolean');
        });
    });
    (0, node_test_1.describe)('releaseHoldsForInvite', () => {
        (0, node_test_1.default)('does not throw for valid invite', async () => {
            await strict_1.default.doesNotReject(async () => {
                await invite_hold_service_1.inviteHoldService.releaseHoldsForInvite('inv_hold_1');
            });
        });
    });
    (0, node_test_1.describe)('releaseHolds', () => {
        (0, node_test_1.default)('does not throw for hold IDs', async () => {
            await strict_1.default.doesNotReject(async () => {
                await invite_hold_service_1.inviteHoldService.releaseHolds(['hold_1', 'hold_2']);
            });
        });
    });
    (0, node_test_1.describe)('cleanup', () => {
        (0, node_test_1.default)('returns number of cleaned up holds', async () => {
            const count = await invite_hold_service_1.inviteHoldService.cleanup();
            strict_1.default.equal(typeof count, 'number');
        });
    });
});
