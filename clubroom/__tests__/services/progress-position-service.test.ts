import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { progressPositionService } from '@/services/progress/progress-position-service';

describe('progressPositionService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.POSITION_HISTORY);
  });

  it('records position history for a session', async () => {
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

  it('returns recent position history with limit', async () => {
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

  it('returns most played position with tie-breaker on recency', async () => {
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
});
