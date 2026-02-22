import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { progressGoalsService } from '@/services/progress/progress-goals-service';

describe('progressGoalsService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.GOALS);
    await progressGoalsService.resetToMockData();
  });

  it('creates and fetches goal by id (happy path)', async () => {
    const created = await progressGoalsService.createGoal('athlete_pg_1', {
      title: 'Improve weak foot finishing',
      description: 'Increase confidence using weaker foot',
      category: 'BALL_SKILLS',
      milestones: ['Baseline', 'Session block', 'Match application'],
      targetDate: '2026-06-01',
    });

    const fetched = await progressGoalsService.getGoalById(created.id);
    assert.ok(fetched);
    assert.equal(fetched?.id, created.id);
  });

  it('returns null for missing goal id (empty path)', async () => {
    const goal = await progressGoalsService.getGoalById('goal_missing');
    assert.equal(goal, null);
  });

  it('updates goal progress and auto-completes at 100', async () => {
    const created = await progressGoalsService.createGoal('athlete_pg_2', {
      title: 'Improve sprint starts',
      description: 'Explosive first step',
      category: 'CHARACTER',
      milestones: ['Technique prep', 'Timing drills'],
      targetDate: '2026-05-20',
    });

    const updated = await progressGoalsService.updateGoalProgress(created.id, 100);
    assert.ok(updated);
    assert.equal(updated?.status, 'COMPLETED');
  });
});
