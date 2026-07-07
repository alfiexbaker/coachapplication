import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('reportService API mode', () => {
  it('blocks generic local report persistence until a backend report route exists', async () => {
    const [{ reportService }, { apiClient }] = await Promise.all([
      import('@/services/report-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    apiClient.get = async () => {
      throw new Error('local report reads should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local report writes should not run in API mode');
    };

    try {
      const submitted = await reportService.submitReport({
        reportedUserId: 'user_reported_api',
        reportedByUserId: 'user_reporter_api',
        type: 'spam',
        context: 'profile',
        description: 'Repeated spam messages',
      });
      assert.equal(submitted.success, false);
      assert.equal(!submitted.success && submitted.error.code, 'UNSUPPORTED');
      assert.equal(
        !submitted.success && (submitted.error.details as { route?: string } | undefined)?.route,
        '/v1/reports',
      );

      const listed = await reportService.getReports();
      assert.equal(listed.success, false);
      assert.equal(!listed.success && listed.error.code, 'UNSUPPORTED');
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
    }
  });
});
