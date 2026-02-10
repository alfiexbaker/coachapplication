/**
 * Session Invite Service Tests
 *
 * Tests for individual session invite lifecycle: create, respond, cancel.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { sessionInviteService } from '../../services/invite/session-invite-service';

describe('sessionInviteService', () => {
  describe('getCoachInvites', () => {
    test('returns array of invites', async () => {
      const invites = await sessionInviteService.getCoachInvites('coach_1');
      assert.ok(Array.isArray(invites));
    });
  });

  describe('getParentInvites', () => {
    test('returns array of invites', async () => {
      const invites = await sessionInviteService.getParentInvites('parent_1');
      assert.ok(Array.isArray(invites));
    });
  });

  describe('getPendingInvites', () => {
    test('returns array of pending invites', async () => {
      const invites = await sessionInviteService.getPendingInvites();
      assert.ok(Array.isArray(invites));
    });
  });

  describe('getInviteHistory', () => {
    test('returns array of all invites', async () => {
      const history = await sessionInviteService.getInviteHistory();
      assert.ok(Array.isArray(history));
    });
  });

  describe('getInvite', () => {
    test('returns null for non-existent invite', async () => {
      const invite = await sessionInviteService.getInvite('nonexistent_inv');
      assert.equal(invite, null);
    });
  });

  describe('respondToInvite (Result pattern)', () => {
    test('returns err for non-existent invite', async () => {
      const result = await sessionInviteService.respondToInvite({
        inviteId: 'nonexistent_respond',
        response: 'DECLINED',
      });
      assert.equal(result.success, false);
    });
  });

  describe('acceptInvite (Result pattern)', () => {
    test('returns err for non-existent invite', async () => {
      const result = await sessionInviteService.acceptInvite(
        'nonexistent_accept',
        { date: '2026-06-15', startTime: '09:00', endTime: '10:00' }
      );
      assert.equal(result.success, false);
    });
  });

  describe('declineInvite (Result pattern)', () => {
    test('returns err for non-existent invite', async () => {
      const result = await sessionInviteService.declineInvite('nonexistent_decline');
      assert.equal(result.success, false);
    });
  });

  describe('cancelInvite', () => {
    test('does not throw for non-existent invite', async () => {
      await assert.doesNotReject(async () => {
        await sessionInviteService.cancelInvite('nonexistent_cancel');
      });
    });
  });

  describe('dismissInvite', () => {
    test('does not throw for non-existent invite', async () => {
      await assert.doesNotReject(async () => {
        await sessionInviteService.dismissInvite('nonexistent_dismiss');
      });
    });
  });

  describe('getOpenInvites', () => {
    test('returns array of open invites', async () => {
      const invites = await sessionInviteService.getOpenInvites();
      assert.ok(Array.isArray(invites));
    });
  });

  describe('getAvailableInvitesForParent', () => {
    test('returns array of available invites', async () => {
      const invites = await sessionInviteService.getAvailableInvitesForParent('parent_1');
      assert.ok(Array.isArray(invites));
    });
  });

  describe('generateWeekSlots', () => {
    test('generates correct number of week slots', () => {
      const slots = sessionInviteService.generateWeekSlots(
        [{ date: '2026-06-15', startTime: '09:00', endTime: '10:00' }],
        4,
        '2026-06-15'
      );
      assert.equal(slots.length, 4);
      assert.equal(slots[0].accepted, true);
    });

    test('returns empty for no proposed slots', () => {
      const slots = sessionInviteService.generateWeekSlots([], 4, '2026-06-15');
      assert.equal(slots.length, 0);
    });
  });

  describe('clearCache', () => {
    test('does not throw', async () => {
      await assert.doesNotReject(async () => {
        await sessionInviteService.clearCache();
      });
    });
  });
});
