import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildHomeworkStateFromPracticeTasks,
  loadCoachDirectoryForProgress,
  resolveHomeworkFeedbackIdsForPracticeTask,
} from '@/hooks/use-my-progress';
import { apiClient } from '@/services/api-client';
import { coachService } from '@/services/coach-service';
import type { PracticeTask } from '@/services/progress/progress-practice-task-service';
import { err, ok, serviceError } from '@/types/result';

function makeTask(overrides: Partial<PracticeTask> = {}): PracticeTask {
  const assignedAt = '2026-07-05T08:00:00.000Z';
  return {
    id: 'practice_task_drill_dra_feedback_feedback_1',
    source: 'drill_assignment',
    sourceFeedbackId: 'dra_feedback_feedback_1',
    drillAssignmentId: 'dra_feedback_feedback_1',
    sessionId: 'session_1',
    athleteId: 'athlete_1',
    athleteName: 'Athlete One',
    coachId: 'coach_1',
    coachName: 'Coach One',
    visibility: 'parent',
    description: 'Wall passes',
    assignedAt,
    dueAt: '2026-07-08T08:00:00.000Z',
    status: 'pending',
    updatedAt: assignedAt,
    timing: 'upcoming',
    ...overrides,
  };
}

describe('useMyProgress homework state mapping', () => {
  it('maps backend feedback homework task ids back to feedback ids', () => {
    assert.deepEqual(resolveHomeworkFeedbackIdsForPracticeTask(makeTask()), [
      'dra_feedback_feedback_1',
      'practice_task_drill_dra_feedback_feedback_1',
      'feedback_1',
      'drill_dra_feedback_feedback_1',
    ]);
  });

  it('builds completion state from API practice tasks without local proof storage', () => {
    const completedAt = '2026-07-05T09:00:00.000Z';
    const state = buildHomeworkStateFromPracticeTasks([
      makeTask({
        status: 'completed',
        completedAt,
        completionNote: 'Photo proof submitted from My Progress.',
        timing: 'completed',
      }),
    ]);

    assert.equal(
      state.taskIdsByFeedbackId.feedback_1,
      'practice_task_drill_dra_feedback_feedback_1',
    );
    assert.deepEqual(state.completion.feedback_1, {
      completedAt,
      taskId: 'practice_task_drill_dra_feedback_feedback_1',
      completionNote: 'Photo proof submitted from My Progress.',
    });
  });

  it('loads coach trust metadata from v1 profiles in API mode', async (t) => {
    const originalGet = apiClient.get;
    const originalGetCoach = coachService.getCoach;
    const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');

    Object.defineProperty(apiClient, 'isMockMode', {
      configurable: true,
      get: () => false,
    });
    apiClient.get = async () => {
      throw new Error('coach directory local storage should not be read in API mode');
    };
    coachService.getCoach = async (coachId) =>
      ok({
        id: coachId,
        name: 'Coach One',
        certifications: [
          {
            name: 'UEFA B',
            issuer: 'FA',
            issueDate: '2024-01-01',
          },
        ],
      } as never);

    t.after(() => {
      apiClient.get = originalGet;
      coachService.getCoach = originalGetCoach;
      if (originalIsMockMode) {
        Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
      } else {
        delete (apiClient as unknown as { isMockMode?: boolean }).isMockMode;
      }
    });

    assert.deepEqual(await loadCoachDirectoryForProgress(['coach_1', 'coach_1']), [
      {
        id: 'coach_1',
        name: 'Coach One',
        qualifications: ['UEFA B'],
      },
    ]);
  });

  it('fails closed when a referenced live coach profile cannot load', async (t) => {
    const originalGetCoach = coachService.getCoach;
    const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');

    Object.defineProperty(apiClient, 'isMockMode', {
      configurable: true,
      get: () => false,
    });
    coachService.getCoach = async () =>
      err(serviceError('NETWORK', 'Coach profile authority unavailable.'));

    t.after(() => {
      coachService.getCoach = originalGetCoach;
      if (originalIsMockMode) {
        Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
      } else {
        delete (apiClient as unknown as { isMockMode?: boolean }).isMockMode;
      }
    });

    await assert.rejects(
      () => loadCoachDirectoryForProgress(['coach_1']),
      /Failed to load coach profile coach_1: Coach profile authority unavailable\./,
    );
  });
});
