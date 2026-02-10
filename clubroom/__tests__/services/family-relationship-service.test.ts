/**
 * Family Relationship Service Tests
 *
 * Tests for family accounts, guardian management, and invites.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { familyRelationshipService } from '../../services/family/family-relationship-service';

describe('familyRelationshipService', () => {
  describe('getOrCreateAccount (Result pattern)', () => {
    test('creates account for new user', async () => {
      const result = await familyRelationshipService.getOrCreateAccount('new_user_xyz', 'Test User');
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.id);
        assert.equal(result.data.primaryGuardianId, 'new_user_xyz');
      }
    });

    test('returns existing account for existing user', async () => {
      await familyRelationshipService.getOrCreateAccount('existing_u1', 'User 1');
      const result = await familyRelationshipService.getOrCreateAccount('existing_u1', 'User 1');
      assert.equal(result.success, true);
    });
  });

  describe('getFamilyAccount', () => {
    test('returns a family account', async () => {
      const account = await familyRelationshipService.getFamilyAccount('fam_user_1', 'Fam User');
      assert.ok(account);
      assert.ok(account.id);
    });
  });

  describe('getGuardians', () => {
    test('returns array of guardians', async () => {
      const account = await familyRelationshipService.getFamilyAccount('guard_user_1', 'Guardian User');
      const guardians = await familyRelationshipService.getGuardians(account.id);
      assert.ok(Array.isArray(guardians));
    });
  });

  describe('inviteGuardian (Result pattern)', () => {
    test('returns err when inviter is not admin', async () => {
      const account = await familyRelationshipService.getFamilyAccount('invite_u1', 'Inviter');
      const result = await familyRelationshipService.inviteGuardian(
        account.id,
        'some_non_admin_user',
        'Non Admin',
        'invited@example.com',
        'Invitee',
        'GUARDIAN',
        'Other Parent',
        [],
      );
      assert.equal(result.success, false);
    });
  });

  describe('removeGuardian (Result pattern)', () => {
    test('returns err for non-existent guardian', async () => {
      const result = await familyRelationshipService.removeGuardian('fam_1', 'req_1', 'nonexistent_g');
      assert.equal(result.success, false);
    });
  });

  describe('declineInvite (Result pattern)', () => {
    test('returns err for non-existent invite', async () => {
      const result = await familyRelationshipService.declineInvite('nonexistent_invite');
      assert.equal(result.success, false);
    });
  });

  describe('getPendingInvitesForUser', () => {
    test('returns array', async () => {
      const invites = await familyRelationshipService.getPendingInvitesForUser('test@example.com');
      assert.ok(Array.isArray(invites));
    });
  });
});
