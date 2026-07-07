import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { authService } from '@/services/auth-service';
import { progressPositionService } from '@/services/progress/progress-position-service';

const mockOnly = apiClient.isMockMode ? {} : { skip: 'mock mode only' };

describe('progressPositionService', () => {
  beforeEach(async () => {
    if (apiClient.isMockMode) {
      await apiClient.remove(STORAGE_KEYS.POSITION_HISTORY);
    }
  });

  it('records position history for a session', mockOnly, async () => {
    const recorded = await progressPositionService.recordPosition(
      'session_pos_1',
      'athlete_pos_1',
      'MID',
    );

    assert.equal(recorded.success, true);
    if (!recorded.success) {
      return;
    }

    assert.equal(recorded.data.position, 'MID');

    const history = await progressPositionService.getPositionHistory('athlete_pos_1');
    assert.equal(history.success, true);
    if (!history.success) {
      return;
    }

    assert.equal(history.data.length, 1);
    assert.equal(history.data[0].sessionId, 'session_pos_1');
    assert.equal(history.data[0].position, 'MID');
  });

  it('returns recent position history with limit', mockOnly, async () => {
    await progressPositionService.recordPosition('session_pos_2', 'athlete_pos_2', 'DEF');
    await progressPositionService.recordPosition('session_pos_3', 'athlete_pos_2', 'DEF');
    await progressPositionService.recordPosition('session_pos_4', 'athlete_pos_2', 'ATT');

    const limited = await progressPositionService.getPositionHistory('athlete_pos_2', 2);
    assert.equal(limited.success, true);
    if (!limited.success) {
      return;
    }

    assert.equal(limited.data.length, 2);
  });

  it('returns most played position with tie-breaker on recency', mockOnly, async () => {
    await progressPositionService.recordPosition('session_pos_5', 'athlete_pos_3', 'DEF');
    await progressPositionService.recordPosition('session_pos_6', 'athlete_pos_3', 'MID');
    await progressPositionService.recordPosition('session_pos_7', 'athlete_pos_3', 'DEF');
    await progressPositionService.recordPosition('session_pos_8', 'athlete_pos_3', 'MID');

    const mostPlayed = await progressPositionService.getMostPlayedPosition('athlete_pos_3');
    assert.equal(mostPlayed.success, true);
    if (!mostPlayed.success) {
      return;
    }

    // DEF and MID both appear twice; latest entry wins.
    assert.equal(mostPlayed.data, 'MID');
  });

  it('derives API-mode position history from signed-in session feedback scope', async () => {
    const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
    const originalGetCurrentUser = authService.getCurrentUser;
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    const requestedHeaders: unknown[] = [];
    Object.defineProperty(apiClient, 'isMockMode', {
      configurable: true,
      get: () => false,
    });
    authService.getCurrentUser = async () => ({
      id: 'coach_api_position',
      email: 'coach.api.position@example.test',
      accountType: 'COACH',
      firstName: 'API',
      lastName: 'Coach',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-05T10:00:00.000Z',
      updatedAt: '2026-07-05T10:00:00.000Z',
    });
    globalThis.fetch = (async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      requestedUrls.push(String(input));
      requestedHeaders.push(init?.headers ?? {});
      return new Response(
        JSON.stringify({
          feedback: [
            {
              sessionId: 'session_api_new',
              athleteId: 'ath_api_position',
              createdAt: '2026-01-02T10:00:00.000Z',
              positionsPlayed: ['DEF', 'MID', 'MID'],
            },
            {
              sessionId: 'session_api_old',
              athleteId: 'ath_api_position',
              createdAt: '2026-01-01T10:00:00.000Z',
              positionPlayed: 'GK',
            },
            {
              sessionId: 'session_api_ignored',
              athleteId: 'ath_api_position',
              createdAt: '2026-01-03T10:00:00.000Z',
              positionPlayed: 'WING',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    try {
      const history = await progressPositionService.getPositionHistory('usr_api_position');
      assert.equal(history.success, true);
      if (!history.success) {
        return;
      }

      assert.equal(
        requestedUrls[0],
        'http://localhost:4000/v1/athletes/ath_api_position/session-feedback?viewerRole=coach',
      );
      assert.equal((requestedHeaders[0] as Record<string, string>)['x-acting-role'], 'coach');
      assert.equal(
        (requestedHeaders[0] as Record<string, string>)['x-coach-athlete-ids'],
        'ath_api_position',
      );
      assert.equal((requestedHeaders[0] as Record<string, string>)['x-coach-verified'], '1');
      assert.deepEqual(
        history.data.map((entry) => [entry.sessionId, entry.position]),
        [
          ['session_api_new', 'DEF'],
          ['session_api_new', 'MID'],
          ['session_api_old', 'GK'],
        ],
      );
    } finally {
      if (originalIsMockMode) {
        Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
      }
      authService.getCurrentUser = originalGetCurrentUser;
      globalThis.fetch = originalFetch;
    }
  });
});
