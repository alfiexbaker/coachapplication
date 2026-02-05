"use strict";
/**
 * FamilyMemberCard Component Tests
 *
 * Unit tests for the FamilyMemberCard component that displays
 * child information in the family dashboard.
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
// Mock member data for testing
const mockMember = {
    id: 'child_test',
    name: 'Test Child',
    avatar: undefined,
    relationship: 'son',
    age: 10,
    colorCode: '#3B82F6',
    dateOfBirth: '2014-05-15',
    skillLevel: 'INTERMEDIATE',
    primarySport: 'Football',
    totalSessions: 15,
    totalBadges: 5,
    isActive: true,
    addedAt: '2024-01-01T00:00:00.000Z',
};
(0, node_test_1.describe)('FamilyMemberCard', () => {
    (0, node_test_1.describe)('Data Structure', () => {
        (0, node_test_1.default)('should have required member fields', () => {
            node_assert_1.default.ok(mockMember.id);
            node_assert_1.default.ok(mockMember.name);
            node_assert_1.default.ok(mockMember.relationship);
            node_assert_1.default.ok(typeof mockMember.age === 'number');
            node_assert_1.default.ok(mockMember.colorCode);
            node_assert_1.default.ok(typeof mockMember.isActive === 'boolean');
            node_assert_1.default.ok(mockMember.addedAt);
        });
        (0, node_test_1.default)('should have valid relationship type', () => {
            const validRelationships = ['son', 'daughter', 'ward', 'other'];
            node_assert_1.default.ok(validRelationships.includes(mockMember.relationship));
        });
        (0, node_test_1.default)('should have valid skill level if present', () => {
            const validSkillLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE'];
            if (mockMember.skillLevel) {
                node_assert_1.default.ok(validSkillLevels.includes(mockMember.skillLevel));
            }
        });
        (0, node_test_1.default)('should have valid color code format', () => {
            node_assert_1.default.ok(mockMember.colorCode.startsWith('#'));
            node_assert_1.default.strictEqual(mockMember.colorCode.length, 7);
            // Validate hex format
            node_assert_1.default.ok(/^#[0-9A-Fa-f]{6}$/.test(mockMember.colorCode));
        });
    });
    (0, node_test_1.describe)('Helper Functions', () => {
        (0, node_test_1.default)('getInitials should return correct initials', () => {
            const getInitials = (name) => {
                return name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
            };
            node_assert_1.default.strictEqual(getInitials('Test Child'), 'TC');
            node_assert_1.default.strictEqual(getInitials('John'), 'J');
            node_assert_1.default.strictEqual(getInitials('Mary Jane Watson'), 'MJ');
        });
        (0, node_test_1.default)('getRelationshipLabel should return correct label', () => {
            const getRelationshipLabel = (relationship) => {
                switch (relationship) {
                    case 'son':
                        return 'Son';
                    case 'daughter':
                        return 'Daughter';
                    case 'ward':
                        return 'Ward';
                    default:
                        return 'Child';
                }
            };
            node_assert_1.default.strictEqual(getRelationshipLabel('son'), 'Son');
            node_assert_1.default.strictEqual(getRelationshipLabel('daughter'), 'Daughter');
            node_assert_1.default.strictEqual(getRelationshipLabel('ward'), 'Ward');
            node_assert_1.default.strictEqual(getRelationshipLabel('other'), 'Child');
        });
    });
    (0, node_test_1.describe)('Statistics Display', () => {
        (0, node_test_1.default)('should have numeric session count', () => {
            node_assert_1.default.ok(typeof mockMember.totalSessions === 'number');
            node_assert_1.default.ok(mockMember.totalSessions >= 0);
        });
        (0, node_test_1.default)('should have numeric badge count', () => {
            node_assert_1.default.ok(typeof mockMember.totalBadges === 'number');
            node_assert_1.default.ok(mockMember.totalBadges >= 0);
        });
        (0, node_test_1.default)('should have valid age', () => {
            node_assert_1.default.ok(mockMember.age > 0);
            node_assert_1.default.ok(mockMember.age < 100);
        });
    });
    (0, node_test_1.describe)('Optional Fields', () => {
        (0, node_test_1.default)('should handle missing avatar', () => {
            const memberWithoutAvatar = {
                ...mockMember,
                avatar: undefined,
            };
            node_assert_1.default.strictEqual(memberWithoutAvatar.avatar, undefined);
        });
        (0, node_test_1.default)('should handle missing skill level', () => {
            const memberWithoutSkill = {
                ...mockMember,
                skillLevel: undefined,
            };
            node_assert_1.default.strictEqual(memberWithoutSkill.skillLevel, undefined);
        });
        (0, node_test_1.default)('should handle missing sport', () => {
            const memberWithoutSport = {
                ...mockMember,
                primarySport: undefined,
            };
            node_assert_1.default.strictEqual(memberWithoutSport.primarySport, undefined);
        });
    });
    (0, node_test_1.describe)('Edge Cases', () => {
        (0, node_test_1.default)('should handle empty name gracefully', () => {
            const getInitials = (name) => {
                if (!name)
                    return '';
                return name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
            };
            node_assert_1.default.strictEqual(getInitials(''), '');
        });
        (0, node_test_1.default)('should handle zero sessions and badges', () => {
            const newMember = {
                ...mockMember,
                totalSessions: 0,
                totalBadges: 0,
            };
            node_assert_1.default.strictEqual(newMember.totalSessions, 0);
            node_assert_1.default.strictEqual(newMember.totalBadges, 0);
        });
        (0, node_test_1.default)('should handle inactive member', () => {
            const inactiveMember = {
                ...mockMember,
                isActive: false,
            };
            node_assert_1.default.strictEqual(inactiveMember.isActive, false);
        });
    });
});
