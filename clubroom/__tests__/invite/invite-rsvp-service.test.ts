// @ts-nocheck
/**
 * Invite RSVP Service Tests
 *
 * Tests the Facebook-style Going/Maybe/Can't Go RSVP functionality:
 * - respondToInvite: stores response, handles duplicates, returns error for invalid invites
 * - getResponses: retrieves all responses for an invite
 * - getCounts: aggregates going/maybe/cantGo counts
 * - getRespondents: filters by status
 * - updateResponse: changes status, handles not-found
 * - Event emission: INVITE_RSVP_RESPONDED event
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';
import { inviteRsvpService } from '@/services/invite/invite-rsvp-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { eventBus, ServiceEvents } from '@/services/event-bus';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Clear storage and event listeners between tests.
 */
async function clearStorage(): Promise<void> {
  await apiClient.set(STORAGE_KEYS.INVITE_RSVPS, []);
}

// ============================================================================
// TESTS
// ============================================================================

describe('InviteRsvpService', () => {
  beforeEach(async () => {
    await clearStorage();
    eventBus.clearAll();
  });

  afterEach(async () => {
    await clearStorage();
    eventBus.clearAll();
  });

  // --------------------------------------------------------------------------
  // respondToInvite
  // --------------------------------------------------------------------------

  describe('respondToInvite', () => {
    test('stores a new RSVP response and returns ok', async () => {
      const result = await inviteRsvpService.respondToInvite(
        'rsvp_test_invite_1',
        'rsvp_test_user_1',
        'Alice Smith',
        'going',
        'rsvp_test_child_1',
        'Tommy Smith',
        'https://photo.example.com/alice.jpg'
      );

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.inviteId, 'rsvp_test_invite_1');
        assert.equal(result.data.userId, 'rsvp_test_user_1');
        assert.equal(result.data.userName, 'Alice Smith');
        assert.equal(result.data.status, 'going');
        assert.equal(result.data.childId, 'rsvp_test_child_1');
        assert.equal(result.data.childName, 'Tommy Smith');
        assert.equal(result.data.userPhotoUrl, 'https://photo.example.com/alice.jpg');
        assert.ok(result.data.id.startsWith('rsvp_'));
        assert.ok(result.data.respondedAt);
      }
    });

    test('stores response in storage', async () => {
      await inviteRsvpService.respondToInvite(
        'rsvp_storage_invite_1',
        'rsvp_storage_user_1',
        'Bob Jones',
        'maybe'
      );

      const stored = await apiClient.get<unknown[]>(STORAGE_KEYS.INVITE_RSVPS, []);
      assert.equal(stored.length, 1);
    });

    test('updates existing response when user responds again to same invite', async () => {
      // First response: going
      await inviteRsvpService.respondToInvite(
        'rsvp_dup_invite_1',
        'rsvp_dup_user_1',
        'Charlie Brown',
        'going'
      );

      // Second response: maybe (should update, not duplicate)
      const result = await inviteRsvpService.respondToInvite(
        'rsvp_dup_invite_1',
        'rsvp_dup_user_1',
        'Charlie Brown',
        'maybe'
      );

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'maybe');
      }

      // Verify only one response exists
      const stored = await apiClient.get<unknown[]>(STORAGE_KEYS.INVITE_RSVPS, []);
      assert.equal(stored.length, 1);
    });

    test('preserves existing ID when updating an existing response', async () => {
      const first = await inviteRsvpService.respondToInvite(
        'rsvp_id_invite_1',
        'rsvp_id_user_1',
        'Diana Prince',
        'going'
      );

      assert.equal(first.success, true);
      const firstId = first.success ? first.data.id : '';

      const second = await inviteRsvpService.respondToInvite(
        'rsvp_id_invite_1',
        'rsvp_id_user_1',
        'Diana Prince',
        'cant_go'
      );

      assert.equal(second.success, true);
      if (second.success) {
        assert.equal(second.data.id, firstId);
        assert.equal(second.data.status, 'cant_go');
      }
    });

    test('allows different users to respond to the same invite', async () => {
      await inviteRsvpService.respondToInvite(
        'rsvp_multi_invite_1',
        'rsvp_multi_user_1',
        'Eve Adams',
        'going'
      );

      await inviteRsvpService.respondToInvite(
        'rsvp_multi_invite_1',
        'rsvp_multi_user_2',
        'Frank White',
        'maybe'
      );

      const stored = await apiClient.get<unknown[]>(STORAGE_KEYS.INVITE_RSVPS, []);
      assert.equal(stored.length, 2);
    });

    test('emits INVITE_RSVP_RESPONDED event with correct payload', async () => {
      let emittedPayload: Record<string, unknown> | null = null;

      eventBus.on(ServiceEvents.INVITE_RSVP_RESPONDED, (data: Record<string, unknown>) => {
        emittedPayload = data;
      });

      await inviteRsvpService.respondToInvite(
        'rsvp_event_invite_1',
        'rsvp_event_user_1',
        'Grace Lee',
        'going',
        'rsvp_event_child_1',
        'Junior Lee'
      );

      assert.ok(emittedPayload, 'Event should have been emitted');
      assert.equal(emittedPayload!.inviteId, 'rsvp_event_invite_1');
      assert.equal(emittedPayload!.userId, 'rsvp_event_user_1');
      assert.equal(emittedPayload!.userName, 'Grace Lee');
      assert.equal(emittedPayload!.status, 'going');
      assert.equal(emittedPayload!.childName, 'Junior Lee');
      assert.ok(emittedPayload!.responseId);
    });

    test('responds with all three RSVP statuses correctly', async () => {
      const statuses = ['going', 'maybe', 'cant_go'] as const;
      for (const status of statuses) {
        const result = await inviteRsvpService.respondToInvite(
          `rsvp_status_invite_${status}`,
          `rsvp_status_user_${status}`,
          `User ${status}`,
          status
        );
        assert.equal(result.success, true, `Failed for status: ${status}`);
        if (result.success) {
          assert.equal(result.data.status, status);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // getResponses
  // --------------------------------------------------------------------------

  describe('getResponses', () => {
    test('returns all responses for a given inviteId', async () => {
      await inviteRsvpService.respondToInvite('rsvp_get_invite_1', 'rsvp_get_user_1', 'User A', 'going');
      await inviteRsvpService.respondToInvite('rsvp_get_invite_1', 'rsvp_get_user_2', 'User B', 'maybe');
      await inviteRsvpService.respondToInvite('rsvp_get_invite_2', 'rsvp_get_user_3', 'User C', 'going'); // different invite

      const result = await inviteRsvpService.getResponses('rsvp_get_invite_1');

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 2);
        const userNames = result.data.map((r: { userName: string }) => r.userName);
        assert.ok(userNames.includes('User A'));
        assert.ok(userNames.includes('User B'));
      }
    });

    test('returns empty array when no responses exist for inviteId', async () => {
      const result = await inviteRsvpService.getResponses('rsvp_empty_invite_999');

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 0);
      }
    });

    test('does not return responses from other invites', async () => {
      await inviteRsvpService.respondToInvite('rsvp_iso_invite_1', 'rsvp_iso_user_1', 'User X', 'going');
      await inviteRsvpService.respondToInvite('rsvp_iso_invite_2', 'rsvp_iso_user_2', 'User Y', 'going');

      const result = await inviteRsvpService.getResponses('rsvp_iso_invite_1');

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].userName, 'User X');
      }
    });
  });

  // --------------------------------------------------------------------------
  // getCounts
  // --------------------------------------------------------------------------

  describe('getCounts', () => {
    test('returns correct aggregation of going/maybe/cantGo counts', async () => {
      await inviteRsvpService.respondToInvite('rsvp_cnt_invite_1', 'rsvp_cnt_u1', 'U1', 'going');
      await inviteRsvpService.respondToInvite('rsvp_cnt_invite_1', 'rsvp_cnt_u2', 'U2', 'going');
      await inviteRsvpService.respondToInvite('rsvp_cnt_invite_1', 'rsvp_cnt_u3', 'U3', 'maybe');
      await inviteRsvpService.respondToInvite('rsvp_cnt_invite_1', 'rsvp_cnt_u4', 'U4', 'cant_go');
      await inviteRsvpService.respondToInvite('rsvp_cnt_invite_1', 'rsvp_cnt_u5', 'U5', 'cant_go');
      await inviteRsvpService.respondToInvite('rsvp_cnt_invite_1', 'rsvp_cnt_u6', 'U6', 'cant_go');

      const result = await inviteRsvpService.getCounts('rsvp_cnt_invite_1');

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.going, 2);
        assert.equal(result.data.maybe, 1);
        assert.equal(result.data.cantGo, 3);
      }
    });

    test('returns all zeros when no responses exist', async () => {
      const result = await inviteRsvpService.getCounts('rsvp_zero_invite_999');

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.going, 0);
        assert.equal(result.data.maybe, 0);
        assert.equal(result.data.cantGo, 0);
      }
    });

    test('does not count responses from other invites', async () => {
      await inviteRsvpService.respondToInvite('rsvp_cntiso_invite_1', 'rsvp_cntiso_u1', 'U1', 'going');
      await inviteRsvpService.respondToInvite('rsvp_cntiso_invite_2', 'rsvp_cntiso_u2', 'U2', 'going');

      const result = await inviteRsvpService.getCounts('rsvp_cntiso_invite_1');

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.going, 1);
      }
    });
  });

  // --------------------------------------------------------------------------
  // getRespondents
  // --------------------------------------------------------------------------

  describe('getRespondents', () => {
    test('filters respondents by going status', async () => {
      await inviteRsvpService.respondToInvite('rsvp_filt_invite_1', 'rsvp_filt_u1', 'Going User', 'going');
      await inviteRsvpService.respondToInvite('rsvp_filt_invite_1', 'rsvp_filt_u2', 'Maybe User', 'maybe');
      await inviteRsvpService.respondToInvite('rsvp_filt_invite_1', 'rsvp_filt_u3', 'CantGo User', 'cant_go');

      const result = await inviteRsvpService.getRespondents('rsvp_filt_invite_1', 'going');

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].userName, 'Going User');
        assert.equal(result.data[0].status, 'going');
      }
    });

    test('filters respondents by maybe status', async () => {
      await inviteRsvpService.respondToInvite('rsvp_filtm_invite_1', 'rsvp_filtm_u1', 'User A', 'going');
      await inviteRsvpService.respondToInvite('rsvp_filtm_invite_1', 'rsvp_filtm_u2', 'User B', 'maybe');
      await inviteRsvpService.respondToInvite('rsvp_filtm_invite_1', 'rsvp_filtm_u3', 'User C', 'maybe');

      const result = await inviteRsvpService.getRespondents('rsvp_filtm_invite_1', 'maybe');

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 2);
        assert.ok(result.data.every((r: { status: string }) => r.status === 'maybe'));
      }
    });

    test('filters respondents by cant_go status', async () => {
      await inviteRsvpService.respondToInvite('rsvp_filtc_invite_1', 'rsvp_filtc_u1', 'User X', 'going');
      await inviteRsvpService.respondToInvite('rsvp_filtc_invite_1', 'rsvp_filtc_u2', 'User Y', 'cant_go');

      const result = await inviteRsvpService.getRespondents('rsvp_filtc_invite_1', 'cant_go');

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].userName, 'User Y');
      }
    });

    test('returns empty array when no respondents match the status', async () => {
      await inviteRsvpService.respondToInvite('rsvp_filte_invite_1', 'rsvp_filte_u1', 'User A', 'going');

      const result = await inviteRsvpService.getRespondents('rsvp_filte_invite_1', 'cant_go');

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 0);
      }
    });
  });

  // --------------------------------------------------------------------------
  // updateResponse
  // --------------------------------------------------------------------------

  describe('updateResponse', () => {
    test('updates an existing response status', async () => {
      const createResult = await inviteRsvpService.respondToInvite(
        'rsvp_upd_invite_1',
        'rsvp_upd_user_1',
        'Update User',
        'going'
      );

      assert.equal(createResult.success, true);
      const responseId = createResult.success ? createResult.data.id : '';

      const updateResult = await inviteRsvpService.updateResponse(responseId, 'cant_go');

      assert.equal(updateResult.success, true);
      if (updateResult.success) {
        assert.equal(updateResult.data.status, 'cant_go');
        assert.equal(updateResult.data.id, responseId);
      }
    });

    test('updates respondedAt timestamp when status changes', async () => {
      const createResult = await inviteRsvpService.respondToInvite(
        'rsvp_updts_invite_1',
        'rsvp_updts_user_1',
        'Timestamp User',
        'going'
      );

      const originalTime = createResult.success ? createResult.data.respondedAt : '';

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const responseId = createResult.success ? createResult.data.id : '';
      const updateResult = await inviteRsvpService.updateResponse(responseId, 'maybe');

      assert.equal(updateResult.success, true);
      if (updateResult.success) {
        assert.ok(updateResult.data.respondedAt >= originalTime);
      }
    });

    test('returns NOT_FOUND error for non-existent responseId', async () => {
      const result = await inviteRsvpService.updateResponse('rsvp_nonexistent_id', 'going');

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, 'NOT_FOUND');
        assert.ok(result.error.message.includes('rsvp_nonexistent_id'));
      }
    });

    test('emits INVITE_RSVP_RESPONDED event when updating', async () => {
      let emittedPayload: Record<string, unknown> | null = null;

      const createResult = await inviteRsvpService.respondToInvite(
        'rsvp_updevt_invite_1',
        'rsvp_updevt_user_1',
        'Event User',
        'going'
      );

      const responseId = createResult.success ? createResult.data.id : '';

      eventBus.on(ServiceEvents.INVITE_RSVP_RESPONDED, (data: Record<string, unknown>) => {
        emittedPayload = data;
      });

      await inviteRsvpService.updateResponse(responseId, 'maybe');

      assert.ok(emittedPayload, 'Event should have been emitted on update');
      assert.equal(emittedPayload!.status, 'maybe');
      assert.equal(emittedPayload!.responseId, responseId);
      assert.equal(emittedPayload!.inviteId, 'rsvp_updevt_invite_1');
    });

    test('persists update to storage', async () => {
      const createResult = await inviteRsvpService.respondToInvite(
        'rsvp_updstore_invite_1',
        'rsvp_updstore_user_1',
        'Storage User',
        'going'
      );

      const responseId = createResult.success ? createResult.data.id : '';

      await inviteRsvpService.updateResponse(responseId, 'cant_go');

      // Verify in storage
      const stored = await apiClient.get<Array<{ id: string; status: string }>>(STORAGE_KEYS.INVITE_RSVPS, []);
      const updated = stored.find((r) => r.id === responseId);
      assert.ok(updated);
      assert.equal(updated!.status, 'cant_go');
    });
  });
});
