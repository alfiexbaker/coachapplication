import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function setupApiModeCoach() {
  const [{ authService }, { registerApiAuthService }, { ok }] = await Promise.all([
    import('@/services/auth-service'),
    import('@/services/auth-service-registry'),
    import('@/types/result'),
  ]);
  const originalGetCurrentUser = authService.getCurrentUser;

  authService.getCurrentUser = async () => ({
    id: 'coach_api_skill_history',
    email: 'skill.history.coach@example.com',
    accountType: 'COACH',
    appRole: 'USER',
    firstName: 'Skill',
    lastName: 'History',
    isVerified: true,
    onboardingComplete: true,
    createdAt: '2026-07-14T09:00:00.000Z',
    updatedAt: '2026-07-14T09:00:00.000Z',
  });
  registerApiAuthService({
    getTokens: async () => ({
      accessToken: 'skill-history-api-token',
      refreshToken: 'skill-history-refresh-token',
      expiresAt: Date.now() + 3_600_000,
    }),
    refreshToken: async () => ok(undefined),
    logout: async () => {},
  });

  return () => {
    authService.getCurrentUser = originalGetCurrentUser;
  };
}

async function trapGenericStorage() {
  const { apiClient } = await import('@/services/api-client');
  const client = apiClient as unknown as {
    get: typeof apiClient.get;
    set: typeof apiClient.set;
    remove: typeof apiClient.remove;
  };
  const original = { get: client.get, set: client.set, remove: client.remove };

  client.get = async () => {
    throw new Error('skill history local reads should not run in API mode');
  };
  client.set = async () => {
    throw new Error('skill history local writes should not run in API mode');
  };
  client.remove = async () => {
    throw new Error('skill history local removes should not run in API mode');
  };

  return () => {
    client.get = original.get;
    client.set = original.set;
    client.remove = original.remove;
  };
}

function skillHistoryPayload(skills: unknown[]) {
  return {
    athleteId: 'ath_api-skill-history',
    skills,
    seedVersion: null,
    requestId: 'req_skill_history_service',
  };
}

function skillUpdatePayload(score = 8) {
  return {
    athleteId: 'ath_api-skill-history',
    skillAssessment: {
      id: 'ska_api-skill-update',
      athleteId: 'ath_api-skill-history',
      skillDefinitionId: 'skd_api-passing',
      assessorUserId: 'usr_api-skill-coach',
      score,
      notes: null,
      bookingId: 'bok_api_skill_session',
      assessedAt: '2026-07-14T12:00:00.000Z',
      createdAt: '2026-07-14T12:00:00.000Z',
    },
    skillDefinition: {
      id: 'skd_api-passing',
      code: 'PASSING',
      name: 'Passing',
      category: 'Technical',
      description: 'Passing definition.',
      active: true,
      createdAt: '2026-07-14T11:00:00.000Z',
      updatedAt: '2026-07-14T11:00:00.000Z',
    },
    previousScore: 6,
    score,
    replayed: false,
    seedVersion: null,
    requestId: 'req_api_skill_update',
  };
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('progressSkillsService API mode', () => {
  it('maps exact API skill history and preserves an honest empty state', async () => {
    const restoreUser = await setupApiModeCoach();
    const restoreStorage = await trapGenericStorage();
    const { progressSkillsService } = await import(
      '@/services/progress/progress-skills-service'
    );
    let responseSkills: unknown[] = [
      {
        skillName: 'Passing',
        category: 'Technical',
        currentLevel: 72,
        previousLevel: 68,
        changePercent: 5.9,
        history: [{ date: '2026-07-14', level: 72 }],
      },
    ];

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, '/v1/athletes/ath_api-skill-history/skills/history');
      assert.equal(init?.method, 'GET');
      return jsonResponse(skillHistoryPayload(responseSkills));
    }) as typeof fetch;

    try {
      const populated = await progressSkillsService.getAthleteSkillLevels(
        'ath_api-skill-history',
      );
      assert.equal(populated?.skills.Passing?.level, 7);
      assert.equal(populated?.skills.Passing?.lastUpdated, '2026-07-14');
      assert.equal(populated?.lastUpdated, '2026-07-14');

      responseSkills = [];
      const empty = await progressSkillsService.getAthleteSkillLevels('ath_api-skill-history');
      assert.deepEqual(empty?.skills, {});
      assert.equal(empty?.lastUpdated, null);
    } finally {
      restoreStorage();
      restoreUser();
    }
  });

  it('rejects malformed API skill history instead of coercing a plausible level', async () => {
    const restoreUser = await setupApiModeCoach();
    const restoreStorage = await trapGenericStorage();
    const { progressSkillsService } = await import(
      '@/services/progress/progress-skills-service'
    );

    globalThis.fetch = (async () =>
      jsonResponse(
        skillHistoryPayload([
          {
            skillName: 'Passing',
            category: 'Technical',
            currentLevel: 'not-a-score',
            previousLevel: 68,
            changePercent: 0,
            history: [{ date: '2026-07-14', level: 72 }],
          },
        ]),
      )) as typeof fetch;

    try {
      await assert.rejects(
        () => progressSkillsService.getAthleteSkillLevels('ath_api-skill-history'),
        /did not match contract/i,
      );
    } finally {
      restoreStorage();
      restoreUser();
    }
  });

  it('writes an exact idempotent API skill update and rejects malformed output', async () => {
    const restoreUser = await setupApiModeCoach();
    const restoreStorage = await trapGenericStorage();
    const { progressSkillsService } = await import(
      '@/services/progress/progress-skills-service'
    );
    const requestBodies: Array<Record<string, unknown>> = [];
    let malformed = false;

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, '/v1/athletes/ath_api-skill-history/skill-updates');
      assert.equal(init?.method, 'POST');
      requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      const response = skillUpdatePayload(8);
      return jsonResponse(malformed ? { ...response, score: 7 } : response);
    }) as typeof fetch;

    try {
      const updated = await progressSkillsService.updateSkillLevel(
        'ath_api-skill-history',
        'Passing',
        8,
        'coach_api_skill_history',
        'bok_api_skill_session',
      );
      assert.equal(updated.skill, 'Passing');
      assert.equal(updated.level, 8);
      assert.equal(updated.previousLevel, 6);
      assert.equal(updated.lastUpdated, '2026-07-14T12:00:00.000Z');
      assert.equal(updated.updatedBy, 'usr_api-skill-coach');
      assert.equal(requestBodies[0]?.sessionId, 'bok_api_skill_session');
      assert.match(String(requestBodies[0]?.idempotencyKey), /^skill-update_/);

      malformed = true;
      await assert.rejects(
        () =>
          progressSkillsService.updateSkillLevel(
            'ath_api-skill-history',
            'Passing',
            8,
            'coach_api_skill_history',
          ),
        /did not match contract/i,
      );
      await assert.rejects(
        () =>
          progressSkillsService.updateSkillLevel(
            'ath_api-skill-history',
            'Passing',
            0,
            'coach_api_skill_history',
          ),
        /integer from 1 to 10/i,
      );
      assert.equal(requestBodies.length, 2);
    } finally {
      restoreStorage();
      restoreUser();
    }
  });
});
