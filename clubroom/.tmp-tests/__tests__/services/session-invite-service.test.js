"use strict";
/**
 * Session Invite Service Tests
 *
 * Tests for individual session invite lifecycle: create, respond, cancel.
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
const session_invite_service_1 = require("../../services/invite/session-invite-service");
(0, node_test_1.describe)('sessionInviteService', () => {
    (0, node_test_1.describe)('getCoachInvites', () => {
        (0, node_test_1.default)('returns array of invites', async () => {
            const invites = await session_invite_service_1.sessionInviteService.getCoachInvites('coach_1');
            strict_1.default.ok(Array.isArray(invites));
        });
    });
    (0, node_test_1.describe)('getParentInvites', () => {
        (0, node_test_1.default)('returns array of invites', async () => {
            const invites = await session_invite_service_1.sessionInviteService.getParentInvites('parent_1');
            strict_1.default.ok(Array.isArray(invites));
        });
    });
    (0, node_test_1.describe)('getPendingInvites', () => {
        (0, node_test_1.default)('returns array of pending invites', async () => {
            const invites = await session_invite_service_1.sessionInviteService.getPendingInvites();
            strict_1.default.ok(Array.isArray(invites));
        });
    });
    (0, node_test_1.describe)('getInviteHistory', () => {
        (0, node_test_1.default)('returns array of all invites', async () => {
            const history = await session_invite_service_1.sessionInviteService.getInviteHistory();
            strict_1.default.ok(Array.isArray(history));
        });
    });
    (0, node_test_1.describe)('getInvite', () => {
        (0, node_test_1.default)('returns null for non-existent invite', async () => {
            const invite = await session_invite_service_1.sessionInviteService.getInvite('nonexistent_inv');
            strict_1.default.equal(invite, null);
        });
    });
    (0, node_test_1.describe)('respondToInvite (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent invite', async () => {
            const result = await session_invite_service_1.sessionInviteService.respondToInvite({
                inviteId: 'nonexistent_respond',
                response: 'DECLINED',
            });
            strict_1.default.equal(result.success, false);
        });
    });
    (0, node_test_1.describe)('acceptInvite (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent invite', async () => {
            const result = await session_invite_service_1.sessionInviteService.acceptInvite('nonexistent_accept', { date: '2026-06-15', startTime: '09:00', endTime: '10:00' });
            strict_1.default.equal(result.success, false);
        });
    });
    (0, node_test_1.describe)('declineInvite (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent invite', async () => {
            const result = await session_invite_service_1.sessionInviteService.declineInvite('nonexistent_decline');
            strict_1.default.equal(result.success, false);
        });
    });
    (0, node_test_1.describe)('cancelInvite', () => {
        (0, node_test_1.default)('does not throw for non-existent invite', async () => {
            await strict_1.default.doesNotReject(async () => {
                await session_invite_service_1.sessionInviteService.cancelInvite('nonexistent_cancel');
            });
        });
    });
    (0, node_test_1.describe)('dismissInvite', () => {
        (0, node_test_1.default)('does not throw for non-existent invite', async () => {
            await strict_1.default.doesNotReject(async () => {
                await session_invite_service_1.sessionInviteService.dismissInvite('nonexistent_dismiss');
            });
        });
    });
    (0, node_test_1.describe)('getOpenInvites', () => {
        (0, node_test_1.default)('returns array of open invites', async () => {
            const invites = await session_invite_service_1.sessionInviteService.getOpenInvites();
            strict_1.default.ok(Array.isArray(invites));
        });
    });
    (0, node_test_1.describe)('getAvailableInvitesForParent', () => {
        (0, node_test_1.default)('returns array of available invites', async () => {
            const invites = await session_invite_service_1.sessionInviteService.getAvailableInvitesForParent('parent_1');
            strict_1.default.ok(Array.isArray(invites));
        });
    });
    (0, node_test_1.describe)('generateWeekSlots', () => {
        (0, node_test_1.default)('generates correct number of week slots', () => {
            const slots = session_invite_service_1.sessionInviteService.generateWeekSlots([{ date: '2026-06-15', startTime: '09:00', endTime: '10:00' }], 4, '2026-06-15');
            strict_1.default.equal(slots.length, 4);
            strict_1.default.equal(slots[0].accepted, true);
        });
        (0, node_test_1.default)('returns empty for no proposed slots', () => {
            const slots = session_invite_service_1.sessionInviteService.generateWeekSlots([], 4, '2026-06-15');
            strict_1.default.equal(slots.length, 0);
        });
    });
    (0, node_test_1.describe)('clearCache', () => {
        (0, node_test_1.default)('does not throw', async () => {
            await strict_1.default.doesNotReject(async () => {
                await session_invite_service_1.sessionInviteService.clearCache();
            });
        });
    });
});
