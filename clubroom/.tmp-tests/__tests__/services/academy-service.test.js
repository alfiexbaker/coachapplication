"use strict";
/**
 * Academy Service Tests
 *
 * Tests for academy CRUD, branding, settings, staff, invites,
 * joinWithCode, member role updates, member removal, permissions, formatRole.
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
const academy_service_1 = require("../../services/academy-service");
const api_client_1 = require("../../services/api-client");
const rid = () => Math.random().toString(36).slice(2, 10);
(0, node_test_1.describe)('academyService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove('academies');
        await api_client_1.apiClient.remove('academy_memberships');
        await api_client_1.apiClient.remove('academy_invites');
    });
    // ---------------------------------------------------------------------------
    // discoverAcademies
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('discoverAcademies', () => {
        (0, node_test_1.default)('returns public academies sorted by rating', async () => {
            const academies = await academy_service_1.academyService.discoverAcademies();
            strict_1.default.ok(Array.isArray(academies));
            strict_1.default.ok(academies.length >= 2);
            // Should be sorted by rating descending
            for (let i = 1; i < academies.length; i++) {
                strict_1.default.ok((academies[i - 1].rating?.average ?? 0) >= (academies[i].rating?.average ?? 0));
            }
        });
    });
    // ---------------------------------------------------------------------------
    // getAcademy
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getAcademy', () => {
        (0, node_test_1.default)('returns academy for known id', async () => {
            const academy = await academy_service_1.academyService.getAcademy('academy_1');
            strict_1.default.ok(academy);
            strict_1.default.equal(academy.id, 'academy_1');
        });
        (0, node_test_1.default)('returns null for unknown id', async () => {
            const result = await academy_service_1.academyService.getAcademy(`unknown_${rid()}`);
            strict_1.default.equal(result, null);
        });
    });
    // ---------------------------------------------------------------------------
    // getAcademyBySlug
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getAcademyBySlug', () => {
        (0, node_test_1.default)('returns academy by slug', async () => {
            const academy = await academy_service_1.academyService.getAcademyBySlug('east-london-fc');
            strict_1.default.ok(academy);
            strict_1.default.equal(academy.slug, 'east-london-fc');
        });
        (0, node_test_1.default)('returns null for unknown slug', async () => {
            const result = await academy_service_1.academyService.getAcademyBySlug(`no-slug-${rid()}`);
            strict_1.default.equal(result, null);
        });
    });
    // ---------------------------------------------------------------------------
    // createAcademy
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('createAcademy', () => {
        (0, node_test_1.default)('creates academy with correct fields', async () => {
            const academy = await academy_service_1.academyService.createAcademy({
                name: `Test Academy ${rid()}`,
                description: 'A test academy',
                postcode: 'SW1A 1AA',
                city: 'London',
                ownerId: `owner_${rid()}`,
                ownerName: 'Test Owner',
            });
            strict_1.default.ok(academy.id);
            strict_1.default.ok(academy.slug);
            strict_1.default.equal(academy.coachCount, 1);
            strict_1.default.equal(academy.athleteCount, 0);
            strict_1.default.equal(academy.isPublic, true);
        });
    });
    // ---------------------------------------------------------------------------
    // updateBranding
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('updateBranding', () => {
        (0, node_test_1.default)('updates branding and returns ok', async () => {
            const result = await academy_service_1.academyService.updateBranding('academy_1', {
                primaryColor: '#FF0000',
                email: 'new@test.com',
            });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.primaryColor, '#FF0000');
            }
        });
        (0, node_test_1.default)('returns err for unknown academy', async () => {
            const result = await academy_service_1.academyService.updateBranding(`unknown_${rid()}`, {
                primaryColor: '#000',
            });
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // updateSettings
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('updateSettings', () => {
        (0, node_test_1.default)('updates settings and returns ok', async () => {
            const result = await academy_service_1.academyService.updateSettings('academy_1', {
                name: 'Updated Academy Name',
                isPublic: false,
            });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.name, 'Updated Academy Name');
                strict_1.default.equal(result.data.isPublic, false);
            }
        });
        (0, node_test_1.default)('returns err for unknown academy', async () => {
            const result = await academy_service_1.academyService.updateSettings(`unknown_${rid()}`, { name: 'X' });
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // getStaff
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getStaff', () => {
        (0, node_test_1.default)('returns staff for known academy sorted by role', async () => {
            const staff = await academy_service_1.academyService.getStaff('academy_1');
            strict_1.default.ok(Array.isArray(staff));
            strict_1.default.ok(staff.length >= 1);
            // First should be OWNER
            strict_1.default.equal(staff[0].role, 'OWNER');
        });
    });
    // ---------------------------------------------------------------------------
    // createInvite
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('createInvite', () => {
        (0, node_test_1.default)('creates invite with code', async () => {
            const invite = await academy_service_1.academyService.createInvite('academy_1', 'East London FC Academy', 'COACH', ['CREATE_SESSIONS'], 'coach1', 'Marcus Thompson', 30, 5);
            strict_1.default.ok(invite.id);
            strict_1.default.ok(invite.code);
            strict_1.default.equal(invite.academyId, 'academy_1');
            strict_1.default.equal(invite.role, 'COACH');
            strict_1.default.equal(invite.maxUses, 5);
            strict_1.default.equal(invite.currentUses, 0);
        });
    });
    // ---------------------------------------------------------------------------
    // joinWithCode
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('joinWithCode', () => {
        (0, node_test_1.default)('joins with valid code', async () => {
            const invite = await academy_service_1.academyService.createInvite('academy_1', 'East London FC Academy', 'COACH', ['CREATE_SESSIONS'], 'coach1', 'Marcus Thompson', 30, 5);
            const userId = `user_${rid()}`;
            const result = await academy_service_1.academyService.joinWithCode(invite.code, userId, 'New Coach');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.userId, userId);
                strict_1.default.equal(result.data.role, 'COACH');
                strict_1.default.equal(result.data.status, 'ACTIVE');
            }
        });
        (0, node_test_1.default)('returns err for invalid code', async () => {
            const result = await academy_service_1.academyService.joinWithCode(`INVALID_${rid()}`, 'u1', 'Name');
            strict_1.default.equal(result.success, false);
        });
        (0, node_test_1.default)('returns err for already a member', async () => {
            // coach1 is already a member of academy_1 via mock data
            // Use the existing mock invite code 'ELFC2026'
            const result = await academy_service_1.academyService.joinWithCode('ELFC2026', 'coach1', 'Marcus Thompson');
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // updateMemberRole
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('updateMemberRole', () => {
        (0, node_test_1.default)('updates role and returns ok', async () => {
            const result = await academy_service_1.academyService.updateMemberRole('mem_2', 'ADMIN', [
                'MANAGE_STAFF',
                'CREATE_SESSIONS',
            ]);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.role, 'ADMIN');
            }
        });
        (0, node_test_1.default)('returns err for unknown membership', async () => {
            const result = await academy_service_1.academyService.updateMemberRole(`mem_${rid()}`, 'COACH', []);
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // removeMember
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('removeMember', () => {
        (0, node_test_1.default)('suspends member and returns ok', async () => {
            // mem_3 is ASSISTANT
            const result = await academy_service_1.academyService.removeMember('mem_3');
            strict_1.default.equal(result.success, true);
        });
        (0, node_test_1.default)('returns err when removing OWNER', async () => {
            // mem_1 is OWNER
            const result = await academy_service_1.academyService.removeMember('mem_1');
            strict_1.default.equal(result.success, false);
        });
        (0, node_test_1.default)('returns err for unknown membership', async () => {
            const result = await academy_service_1.academyService.removeMember(`mem_${rid()}`);
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // hasPermission
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('hasPermission', () => {
        (0, node_test_1.default)('owner has all permissions', async () => {
            const has = await academy_service_1.academyService.hasPermission('academy_1', 'coach1', 'MANAGE_BILLING');
            strict_1.default.equal(has, true);
        });
        (0, node_test_1.default)('coach only has assigned permissions', async () => {
            const has = await academy_service_1.academyService.hasPermission('academy_1', 'coach_3', 'CREATE_SESSIONS');
            strict_1.default.equal(has, true);
            const noHas = await academy_service_1.academyService.hasPermission('academy_1', 'coach_3', 'MANAGE_BILLING');
            strict_1.default.equal(noHas, false);
        });
        (0, node_test_1.default)('unknown user has no permissions', async () => {
            const has = await academy_service_1.academyService.hasPermission('academy_1', `nobody_${rid()}`, 'CREATE_SESSIONS');
            strict_1.default.equal(has, false);
        });
    });
    // ---------------------------------------------------------------------------
    // formatRole
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('formatRole', () => {
        (0, node_test_1.default)('returns display labels', () => {
            strict_1.default.equal(academy_service_1.academyService.formatRole('OWNER'), 'Owner');
            strict_1.default.equal(academy_service_1.academyService.formatRole('COACH'), 'Coach');
            strict_1.default.equal(academy_service_1.academyService.formatRole('ASSISTANT'), 'Assistant');
        });
    });
});
