import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { familyMemberService } from '@/services/family/family-member-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { FamilyMember } from '@/constants/types';

describe('FamilyMemberService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.FAMILY_MEMBERS);
    await apiClient.remove(STORAGE_KEYS.FAMILY_BOOKINGS);
  });

  describe('addFamilyMember', () => {
    it('should create family member successfully', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const data: Partial<FamilyMember> = {
        name: 'Test Child',
        relationship: 'son',
        age: 10,
        dateOfBirth: '2015-05-15',
        skillLevel: 'BEGINNER',
        primarySport: 'Football',
      };

      const result = await familyMemberService.addFamilyMember(parentId, data);

      assert.ok(result);
      assert.ok(result.id);
      assert.equal(result.name, 'Test Child');
      assert.equal(result.relationship, 'son');
      assert.equal(result.age, 10);
      assert.equal(result.skillLevel, 'BEGINNER');
      assert.ok(result.addedAt);
      assert.ok(result.colorCode);
    });

    it('should assign color from CHILD_COLORS palette', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const data: Partial<FamilyMember> = {
        name: 'Child with Color',
        relationship: 'daughter',
        age: 8,
      };

      const result = await familyMemberService.addFamilyMember(parentId, data);

      assert.ok(result.colorCode);
      assert.ok(result.colorCode.startsWith('#'));
    });
  });

  describe('create (Result wrapper)', () => {
    it('should return ok() with new member', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const data: Partial<FamilyMember> = {
        name: 'Result Child',
        relationship: 'son',
        age: 12,
      };

      const result = await familyMemberService.create(parentId, data);

      assert.ok(result.success);
      assert.ok(result.data.id);
      assert.equal(result.data.name, 'Result Child');
    });
  });

  describe('getFamilyMembers', () => {
    it('should return all family members for parent', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);

      await familyMemberService.addFamilyMember(parentId, {
        name: 'Child 1',
        relationship: 'son',
        age: 10,
      });

      await familyMemberService.addFamilyMember(parentId, {
        name: 'Child 2',
        relationship: 'daughter',
        age: 8,
      });

      const members = await familyMemberService.getFamilyMembers(parentId);

      assert.ok(members.length >= 2);
      assert.ok(members.some(m => m.name === 'Child 1'));
      assert.ok(members.some(m => m.name === 'Child 2'));
    });

    it('should return empty array when no members exist', async () => {
      const parentId = 'test-parent-empty-' + Math.random().toString(36).slice(2);
      const members = await familyMemberService.getFamilyMembers(parentId);

      assert.ok(Array.isArray(members));
    });
  });

  describe('getFamilyMember', () => {
    it('should retrieve member by id', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const created = await familyMemberService.addFamilyMember(parentId, {
        name: 'Find Me',
        relationship: 'son',
        age: 11,
      });

      const found = await familyMemberService.getFamilyMember(created.id);

      assert.ok(found);
      assert.equal(found.id, created.id);
      assert.equal(found.name, 'Find Me');
    });

    it('should return null when member not found', async () => {
      const found = await familyMemberService.getFamilyMember('non-existent-id');
      assert.equal(found, null);
    });
  });

  describe('getById (Result wrapper)', () => {
    it('should return ok() when member exists', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const created = await familyMemberService.addFamilyMember(parentId, {
        name: 'Result Test',
        relationship: 'daughter',
        age: 9,
      });

      const result = await familyMemberService.getById(created.id);

      assert.ok(result.success);
      assert.equal(result.data.id, created.id);
      assert.equal(result.data.name, 'Result Test');
    });

    it('should return err() when member not found', async () => {
      const result = await familyMemberService.getById('non-existent-id');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('updateFamilyMember', () => {
    it('should update member fields', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const created = await familyMemberService.addFamilyMember(parentId, {
        name: 'Original Name',
        relationship: 'son',
        age: 10,
        skillLevel: 'BEGINNER',
      });

      const updated = await familyMemberService.updateFamilyMember(created.id, {
        name: 'Updated Name',
        age: 11,
        skillLevel: 'INTERMEDIATE',
      });

      assert.ok(updated);
      assert.equal(updated.id, created.id);
      assert.equal(updated.name, 'Updated Name');
      assert.equal(updated.age, 11);
      assert.equal(updated.skillLevel, 'INTERMEDIATE');
    });

    it('should return null when member not found', async () => {
      const updated = await familyMemberService.updateFamilyMember('non-existent-id', {
        name: 'New Name',
      });

      assert.equal(updated, null);
    });
  });

  describe('update (Result wrapper)', () => {
    it('should return ok() with updated member', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const created = await familyMemberService.addFamilyMember(parentId, {
        name: 'Before Update',
        relationship: 'daughter',
        age: 8,
      });

      const result = await familyMemberService.update(created.id, {
        name: 'After Update',
      });

      assert.ok(result.success);
      assert.equal(result.data.name, 'After Update');
    });

    it('should return err() when member not found', async () => {
      const result = await familyMemberService.update('non-existent-id', {
        name: 'New Name',
      });

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('remove', () => {
    it('should remove member successfully', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const created = await familyMemberService.addFamilyMember(parentId, {
        name: 'To Remove',
        relationship: 'son',
        age: 10,
      });

      const removed = await familyMemberService.remove(created.id);
      assert.equal(removed, true);

      const found = await familyMemberService.getFamilyMember(created.id);
      assert.equal(found, null);
    });

    it('should return false when member not found', async () => {
      const removed = await familyMemberService.remove('non-existent-id');
      assert.equal(removed, false);
    });
  });

  describe('getActive', () => {
    it('should return only active members', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);

      await familyMemberService.addFamilyMember(parentId, {
        name: 'Active Child',
        relationship: 'son',
        age: 10,
        isActive: true,
      });

      const activeMembers = await familyMemberService.getActive(parentId);

      assert.ok(activeMembers.length >= 1);
      assert.ok(activeMembers.every(m => m.isActive === true || m.isActive === undefined));
    });
  });

  describe('getFamilyBookings', () => {
    it('should return bookings for family', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const bookings = await familyMemberService.getFamilyBookings(parentId);

      assert.ok(Array.isArray(bookings));
    });
  });

  describe('getChildBookings', () => {
    it('should return bookings for specific child', async () => {
      const childId = 'test-child-' + Math.random().toString(36).slice(2);
      const bookings = await familyMemberService.getChildBookings(childId);

      assert.ok(Array.isArray(bookings));
    });
  });

  describe('getUpcomingForFamily', () => {
    it('should return limited upcoming bookings', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const upcoming = await familyMemberService.getUpcomingForFamily(parentId, 5);

      assert.ok(Array.isArray(upcoming));
      assert.ok(upcoming.length <= 5);
    });
  });

  describe('getFamilySpending', () => {
    it('should return spending records', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const spending = await familyMemberService.getFamilySpending(parentId);

      assert.ok(Array.isArray(spending));
    });
  });

  describe('getChildProgress', () => {
    it('should return progress summary for child', async () => {
      const childId = 'test-child-' + Math.random().toString(36).slice(2);
      const progress = await familyMemberService.getChildProgress(childId);

      // Can be null if no data
      assert.ok(progress === null || typeof progress === 'object');
    });
  });

  describe('getFamilyOverview', () => {
    it('should return overview with stats', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const overview = await familyMemberService.getFamilyOverview(parentId);

      assert.ok(overview);
      assert.ok(typeof overview.totalMembers === 'number');
      assert.ok(typeof overview.activeMembers === 'number');
      assert.ok(typeof overview.totalBookings === 'number');
      assert.ok(Array.isArray(overview.upcomingBookings));
    });
  });

  describe('clearAllData', () => {
    it('should clear all family data', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);

      await familyMemberService.addFamilyMember(parentId, {
        name: 'Clear Test',
        relationship: 'son',
        age: 10,
      });

      await familyMemberService.clearAllData();

      const members = await familyMemberService.getFamilyMembers(parentId);
      assert.equal(members.length, 0);
    });
  });
});
