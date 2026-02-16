"use strict";
/**
 * Tests for reconcileChildren() and getInitials() pure functions
 * from hooks/use-child-context.tsx
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
const use_child_context_1 = require("../../hooks/use-child-context");
const child_context_1 = require("../../types/child-context");
// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
function makeRef(overrides) {
    return {
        relationshipType: 'PARENT_CHILD',
        addedAt: '2024-01-01T00:00:00Z',
        ...overrides,
    };
}
function makeProfile(overrides) {
    return {
        parentId: 'parent-1',
        gender: 'MALE',
        relationship: 'SON',
        disabilities: [],
        specialNeeds: [],
        hasSpecialNeeds: false,
        allergies: [],
        medicalConditions: [],
        medications: [],
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+44 7700 000000',
        emergencyContactRelation: 'Mother',
        photoConsent: true,
        videoConsent: true,
        socialMediaConsent: false,
        emergencyTreatmentConsent: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        ...overrides,
    };
}
// ---------------------------------------------------------------------------
// getInitials()
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('getInitials', () => {
    (0, node_test_1.default)('returns two-letter initials for two-part name', () => {
        strict_1.default.equal((0, use_child_context_1.getInitials)('Tom Henderson'), 'TH');
    });
    (0, node_test_1.default)('returns two-letter initials for three-part name (first + last)', () => {
        strict_1.default.equal((0, use_child_context_1.getInitials)('Anna Marie Smith'), 'AS');
    });
    (0, node_test_1.default)('returns single letter for single-word name', () => {
        strict_1.default.equal((0, use_child_context_1.getInitials)('Zara'), 'Z');
    });
    (0, node_test_1.default)('returns ? for empty string', () => {
        strict_1.default.equal((0, use_child_context_1.getInitials)(''), '?');
    });
    (0, node_test_1.default)('returns ? for whitespace-only string', () => {
        strict_1.default.equal((0, use_child_context_1.getInitials)('   '), '?');
    });
    (0, node_test_1.default)('is case-insensitive (uppercases output)', () => {
        strict_1.default.equal((0, use_child_context_1.getInitials)('jake henderson'), 'JH');
    });
    (0, node_test_1.default)('handles extra whitespace between parts', () => {
        strict_1.default.equal((0, use_child_context_1.getInitials)('  Tom   Henderson  '), 'TH');
    });
});
// ---------------------------------------------------------------------------
// reconcileChildren() — exact full-name match
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('reconcileChildren', () => {
    (0, node_test_1.describe)('exact full-name matching', () => {
        (0, node_test_1.default)('matches ref to profile by full name (case-insensitive)', () => {
            const refs = [makeRef({ childId: 'user1', childName: 'Tom Henderson' })];
            const profiles = [makeProfile({ id: 'child-2', firstName: 'Tom', lastName: 'Henderson' })];
            const result = (0, use_child_context_1.reconcileChildren)(refs, profiles);
            strict_1.default.equal(result.length, 1);
            strict_1.default.equal(result[0].id, 'user1');
            strict_1.default.equal(result[0].referenceId, 'user1');
            strict_1.default.equal(result[0].profileId, 'child-2');
            strict_1.default.equal(result[0].fullName, 'Tom Henderson');
        });
        (0, node_test_1.default)('uses profile nickname as display name when available', () => {
            const refs = [makeRef({ childId: 'user1', childName: 'Jake Henderson' })];
            const profiles = [makeProfile({ id: 'child-1', firstName: 'Jake', lastName: 'Henderson', nickname: 'JT' })];
            const result = (0, use_child_context_1.reconcileChildren)(refs, profiles);
            strict_1.default.equal(result[0].name, 'JT');
        });
        (0, node_test_1.default)('falls back to firstName when no nickname', () => {
            const refs = [makeRef({ childId: 'user1', childName: 'Tom Henderson' })];
            const profiles = [makeProfile({ id: 'child-2', firstName: 'Tom', lastName: 'Henderson' })];
            const result = (0, use_child_context_1.reconcileChildren)(refs, profiles);
            strict_1.default.equal(result[0].name, 'Tom');
        });
    });
    // ---------------------------------------------------------------------------
    // First-name fallback
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('first-name fallback matching', () => {
        (0, node_test_1.default)('matches by first name when full name does not match', () => {
            // Ref has "Tom H" but profile has "Tom Henderson"
            const refs = [makeRef({ childId: 'user1', childName: 'Tom H' })];
            const profiles = [makeProfile({ id: 'child-2', firstName: 'Tom', lastName: 'Henderson' })];
            const result = (0, use_child_context_1.reconcileChildren)(refs, profiles);
            strict_1.default.equal(result[0].profileId, 'child-2');
        });
        (0, node_test_1.default)('does NOT first-name-match when multiple profiles share same first name', () => {
            const refs = [makeRef({ childId: 'user1', childName: 'Tom X' })];
            const profiles = [
                makeProfile({ id: 'child-a', firstName: 'Tom', lastName: 'Alpha' }),
                makeProfile({ id: 'child-b', firstName: 'Tom', lastName: 'Beta' }),
            ];
            const result = (0, use_child_context_1.reconcileChildren)(refs, profiles);
            // First-name map only stores the first profile with that name; second is skipped.
            // "Tom X" doesn't match either full name, so first-name fallback picks child-a.
            strict_1.default.equal(result[0].profileId, 'child-a');
        });
    });
    // ---------------------------------------------------------------------------
    // Degraded mode (no profiles)
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('degraded mode (no profiles)', () => {
        (0, node_test_1.default)('builds ChildInfo from ref alone when no profiles exist', () => {
            const refs = [makeRef({ childId: 'user1', childName: 'Tom Henderson' })];
            const result = (0, use_child_context_1.reconcileChildren)(refs, []);
            strict_1.default.equal(result.length, 1);
            strict_1.default.equal(result[0].id, 'user1');
            strict_1.default.equal(result[0].referenceId, 'user1');
            strict_1.default.equal(result[0].profileId, null);
            strict_1.default.equal(result[0].name, 'Tom');
            strict_1.default.equal(result[0].fullName, 'Tom Henderson');
            strict_1.default.equal(result[0].initials, 'TH');
            strict_1.default.equal(result[0].avatarUrl, null);
            strict_1.default.equal(result[0].age, null);
            strict_1.default.equal(result[0].dateOfBirth, null);
            strict_1.default.equal(result[0].hasSpecialNeeds, false);
            strict_1.default.equal(result[0].profile, null);
            strict_1.default.deepEqual(result[0].squadIds, []);
            strict_1.default.deepEqual(result[0].clubIds, []);
        });
        (0, node_test_1.default)('uses first word of childName as display name in degraded mode', () => {
            const refs = [makeRef({ childId: 'u1', childName: 'Lily Henderson' })];
            const result = (0, use_child_context_1.reconcileChildren)(refs, []);
            strict_1.default.equal(result[0].name, 'Lily');
        });
    });
    // ---------------------------------------------------------------------------
    // Color coding
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('color coding', () => {
        (0, node_test_1.default)('assigns colors by index from CHILD_COLORS', () => {
            const refs = [
                makeRef({ childId: 'u1', childName: 'A Child' }),
                makeRef({ childId: 'u2', childName: 'B Child' }),
                makeRef({ childId: 'u3', childName: 'C Child' }),
            ];
            const result = (0, use_child_context_1.reconcileChildren)(refs, []);
            strict_1.default.equal(result[0].colorCode, child_context_1.CHILD_COLORS[0]);
            strict_1.default.equal(result[1].colorCode, child_context_1.CHILD_COLORS[1]);
            strict_1.default.equal(result[2].colorCode, child_context_1.CHILD_COLORS[2]);
        });
        (0, node_test_1.default)('wraps around when more children than colors', () => {
            const refs = Array.from({ length: child_context_1.CHILD_COLORS.length + 1 }, (_, i) => makeRef({ childId: `u${i}`, childName: `Child ${i}` }));
            const result = (0, use_child_context_1.reconcileChildren)(refs, []);
            strict_1.default.equal(result[child_context_1.CHILD_COLORS.length].colorCode, child_context_1.CHILD_COLORS[0]);
        });
    });
    // ---------------------------------------------------------------------------
    // Profile data propagation
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('profile data propagation', () => {
        (0, node_test_1.default)('populates avatarUrl from profile photoUrl', () => {
            const refs = [makeRef({ childId: 'u1', childName: 'Tom Henderson' })];
            const profiles = [makeProfile({ id: 'c1', firstName: 'Tom', lastName: 'Henderson', photoUrl: 'https://img.test/tom.jpg' })];
            const result = (0, use_child_context_1.reconcileChildren)(refs, profiles);
            strict_1.default.equal(result[0].avatarUrl, 'https://img.test/tom.jpg');
        });
        (0, node_test_1.default)('populates hasSpecialNeeds from profile', () => {
            const refs = [makeRef({ childId: 'u1', childName: 'Jake Henderson' })];
            const profiles = [makeProfile({ id: 'c1', firstName: 'Jake', lastName: 'Henderson', hasSpecialNeeds: true })];
            const result = (0, use_child_context_1.reconcileChildren)(refs, profiles);
            strict_1.default.equal(result[0].hasSpecialNeeds, true);
        });
        (0, node_test_1.default)('attaches full profile object', () => {
            const refs = [makeRef({ childId: 'u1', childName: 'Tom Henderson' })];
            const profile = makeProfile({ id: 'c1', firstName: 'Tom', lastName: 'Henderson' });
            const result = (0, use_child_context_1.reconcileChildren)(refs, [profile]);
            strict_1.default.equal(result[0].profile, profile);
        });
        (0, node_test_1.default)('populates dateOfBirth from profile', () => {
            const refs = [makeRef({ childId: 'u1', childName: 'Tom Henderson' })];
            const profiles = [makeProfile({ id: 'c1', firstName: 'Tom', lastName: 'Henderson', dateOfBirth: '2012-03-15' })];
            const result = (0, use_child_context_1.reconcileChildren)(refs, profiles);
            strict_1.default.equal(result[0].dateOfBirth, '2012-03-15');
            strict_1.default.equal(typeof result[0].age, 'number');
            strict_1.default.ok(result[0].age > 0);
        });
    });
    // ---------------------------------------------------------------------------
    // Edge cases
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('edge cases', () => {
        (0, node_test_1.default)('returns empty array for empty refs', () => {
            strict_1.default.deepEqual((0, use_child_context_1.reconcileChildren)([], []), []);
        });
        (0, node_test_1.default)('ignores unmatched profiles', () => {
            const refs = [makeRef({ childId: 'u1', childName: 'Tom Henderson' })];
            const profiles = [
                makeProfile({ id: 'c1', firstName: 'Tom', lastName: 'Henderson' }),
                makeProfile({ id: 'c99', firstName: 'Unknown', lastName: 'Person' }),
            ];
            const result = (0, use_child_context_1.reconcileChildren)(refs, profiles);
            // Only one ref → only one ChildInfo
            strict_1.default.equal(result.length, 1);
        });
        (0, node_test_1.default)('multiple refs each match distinct profiles', () => {
            const refs = [
                makeRef({ childId: 'u1', childName: 'Tom Henderson' }),
                makeRef({ childId: 'u2', childName: 'Lily Henderson' }),
            ];
            const profiles = [
                makeProfile({ id: 'c1', firstName: 'Tom', lastName: 'Henderson' }),
                makeProfile({ id: 'c2', firstName: 'Lily', lastName: 'Henderson' }),
            ];
            const result = (0, use_child_context_1.reconcileChildren)(refs, profiles);
            strict_1.default.equal(result.length, 2);
            strict_1.default.equal(result[0].profileId, 'c1');
            strict_1.default.equal(result[1].profileId, 'c2');
        });
    });
});
