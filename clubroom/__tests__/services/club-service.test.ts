/**
 * Club Service Tests
 *
 * Tests for club members, removal, undo, role change, ban, squad management,
 * branding, dashboard, calendar, and helper methods.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { clubService } from '../../services/club-service';
import { apiClient } from '../../services/api-client';
import { eventBus, onTyped, ServiceEvents } from '../../services/event-bus';

const rid = () => Math.random().toString(36).slice(2, 10);
const CLUB_ID = `club_${rid()}`;

describe('clubService', () => {
  beforeEach(async () => {
    clubService.__resetMockMembers(CLUB_ID);
    await apiClient.remove(`club_branding_${CLUB_ID}`);
    eventBus.clearAll();
  });

  // ---------------------------------------------------------------------------
  // getMembers
  // ---------------------------------------------------------------------------
  describe('getMembers', () => {
    test('returns mock members for club', async () => {
      const members = await clubService.getMembers(CLUB_ID);
      assert.ok(Array.isArray(members));
      assert.ok(members.length >= 1);
    });
  });

  // ---------------------------------------------------------------------------
  // getMember
  // ---------------------------------------------------------------------------
  describe('getMember', () => {
    test('returns member by userId', async () => {
      const member = await clubService.getMember(CLUB_ID, 'coach1');
      assert.ok(member);
      assert.equal(member!.userId, 'coach1');
    });

    test('returns null for unknown userId', async () => {
      const member = await clubService.getMember(CLUB_ID, `unknown_${rid()}`);
      assert.equal(member, null);
    });
  });

  // ---------------------------------------------------------------------------
  // removeMember + undoRemoval
  // ---------------------------------------------------------------------------
  describe('removeMember', () => {
    test('removes member and emits CLUB_MEMBER_LEFT event', async () => {
      let emitted = false;
      eventBus.on(ServiceEvents.CLUB_MEMBER_LEFT, () => {
        emitted = true;
      });

      const result = await clubService.removeMember(
        CLUB_ID,
        'parent1',
        'LEFT_CLUB',
        { id: 'coach1', name: 'Director Kelly' },
      );
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.userId, 'parent1');
        assert.equal(result.data.reason, 'LEFT_CLUB');
      }
      assert.equal(emitted, true);
    });

    test('returns err for unknown member', async () => {
      const result = await clubService.removeMember(
        CLUB_ID,
        `unknown_${rid()}`,
        'INACTIVE',
        { id: 'coach1', name: 'Director Kelly' },
      );
      assert.strictEqual(result.success, false);
    });
  });

  describe('undoRemoval', () => {
    test('restores removed member', async () => {
      const removed = await clubService.removeMember(
        CLUB_ID,
        'parent2',
        'LEFT_CLUB',
        { id: 'coach1', name: 'Director Kelly' },
      );
      if (!removed.success) return;

      const result = await clubService.undoRemoval(CLUB_ID, removed.data.id);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.userId, 'parent2');
        assert.equal(result.data.status, 'active');
      }
    });

    test('returns err for unknown removal id', async () => {
      const result = await clubService.undoRemoval(CLUB_ID, `unknown_${rid()}`);
      assert.strictEqual(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // changeMemberRole
  // ---------------------------------------------------------------------------
  describe('changeMemberRole', () => {
    test('updates member role', async () => {
      const result = await clubService.changeMemberRole(
        CLUB_ID,
        'parent1',
        'COACH',
        { id: 'coach1', name: 'Director Kelly' },
      );
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.role, 'COACH');
      }
    });

    test('returns err for unknown member', async () => {
      const result = await clubService.changeMemberRole(
        CLUB_ID,
        `unknown_${rid()}`,
        'MEMBER',
        { id: 'coach1', name: 'Director Kelly' },
      );
      assert.strictEqual(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // banMember
  // ---------------------------------------------------------------------------
  describe('banMember', () => {
    test('bans member and emits event', async () => {
      let emitted = false;
      eventBus.on(ServiceEvents.CLUB_MEMBER_LEFT, () => {
        emitted = true;
      });

      const result = await clubService.banMember(
        CLUB_ID,
        'parent1',
        'Misconduct',
        { id: 'coach1', name: 'Director Kelly' },
      );
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.reason, 'CONDUCT');
      }
      assert.equal(emitted, true);
    });

    test('returns err for unknown member', async () => {
      const result = await clubService.banMember(
        CLUB_ID,
        `unknown_${rid()}`,
        'Bad',
        { id: 'coach1', name: 'Director Kelly' },
      );
      assert.strictEqual(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // addMemberToSquad + removeMemberFromSquad
  // ---------------------------------------------------------------------------
  describe('squad management', () => {
    test('adds member to squad and emits SQUAD_MEMBER_ADDED', async () => {
      let emitted = false;
      eventBus.on(ServiceEvents.SQUAD_MEMBER_ADDED, () => {
        emitted = true;
      });

      const result = await clubService.addMemberToSquad(CLUB_ID, 'parent1', 'squad_u15');
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.squadIds?.includes('squad_u15'));
      }
      assert.equal(emitted, true);
    });

    test('removes member from squad and emits SQUAD_MEMBER_REMOVED', async () => {
      // First add to squad
      await clubService.addMemberToSquad(CLUB_ID, 'parent1', 'squad_u15');

      let emitted = false;
      eventBus.on(ServiceEvents.SQUAD_MEMBER_REMOVED, () => {
        emitted = true;
      });

      const result = await clubService.removeMemberFromSquad(CLUB_ID, 'parent1', 'squad_u15');
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(!result.data.squadIds?.includes('squad_u15'));
      }
      assert.equal(emitted, true);
    });
  });

  // ---------------------------------------------------------------------------
  // Role helper methods
  // ---------------------------------------------------------------------------
  describe('canRemoveMembers', () => {
    test('OWNER can remove', () => assert.equal(clubService.canRemoveMembers('OWNER'), true));
    test('ADMIN can remove', () => assert.equal(clubService.canRemoveMembers('ADMIN'), true));
    test('HEAD_COACH can remove', () => assert.equal(clubService.canRemoveMembers('HEAD_COACH'), true));
    test('MEMBER cannot remove', () => assert.strictEqual(clubService.canRemoveMembers('MEMBER'), false));
  });

  describe('canBeRemoved', () => {
    test('OWNER cannot be removed', () => assert.strictEqual(clubService.canBeRemoved('OWNER'), false));
    test('MEMBER can be removed', () => assert.equal(clubService.canBeRemoved('MEMBER'), true));
  });

  describe('canManageRole', () => {
    test('OWNER can manage ADMIN', () => assert.equal(clubService.canManageRole('OWNER', 'ADMIN'), true));
    test('MEMBER cannot manage COACH', () => assert.strictEqual(clubService.canManageRole('MEMBER', 'COACH'), false));
  });

  describe('getAssignableRoles', () => {
    test('OWNER can assign all below', () => {
      const roles = clubService.getAssignableRoles('OWNER');
      assert.deepEqual(roles, ['ADMIN', 'HEAD_COACH', 'COACH', 'ASSISTANT', 'MEMBER']);
    });
  });

  // ---------------------------------------------------------------------------
  // Format helpers
  // ---------------------------------------------------------------------------
  describe('formatRemovalReason', () => {
    test('formats known reasons', () => {
      assert.equal(clubService.formatRemovalReason('LEFT_CLUB'), 'Left club');
      assert.equal(clubService.formatRemovalReason('CONDUCT'), 'Conduct issue');
    });
  });

  describe('formatRole', () => {
    test('formats known roles', () => {
      assert.equal(clubService.formatRole('HEAD_COACH'), 'Head Coach');
      assert.equal(clubService.formatRole('ASSISTANT'), 'Assistant');
      assert.equal(clubService.formatRole('MEMBER'), 'Member');
    });
  });

  describe('getRoleColor', () => {
    test('returns color strings', () => {
      assert.equal(typeof clubService.getRoleColor('OWNER'), 'string');
      assert.equal(typeof clubService.getRoleColor('MEMBER'), 'string');
    });
  });

  // ---------------------------------------------------------------------------
  // Branding
  // ---------------------------------------------------------------------------
  describe('branding', () => {
    test('getBranding returns default for new club', async () => {
      const branding = await clubService.getBranding(CLUB_ID);
      assert.ok(branding);
      assert.equal(branding.clubId, CLUB_ID);
    });

    test('updateBranding persists and returns ok', async () => {
      const result = await clubService.updateBranding(CLUB_ID, {
        tagline: 'New tagline',
        primaryColor: '#FF0000',
      });
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.tagline, 'New tagline');
        assert.equal(result.data.primaryColor, '#FF0000');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------
  describe('getDashboardStats', () => {
    test('returns stats object', async () => {
      const stats = await clubService.getDashboardStats(CLUB_ID);
      assert.ok(typeof stats.sessionsThisWeek === 'number');
      assert.ok(typeof stats.memberCount === 'number');
    });
  });

  describe('getRecentResults', () => {
    test('returns match results', async () => {
      const results = await clubService.getRecentResults(CLUB_ID);
      assert.ok(Array.isArray(results));
      assert.ok(results.length <= 3);
    });
  });

  // ---------------------------------------------------------------------------
  // Calendar
  // ---------------------------------------------------------------------------
  describe('getCalendarEvents', () => {
    test('returns events array', async () => {
      const events = await clubService.getCalendarEvents(CLUB_ID);
      assert.ok(Array.isArray(events));
      assert.ok(events.length > 0);
    });

    test('filters by squad', async () => {
      const events = await clubService.getCalendarEvents(CLUB_ID, { squadId: 'squad_u15' });
      for (const e of events) {
        assert.ok(e.squadId === 'squad_u15' || !e.squadId);
      }
    });
  });

  describe('getCalendarSquads', () => {
    test('returns unique squads', async () => {
      const squads = await clubService.getCalendarSquads(CLUB_ID);
      assert.ok(Array.isArray(squads));
      const ids = squads.map((s) => s.id);
      assert.equal(new Set(ids).size, ids.length);
    });
  });
});
