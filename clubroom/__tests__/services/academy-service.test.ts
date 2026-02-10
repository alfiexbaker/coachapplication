/**
 * Academy Service Tests
 *
 * Tests for academy CRUD, branding, settings, staff, invites,
 * joinWithCode, member role updates, member removal, permissions, formatRole.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { academyService } from '../../services/academy-service';
import { apiClient } from '../../services/api-client';

const rid = () => Math.random().toString(36).slice(2, 10);

describe('academyService', () => {
  beforeEach(async () => {
    await apiClient.remove('academies');
    await apiClient.remove('academy_memberships');
    await apiClient.remove('academy_invites');
  });

  // ---------------------------------------------------------------------------
  // discoverAcademies
  // ---------------------------------------------------------------------------
  describe('discoverAcademies', () => {
    test('returns public academies sorted by rating', async () => {
      const academies = await academyService.discoverAcademies();
      assert.ok(Array.isArray(academies));
      assert.ok(academies.length >= 2);
      // Should be sorted by rating descending
      for (let i = 1; i < academies.length; i++) {
        assert.ok(
          (academies[i - 1].rating?.average ?? 0) >= (academies[i].rating?.average ?? 0),
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getAcademy
  // ---------------------------------------------------------------------------
  describe('getAcademy', () => {
    test('returns academy for known id', async () => {
      const academy = await academyService.getAcademy('academy_1');
      assert.ok(academy);
      assert.equal(academy!.id, 'academy_1');
    });

    test('returns null for unknown id', async () => {
      const result = await academyService.getAcademy(`unknown_${rid()}`);
      assert.equal(result, null);
    });
  });

  // ---------------------------------------------------------------------------
  // getAcademyBySlug
  // ---------------------------------------------------------------------------
  describe('getAcademyBySlug', () => {
    test('returns academy by slug', async () => {
      const academy = await academyService.getAcademyBySlug('east-london-fc');
      assert.ok(academy);
      assert.equal(academy!.slug, 'east-london-fc');
    });

    test('returns null for unknown slug', async () => {
      const result = await academyService.getAcademyBySlug(`no-slug-${rid()}`);
      assert.equal(result, null);
    });
  });

  // ---------------------------------------------------------------------------
  // createAcademy
  // ---------------------------------------------------------------------------
  describe('createAcademy', () => {
    test('creates academy with correct fields', async () => {
      const academy = await academyService.createAcademy({
        name: `Test Academy ${rid()}`,
        description: 'A test academy',
        postcode: 'SW1A 1AA',
        city: 'London',
        ownerId: `owner_${rid()}`,
        ownerName: 'Test Owner',
      });

      assert.ok(academy.id);
      assert.ok(academy.slug);
      assert.equal(academy.coachCount, 1);
      assert.equal(academy.athleteCount, 0);
      assert.equal(academy.isPublic, true);
    });
  });

  // ---------------------------------------------------------------------------
  // updateBranding
  // ---------------------------------------------------------------------------
  describe('updateBranding', () => {
    test('updates branding and returns ok', async () => {
      const result = await academyService.updateBranding('academy_1', {
        primaryColor: '#FF0000',
        email: 'new@test.com',
      });
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.primaryColor, '#FF0000');
      }
    });

    test('returns err for unknown academy', async () => {
      const result = await academyService.updateBranding(`unknown_${rid()}`, {
        primaryColor: '#000',
      });
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // updateSettings
  // ---------------------------------------------------------------------------
  describe('updateSettings', () => {
    test('updates settings and returns ok', async () => {
      const result = await academyService.updateSettings('academy_1', {
        name: 'Updated Academy Name',
        isPublic: false,
      });
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.name, 'Updated Academy Name');
        assert.equal(result.data.isPublic, false);
      }
    });

    test('returns err for unknown academy', async () => {
      const result = await academyService.updateSettings(`unknown_${rid()}`, { name: 'X' });
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // getStaff
  // ---------------------------------------------------------------------------
  describe('getStaff', () => {
    test('returns staff for known academy sorted by role', async () => {
      const staff = await academyService.getStaff('academy_1');
      assert.ok(Array.isArray(staff));
      assert.ok(staff.length >= 1);
      // First should be OWNER
      assert.equal(staff[0].role, 'OWNER');
    });
  });

  // ---------------------------------------------------------------------------
  // createInvite
  // ---------------------------------------------------------------------------
  describe('createInvite', () => {
    test('creates invite with code', async () => {
      const invite = await academyService.createInvite(
        'academy_1',
        'East London FC Academy',
        'COACH',
        ['CREATE_SESSIONS'],
        'coach1',
        'Marcus Thompson',
        30,
        5,
      );

      assert.ok(invite.id);
      assert.ok(invite.code);
      assert.equal(invite.academyId, 'academy_1');
      assert.equal(invite.role, 'COACH');
      assert.equal(invite.maxUses, 5);
      assert.equal(invite.currentUses, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // joinWithCode
  // ---------------------------------------------------------------------------
  describe('joinWithCode', () => {
    test('joins with valid code', async () => {
      const invite = await academyService.createInvite(
        'academy_1',
        'East London FC Academy',
        'COACH',
        ['CREATE_SESSIONS'],
        'coach1',
        'Marcus Thompson',
        30,
        5,
      );

      const userId = `user_${rid()}`;
      const result = await academyService.joinWithCode(invite.code, userId, 'New Coach');
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.userId, userId);
        assert.equal(result.data.role, 'COACH');
        assert.equal(result.data.status, 'ACTIVE');
      }
    });

    test('returns err for invalid code', async () => {
      const result = await academyService.joinWithCode(`INVALID_${rid()}`, 'u1', 'Name');
      assert.equal(result.success, false);
    });

    test('returns err for already a member', async () => {
      // coach1 is already a member of academy_1 via mock data
      // Use the existing mock invite code 'ELFC2026'
      const result = await academyService.joinWithCode('ELFC2026', 'coach1', 'Marcus Thompson');
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // updateMemberRole
  // ---------------------------------------------------------------------------
  describe('updateMemberRole', () => {
    test('updates role and returns ok', async () => {
      const result = await academyService.updateMemberRole('mem_2', 'ADMIN', [
        'MANAGE_STAFF',
        'CREATE_SESSIONS',
      ]);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.role, 'ADMIN');
      }
    });

    test('returns err for unknown membership', async () => {
      const result = await academyService.updateMemberRole(`mem_${rid()}`, 'COACH', []);
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // removeMember
  // ---------------------------------------------------------------------------
  describe('removeMember', () => {
    test('suspends member and returns ok', async () => {
      // mem_3 is ASSISTANT
      const result = await academyService.removeMember('mem_3');
      assert.equal(result.success, true);
    });

    test('returns err when removing OWNER', async () => {
      // mem_1 is OWNER
      const result = await academyService.removeMember('mem_1');
      assert.equal(result.success, false);
    });

    test('returns err for unknown membership', async () => {
      const result = await academyService.removeMember(`mem_${rid()}`);
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // hasPermission
  // ---------------------------------------------------------------------------
  describe('hasPermission', () => {
    test('owner has all permissions', async () => {
      const has = await academyService.hasPermission('academy_1', 'coach1', 'MANAGE_BILLING');
      assert.equal(has, true);
    });

    test('coach only has assigned permissions', async () => {
      const has = await academyService.hasPermission('academy_1', 'coach_3', 'CREATE_SESSIONS');
      assert.equal(has, true);

      const noHas = await academyService.hasPermission('academy_1', 'coach_3', 'MANAGE_BILLING');
      assert.equal(noHas, false);
    });

    test('unknown user has no permissions', async () => {
      const has = await academyService.hasPermission('academy_1', `nobody_${rid()}`, 'CREATE_SESSIONS');
      assert.equal(has, false);
    });
  });

  // ---------------------------------------------------------------------------
  // formatRole
  // ---------------------------------------------------------------------------
  describe('formatRole', () => {
    test('returns display labels', () => {
      assert.equal(academyService.formatRole('OWNER'), 'Owner');
      assert.equal(academyService.formatRole('COACH'), 'Coach');
      assert.equal(academyService.formatRole('ASSISTANT'), 'Assistant');
    });
  });
});
