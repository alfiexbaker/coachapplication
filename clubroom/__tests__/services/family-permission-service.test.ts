/**
 * Family Permission Service Tests
 *
 * Tests for guardian permissions, role-based access checks.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { familyPermissionService } from '../../services/family/family-permission-service';

describe('familyPermissionService', () => {
  describe('getDefaultPermissions', () => {
    test('returns permissions for PRIMARY role', () => {
      const perms = familyPermissionService.getDefaultPermissions('PRIMARY');
      assert.ok(Array.isArray(perms));
      assert.ok(perms.length > 0);
    });

    test('returns fewer permissions for VIEWER role', () => {
      const primaryPerms = familyPermissionService.getDefaultPermissions('PRIMARY');
      const viewerPerms = familyPermissionService.getDefaultPermissions('VIEWER');
      assert.ok(viewerPerms.length <= primaryPerms.length);
    });
  });

  describe('canBook', () => {
    test('returns boolean', async () => {
      const result = await familyPermissionService.canBook('user_1', 'family_1');
      assert.equal(typeof result, 'boolean');
    });
  });

  describe('canViewSchedule', () => {
    test('returns boolean', async () => {
      const result = await familyPermissionService.canViewSchedule('user_1', 'family_1');
      assert.equal(typeof result, 'boolean');
    });
  });

  describe('canViewProgress', () => {
    test('returns boolean', async () => {
      const result = await familyPermissionService.canViewProgress('user_1', 'family_1');
      assert.equal(typeof result, 'boolean');
    });
  });

  describe('canManagePayments', () => {
    test('returns boolean', async () => {
      const result = await familyPermissionService.canManagePayments('user_1', 'family_1');
      assert.equal(typeof result, 'boolean');
    });
  });

  describe('isAdmin', () => {
    test('returns boolean', async () => {
      const result = await familyPermissionService.isAdmin('user_1', 'family_1');
      assert.equal(typeof result, 'boolean');
    });
  });

  describe('hasPermission', () => {
    test('returns boolean', async () => {
      const result = await familyPermissionService.hasPermission('user_1', 'family_1', 'BOOK_SESSIONS');
      assert.equal(typeof result, 'boolean');
    });
  });

  describe('getGuardianPermissions (Result pattern)', () => {
    test('returns Result with permissions array', async () => {
      const result = await familyPermissionService.getGuardianPermissions('user_1', 'family_1');
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(Array.isArray(result.data));
      }
    });
  });
});
