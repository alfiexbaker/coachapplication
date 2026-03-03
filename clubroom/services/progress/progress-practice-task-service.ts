import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { AssignedDrill } from '@/constants/types';
import { drillService } from '@/services/drill-service';
import { apiClient } from '@/services/api-client';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';

import type { SessionFeedback } from './progress-feedback-service';

const logger = createLogger('ProgressPracticeTaskService');

const DEFAULT_DUE_DAYS = 3;
const DUE_SOON_WINDOW_MS = 36 * 60 * 60 * 1000;

export type PracticeTaskStatus = 'pending' | 'completed';
export type PracticeTaskTiming = 'overdue' | 'due_soon' | 'upcoming' | 'completed';
export type PracticeTaskRisk = 'high' | 'watch' | 'stable';
export type TaskViewerRole = 'coach' | 'parent' | 'athlete';
export type CoachFollowUpActionType =
  | 'nudge'
  | 'message'
  | 'recovery_checkpoint'
  | 'review'
  | 'task_update'
  | 'completion';

export interface PracticeTaskRecord {
  id: string;
  source: 'session_feedback' | 'drill_assignment';
  sourceFeedbackId: string;
  drillAssignmentId?: string;
  sessionId: string;
  sessionTitle?: string;
  athleteId: string;
  athleteName: string;
  coachId: string;
  coachName: string;
  visibility: 'coach_only' | 'parent' | 'athlete';
  description: string;
  assignedAt: string;
  dueAt: string;
  status: PracticeTaskStatus;
  completedAt?: string;
  completedByUserId?: string;
  completionNote?: string;
  coachReviewedAt?: string;
  coachReviewedByUserId?: string;
  lastCoachActionAt?: string;
  lastCoachActionType?: CoachFollowUpActionType;
  updatedAt: string;
}

export interface PracticeTask extends PracticeTaskRecord {
  timing: PracticeTaskTiming;
}

export interface CoachFollowUpItem {
  athleteId: string;
  athleteName: string;
  coachId: string;
  taskIds: string[];
  pendingCount: number;
  reviewedCount: number;
  overdueCount: number;
  dueSoonCount: number;
  nextDueAt: string | null;
  latestConfidence: number | null;
  latestMood: number | null;
  confidenceTrend: number[];
  moodTrend: number[];
  latestCoachActionAt: string | null;
  risk: PracticeTaskRisk;
  attentionScore: number;
  recommendedAction: string;
}

export interface CoachBulkActionResult {
  requestedCount: number;
  updatedCount: number;
  skippedCount: number;
}

interface SelfAssessmentSnapshot {
  athleteId: string;
  coachId: string;
  mood: number;
  confidence: number;
  createdAt: string;
}

function parseTimestamp(value: string | undefined): number {
  if (!value) {
    return Number.NaN;
  }
  return new Date(value).getTime();
}

function resolveHomeworkText(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
}

