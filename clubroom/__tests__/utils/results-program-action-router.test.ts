import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PracticeTask } from '@/services/progress/progress-practice-task-service';
import { ok } from '@/types/result';
import { runResultsProgramTaskAction } from '@/utils/results-program-action-router';

function makeTask(overrides: Partial<PracticeTask> = {}): PracticeTask {
  const nowIso = new Date('2026-03-03T12:00:00.000Z').toISOString();
  return {
    id: 'task_router_1',
    source: 'session_feedback',
    sourceFeedbackId: 'feedback_router_1',
    sessionId: 'session_router_1',
    sessionTitle: 'Router Session',
    athleteId: 'athlete_router_1',
    athleteName: 'Router Athlete',
    coachId: 'coach_router_1',
    coachName: 'Coach Router',
    visibility: 'athlete',
    description: 'Practice task',
    assignedAt: nowIso,
    dueAt: nowIso,
    status: 'pending',
    updatedAt: nowIso,
    timing: 'upcoming',
    ...overrides,
  };
}

describe('runResultsProgramTaskAction', () => {
  it('routes toggle action to setTaskCompletion with expected next state', async () => {
    const calls: Array<{ taskId: string; completed: boolean; note?: string }> = [];
    const pendingTask = makeTask({ status: 'pending' });

    const result = await runResultsProgramTaskAction(
      {
        type: 'toggle_completion',
        task: pendingTask,
        completionNote: 'Done',
      },
      {
        setTaskCompletion: async (taskId, completed, note) => {
          calls.push({ taskId, completed, note });
          return ok(pendingTask);
        },
        updateTaskDueAt: async () => ok(pendingTask),
        snoozeTask: async () => ok(pendingTask),
      },
    );

    assert.equal(result.success, true);
    assert.deepEqual(calls, [{ taskId: 'task_router_1', completed: true, note: 'Done' }]);
  });

  it('routes reschedule action to updateTaskDueAt', async () => {
    const calls: Array<{ taskId: string; dueAtIso: string }> = [];
    const task = makeTask();

    const result = await runResultsProgramTaskAction(
      {
        type: 'reschedule',
        task,
        dueAtIso: '2026-03-06T10:00:00.000Z',
      },
      {
        setTaskCompletion: async () => ok(task),
        updateTaskDueAt: async (taskId, dueAtIso) => {
          calls.push({ taskId, dueAtIso });
          return ok(task);
        },
        snoozeTask: async () => ok(task),
      },
    );

    assert.equal(result.success, true);
    assert.deepEqual(calls, [{ taskId: 'task_router_1', dueAtIso: '2026-03-06T10:00:00.000Z' }]);
  });

  it('routes snooze action to snoozeTask', async () => {
    const calls: Array<{ taskId: string; hours: number }> = [];
    const task = makeTask();

    const result = await runResultsProgramTaskAction(
      {
        type: 'snooze',
        task,
        hours: 48,
      },
      {
        setTaskCompletion: async () => ok(task),
        updateTaskDueAt: async () => ok(task),
        snoozeTask: async (taskId, hours) => {
          calls.push({ taskId, hours });
          return ok(task);
        },
      },
    );

    assert.equal(result.success, true);
    assert.deepEqual(calls, [{ taskId: 'task_router_1', hours: 48 }]);
  });
});
