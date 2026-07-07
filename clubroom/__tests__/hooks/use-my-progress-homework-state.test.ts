import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildHomeworkStateFromPracticeTasks,
  resolveHomeworkFeedbackIdsForPracticeTask,
} from '@/hooks/use-my-progress';
import type { PracticeTask } from '@/services/progress/progress-practice-task-service';

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
});