function resolveDefaultDueAt(assignedAt: string): string {
  const assignedAtTs = parseTimestamp(assignedAt);
  if (Number.isNaN(assignedAtTs)) {
    return new Date(Date.now() + DEFAULT_DUE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  }
  return new Date(assignedAtTs + DEFAULT_DUE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function canViewerAccessTask(task: PracticeTaskRecord, viewerRole: TaskViewerRole): boolean {
  if (viewerRole === 'coach') {
    return true;
  }
  if (viewerRole === 'parent') {
    return task.visibility === 'parent';
  }
  return task.visibility !== 'coach_only';
}

function deriveTaskTiming(task: PracticeTaskRecord, nowTs = Date.now()): PracticeTaskTiming {
  if (task.status === 'completed') {
    return 'completed';
  }

  const dueTs = parseTimestamp(task.dueAt);
  if (Number.isNaN(dueTs)) {
    return 'upcoming';
  }
  if (dueTs < nowTs) {
    return 'overdue';
  }
  if (dueTs - nowTs <= DUE_SOON_WINDOW_MS) {
    return 'due_soon';
  }
  return 'upcoming';
}

function toViewModel(task: PracticeTaskRecord, nowTs = Date.now()): PracticeTask {
  return {
    ...task,
    timing: deriveTaskTiming(task, nowTs),
  };
}

function sortTasksForAthlete(left: PracticeTask, right: PracticeTask): number {
  const statusRank: Record<PracticeTaskTiming, number> = {
    overdue: 0,
    due_soon: 1,
    upcoming: 2,
    completed: 3,
  };

  if (statusRank[left.timing] !== statusRank[right.timing]) {
    return statusRank[left.timing] - statusRank[right.timing];
  }

  const leftDueTs = parseTimestamp(left.dueAt);
  const rightDueTs = parseTimestamp(right.dueAt);
  if (!Number.isNaN(leftDueTs) && !Number.isNaN(rightDueTs) && leftDueTs !== rightDueTs) {
    return leftDueTs - rightDueTs;
  }

  const leftAssigned = parseTimestamp(left.assignedAt);
  const rightAssigned = parseTimestamp(right.assignedAt);
  if (!Number.isNaN(leftAssigned) && !Number.isNaN(rightAssigned) && leftAssigned !== rightAssigned) {
    return rightAssigned - leftAssigned;
  }

  return right.id.localeCompare(left.id);
}

function hasRecordChanged(before: PracticeTaskRecord, after: PracticeTaskRecord): boolean {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function normalizeTaskIds(taskIds: string[]): string[] {
  return Array.from(
    new Set(
      taskIds
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function applyCoachActionMetadata(
  task: PracticeTaskRecord,
  actorId: string,
  actionType: CoachFollowUpActionType,
  actionAtIso: string,
): PracticeTaskRecord {
  if (task.coachId !== actorId) {
    return task;
  }

  return {
    ...task,
    lastCoachActionAt: actionAtIso,
    lastCoachActionType: actionType,
  };
}

async function getTaskRecords(): Promise<PracticeTaskRecord[]> {
  return apiClient.get<PracticeTaskRecord[]>(STORAGE_KEYS.PROGRESS_PRACTICE_TASKS, []);
}

async function saveTaskRecords(records: PracticeTaskRecord[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.PROGRESS_PRACTICE_TASKS, records);
}

async function getFeedbackHomeworkRows(): Promise<SessionFeedback[]> {
  const allFeedback = await apiClient.get<SessionFeedback[]>(STORAGE_KEYS.SESSION_FEEDBACK, []);
  return allFeedback.filter((feedback) => resolveHomeworkText(feedback.homework) !== null);
}

async function getDrillAssignments(): Promise<AssignedDrill[]> {
  return apiClient.get<AssignedDrill[]>(STORAGE_KEYS.DRILL_ASSIGNMENTS, []);
}

async function saveDrillAssignments(assignments: AssignedDrill[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.DRILL_ASSIGNMENTS, assignments);
}

function normalizeDueAt(value: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const dueTs = parseTimestamp(trimmed);
  if (Number.isNaN(dueTs)) {
    return null;
  }
  return new Date(dueTs).toISOString();
}

async function updateAssignmentDueDate(
  assignmentId: string,
  dueAtIso: string,
): Promise<boolean> {
  const assignments = await getDrillAssignments();
  const assignmentIndex = assignments.findIndex((entry) => entry.id === assignmentId);
  if (assignmentIndex < 0) {
    return false;
  }

  assignments[assignmentIndex] = {
    ...assignments[assignmentIndex],
    dueDate: dueAtIso,
  };
  await saveDrillAssignments(assignments);
  return true;
}

function buildTaskFromFeedback(
  feedback: SessionFeedback,
  existing: PracticeTaskRecord | undefined,
  nowIso: string,
): PracticeTaskRecord {
  const nextDescription = resolveHomeworkText(feedback.homework) ?? existing?.description ?? '';
  const dueAt = existing?.dueAt?.trim() ? existing.dueAt : resolveDefaultDueAt(feedback.createdAt);

  return {
    id: existing?.id ?? `practice_task_${feedback.id}`,
    source: 'session_feedback',
    sourceFeedbackId: feedback.id,
    sessionId: feedback.sessionId,
    sessionTitle: feedback.sessionTitle,
    athleteId: feedback.athleteId,
    athleteName: feedback.athleteName,
    coachId: feedback.coachId,
    coachName: feedback.coachName,
    visibility: feedback.visibility,
    description: existing?.status === 'completed' ? existing.description : nextDescription,
    assignedAt: existing?.assignedAt ?? feedback.createdAt,
    dueAt,
    status: existing?.status ?? 'pending',
    completedAt: existing?.completedAt,
    completedByUserId: existing?.completedByUserId,
    completionNote: existing?.completionNote,
    coachReviewedAt: existing?.coachReviewedAt,
    coachReviewedByUserId: existing?.coachReviewedByUserId,
    lastCoachActionAt: existing?.lastCoachActionAt ?? feedback.createdAt,
    lastCoachActionType: existing?.lastCoachActionType ?? 'task_update',
    updatedAt: nowIso,
  };
}

function buildTaskFromDrillAssignment(
  assignment: AssignedDrill,
  existing: PracticeTaskRecord | undefined,
  nowIso: string,
): PracticeTaskRecord {
  const drillTitle = assignment.drill?.title?.trim() || 'Drill Assignment';
  const coachNote = assignment.notes?.trim();

  return {
    id: existing?.id ?? `practice_task_drill_${assignment.id}`,
    source: 'drill_assignment',
    sourceFeedbackId: assignment.id,
    drillAssignmentId: assignment.id,
    sessionId: `drill_assignment_${assignment.drillId}`,
    sessionTitle: drillTitle,
    athleteId: assignment.athleteId,
    athleteName: existing?.athleteName ?? 'Athlete',
    coachId: assignment.assignedBy,
    coachName: existing?.coachName ?? 'Coach',
    visibility: 'parent',
    description: coachNote || `Complete ${drillTitle}.`,
    assignedAt: assignment.assignedAt,
    dueAt: assignment.dueDate || existing?.dueAt || resolveDefaultDueAt(assignment.assignedAt),
    status: assignment.isCompleted ? 'completed' : 'pending',
    completedAt: assignment.isCompleted ? assignment.completedAt : undefined,
    completedByUserId: assignment.isCompleted ? (existing?.completedByUserId ?? assignment.athleteId) : undefined,
    completionNote: assignment.isCompleted
      ? assignment.evidenceNotes?.trim() || assignment.athleteFeedback?.trim() || existing?.completionNote
      : undefined,
    coachReviewedAt: existing?.coachReviewedAt,
    coachReviewedByUserId: existing?.coachReviewedByUserId,
    lastCoachActionAt: existing?.lastCoachActionAt ?? assignment.assignedAt,
    lastCoachActionType: existing?.lastCoachActionType ?? 'task_update',
    updatedAt: nowIso,
  };
}

async function syncPracticeTasks(): Promise<PracticeTaskRecord[]> {
  const [existingTasks, homeworkFeedback, drillAssignments] = await Promise.all([
    getTaskRecords(),
    getFeedbackHomeworkRows(),
    getDrillAssignments(),
  ]);

  const nowIso = new Date().toISOString();
  let changed = false;

  const feedbackIds = new Set(homeworkFeedback.map((feedback) => feedback.id));
  const drillAssignmentIds = new Set(drillAssignments.map((assignment) => assignment.id));

  const tasksById = new Map(existingTasks.map((task) => [task.id, task]));
  const taskByFeedbackId = new Map(
    existingTasks
      .filter((task) => task.source === 'session_feedback')
      .map((task) => [task.sourceFeedbackId, task]),
  );
  const taskByDrillAssignmentId = new Map(
    existingTasks
      .filter((task) => task.source === 'drill_assignment')
      .map((task) => [task.drillAssignmentId ?? task.sourceFeedbackId, task]),
  );

  for (const feedback of homeworkFeedback) {
    const existing = taskByFeedbackId.get(feedback.id);
    const nextTask = buildTaskFromFeedback(feedback, existing, nowIso);

    if (!existing || hasRecordChanged(existing, nextTask)) {
      tasksById.set(nextTask.id, nextTask);
      changed = true;
    }
  }

  for (const assignment of drillAssignments) {
    const existing = taskByDrillAssignmentId.get(assignment.id);
    const nextTask = buildTaskFromDrillAssignment(assignment, existing, nowIso);
    if (!existing || hasRecordChanged(existing, nextTask)) {
      tasksById.set(nextTask.id, nextTask);
      changed = true;
    }
  }

  // Remove pending feedback-derived tasks no longer present in feedback.
  for (const task of existingTasks) {
    if (task.source !== 'session_feedback') {
      continue;
    }
    if (feedbackIds.has(task.sourceFeedbackId)) {
      continue;
    }
    if (task.status === 'pending') {
      tasksById.delete(task.id);
      changed = true;
    }
  }

  // Remove drill-assignment tasks no longer present in assignment storage.
  for (const task of existingTasks) {
    if (task.source !== 'drill_assignment') {
      continue;
    }
    const assignmentId = task.drillAssignmentId ?? task.sourceFeedbackId;
    if (!drillAssignmentIds.has(assignmentId)) {
      tasksById.delete(task.id);
      changed = true;
    }
  }

  if (!changed) {
    return existingTasks;
  }

  const nextRecords = Array.from(tasksById.values()).sort((left, right) => {
    const leftTs = parseTimestamp(left.assignedAt);
    const rightTs = parseTimestamp(right.assignedAt);
    if (!Number.isNaN(leftTs) && !Number.isNaN(rightTs) && leftTs !== rightTs) {
      return rightTs - leftTs;
    }
    return right.id.localeCompare(left.id);
  });

  await saveTaskRecords(nextRecords);

  logger.info('practice_tasks_synced', {
    feedbackCount: homeworkFeedback.length,
    drillAssignments: drillAssignments.length,
    taskCount: nextRecords.length,
  });

  return nextRecords;
}

async function listTasksForAthlete(
  athleteId: string,
  viewerRole: TaskViewerRole,
): Promise<PracticeTask[]> {
  if (!athleteId?.trim()) {
    return [];
  }

  const tasks = await syncPracticeTasks();
  const nowTs = Date.now();

  return tasks
    .filter((task) => task.athleteId === athleteId)
    .filter((task) => canViewerAccessTask(task, viewerRole))
    .map((task) => toViewModel(task, nowTs))
    .sort(sortTasksForAthlete);
}

async function setTaskCompletion(
  taskId: string,
  completed: boolean,
  actorId: string,
  completionNote?: string,
): Promise<Result<PracticeTask, ServiceError>> {
  if (!taskId?.trim()) {
    return err(serviceError('VALIDATION', 'Missing practice task id.'));
  }

  try {
    const tasks = await syncPracticeTasks();
    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    if (taskIndex < 0) {
      return err(serviceError('NOT_FOUND', 'Practice task not found.'));
    }

    const current = tasks[taskIndex];
    const nowIso = new Date().toISOString();
    const normalizedNote = completionNote?.trim();

    if (current.source === 'drill_assignment') {
      const assignmentId = current.drillAssignmentId ?? current.sourceFeedbackId;
      const assignmentResult = completed
        ? await drillService.completeDrill(assignmentId, {
            athleteFeedback: normalizedNote,
            evidenceNotes: normalizedNote,
          })
        : await drillService.uncompleteDrill(assignmentId);

      if (!assignmentResult) {
        return err(serviceError('NOT_FOUND', 'Drill assignment not found.'));
      }

      const synced = await syncPracticeTasks();
      const refreshed = synced.find((task) => task.id === taskId);
      if (!refreshed) {
        return err(serviceError('NOT_FOUND', 'Practice task not found after update.'));
      }

      logger.info('practice_task_completion_updated', {
        taskId,
        source: current.source,
        athleteId: current.athleteId,
        completed,
        actorId,
      });

      return ok(toViewModel(refreshed));
    }

    const nextTask: PracticeTaskRecord = completed
      ? applyCoachActionMetadata(
          {
            ...current,
            status: 'completed',
            completedAt: nowIso,
            completedByUserId: actorId,
            completionNote: normalizedNote ?? current.completionNote,
            updatedAt: nowIso,
          },
          actorId,
          'completion',
          nowIso,
        )
      : applyCoachActionMetadata(
          {
            ...current,
            status: 'pending',
            completedAt: undefined,
            completedByUserId: undefined,
            completionNote: undefined,
            updatedAt: nowIso,
          },
          actorId,
          'completion',
          nowIso,
        );

    tasks[taskIndex] = nextTask;
    await saveTaskRecords(tasks);

    logger.info('practice_task_completion_updated', {
      taskId,
      source: current.source,
      athleteId: current.athleteId,
      completed,
      actorId,
    });

    return ok(toViewModel(nextTask));
  } catch (error) {
    logger.error('Failed to update task completion', { taskId, completed, error });
    return err(serviceError('UNKNOWN', 'Failed to update practice task.', error));
  }
}

async function updateTaskDueAt(
  taskId: string,
  dueAtIso: string,
  actorId: string,
): Promise<Result<PracticeTask, ServiceError>> {
  if (!taskId?.trim()) {
    return err(serviceError('VALIDATION', 'Missing practice task id.'));
  }
  if (!actorId?.trim()) {
    return err(serviceError('VALIDATION', 'Missing actor id.'));
  }
  const normalizedDueAt = normalizeDueAt(dueAtIso);
  if (!normalizedDueAt) {
    return err(serviceError('VALIDATION', 'Invalid due date.'));
  }

  try {
    const tasks = await syncPracticeTasks();
    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    if (taskIndex < 0) {
      return err(serviceError('NOT_FOUND', 'Practice task not found.'));
    }

    const current = tasks[taskIndex];
    const nowIso = new Date().toISOString();

    if (current.source === 'drill_assignment') {
      const assignmentId = current.drillAssignmentId ?? current.sourceFeedbackId;
      const updatedAssignment = await updateAssignmentDueDate(assignmentId, normalizedDueAt);
      if (!updatedAssignment) {
        return err(serviceError('NOT_FOUND', 'Drill assignment not found.'));
      }
    }

    const nextTask: PracticeTaskRecord = applyCoachActionMetadata(
      {
        ...current,
        dueAt: normalizedDueAt,
        updatedAt: nowIso,
      },
      actorId,
      'task_update',
      nowIso,
    );
    tasks[taskIndex] = nextTask;
    await saveTaskRecords(tasks);

    logger.info('practice_task_due_updated', {
      taskId,
      source: current.source,
      athleteId: current.athleteId,
      dueAtIso: normalizedDueAt,
      actorId,
    });

    return ok(toViewModel(nextTask));
  } catch (error) {
    logger.error('Failed to update task due date', { taskId, dueAtIso, actorId, error });
    return err(serviceError('UNKNOWN', 'Failed to update task due date.', error));
  }
}

async function snoozeTask(
  taskId: string,
  actorId: string,
  hours: number,
): Promise<Result<PracticeTask, ServiceError>> {
  if (!taskId?.trim()) {
    return err(serviceError('VALIDATION', 'Missing practice task id.'));
  }
  if (!actorId?.trim()) {
    return err(serviceError('VALIDATION', 'Missing actor id.'));
  }
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 14) {
    return err(serviceError('VALIDATION', 'Snooze hours must be between 1 and 336.'));
  }

  try {
    const tasks = await syncPracticeTasks();
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) {
      return err(serviceError('NOT_FOUND', 'Practice task not found.'));
    }

    const baseDueTs = parseTimestamp(task.dueAt);
    const baseTs = Number.isNaN(baseDueTs) ? Date.now() : Math.max(Date.now(), baseDueTs);
    const nextDueAtIso = new Date(baseTs + hours * 60 * 60 * 1000).toISOString();
    return updateTaskDueAt(taskId, nextDueAtIso, actorId);
  } catch (error) {
    logger.error('Failed to snooze task', { taskId, actorId, hours, error });
    return err(serviceError('UNKNOWN', 'Failed to snooze task.', error));
  }
}

async function markTasksReviewed(
  taskIds: string[],
  actorId: string,
): Promise<Result<CoachBulkActionResult, ServiceError>> {
  if (!actorId?.trim()) {
    return err(serviceError('VALIDATION', 'Missing actor id.'));
  }

  const normalizedTaskIds = normalizeTaskIds(taskIds);
  if (normalizedTaskIds.length === 0) {
    return err(serviceError('VALIDATION', 'No tasks selected.'));
  }

  try {
    const tasks = await syncPracticeTasks();
    const taskIndexById = new Map(tasks.map((task, index) => [task.id, index]));
    const nowIso = new Date().toISOString();
    let updatedCount = 0;

    for (const taskId of normalizedTaskIds) {
      const taskIndex = taskIndexById.get(taskId);
      if (taskIndex == null) {
        continue;
      }
      const current = tasks[taskIndex];
      if (current.coachId !== actorId) {
        continue;
      }
      const nextTask = applyCoachActionMetadata(
        {
          ...current,
          coachReviewedAt: nowIso,
          coachReviewedByUserId: actorId,
          updatedAt: nowIso,
        },
        actorId,
        'review',
        nowIso,
      );
      tasks[taskIndex] = nextTask;
      updatedCount += 1;
    }

    if (updatedCount > 0) {
      await saveTaskRecords(tasks);
    }

    return ok({
      requestedCount: normalizedTaskIds.length,
      updatedCount,
      skippedCount: normalizedTaskIds.length - updatedCount,
    });
  } catch (error) {
    logger.error('Failed to mark coach tasks reviewed', { taskIds, actorId, error });
    return err(serviceError('UNKNOWN', 'Failed to mark tasks reviewed.', error));
  }
}

async function recordCoachFollowUp(
  taskIds: string[],
  actorId: string,
  actionType: Exclude<CoachFollowUpActionType, 'task_update' | 'completion' | 'review'>,
): Promise<Result<CoachBulkActionResult, ServiceError>> {
  if (!actorId?.trim()) {
    return err(serviceError('VALIDATION', 'Missing actor id.'));
  }

  const normalizedTaskIds = normalizeTaskIds(taskIds);
  if (normalizedTaskIds.length === 0) {
    return err(serviceError('VALIDATION', 'No tasks selected.'));
  }

  try {
    const tasks = await syncPracticeTasks();
    const taskIndexById = new Map(tasks.map((task, index) => [task.id, index]));
    const nowIso = new Date().toISOString();
    let updatedCount = 0;

    for (const taskId of normalizedTaskIds) {
      const taskIndex = taskIndexById.get(taskId);
      if (taskIndex == null) {
        continue;
      }
      const current = tasks[taskIndex];
      if (current.coachId !== actorId) {
        continue;
      }
      tasks[taskIndex] = applyCoachActionMetadata(
        {
          ...current,
          updatedAt: nowIso,
        },
        actorId,
        actionType,
        nowIso,
      );
      updatedCount += 1;
    }

    if (updatedCount > 0) {
      await saveTaskRecords(tasks);
    }

    return ok({
      requestedCount: normalizedTaskIds.length,
      updatedCount,
      skippedCount: normalizedTaskIds.length - updatedCount,
    });
  } catch (error) {
    logger.error('Failed to record coach follow-up action', {
      taskIds,
      actorId,
      actionType,
      error,
    });
    return err(serviceError('UNKNOWN', 'Failed to record coach follow-up.', error));
  }
}

async function setRecoveryCheckpoint(
  taskIds: string[],
  actorId: string,
  hours = 48,
): Promise<Result<CoachBulkActionResult, ServiceError>> {
  if (!actorId?.trim()) {
    return err(serviceError('VALIDATION', 'Missing actor id.'));
  }
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 14) {
    return err(serviceError('VALIDATION', 'Checkpoint hours must be between 1 and 336.'));
  }

  const normalizedTaskIds = normalizeTaskIds(taskIds);
  if (normalizedTaskIds.length === 0) {
    return err(serviceError('VALIDATION', 'No tasks selected.'));
  }

  try {
    const tasks = await syncPracticeTasks();
    const taskIndexById = new Map(tasks.map((task, index) => [task.id, index]));
    const nowIso = new Date().toISOString();
    const checkpointDueAtIso = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    let updatedCount = 0;

    for (const taskId of normalizedTaskIds) {
      const taskIndex = taskIndexById.get(taskId);
      if (taskIndex == null) {
        continue;
      }
      const current = tasks[taskIndex];
      if (current.coachId !== actorId) {
        continue;
      }

      if (current.source === 'drill_assignment') {
        const assignmentId = current.drillAssignmentId ?? current.sourceFeedbackId;
        const updatedAssignment = await updateAssignmentDueDate(assignmentId, checkpointDueAtIso);
        if (!updatedAssignment) {
          continue;
        }
      }

      tasks[taskIndex] = applyCoachActionMetadata(
        {
          ...current,
          dueAt: checkpointDueAtIso,
          updatedAt: nowIso,
        },
        actorId,
        'recovery_checkpoint',
        nowIso,
      );
      updatedCount += 1;
    }

    if (updatedCount > 0) {
      await saveTaskRecords(tasks);
    }

    return ok({
      requestedCount: normalizedTaskIds.length,
      updatedCount,
      skippedCount: normalizedTaskIds.length - updatedCount,
    });
  } catch (error) {
    logger.error('Failed to set recovery checkpoint', { taskIds, actorId, hours, error });
    return err(serviceError('UNKNOWN', 'Failed to set recovery checkpoint.', error));
  }
}

function resolveRisk(
  overdueCount: number,
  dueSoonCount: number,
  latestConfidence: number | null,
): PracticeTaskRisk {
  if (overdueCount > 0) {
    return 'high';
  }
  if (dueSoonCount > 0 || (latestConfidence != null && latestConfidence <= 2)) {
    return 'watch';
  }
  return 'stable';
}

function resolveAttentionScore(
  overdueCount: number,
  dueSoonCount: number,
  latestConfidence: number | null,
  latestMood: number | null,
): number {
  const confidencePenalty = latestConfidence == null ? 0 : Math.max(0, 3 - latestConfidence) * 12;
  const moodPenalty = latestMood == null ? 0 : Math.max(0, 2 - latestMood) * 8;
  const raw = overdueCount * 35 + dueSoonCount * 14 + confidencePenalty + moodPenalty;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function resolveRecommendedAction(
  overdueCount: number,
  dueSoonCount: number,
  latestConfidence: number | null,
): string {
  if (overdueCount > 0) {
    return 'Message today and lock a 48h recovery plan.';
  }
  if (latestConfidence != null && latestConfidence <= 2) {
    return 'Run a confidence reset in next session and follow up today.';
  }
  if (dueSoonCount > 0) {
    return 'Send a completion nudge before deadline.';
  }
  return 'No immediate intervention needed.';
}

async function listCoachFollowUpQueue(coachId: string): Promise<CoachFollowUpItem[]> {
  if (!coachId?.trim()) {
    return [];
  }

  const [tasks, allAssessments] = await Promise.all([
    syncPracticeTasks(),
    apiClient.get<SelfAssessmentSnapshot[]>(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENTS, []),
  ]);

  const nowTs = Date.now();
  const coachTasks = tasks.filter((task) => task.coachId === coachId && task.status === 'pending');

  const assessmentsByAthlete = new Map<string, SelfAssessmentSnapshot[]>();
  for (const assessment of allAssessments) {
    if (assessment.coachId !== coachId) {
      continue;
    }
    const existing = assessmentsByAthlete.get(assessment.athleteId);
    if (existing) {
      existing.push(assessment);
    } else {
      assessmentsByAthlete.set(assessment.athleteId, [assessment]);
    }
  }
  for (const entry of assessmentsByAthlete.values()) {
    entry.sort((left, right) => parseTimestamp(left.createdAt) - parseTimestamp(right.createdAt));
  }

  const groupedByAthlete = new Map<string, PracticeTaskRecord[]>();
  for (const task of coachTasks) {
    const bucket = groupedByAthlete.get(task.athleteId);
    if (bucket) {
      bucket.push(task);
    } else {
      groupedByAthlete.set(task.athleteId, [task]);
    }
  }

  const queue: CoachFollowUpItem[] = [];
  for (const [athleteId, athleteTasks] of groupedByAthlete.entries()) {
    const overdueCount = athleteTasks.filter((task) => deriveTaskTiming(task, nowTs) === 'overdue').length;
    const dueSoonCount = athleteTasks.filter((task) => deriveTaskTiming(task, nowTs) === 'due_soon').length;

    const nextDueAt = athleteTasks
      .map((task) => task.dueAt)
      .filter((dueAt) => !Number.isNaN(parseTimestamp(dueAt)))
      .sort((left, right) => parseTimestamp(left) - parseTimestamp(right))[0] ?? null;

    const athleteAssessments = assessmentsByAthlete.get(athleteId) ?? [];
    const latestAssessment = athleteAssessments[athleteAssessments.length - 1];
    const latestConfidence = latestAssessment?.confidence ?? null;
    const latestMood = latestAssessment?.mood ?? null;
    const confidenceTrend = athleteAssessments.slice(-6).map((entry) => entry.confidence);
    const moodTrend = athleteAssessments.slice(-6).map((entry) => entry.mood);
    const latestCoachActionAt = athleteTasks
      .map((task) => task.lastCoachActionAt)
      .filter((value): value is string => typeof value === 'string' && !Number.isNaN(parseTimestamp(value)))
      .sort((left, right) => parseTimestamp(right) - parseTimestamp(left))[0] ?? null;
    const reviewedCount = athleteTasks.filter((task) => task.coachReviewedAt != null).length;
    const attentionScore = resolveAttentionScore(
      overdueCount,
      dueSoonCount,
      latestConfidence,
      latestMood,
    );

    queue.push({
      athleteId,
      athleteName: athleteTasks[0]?.athleteName ?? 'Athlete',
      coachId,
      taskIds: athleteTasks.map((task) => task.id),
      pendingCount: athleteTasks.length,
      reviewedCount,
      overdueCount,
      dueSoonCount,
      nextDueAt,
      latestConfidence,
      latestMood,
      confidenceTrend,
      moodTrend,
      latestCoachActionAt,
      risk: resolveRisk(overdueCount, dueSoonCount, latestConfidence),
      attentionScore,
      recommendedAction: resolveRecommendedAction(overdueCount, dueSoonCount, latestConfidence),
    });
  }

  const riskRank: Record<PracticeTaskRisk, number> = {
    high: 0,
    watch: 1,
    stable: 2,
  };

  return queue.sort((left, right) => {
    if (riskRank[left.risk] !== riskRank[right.risk]) {
      return riskRank[left.risk] - riskRank[right.risk];
    }
    if (left.overdueCount !== right.overdueCount) {
      return right.overdueCount - left.overdueCount;
    }
    if (left.attentionScore !== right.attentionScore) {
      return right.attentionScore - left.attentionScore;
    }
    if (left.pendingCount !== right.pendingCount) {
      return right.pendingCount - left.pendingCount;
    }
    const leftDue = parseTimestamp(left.nextDueAt ?? undefined);
    const rightDue = parseTimestamp(right.nextDueAt ?? undefined);
    if (!Number.isNaN(leftDue) && !Number.isNaN(rightDue) && leftDue !== rightDue) {
      return leftDue - rightDue;
    }
    return left.athleteName.localeCompare(right.athleteName);
  });
}

export const progressPracticeTaskService = {
  listTasksForAthlete,
  setTaskCompletion,
  updateTaskDueAt,
  snoozeTask,
  markTasksReviewed,
  recordCoachFollowUp,
  setRecoveryCheckpoint,
  listCoachFollowUpQueue,
};
