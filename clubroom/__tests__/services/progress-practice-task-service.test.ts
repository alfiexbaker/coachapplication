import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { AssignedDrill } from '@/constants/types';
import { apiClient } from '@/services/api-client';
import {
  progressPracticeTaskService,
  type PracticeTaskRecord,
} from '@/services/progress/progress-practice-task-service';

const ATHLETE_ID = 'athlete_task_1';
const COACH_ID = 'coach_task_1';

async function seedPracticeTask() {
  const now = new Date().toISOString();
  const dueAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const drillAssignment: AssignedDrill = {
    id: 'assignment_task_1',
    drillId: 'drill_task_1',
    drill: {
      id: 'drill_task_1',
      coachId: COACH_ID,
      title: 'Wall Passing',
      description: 'Clean first touch and pass rhythm.',
      category: 'TECHNIQUE',
      duration: 20,
      difficulty: 'BEGINNER',
      tags: ['First touch'],
      createdAt: now,
      updatedAt: now,
    },
    athleteId: ATHLETE_ID,
    assignedBy: COACH_ID,
    assignedAt: now,
    dueDate: dueAt,
    isCompleted: false,
    notes: 'Wall passing, 20 minutes',
  };
  const seededTask: PracticeTaskRecord = {
    id: 'practice_task_seeded_1',
    source: 'drill_assignment',
    sourceFeedbackId: drillAssignment.id,
    drillAssignmentId: drillAssignment.id,
    sessionId: `drill_assignment_${drillAssignment.drillId}`,
    sessionTitle: drillAssignment.drill?.title,
    coachId: COACH_ID,
    coachName: 'Coach Task',
    athleteId: ATHLETE_ID,
    athleteName: 'Task Athlete',
    visibility: 'athlete',
    description: 'Wall passing, 20 minutes',
    assignedAt: now,
    dueAt,
    status: 'pending',
    updatedAt: now,
  };
  await apiClient.set(STORAGE_KEYS.DRILL_ASSIGNMENTS, [drillAssignment]);
  await apiClient.set(STORAGE_KEYS.PROGRESS_PRACTICE_TASKS, [seededTask]);

  const tasks = await progressPracticeTaskService.listTasksForAthlete(ATHLETE_ID, 'athlete');
  assert.equal(tasks.length, 1);
  return tasks[0];
}

describe('progressPracticeTaskService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.PROGRESS_PRACTICE_TASKS);
    await apiClient.remove(STORAGE_KEYS.SESSION_FEEDBACK);
    await apiClient.remove(STORAGE_KEYS.DRILL_ASSIGNMENTS);
  });

  it('sets completion and reopens a task', async () => {
    const seededTask = await seedPracticeTask();

    const completedResult = await progressPracticeTaskService.setTaskCompletion(
      seededTask.id,
      true,
      ATHLETE_ID,
      'Completed all reps',
    );

    assert.equal(completedResult.success, true);
    if (completedResult.success) {
      assert.equal(completedResult.data.status, 'completed');
      assert.equal(completedResult.data.completionNote, 'Completed all reps');
      assert.ok(completedResult.data.completedAt);
    }

    const reopenedResult = await progressPracticeTaskService.setTaskCompletion(
      seededTask.id,
      false,
      ATHLETE_ID,
    );

    assert.equal(reopenedResult.success, true);
    if (reopenedResult.success) {
      assert.equal(reopenedResult.data.status, 'pending');
      assert.equal(reopenedResult.data.completionNote, undefined);
      assert.equal(reopenedResult.data.completedAt, undefined);
    }
  });

  it('validates due date updates and applies a valid reschedule', async () => {
    const seededTask = await seedPracticeTask();

    const invalidResult = await progressPracticeTaskService.updateTaskDueAt(
      seededTask.id,
      'not-a-date',
      COACH_ID,
    );

    assert.equal(invalidResult.success, false);
    if (!invalidResult.success) {
      assert.equal(invalidResult.error.code, 'VALIDATION');
    }

    const nextDueAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const validResult = await progressPracticeTaskService.updateTaskDueAt(
      seededTask.id,
      nextDueAt,
      COACH_ID,
    );

    assert.equal(validResult.success, true);
    if (validResult.success) {
      assert.equal(validResult.data.dueAt, nextDueAt);
      assert.equal(validResult.data.status, 'pending');
    }
  });

  it('validates snooze hour bounds and shifts due date forward', async () => {
    const seededTask = await seedPracticeTask();

    const invalidHours = await progressPracticeTaskService.snoozeTask(seededTask.id, COACH_ID, 0);
    assert.equal(invalidHours.success, false);
    if (!invalidHours.success) {
      assert.equal(invalidHours.error.code, 'VALIDATION');
    }

    const snoozed = await progressPracticeTaskService.snoozeTask(seededTask.id, COACH_ID, 24);
    assert.equal(snoozed.success, true);
    if (snoozed.success) {
      const originalTs = new Date(seededTask.dueAt).getTime();
      const updatedTs = new Date(snoozed.data.dueAt).getTime();
      assert.ok(updatedTs > originalTs);
    }
  });
});
