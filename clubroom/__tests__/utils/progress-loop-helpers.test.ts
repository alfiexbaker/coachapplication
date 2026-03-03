import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyTaskOptimisticPatch,
  filterTasksForProgressLoop,
  groupTasksForProgressLoop,
  shouldQueueTaskRetry,
  type ProgressLoopFilter,
} from '@/hooks/use-progress-loop';
import type { PracticeTask } from '@/services/progress/progress-practice-task-service';
import { serviceError } from '@/types/result';

const NOW_TS = new Date('2026-03-03T12:00:00.000Z').getTime();

function makeTask(
  id: string,
  overrides: Partial<PracticeTask> = {},
): PracticeTask {
  const assignedAt = new Date(NOW_TS - 2 * 24 * 60 * 60 * 1000).toISOString();
  const dueAt = new Date(NOW_TS + 2 * 24 * 60 * 60 * 1000).toISOString();

  return {
    id,
    source: 'session_feedback',
    sourceFeedbackId: `feedback_${id}`,
    sessionId: `session_${id}`,
    sessionTitle: `Session ${id}`,
    athleteId: 'athlete_filter_1',
    athleteName: 'Athlete',
    coachId: 'coach_filter_1',
    coachName: 'Coach Filter',
    visibility: 'athlete',
    description: 'Task description',
    assignedAt,
    dueAt,
    status: 'pending',
    updatedAt: assignedAt,
    timing: 'upcoming',
    ...overrides,
  };
}

function ids(tasks: PracticeTask[]): string[] {
  return tasks.map((task) => task.id);
}

describe('progress loop helper logic', () => {
  const tasks: PracticeTask[] = [
    makeTask('overdue', {
      dueAt: new Date(NOW_TS - 36 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      timing: 'overdue',
    }),
    makeTask('soon', {
      dueAt: new Date(NOW_TS + 6 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      timing: 'due_soon',
    }),
    makeTask('upcoming', {
      dueAt: new Date(NOW_TS + 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      timing: 'upcoming',
    }),
    makeTask('done', {
      dueAt: new Date(NOW_TS + 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
      completedAt: new Date(NOW_TS - 2 * 60 * 60 * 1000).toISOString(),
      timing: 'completed',
    }),
  ];

  const runFilter = (filter: ProgressLoopFilter) => filterTasksForProgressLoop(tasks, filter, NOW_TS);

  it('filters tasks by pending/overdue/done/all', () => {
    assert.deepEqual(ids(runFilter('pending')), ['overdue', 'soon', 'upcoming']);
    assert.deepEqual(ids(runFilter('overdue')), ['overdue']);
    assert.deepEqual(ids(runFilter('done')), ['done']);
    assert.deepEqual(ids(runFilter('all')), ['overdue', 'soon', 'upcoming', 'done']);
  });

  it('groups filtered tasks into urgency sections', () => {
    const grouped = groupTasksForProgressLoop(runFilter('all'), 'all', NOW_TS);
    assert.deepEqual(
      grouped.map((group) => ({ key: group.key, count: group.count })),
      [
        { key: 'overdue', count: 1 },
        { key: 'due_soon', count: 1 },
        { key: 'upcoming', count: 1 },
        { key: 'completed', count: 1 },
      ],
    );
  });

  it('applies optimistic patch to task view model', () => {
    const pendingTask = tasks[0];
    const patch = {
      status: 'completed' as const,
      dueAt: pendingTask.dueAt,
      completedAt: new Date(NOW_TS).toISOString(),
      completedByUserId: 'athlete_filter_1',
      completionNote: 'Completed',
      updatedAt: new Date(NOW_TS).toISOString(),
    };

    const patched = applyTaskOptimisticPatch(pendingTask, patch, NOW_TS);
    assert.equal(patched.status, 'completed');
    assert.equal(patched.timing, 'completed');
    assert.equal(patched.completionNote, 'Completed');
  });

  it('queues only retry-safe error classes', () => {
    assert.equal(shouldQueueTaskRetry(serviceError('NETWORK', 'Network failed')), true);
    assert.equal(shouldQueueTaskRetry(serviceError('STORAGE', 'Storage failed')), true);
    assert.equal(shouldQueueTaskRetry(serviceError('UNKNOWN', 'Unknown failed')), true);
    assert.equal(shouldQueueTaskRetry(serviceError('VALIDATION', 'Bad input')), false);
    assert.equal(shouldQueueTaskRetry(serviceError('NOT_FOUND', 'Missing record')), false);
  });
});
