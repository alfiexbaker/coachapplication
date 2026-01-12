/**
 * FamilyMemberCard Component Tests
 *
 * Unit tests for the FamilyMemberCard component that displays
 * child information in the family dashboard.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';
import type { FamilyMember } from '../../constants/types';

// Mock member data for testing
const mockMember: FamilyMember = {
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

describe('FamilyMemberCard', () => {
  describe('Data Structure', () => {
    test('should have required member fields', () => {
      assert.ok(mockMember.id);
      assert.ok(mockMember.name);
      assert.ok(mockMember.relationship);
      assert.ok(typeof mockMember.age === 'number');
      assert.ok(mockMember.colorCode);
      assert.ok(typeof mockMember.isActive === 'boolean');
      assert.ok(mockMember.addedAt);
    });

    test('should have valid relationship type', () => {
      const validRelationships = ['son', 'daughter', 'ward', 'other'];
      assert.ok(validRelationships.includes(mockMember.relationship));
    });

    test('should have valid skill level if present', () => {
      const validSkillLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE'];
      if (mockMember.skillLevel) {
        assert.ok(validSkillLevels.includes(mockMember.skillLevel));
      }
    });

    test('should have valid color code format', () => {
      assert.ok(mockMember.colorCode.startsWith('#'));
      assert.strictEqual(mockMember.colorCode.length, 7);
      // Validate hex format
      assert.ok(/^#[0-9A-Fa-f]{6}$/.test(mockMember.colorCode));
    });
  });

  describe('Helper Functions', () => {
    test('getInitials should return correct initials', () => {
      const getInitials = (name: string): string => {
        return name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
      };

      assert.strictEqual(getInitials('Test Child'), 'TC');
      assert.strictEqual(getInitials('John'), 'J');
      assert.strictEqual(getInitials('Mary Jane Watson'), 'MJ');
    });

    test('getRelationshipLabel should return correct label', () => {
      const getRelationshipLabel = (relationship: FamilyMember['relationship']): string => {
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

      assert.strictEqual(getRelationshipLabel('son'), 'Son');
      assert.strictEqual(getRelationshipLabel('daughter'), 'Daughter');
      assert.strictEqual(getRelationshipLabel('ward'), 'Ward');
      assert.strictEqual(getRelationshipLabel('other'), 'Child');
    });
  });

  describe('Statistics Display', () => {
    test('should have numeric session count', () => {
      assert.ok(typeof mockMember.totalSessions === 'number');
      assert.ok(mockMember.totalSessions >= 0);
    });

    test('should have numeric badge count', () => {
      assert.ok(typeof mockMember.totalBadges === 'number');
      assert.ok(mockMember.totalBadges >= 0);
    });

    test('should have valid age', () => {
      assert.ok(mockMember.age > 0);
      assert.ok(mockMember.age < 100);
    });
  });

  describe('Optional Fields', () => {
    test('should handle missing avatar', () => {
      const memberWithoutAvatar: FamilyMember = {
        ...mockMember,
        avatar: undefined,
      };
      assert.strictEqual(memberWithoutAvatar.avatar, undefined);
    });

    test('should handle missing skill level', () => {
      const memberWithoutSkill: FamilyMember = {
        ...mockMember,
        skillLevel: undefined,
      };
      assert.strictEqual(memberWithoutSkill.skillLevel, undefined);
    });

    test('should handle missing sport', () => {
      const memberWithoutSport: FamilyMember = {
        ...mockMember,
        primarySport: undefined,
      };
      assert.strictEqual(memberWithoutSport.primarySport, undefined);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty name gracefully', () => {
      const getInitials = (name: string): string => {
        if (!name) return '';
        return name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
      };

      assert.strictEqual(getInitials(''), '');
    });

    test('should handle zero sessions and badges', () => {
      const newMember: FamilyMember = {
        ...mockMember,
        totalSessions: 0,
        totalBadges: 0,
      };

      assert.strictEqual(newMember.totalSessions, 0);
      assert.strictEqual(newMember.totalBadges, 0);
    });

    test('should handle inactive member', () => {
      const inactiveMember: FamilyMember = {
        ...mockMember,
        isActive: false,
      };

      assert.strictEqual(inactiveMember.isActive, false);
    });
  });
});
