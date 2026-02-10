import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { familyPermissionService } from '@/services/family/family-permission-service';
import { familyRelationshipService } from '@/services/family/family-relationship-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('FamilyPermissionService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.FAMILY_ACCOUNTS);
  });

  describe('getPermissions', () => {
    it('should return permissions for guardian', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');

      const permissions = await familyPermissionService.getPermissions(userId, account.id);

      assert.ok(Array.isArray(permissions));
      assert.ok(permissions.length > 0);
      assert.ok(permissions.includes('VIEW_SCHEDULE'));
    });

    it('should return empty array for non-guardian', async () => {
      const userId1 = 'test-user-1-' + Math.random().toString(36).slice(2);
      const userId2 = 'test-user-2-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId1, 'User 1');

      const permissions = await familyPermissionService.getPermissions(userId2, account.id);

      assert.ok(Array.isArray(permissions));
      assert.equal(permissions.length, 0);
    });
  });

  describe('getGuardianPermissions (Result wrapper)', () => {
    it('should return ok() with permissions', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');

      const result = await familyPermissionService.getGuardianPermissions(userId, account.id);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));
    });
  });

  describe('hasPermission', () => {
    it('should return true for granted permission', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');

      const has = await familyPermissionService.hasPermission(userId, account.id, 'VIEW_SCHEDULE');

      assert.equal(has, true);
    });

    it('should return false for non-granted permission', async () => {
      const userId1 = 'test-user-1-' + Math.random().toString(36).slice(2);
      const userId2 = 'test-user-2-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId1, 'User 1');

      const has = await familyPermissionService.hasPermission(userId2, account.id, 'ADMIN');

      assert.equal(has, false);
    });
  });

  describe('canBook', () => {
    it('should return true when user has BOOK_SESSIONS permission', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');

      const canBook = await familyPermissionService.canBook(userId, account.id);

      // PRIMARY role has BOOK_SESSIONS by default
      assert.equal(canBook, true);
    });
  });

  describe('canViewSchedule', () => {
    it('should return true when user has VIEW_SCHEDULE permission', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');

      const canView = await familyPermissionService.canViewSchedule(userId, account.id);

      assert.equal(canView, true);
    });
  });

  describe('canViewProgress', () => {
    it('should return true when user has VIEW_PROGRESS permission', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');

      const canView = await familyPermissionService.canViewProgress(userId, account.id);

      assert.equal(canView, true);
    });
  });

  describe('canManagePayments', () => {
    it('should return true when user has MANAGE_PAYMENTS permission', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');

      const canManage = await familyPermissionService.canManagePayments(userId, account.id);

      // PRIMARY role has MANAGE_PAYMENTS by default
      assert.equal(canManage, true);
    });
  });

  describe('isAdmin', () => {
    it('should return true when user has ADMIN permission', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');

      const isAdmin = await familyPermissionService.isAdmin(userId, account.id);

      // PRIMARY role has ADMIN by default
      assert.equal(isAdmin, true);
    });

    it('should return false when user is not admin', async () => {
      const userId1 = 'test-user-1-' + Math.random().toString(36).slice(2);
      const userId2 = 'test-user-2-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId1, 'User 1');

      const isAdmin = await familyPermissionService.isAdmin(userId2, account.id);

      assert.equal(isAdmin, false);
    });
  });

  describe('updatePermissions', () => {
    it('should update guardian permissions', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');
      const guardian = account.guardians[0];

      const result = await familyPermissionService.updatePermissions(
        account.id,
        guardian.id,
        userId,
        ['VIEW_SCHEDULE', 'VIEW_PROGRESS']
      );

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data.permissions));
    });

    it('should return err() when not admin', async () => {
      const userId1 = 'test-user-1-' + Math.random().toString(36).slice(2);
      const userId2 = 'test-user-2-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId1, 'User 1');
      const guardian = account.guardians[0];

      const result = await familyPermissionService.updatePermissions(
        account.id,
        guardian.id,
        userId2,
        ['VIEW_SCHEDULE']
      );

      assert.ok(!result.success);
      assert.equal(result.error.code, 'UNAUTHORIZED');
    });
  });

  describe('updateGuardianPermissions', () => {
    it('should update permissions using Result wrapper', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');
      const guardian = account.guardians[0];

      const result = await familyPermissionService.updateGuardianPermissions(
        account.id,
        guardian.id,
        userId,
        ['VIEW_SCHEDULE', 'VIEW_PROGRESS', 'BOOK_SESSIONS']
      );

      assert.ok(result.success);
    });
  });

  describe('updateChildAccess', () => {
    it('should update child access for guardian', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');
      const guardian = account.guardians[0];
      const childIds = ['child1', 'child2'];

      const result = await familyPermissionService.updateChildAccess(
        account.id,
        guardian.id,
        userId,
        childIds
      );

      assert.ok(result.success);
      assert.deepEqual(result.data.childrenIds, childIds);
    });

    it('should return err() when guardian not found', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');

      const result = await familyPermissionService.updateChildAccess(
        account.id,
        'non-existent-guardian',
        userId,
        ['child1']
      );

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('updateGuardianChildAccess', () => {
    it('should update child access using Result wrapper', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');
      const guardian = account.guardians[0];
      const childIds = ['child3', 'child4'];

      const result = await familyPermissionService.updateGuardianChildAccess(
        account.id,
        guardian.id,
        userId,
        childIds
      );

      assert.ok(result.success);
    });
  });

  describe('getAccessibleChildren', () => {
    it('should return accessible children for guardian', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount(userId, 'Test User');
      const guardian = account.guardians[0];

      // Update with specific child IDs
      await familyPermissionService.updateChildAccess(
        account.id,
        guardian.id,
        userId,
        ['child1', 'child2']
      );

      const result = await familyPermissionService.getAccessibleChildren(userId, account.id);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));
      assert.ok(result.data.includes('child1'));
      assert.ok(result.data.includes('child2'));
    });

    it('should return err() when guardian not found', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const account = await familyRelationshipService.getFamilyAccount('other-user', 'Other User');

      const result = await familyPermissionService.getAccessibleChildren(userId, account.id);

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });
});
