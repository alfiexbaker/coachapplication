import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { reportService } from '@/services/report-service';

describe('reportService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.REPORTS);
  });

  it('submits and lists reports (happy path)', async () => {
    const submitResult = await reportService.submitReport({
      reportedUserId: 'user_reported_1',
      reportedByUserId: 'user_reporter_1',
      type: 'spam',
      context: 'profile',
      description: 'Repeated spam messages',
    });
    assert.equal(submitResult.success, true);
    if (!submitResult.success) return;

    const listResult = await reportService.getReports();
    assert.equal(listResult.success, true);
    if (!listResult.success) return;

    assert.ok(listResult.data.some((item) => item.id === submitResult.data.id));
  });

  it('returns empty list when no reports exist (empty path)', async () => {
    const result = await reportService.getReports();
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.deepEqual(result.data, []);
  });

  it('returns err when storage fails (error path)', async () => {
    const apiClientInternals = apiClient as unknown as { get: typeof apiClient.get };
    const originalGet = apiClientInternals.get;
    apiClientInternals.get = async () => {
      throw new Error('forced reports read failure');
    };

    try {
      const result = await reportService.getReports();
      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'STORAGE');
    } finally {
      apiClientInternals.get = originalGet;
    }
  });
});
