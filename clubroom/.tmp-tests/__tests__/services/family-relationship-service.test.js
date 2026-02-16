"use strict";
/**
 * Family Relationship Service Tests
 *
 * Tests for family accounts, guardian management, and invites.
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
const family_relationship_service_1 = require("../../services/family/family-relationship-service");
(0, node_test_1.describe)('familyRelationshipService', () => {
    (0, node_test_1.describe)('getOrCreateAccount (Result pattern)', () => {
        (0, node_test_1.default)('creates account for new user', async () => {
            const result = await family_relationship_service_1.familyRelationshipService.getOrCreateAccount('new_user_xyz', 'Test User');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.id);
                strict_1.default.equal(result.data.primaryGuardianId, 'new_user_xyz');
            }
        });
        (0, node_test_1.default)('returns existing account for existing user', async () => {
            await family_relationship_service_1.familyRelationshipService.getOrCreateAccount('existing_u1', 'User 1');
            const result = await family_relationship_service_1.familyRelationshipService.getOrCreateAccount('existing_u1', 'User 1');
            strict_1.default.equal(result.success, true);
        });
    });
    (0, node_test_1.describe)('getFamilyAccount', () => {
        (0, node_test_1.default)('returns a family account', async () => {
            const account = await family_relationship_service_1.familyRelationshipService.getFamilyAccount('fam_user_1', 'Fam User');
            strict_1.default.ok(account);
            strict_1.default.ok(account.id);
        });
    });
    (0, node_test_1.describe)('getGuardians', () => {
        (0, node_test_1.default)('returns array of guardians', async () => {
            const account = await family_relationship_service_1.familyRelationshipService.getFamilyAccount('guard_user_1', 'Guardian User');
            const guardians = await family_relationship_service_1.familyRelationshipService.getGuardians(account.id);
            strict_1.default.ok(Array.isArray(guardians));
        });
    });
    (0, node_test_1.describe)('inviteGuardian (Result pattern)', () => {
        (0, node_test_1.default)('returns err when inviter is not admin', async () => {
            const account = await family_relationship_service_1.familyRelationshipService.getFamilyAccount('invite_u1', 'Inviter');
            const result = await family_relationship_service_1.familyRelationshipService.inviteGuardian(account.id, 'some_non_admin_user', 'Non Admin', 'invited@example.com', 'Invitee', 'GUARDIAN', 'Other Parent', []);
            strict_1.default.strictEqual(result.success, false);
        });
    });
    (0, node_test_1.describe)('removeGuardian (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent guardian', async () => {
            const result = await family_relationship_service_1.familyRelationshipService.removeGuardian('fam_1', 'req_1', 'nonexistent_g');
            strict_1.default.strictEqual(result.success, false);
        });
    });
    (0, node_test_1.describe)('declineInvite (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent invite', async () => {
            const result = await family_relationship_service_1.familyRelationshipService.declineInvite('nonexistent_invite');
            strict_1.default.strictEqual(result.success, false);
        });
    });
    (0, node_test_1.describe)('getPendingInvitesForUser', () => {
        (0, node_test_1.default)('returns array', async () => {
            const invites = await family_relationship_service_1.familyRelationshipService.getPendingInvitesForUser('test@example.com');
            strict_1.default.ok(Array.isArray(invites));
        });
    });
});
