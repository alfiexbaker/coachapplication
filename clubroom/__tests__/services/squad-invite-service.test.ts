/**
 * Squad Invite Service Tests
 *
 * Tests for squad-level invite queries, member metadata, and history.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  loadSquadInvites,
  saveSquadInvites,
  loadSquadSessionInvites,
  loadInviteHistory,
} from '../../services/invite/squad-invite-service';

describe('squad-invite-service persistence helpers', () => {
  describe('loadSquadInvites', () => {
    test('returns array', async () => {
      const invites = await loadSquadInvites();
      assert.ok(Array.isArray(invites));
    });
  });

  describe('loadSquadSessionInvites', () => {
    test('returns array', async () => {
      const invites = await loadSquadSessionInvites();
      assert.ok(Array.isArray(invites));
    });
  });

  describe('loadInviteHistory', () => {
    test('returns array', async () => {
      const history = await loadInviteHistory();
      assert.ok(Array.isArray(history));
    });
  });

  describe('saveSquadInvites', () => {
    test('does not throw', async () => {
      await assert.doesNotReject(async () => {
        await saveSquadInvites([]);
      });
    });
  });
});
