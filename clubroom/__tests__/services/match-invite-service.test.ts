/**
 * Match Invite Service Tests
 *
 * Tests for squad invites to matches with availability requests.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { matchInviteService } from '../../services/invite/match-invite-service';

describe('matchInviteService', () => {
  describe('getMatchInvites', () => {
    test('returns array of squad invites for match', async () => {
      const invites = await matchInviteService.getMatchInvites('match_1');
      assert.ok(Array.isArray(invites));
    });
  });

  describe('getCoachMatchInvites', () => {
    test('returns array of invites for coach', async () => {
      const invites = await matchInviteService.getCoachMatchInvites('coach_1');
      assert.ok(Array.isArray(invites));
    });
  });
});
