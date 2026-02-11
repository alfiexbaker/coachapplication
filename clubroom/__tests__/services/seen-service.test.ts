import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { seenService } from '@/services/seen-service';

describe('seenService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SEEN_STATUSES);
  });

  it('marks seen status and retrieves it (happy path)', async () => {
    const markResult = await seenService.markSeen('message', 'msg-1', 'user-1');
    assert.equal(markResult.success, true);

    const statusResult = await seenService.getSeenStatus('message', 'msg-1');
    assert.equal(statusResult.success, true);
    if (!statusResult.success) return;

    assert.equal(statusResult.data?.seenBy, 'user-1');
    assert.ok(statusResult.data?.seenAt);
  });

  it('returns empty list when no statuses are present (empty path)', async () => {
    const statusesResult = await seenService.getSeenStatuses('message', ['msg-1', 'msg-2']);
    assert.equal(statusesResult.success, true);
    if (!statusesResult.success) return;

    assert.deepEqual(statusesResult.data, []);
  });

  it('returns err when storage read fails (error path)', async () => {
    const apiClientInternals = apiClient as unknown as {
      get: typeof apiClient.get;
    };
    const originalGet = apiClientInternals.get;
    apiClientInternals.get = async () => {
      throw new Error('forced seen storage failure');
    };

    try {
      const result = await seenService.markSeen('message', 'msg-err', 'user-err');
      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'STORAGE');
    } finally {
      apiClientInternals.get = originalGet;
    }
  });
});
