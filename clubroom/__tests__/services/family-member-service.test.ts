/**
 * Family Member Service Tests
 *
 * Tests for family member CRUD, bookings, and progress queries.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { familyMemberService } from '../../services/family/family-member-service';

describe('familyMemberService', () => {
  describe('getFamilyMembers', () => {
    test('returns array of family members', async () => {
      const members = await familyMemberService.getFamilyMembers('parent_1');
      assert.ok(Array.isArray(members));
    });
  });

  describe('getFamilyMember', () => {
    test('returns null for non-existent child', async () => {
      const member = await familyMemberService.getFamilyMember('nonexistent_child');
      assert.equal(member, null);
    });
  });

  describe('getById (Result pattern)', () => {
    test('returns err for non-existent child', async () => {
      const result = await familyMemberService.getById('nonexistent_xyz');
      assert.strictEqual(result.success, false);
    });
  });

  describe('create (Result pattern)', () => {
    test('creates a family member', async () => {
      const result = await familyMemberService.create('parent_test_1', {
        name: 'Test Child',
        age: 10,
        dateOfBirth: '2016-05-15',
        relationship: 'son',
      });
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.name, 'Test Child');
        assert.ok(result.data.id);
      }
    });
  });

  describe('update (Result pattern)', () => {
    test('returns err for non-existent child', async () => {
      const result = await familyMemberService.update('nonexistent_child', { name: 'Updated' });
      assert.strictEqual(result.success, false);
    });
  });

  describe('getActive', () => {
    test('returns array of active members', async () => {
      const active = await familyMemberService.getActive('parent_1');
      assert.ok(Array.isArray(active));
    });
  });

  describe('getFamilyBookings', () => {
    test('returns array of bookings', async () => {
      const bookings = await familyMemberService.getFamilyBookings('parent_1');
      assert.ok(Array.isArray(bookings));
    });
  });

  describe('getNextChildColor', () => {
    test('returns a color string', () => {
      const color = familyMemberService.getNextChildColor(0);
      assert.equal(typeof color, 'string');
    });

    test('returns different colors for different counts', () => {
      const c0 = familyMemberService.getNextChildColor(0);
      const c1 = familyMemberService.getNextChildColor(1);
      assert.notEqual(c0, c1);
    });
  });

  describe('formatAmount', () => {
    test('formats amount in GBP', () => {
      const result = familyMemberService.formatAmount(25);
      assert.ok(result.includes('25'));
    });
  });
});
