"use strict";
/**
 * Club Service Tests
 *
 * Tests for club members, removal, undo, role change, ban, squad management,
 * branding, dashboard, calendar, and helper methods.
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
const club_service_1 = require("../../services/club-service");
const api_client_1 = require("../../services/api-client");
const event_bus_1 = require("../../services/event-bus");
const rid = () => Math.random().toString(36).slice(2, 10);
const CLUB_ID = `club_${rid()}`;
(0, node_test_1.describe)('clubService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(`club_members_${CLUB_ID}`);
        await api_client_1.apiClient.remove('club_member_removals');
        await api_client_1.apiClient.remove(`club_branding_${CLUB_ID}`);
        event_bus_1.eventBus.clearAll();
    });
    // ---------------------------------------------------------------------------
    // getMembers
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getMembers', () => {
        (0, node_test_1.default)('returns mock members for club', async () => {
            const members = await club_service_1.clubService.getMembers(CLUB_ID);
            strict_1.default.ok(Array.isArray(members));
            strict_1.default.ok(members.length >= 1);
        });
    });
    // ---------------------------------------------------------------------------
    // getMember
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getMember', () => {
        (0, node_test_1.default)('returns member by userId', async () => {
            const member = await club_service_1.clubService.getMember(CLUB_ID, 'coach1');
            strict_1.default.ok(member);
            strict_1.default.equal(member.userId, 'coach1');
        });
        (0, node_test_1.default)('returns null for unknown userId', async () => {
            const member = await club_service_1.clubService.getMember(CLUB_ID, `unknown_${rid()}`);
            strict_1.default.equal(member, null);
        });
    });
    // ---------------------------------------------------------------------------
    // removeMember + undoRemoval
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('removeMember', () => {
        (0, node_test_1.default)('removes member and emits CLUB_MEMBER_LEFT event', async () => {
            let emitted = false;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.CLUB_MEMBER_LEFT, () => {
                emitted = true;
            });
            const result = await club_service_1.clubService.removeMember(CLUB_ID, 'parent1', 'LEFT_CLUB', { id: 'coach1', name: 'Director Kelly' });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.userId, 'parent1');
                strict_1.default.equal(result.data.reason, 'LEFT_CLUB');
            }
            strict_1.default.equal(emitted, true);
        });
        (0, node_test_1.default)('returns err for unknown member', async () => {
            const result = await club_service_1.clubService.removeMember(CLUB_ID, `unknown_${rid()}`, 'INACTIVE', { id: 'coach1', name: 'Director Kelly' });
            strict_1.default.strictEqual(result.success, false);
        });
    });
    (0, node_test_1.describe)('undoRemoval', () => {
        (0, node_test_1.default)('restores removed member', async () => {
            const removed = await club_service_1.clubService.removeMember(CLUB_ID, 'parent2', 'LEFT_CLUB', { id: 'coach1', name: 'Director Kelly' });
            if (!removed.success)
                return;
            const result = await club_service_1.clubService.undoRemoval(CLUB_ID, removed.data.id);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.userId, 'parent2');
                strict_1.default.equal(result.data.status, 'active');
            }
        });
        (0, node_test_1.default)('returns err for unknown removal id', async () => {
            const result = await club_service_1.clubService.undoRemoval(CLUB_ID, `unknown_${rid()}`);
            strict_1.default.strictEqual(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // changeMemberRole
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('changeMemberRole', () => {
        (0, node_test_1.default)('updates member role', async () => {
            const result = await club_service_1.clubService.changeMemberRole(CLUB_ID, 'parent1', 'COACH', { id: 'coach1', name: 'Director Kelly' });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.role, 'COACH');
            }
        });
        (0, node_test_1.default)('returns err for unknown member', async () => {
            const result = await club_service_1.clubService.changeMemberRole(CLUB_ID, `unknown_${rid()}`, 'MEMBER', { id: 'coach1', name: 'Director Kelly' });
            strict_1.default.strictEqual(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // banMember
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('banMember', () => {
        (0, node_test_1.default)('bans member and emits event', async () => {
            let emitted = false;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.CLUB_MEMBER_LEFT, () => {
                emitted = true;
            });
            const result = await club_service_1.clubService.banMember(CLUB_ID, 'parent1', 'Misconduct', { id: 'coach1', name: 'Director Kelly' });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.reason, 'CONDUCT');
            }
            strict_1.default.equal(emitted, true);
        });
        (0, node_test_1.default)('returns err for unknown member', async () => {
            const result = await club_service_1.clubService.banMember(CLUB_ID, `unknown_${rid()}`, 'Bad', { id: 'coach1', name: 'Director Kelly' });
            strict_1.default.strictEqual(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // addMemberToSquad + removeMemberFromSquad
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('squad management', () => {
        (0, node_test_1.default)('adds member to squad and emits SQUAD_MEMBER_ADDED', async () => {
            let emitted = false;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SQUAD_MEMBER_ADDED, () => {
                emitted = true;
            });
            const result = await club_service_1.clubService.addMemberToSquad(CLUB_ID, 'parent1', 'squad_u15');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.squadIds?.includes('squad_u15'));
            }
            strict_1.default.equal(emitted, true);
        });
        (0, node_test_1.default)('removes member from squad and emits SQUAD_MEMBER_REMOVED', async () => {
            // First add to squad
            await club_service_1.clubService.addMemberToSquad(CLUB_ID, 'parent1', 'squad_u15');
            let emitted = false;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SQUAD_MEMBER_REMOVED, () => {
                emitted = true;
            });
            const result = await club_service_1.clubService.removeMemberFromSquad(CLUB_ID, 'parent1', 'squad_u15');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(!result.data.squadIds?.includes('squad_u15'));
            }
            strict_1.default.equal(emitted, true);
        });
    });
    // ---------------------------------------------------------------------------
    // Role helper methods
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('canRemoveMembers', () => {
        (0, node_test_1.default)('OWNER can remove', () => strict_1.default.equal(club_service_1.clubService.canRemoveMembers('OWNER'), true));
        (0, node_test_1.default)('ADMIN can remove', () => strict_1.default.equal(club_service_1.clubService.canRemoveMembers('ADMIN'), true));
        (0, node_test_1.default)('MEMBER cannot remove', () => strict_1.default.strictEqual(club_service_1.clubService.canRemoveMembers('MEMBER'), false));
    });
    (0, node_test_1.describe)('canBeRemoved', () => {
        (0, node_test_1.default)('OWNER cannot be removed', () => strict_1.default.strictEqual(club_service_1.clubService.canBeRemoved('OWNER'), false));
        (0, node_test_1.default)('MEMBER can be removed', () => strict_1.default.equal(club_service_1.clubService.canBeRemoved('MEMBER'), true));
    });
    (0, node_test_1.describe)('canManageRole', () => {
        (0, node_test_1.default)('OWNER can manage ADMIN', () => strict_1.default.equal(club_service_1.clubService.canManageRole('OWNER', 'ADMIN'), true));
        (0, node_test_1.default)('MEMBER cannot manage COACH', () => strict_1.default.strictEqual(club_service_1.clubService.canManageRole('MEMBER', 'COACH'), false));
    });
    (0, node_test_1.describe)('getAssignableRoles', () => {
        (0, node_test_1.default)('OWNER can assign all below', () => {
            const roles = club_service_1.clubService.getAssignableRoles('OWNER');
            strict_1.default.ok(roles.includes('ADMIN'));
            strict_1.default.ok(roles.includes('MEMBER'));
        });
    });
    // ---------------------------------------------------------------------------
    // Format helpers
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('formatRemovalReason', () => {
        (0, node_test_1.default)('formats known reasons', () => {
            strict_1.default.equal(club_service_1.clubService.formatRemovalReason('LEFT_CLUB'), 'Left club');
            strict_1.default.equal(club_service_1.clubService.formatRemovalReason('CONDUCT'), 'Conduct issue');
        });
    });
    (0, node_test_1.describe)('formatRole', () => {
        (0, node_test_1.default)('formats known roles', () => {
            strict_1.default.equal(club_service_1.clubService.formatRole('HEAD_COACH'), 'Head Coach');
            strict_1.default.equal(club_service_1.clubService.formatRole('MEMBER'), 'Member');
        });
    });
    (0, node_test_1.describe)('getRoleColor', () => {
        (0, node_test_1.default)('returns color strings', () => {
            strict_1.default.equal(typeof club_service_1.clubService.getRoleColor('OWNER'), 'string');
            strict_1.default.equal(typeof club_service_1.clubService.getRoleColor('MEMBER'), 'string');
        });
    });
    // ---------------------------------------------------------------------------
    // Branding
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('branding', () => {
        (0, node_test_1.default)('getBranding returns default for new club', async () => {
            const branding = await club_service_1.clubService.getBranding(CLUB_ID);
            strict_1.default.ok(branding);
            strict_1.default.equal(branding.clubId, CLUB_ID);
        });
        (0, node_test_1.default)('updateBranding persists and returns ok', async () => {
            const result = await club_service_1.clubService.updateBranding(CLUB_ID, {
                tagline: 'New tagline',
                primaryColor: '#FF0000',
            });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.tagline, 'New tagline');
                strict_1.default.equal(result.data.primaryColor, '#FF0000');
            }
        });
    });
    // ---------------------------------------------------------------------------
    // Dashboard
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getDashboardStats', () => {
        (0, node_test_1.default)('returns stats object', async () => {
            const stats = await club_service_1.clubService.getDashboardStats(CLUB_ID);
            strict_1.default.ok(typeof stats.sessionsThisWeek === 'number');
            strict_1.default.ok(typeof stats.memberCount === 'number');
        });
    });
    (0, node_test_1.describe)('getRecentResults', () => {
        (0, node_test_1.default)('returns match results', async () => {
            const results = await club_service_1.clubService.getRecentResults(CLUB_ID);
            strict_1.default.ok(Array.isArray(results));
            strict_1.default.ok(results.length <= 3);
        });
    });
    // ---------------------------------------------------------------------------
    // Calendar
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getCalendarEvents', () => {
        (0, node_test_1.default)('returns events array', async () => {
            const events = await club_service_1.clubService.getCalendarEvents(CLUB_ID);
            strict_1.default.ok(Array.isArray(events));
            strict_1.default.ok(events.length > 0);
        });
        (0, node_test_1.default)('filters by squad', async () => {
            const events = await club_service_1.clubService.getCalendarEvents(CLUB_ID, { squadId: 'squad_u15' });
            for (const e of events) {
                strict_1.default.ok(e.squadId === 'squad_u15' || !e.squadId);
            }
        });
    });
    (0, node_test_1.describe)('getCalendarSquads', () => {
        (0, node_test_1.default)('returns unique squads', async () => {
            const squads = await club_service_1.clubService.getCalendarSquads(CLUB_ID);
            strict_1.default.ok(Array.isArray(squads));
            const ids = squads.map((s) => s.id);
            strict_1.default.equal(new Set(ids).size, ids.length);
        });
    });
});
