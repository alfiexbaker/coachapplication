import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';

import { messagingService } from '@/services/messaging-service';
import { blockService } from '@/services/block-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('MessagingService blocking', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.BLOCKED_USERS);
    await apiClient.remove(STORAGE_KEYS.MESSAGES);
  });

  test('returns a block-specific conflict error when users are blocked', async () => {
    await blockService.blockUser('parent_1', 'coach1');

    const result = await messagingService.sendMessage(
      'thread_tom_coach1',
      'Hello coach',
      'parent',
      'Parent One',
      [],
      'parent_1',
      'coach1',
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'CONFLICT');
      assert.equal(
        result.error.message,
        'Messaging is unavailable because one side has blocked the other.',
      );
    }
  });
});
