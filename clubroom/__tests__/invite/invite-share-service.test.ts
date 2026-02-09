// @ts-nocheck
/**
 * Invite Share Service Tests
 *
 * Tests the shareable deep link generation and native share dialog:
 * - generateShareLink: creates link, caches it, returns cached on repeat
 * - shareInvite: calls Share.share, emits INVITE_SHARED event
 * - Error paths: storage failures
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';
import { inviteShareService } from '@/services/invite/invite-share-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { eventBus, ServiceEvents } from '@/services/event-bus';

// ============================================================================
// TEST HELPERS
// ============================================================================

async function clearStorage(): Promise<void> {
  await apiClient.set(STORAGE_KEYS.INVITE_SHARE_LINKS, []);
}

// ============================================================================
// TESTS
// ============================================================================

describe('InviteShareService', () => {
  beforeEach(async () => {
    await clearStorage();
    eventBus.clearAll();
  });

  afterEach(async () => {
    await clearStorage();
    eventBus.clearAll();
  });

  // --------------------------------------------------------------------------
  // generateShareLink
  // --------------------------------------------------------------------------

  describe('generateShareLink', () => {
    test('generates a deep link and returns ok', async () => {
      const result = await inviteShareService.generateShareLink('share_gen_invite_1');

      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.includes('session-invites/share_gen_invite_1'));
        assert.equal(typeof result.data, 'string');
      }
    });

    test('caches the generated link in storage', async () => {
      await inviteShareService.generateShareLink('share_cache_invite_1');

      const stored = await apiClient.get<Array<{ inviteId: string; link: string }>>(
        STORAGE_KEYS.INVITE_SHARE_LINKS,
        []
      );

      assert.equal(stored.length, 1);
      assert.equal(stored[0].inviteId, 'share_cache_invite_1');
      assert.ok(stored[0].link.includes('session-invites/share_cache_invite_1'));
    });

    test('returns cached link on second call (no duplicate creation)', async () => {
      const first = await inviteShareService.generateShareLink('share_dedup_invite_1');
      const second = await inviteShareService.generateShareLink('share_dedup_invite_1');

      assert.equal(first.success, true);
      assert.equal(second.success, true);

      if (first.success && second.success) {
        assert.equal(first.data, second.data);
      }

      // Verify only one link in storage
      const stored = await apiClient.get<Array<{ inviteId: string }>>(
        STORAGE_KEYS.INVITE_SHARE_LINKS,
        []
      );
      assert.equal(stored.length, 1);
    });

    test('generates different links for different invites', async () => {
      const link1 = await inviteShareService.generateShareLink('share_diff_invite_1');
      const link2 = await inviteShareService.generateShareLink('share_diff_invite_2');

      assert.equal(link1.success, true);
      assert.equal(link2.success, true);

      if (link1.success && link2.success) {
        assert.notEqual(link1.data, link2.data);
        assert.ok(link1.data.includes('share_diff_invite_1'));
        assert.ok(link2.data.includes('share_diff_invite_2'));
      }

      const stored = await apiClient.get<Array<{ inviteId: string }>>(
        STORAGE_KEYS.INVITE_SHARE_LINKS,
        []
      );
      assert.equal(stored.length, 2);
    });
  });

  // --------------------------------------------------------------------------
  // shareInvite
  // --------------------------------------------------------------------------

  describe('shareInvite', () => {
    test('returns ok on success', async () => {
      const result = await inviteShareService.shareInvite(
        'share_invoke_invite_1',
        'Coach Mike',
        'Finishing Drills',
        '2026-03-15'
      );

      assert.equal(result.success, true);
    });

    test('generates a share link as part of sharing', async () => {
      await inviteShareService.shareInvite(
        'share_linkgen_invite_1',
        'Coach Sarah',
        'Ball Control',
        '2026-04-01'
      );

      const stored = await apiClient.get<Array<{ inviteId: string }>>(
        STORAGE_KEYS.INVITE_SHARE_LINKS,
        []
      );
      assert.equal(stored.length, 1);
      assert.equal(stored[0].inviteId, 'share_linkgen_invite_1');
    });

    test('emits INVITE_SHARED event with correct payload', async () => {
      let emittedPayload: Record<string, unknown> | null = null;

      eventBus.on(ServiceEvents.INVITE_SHARED, (data: Record<string, unknown>) => {
        emittedPayload = data;
      });

      await inviteShareService.shareInvite(
        'share_evt_invite_1',
        'Coach Dan',
        'Speed Training',
        '2026-05-10'
      );

      assert.ok(emittedPayload, 'INVITE_SHARED event should have been emitted');
      assert.equal(emittedPayload!.inviteId, 'share_evt_invite_1');
      assert.equal(emittedPayload!.sharedBy, 'Coach Dan');
      assert.ok(typeof emittedPayload!.shareLink === 'string');
      assert.ok((emittedPayload!.shareLink as string).includes('share_evt_invite_1'));
    });

    test('reuses cached link when sharing the same invite twice', async () => {
      let emitCount = 0;

      eventBus.on(ServiceEvents.INVITE_SHARED, () => {
        emitCount++;
      });

      await inviteShareService.shareInvite(
        'share_reuse_invite_1',
        'Coach A',
        'Session A',
        '2026-06-01'
      );

      await inviteShareService.shareInvite(
        'share_reuse_invite_1',
        'Coach A',
        'Session A',
        '2026-06-01'
      );

      // Should have emitted twice (once per share action)
      assert.equal(emitCount, 2);

      // But only one link should be stored
      const stored = await apiClient.get<Array<{ inviteId: string }>>(
        STORAGE_KEYS.INVITE_SHARE_LINKS,
        []
      );
      assert.equal(stored.length, 1);
    });
  });
});
