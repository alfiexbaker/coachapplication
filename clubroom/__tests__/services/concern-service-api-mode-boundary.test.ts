import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const concernInput = {
  coachId: 'coach_api_1',
  athleteId: 'athlete_api_1',
  athleteName: 'API Athlete',
  type: 'SAFEGUARDING' as const,
  severity: 'HIGH' as const,
  title: 'Safeguarding concern',
  description: 'Needs live safeguarding authority.',
  status: 'OPEN' as const,
};

describe('concernService API mode boundary', () => {
  it('fails inherited local CRUD methods closed before local storage can run', async (t) => {
    const [{ concernService }, { apiClient }] = await Promise.all([
      import('@/services/concern-service'),
      import('@/services/api-client'),
    ]);

    const client = apiClient as unknown as {
      get: typeof apiClient.get;
      set: typeof apiClient.set;
      remove: typeof apiClient.remove;
    };
    const original = {
      get: client.get,
      set: client.set,
      remove: client.remove,
    };

    client.get = async () => {
      throw new Error('local concern reads should not run in API mode');
    };
    client.set = async () => {
      throw new Error('local concern writes should not run in API mode');
    };
    client.remove = async () => {
      throw new Error('local concern deletes should not run in API mode');
    };

    t.after(() => {
      client.get = original.get;
      client.set = original.set;
      client.remove = original.remove;
    });

    const results = await Promise.all([
      concernService.getAll(),
      concernService.getPaged(),
      concernService.getById('concern_api_1'),
      concernService.create(concernInput),
      concernService.update('concern_api_1', { title: 'Updated' }),
      concernService.delete('concern_api_1'),
      concernService.hardDelete('concern_api_1'),
      concernService.restore('concern_api_1'),
      concernService.count({ athleteId: 'athlete_api_1' }),
      concernService.findOne({ athleteId: 'athlete_api_1' }),
      concernService.createMany([concernInput]),
      concernService.deleteMany(['concern_api_1']),
      concernService.clear(),
    ]);

    for (const result of results) {
      assert.equal(result.success, false);
      assert.equal(!result.success && result.error.code, 'UNSUPPORTED');
    }

    assert.equal(await concernService.exists('concern_api_1'), false);
  });
});
