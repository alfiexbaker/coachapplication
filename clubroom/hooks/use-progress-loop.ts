import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import { progressPracticeLogService } from '@/services/progress/progress-practice-log-service';
import {
  progressPracticeTaskService,
  type CoachBulkActionResult,
  type CoachFollowUpItem,
  type CoachFollowUpActionType,
  type PracticeTask,
  type PracticeTaskTiming,
  type TaskViewerRole,
} from '@/services/progress/progress-practice-task-service';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import type { SwitcherChild } from '@/components/family/child-switcher';
import {
  type CoachQueueLaneKey,
  deriveTaskTiming,
  resolveCoachQueueLane,
  sortTasksByUrgency,
  type ProgressTaskGroupKey,
} from '@/utils/progress-task-time';
import { runAsyncFinally, runAsyncTryCatchFinally } from '@/utils/async-control';
const logger = createLogger('useProgressLoop');
export type ProgressLoopFilter = 'all' | 'pending' | 'overdue' | 'done';
export interface ProgressLoopTaskGroup {
  key: ProgressTaskGroupKey;
  title: string;
  count: number;
  tasks: PracticeTask[];
  collapsible: boolean;
  defaultCollapsed: boolean;
}
export interface CoachQueueLaneGroup {
  key: CoachQueueLaneKey;
  title: string;
  count: number;
  rows: CoachFollowUpItem[];
}
export interface ParentCoachFollowUpSignal {
  status: 'active' | 'awaiting';
  latestCoachActionAt: string | null;
  pendingCount: number;
  overdueCount: number;
}
interface SeedBoundaryDataResult {
  createdCount: number;
  seededCount: number;
}
interface ProgressLoopData {
  tasks: PracticeTask[];
  coachQueue: CoachFollowUpItem[];
  weeklyPracticeMinutes: number;
  practiceDaysThisWeek: number;
}
interface TaskOptimisticPatch {
  status: PracticeTask['status'];
  dueAt: string;
  completedAt?: string;
  completedByUserId?: string;
  completionNote?: string;
  updatedAt: string;
}
interface TaskSyncErrorNotice {
  key: number;
  taskId: string;
  message: string;
}
type PendingTaskMutation =
  | {
      kind: 'completion';
      taskId: string;
      completed: boolean;
      completionNote?: string;
    }
  | {
      kind: 'due_at';
      taskId: string;
      dueAtIso: string;
    };
function normalizeParam(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return null;
  }
  return trimmed;
}
function getWeekStartTimestamp(now = new Date()): number {
  const date = new Date(now);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - diff);
  return date.getTime();
}
function toDateTimestamp(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00.000Z`).getTime();
}
function parseTimestamp(value: string | undefined | null): number {
  if (!value) {
    return Number.NaN;
  }
  return new Date(value).getTime();
}
function normalizeErrorCode(error: ServiceError): ServiceError['code'] {
  return error.code;
}
export function shouldQueueTaskRetry(error: ServiceError): boolean {
  const code = normalizeErrorCode(error);
  return code === 'NETWORK' || code === 'STORAGE' || code === 'UNKNOWN';
}
function coerceServiceError(error: unknown, fallbackMessage: string): ServiceError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (
      error as {
        code?: unknown;
      }
    ).code === 'string' &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message === 'string'
  ) {
    return error as ServiceError;
  }
  if (error instanceof Error) {
    return serviceError('UNKNOWN', error.message, error);
  }
  return serviceError('UNKNOWN', fallbackMessage, error);
}
export function applyTaskOptimisticPatch(
  task: PracticeTask,
  patch: Pick<
    TaskOptimisticPatch,
    'status' | 'dueAt' | 'completedAt' | 'completedByUserId' | 'completionNote' | 'updatedAt'
  >,
  nowTs: number,
): PracticeTask {
  const merged = {
    ...task,
    ...patch,
  };
  return {
    ...merged,
    timing: deriveTaskTiming(merged, nowTs),
  };
}
function buildCompletionPatch(
  task: PracticeTask,
  completed: boolean,
  actorId: string,
  completionNote: string | undefined,
): TaskOptimisticPatch {
  const nowIso = new Date().toISOString();
  const normalizedNote = completionNote?.trim();
  return completed
    ? {
        status: 'completed',
        dueAt: task.dueAt,
        completedAt: nowIso,
        completedByUserId: actorId,
        completionNote: normalizedNote ?? task.completionNote,
        updatedAt: nowIso,
      }
    : {
        status: 'pending',
        dueAt: task.dueAt,
        completedAt: undefined,
        completedByUserId: undefined,
        completionNote: undefined,
        updatedAt: nowIso,
      };
}
function buildDueAtPatch(task: PracticeTask, dueAtIso: string): TaskOptimisticPatch {
  return {
    status: task.status,
    dueAt: dueAtIso,
    completedAt: task.completedAt,
    completedByUserId: task.completedByUserId,
    completionNote: task.completionNote,
    updatedAt: new Date().toISOString(),
  };
}
function buildSnoozedDueAt(task: PracticeTask, hours: number): string {
  const baseDueTs = parseTimestamp(task.dueAt);
  const baseTs = Number.isNaN(baseDueTs) ? Date.now() : Math.max(Date.now(), baseDueTs);
  return new Date(baseTs + hours * 60 * 60 * 1000).toISOString();
}
export function filterTasksForProgressLoop(
  sortedTasks: PracticeTask[],
  filter: ProgressLoopFilter,
  nowTs: number,
): PracticeTask[] {
  const byTiming = (timing: PracticeTaskTiming) =>
    sortedTasks.filter((task) => deriveTaskTiming(task, nowTs) === timing);
  if (filter === 'all') {
    return sortedTasks;
  }
  if (filter === 'pending') {
    return sortedTasks.filter((task) => task.status === 'pending');
  }
  if (filter === 'overdue') {
    return byTiming('overdue');
  }
  return byTiming('completed');
}
export function groupTasksForProgressLoop(
  filteredTasks: PracticeTask[],
  filter: ProgressLoopFilter,
  nowTs: number,
): ProgressLoopTaskGroup[] {
  const sections: Record<ProgressTaskGroupKey, PracticeTask[]> = {
    overdue: [],
    due_soon: [],
    upcoming: [],
    completed: [],
  };
  for (const task of filteredTasks) {
    const timing = deriveTaskTiming(task, nowTs);
    if (timing === 'completed') {
      sections.completed.push(task);
      continue;
    }
    if (timing === 'overdue') {
      sections.overdue.push(task);
      continue;
    }
    if (timing === 'due_soon') {
      sections.due_soon.push(task);
      continue;
    }
    sections.upcoming.push(task);
  }
  const metadata: Array<{
    key: ProgressTaskGroupKey;
    title: string;
    collapsible: boolean;
    defaultCollapsed: boolean;
  }> = [
    {
      key: 'overdue',
      title: 'Overdue',
      collapsible: false,
      defaultCollapsed: false,
    },
    {
      key: 'due_soon',
      title: 'Due Soon',
      collapsible: false,
      defaultCollapsed: false,
    },
    {
      key: 'upcoming',
      title: 'Upcoming',
      collapsible: false,
      defaultCollapsed: false,
    },
    {
      key: 'completed',
      title: 'Completed',
      collapsible: true,
      defaultCollapsed: filter !== 'done',
    },
  ];
  return metadata.flatMap((entry) => {
    const mapped = {
      ...entry,
      count: sections[entry.key].length,
      tasks: sections[entry.key],
    };
    return mapped.count > 0 ? [mapped] : [];
  });
}
export function useProgressLoop(athleteIdParam?: string | null) {
  const { currentUser } = useAuth();
  const inflightTaskIdsRef = useRef(new Set<string>());
  const coachActionInFlightRef = useRef(false);
  const retryTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queuedMutationsRef = useRef(new Map<string, PendingTaskMutation>());
  const retryAttemptRef = useRef(new Map<string, number>());
  const taskSyncNoticeKeyRef = useRef(0);
  const flushQueuedMutationsRef = useRef<() => void>(() => {});
  const [taskOptimisticPatches, setTaskOptimisticPatches] = useState<
    Record<string, TaskOptimisticPatch>
  >({});
  const [syncingTaskIds, setSyncingTaskIds] = useState<Record<string, true>>({});
  const [taskSyncErrorNotice, setTaskSyncErrorNotice] = useState<TaskSyncErrorNotice | null>(null);
  const [isSeedingBoundaryData, setIsSeedingBoundaryData] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const { children: contextChildren, activeChildId, setActiveChildId } = useChildContext();
  const normalizedAthleteParam = normalizeParam(athleteIdParam ?? null);
  const isCoachView = currentUser?.role === 'COACH';
  const isParentView = currentUser?.role === 'PARENT';
  const taskScopeKeyRef = useRef<string | null>(null);
  const switcherChildren = contextChildren.map((child) => ({
    id: child.id,
    name: child.name,
    initials: child.initials,
    colorCode: child.colorCode,
  }));
  const hasMultipleChildren = isParentView && switcherChildren.length > 1;
  const selectedAthleteId = (() => {
    if (normalizedAthleteParam) {
      return normalizedAthleteParam;
    }
    if (!currentUser) {
      return null;
    }
    if (currentUser.role === 'COACH') {
      return null;
    }
    if (currentUser.role === 'PARENT') {
      if (contextChildren.length === 0) {
        return null;
      }
      if (activeChildId && contextChildren.some((child) => child.id === activeChildId)) {
        return activeChildId;
      }
      return contextChildren[0].id;
    }
    return currentUser.id;
  })();
  const selectedAthleteName = (() => {
    if (!selectedAthleteId) {
      return 'Athlete';
    }
    const child = contextChildren.find((entry) => entry.id === selectedAthleteId);
    if (child) {
      return child.name;
    }
    return currentUser?.name ?? 'Athlete';
  })();
  const loadData = async () => {
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing user context.'));
    }
    return await runAsyncTryCatchFinally<Result<ProgressLoopData, ServiceError>>(
      async () => {
        if (isCoachView) {
          const coachQueue = await progressPracticeTaskService.listCoachFollowUpQueue(
            currentUser.id,
          );
          return ok<ProgressLoopData>({
            tasks: [],
            coachQueue,
            weeklyPracticeMinutes: 0,
            practiceDaysThisWeek: 0,
          });
        }
        if (!selectedAthleteId) {
          return ok<ProgressLoopData>({
            tasks: [],
            coachQueue: [],
            weeklyPracticeMinutes: 0,
            practiceDaysThisWeek: 0,
          });
        }
        const viewerRole: TaskViewerRole = isParentView ? 'parent' : 'athlete';
        const [tasks, practiceLogs] = await Promise.all([
          progressPracticeTaskService.listTasksForAthlete(selectedAthleteId, viewerRole),
          progressPracticeLogService.listAthleteLogs(selectedAthleteId),
        ]);
        const weekStartTs = getWeekStartTimestamp();
        const weeklyLogs = practiceLogs.filter((entry) => {
          const entryTs = toDateTimestamp(entry.dateKey);
          return !Number.isNaN(entryTs) && entryTs >= weekStartTs;
        });
        const weeklyPracticeMinutes = weeklyLogs.reduce(
          (sum, entry) => sum + Math.max(0, entry.minutes),
          0,
        );
        return ok<ProgressLoopData>({
          tasks,
          coachQueue: [],
          weeklyPracticeMinutes,
          practiceDaysThisWeek: weeklyLogs.length,
        });
      },
      async (loadError) => {
        logger.error('Failed to load progress loop data', {
          userId: currentUser.id,
          selectedAthleteId,
          error: loadError,
        });
        return err(serviceError('UNKNOWN', 'Failed to load progress loop data.', loadError));
      },
      () => {},
    );
  };
  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ProgressLoopData>({
    load: loadData,
    deps: [currentUser?.id, selectedAthleteId, isCoachView],
    isEmpty: (value) => (isCoachView ? value.coachQueue.length === 0 : value.tasks.length === 0),
    refetchOnFocus: true,
  });
  const clearTaskRetry = (taskId: string) => {
    const timer = retryTimersRef.current.get(taskId);
    if (timer) {
      clearTimeout(timer);
      retryTimersRef.current.delete(taskId);
    }
    queuedMutationsRef.current.delete(taskId);
    retryAttemptRef.current.delete(taskId);
  };
  const markTaskSyncing = (taskId: string) => {
    setSyncingTaskIds((previous) => {
      if (previous[taskId]) {
        return previous;
      }
      return {
        ...previous,
        [taskId]: true,
      };
    });
  };
  const clearTaskSyncing = (taskId: string) => {
    setSyncingTaskIds((previous) => {
      if (!previous[taskId]) {
        return previous;
      }
      const next = {
        ...previous,
      };
      delete next[taskId];
      return next;
    });
  };
  const setTaskPatch = (taskId: string, patch: TaskOptimisticPatch) => {
    setTaskOptimisticPatches((previous) => ({
      ...previous,
      [taskId]: patch,
    }));
  };
  const clearTaskPatch = (taskId: string) => {
    setTaskOptimisticPatches((previous) => {
      if (!previous[taskId]) {
        return previous;
      }
      const next = {
        ...previous,
      };
      delete next[taskId];
      return next;
    });
  };
  const pushTaskSyncError = (taskId: string, message: string) => {
    taskSyncNoticeKeyRef.current += 1;
    setTaskSyncErrorNotice({
      key: taskSyncNoticeKeyRef.current,
      taskId,
      message,
    });
  };
  const clearTaskSyncErrorNotice = () => {
    setTaskSyncErrorNotice(null);
  };
  const baseTasks = data?.tasks ?? [];
  const tasks = (() => {
    if (Object.keys(taskOptimisticPatches).length === 0) {
      return baseTasks;
    }
    return baseTasks.map((task) => {
      const patch = taskOptimisticPatches[task.id];
      if (!patch) {
        return task;
      }
      return applyTaskOptimisticPatch(task, patch, nowTs);
    });
  })();
  const coachQueue = data?.coachQueue ?? [];
  const weeklyPracticeMinutes = data?.weeklyPracticeMinutes ?? 0;
  const practiceDaysThisWeek = data?.practiceDaysThisWeek ?? 0;
  const [filter, setFilter] = useState<ProgressLoopFilter>('pending');
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTs(Date.now());
    }, 60 * 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);
  const sortedTasks = Array.from(tasks).toSorted((left, right) =>
    sortTasksByUrgency(left, right, nowTs),
  );
  const filteredTasks = filterTasksForProgressLoop(sortedTasks, filter, nowTs);
  const pendingCount = sortedTasks.filter((task) => task.status === 'pending').length;
  const overdueCount = sortedTasks.filter(
    (task) => deriveTaskTiming(task, nowTs) === 'overdue',
  ).length;
  const completedCount = sortedTasks.filter((task) => task.status === 'completed').length;
  const completionRate = (() => {
    if (tasks.length === 0) {
      return 0;
    }
    return Math.round((completedCount / tasks.length) * 100);
  })();
  const readinessScore = (() => {
    if (isCoachView) {
      return 0;
    }
    const dueSoonCount = sortedTasks.filter(
      (task) => deriveTaskTiming(task, nowTs) === 'due_soon',
    ).length;
    const raw = 100 - overdueCount * 28 - dueSoonCount * 12 + Math.min(12, completedCount * 3);
    return Math.max(0, Math.min(100, raw));
  })();
  const groupedFilteredTasks = groupTasksForProgressLoop(filteredTasks, filter, nowTs);
  const coachQueueLanes: CoachQueueLaneGroup[] = (() => {
    const buckets: Record<CoachQueueLaneKey, CoachFollowUpItem[]> = {
      intervene_now: [],
      watch_today: [],
      stable: [],
    };
    for (const row of coachQueue) {
      buckets[resolveCoachQueueLane(row)].push(row);
    }
    return [
      {
        key: 'intervene_now',
        title: 'Intervene now',
        count: buckets.intervene_now.length,
        rows: buckets.intervene_now,
      },
      {
        key: 'watch_today',
        title: 'Watch today',
        count: buckets.watch_today.length,
        rows: buckets.watch_today,
      },
      {
        key: 'stable',
        title: 'Stable',
        count: buckets.stable.length,
        rows: buckets.stable,
      },
    ];
  })();
  const withTaskInflightGuard = async <T>(taskId: string, action: () => Promise<T>): Promise<T> => {
    if (inflightTaskIdsRef.current.has(taskId)) {
      throw serviceError('RATE_LIMITED', 'Task update already in progress.');
    }
    inflightTaskIdsRef.current.add(taskId);
    return await runAsyncFinally(
      async () => {
        return await action();
      },
      () => {
        inflightTaskIdsRef.current.delete(taskId);
      },
    );
  };
  const withCoachActionInflightGuard = async <T>(action: () => Promise<T>): Promise<T> => {
    if (coachActionInFlightRef.current) {
      throw serviceError('RATE_LIMITED', 'Coach queue action already in progress.');
    }
    coachActionInFlightRef.current = true;
    return await runAsyncFinally(
      async () => {
        return await action();
      },
      () => {
        coachActionInFlightRef.current = false;
      },
    );
  };
  const runTaskMutationNow = async (mutation: PendingTaskMutation) => {
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing actor context for task update.'));
    }
    if (mutation.kind === 'completion') {
      return progressPracticeTaskService.setTaskCompletion(
        mutation.taskId,
        mutation.completed,
        currentUser.id,
        mutation.completionNote,
      );
    }
    return progressPracticeTaskService.updateTaskDueAt(
      mutation.taskId,
      mutation.dueAtIso,
      currentUser.id,
    );
  };
  const executeQueuedRetry = async (taskId: string) => {
    const mutation = queuedMutationsRef.current.get(taskId);
    if (!mutation) {
      return;
    }
    let result;
    try {
      result = await withTaskInflightGuard(taskId, () => runTaskMutationNow(mutation));
    } catch {
      const timer = setTimeout(() => {
        void executeQueuedRetry(taskId);
      }, 4000);
      retryTimersRef.current.set(taskId, timer);
      return;
    }
    if (result.success) {
      clearTaskRetry(taskId);
      clearTaskPatch(taskId);
      clearTaskSyncing(taskId);
      onRefresh();
      return;
    }
    if (shouldQueueTaskRetry(result.error)) {
      const nextAttempt = (retryAttemptRef.current.get(taskId) ?? 0) + 1;
      retryAttemptRef.current.set(taskId, nextAttempt);
      if (nextAttempt <= 3) {
        const delayMs = Math.min(12000, nextAttempt * 4000);
        const timer = setTimeout(() => {
          void executeQueuedRetry(taskId);
        }, delayMs);
        retryTimersRef.current.set(taskId, timer);
        return;
      }
    }
    clearTaskRetry(taskId);
    clearTaskPatch(taskId);
    clearTaskSyncing(taskId);
    pushTaskSyncError(taskId, `${result.error.message} Changes were not saved.`);
    onRefresh();
  };
  const queueTaskRetry = (taskId: string, mutation: PendingTaskMutation) => {
    queuedMutationsRef.current.set(taskId, mutation);
    markTaskSyncing(taskId);
    const existing = retryTimersRef.current.get(taskId);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      void executeQueuedRetry(taskId);
    }, 3000);
    retryTimersRef.current.set(taskId, timer);
  };
  const flushQueuedMutations = () => {
    for (const [taskId] of queuedMutationsRef.current) {
      const timer = retryTimersRef.current.get(taskId);
      if (timer) {
        clearTimeout(timer);
        retryTimersRef.current.delete(taskId);
      }
      void executeQueuedRetry(taskId);
    }
  };
  useEffect(() => {
    flushQueuedMutationsRef.current = flushQueuedMutations;
  });
  useEffect(() => {
    const unsubConnection = onTyped(ServiceEvents.CONNECTION_CHANGED, (payload) => {
      if (payload.isConnected) {
        flushQueuedMutationsRef.current();
      }
    });
    const unsubActive = onTyped(ServiceEvents.APP_ACTIVE, () => {
      flushQueuedMutationsRef.current();
    });
    return () => {
      unsubConnection();
      unsubActive();
    };
  }, []);
  useEffect(
    () => () => {
      for (const timer of retryTimersRef.current.values()) {
        clearTimeout(timer);
      }
      retryTimersRef.current.clear();
      queuedMutationsRef.current.clear();
      retryAttemptRef.current.clear();
    },
    [],
  );
  useEffect(() => {
    const nextScope = `${isCoachView ? 'coach' : 'athlete'}:${selectedAthleteId ?? 'none'}`;
    if (taskScopeKeyRef.current == null) {
      taskScopeKeyRef.current = nextScope;
      return;
    }
    if (taskScopeKeyRef.current === nextScope) {
      return;
    }
    taskScopeKeyRef.current = nextScope;
    for (const timer of retryTimersRef.current.values()) {
      clearTimeout(timer);
    }
    retryTimersRef.current.clear();
    queuedMutationsRef.current.clear();
    retryAttemptRef.current.clear();
    // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change -- optimistic task patches are scoped to the active coach/athlete view.
    setTaskOptimisticPatches({});
    // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change -- in-flight task sync indicators are scoped to the active coach/athlete view.
    setSyncingTaskIds({});
    // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change -- task sync notices should not carry between coach/athlete scopes.
    setTaskSyncErrorNotice(null);
  }, [isCoachView, selectedAthleteId]);
  const queueTotals = {
    athletes: coachQueue.length,
    pending: coachQueue.reduce((sum, row) => sum + row.pendingCount, 0),
    overdue: coachQueue.reduce((sum, row) => sum + row.overdueCount, 0),
    dueSoon: coachQueue.reduce((sum, row) => sum + row.dueSoonCount, 0),
    watch: coachQueue.filter((row) => row.risk === 'watch').length,
    high: coachQueue.filter((row) => row.risk === 'high').length,
    atRisk: coachQueue.filter((row) => resolveCoachQueueLane(row) === 'intervene_now').length,
  };
  const parentCoachFollowUpSignal: ParentCoachFollowUpSignal | null = (() => {
    if (!isParentView) {
      return null;
    }
    const pendingTasks = sortedTasks.filter((task) => task.status === 'pending');
    if (pendingTasks.length === 0) {
      return null;
    }
    const latestCoachActionAt = pendingTasks.reduce<string | null>((latest, task) => {
      const value = task.lastCoachActionAt;
      if (typeof value !== 'string' || Number.isNaN(parseTimestamp(value))) {
        return latest;
      }
      return latest === null || parseTimestamp(value) > parseTimestamp(latest) ? value : latest;
    }, null);
    const latestCoachActionTs = parseTimestamp(latestCoachActionAt);
    const RECENT_WINDOW_MS = 72 * 60 * 60 * 1000;
    const isRecent =
      !Number.isNaN(latestCoachActionTs) && nowTs - latestCoachActionTs <= RECENT_WINDOW_MS;
    return {
      status: isRecent ? 'active' : 'awaiting',
      latestCoachActionAt,
      pendingCount: pendingTasks.length,
      overdueCount: pendingTasks.filter((task) => deriveTaskTiming(task, nowTs) === 'overdue')
        .length,
    };
  })();
  const setTaskCompletion = async (taskId: string, completed: boolean, completionNote?: string) => {
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing actor context for task update.'));
    }
    const currentTask = tasks.find((entry) => entry.id === taskId);
    if (!currentTask) {
      return err(serviceError('NOT_FOUND', 'Practice task not found.'));
    }
    if (inflightTaskIdsRef.current.has(taskId)) {
      return err(serviceError('RATE_LIMITED', 'Task update already in progress.'));
    }
    const mutation: PendingTaskMutation = {
      kind: 'completion',
      taskId,
      completed,
      completionNote,
    };
    const optimisticPatch = buildCompletionPatch(
      currentTask,
      completed,
      currentUser.id,
      completionNote,
    );
    const optimisticTask = applyTaskOptimisticPatch(currentTask, optimisticPatch, nowTs);
    clearTaskRetry(taskId);
    setTaskPatch(taskId, optimisticPatch);
    markTaskSyncing(taskId);
    let result;
    try {
      result = await withTaskInflightGuard(taskId, () => runTaskMutationNow(mutation));
    } catch (guardError) {
      const normalizedError = coerceServiceError(guardError, 'Task update already in progress.');
      if (shouldQueueTaskRetry(normalizedError)) {
        queueTaskRetry(taskId, mutation);
        return ok(optimisticTask);
      }
      clearTaskPatch(taskId);
      clearTaskSyncing(taskId);
      onRefresh();
      return err(
        normalizedError.code === 'UNKNOWN'
          ? serviceError('RATE_LIMITED', normalizedError.message)
          : normalizedError,
      );
    }
    if (!result.success) {
      if (shouldQueueTaskRetry(result.error)) {
        queueTaskRetry(taskId, mutation);
        return ok(optimisticTask);
      }
      clearTaskPatch(taskId);
      clearTaskSyncing(taskId);
      logger.error('Failed to set practice task completion', {
        taskId,
        completed,
        error: result.error,
      });
      onRefresh();
      return result;
    }
    clearTaskRetry(taskId);
    clearTaskPatch(taskId);
    clearTaskSyncing(taskId);
    onRefresh();
    return result;
  };
  const updateTaskDueAt = async (taskId: string, dueAtIso: string) => {
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing actor context for due date update.'));
    }
    const currentTask = tasks.find((entry) => entry.id === taskId);
    if (!currentTask) {
      return err(serviceError('NOT_FOUND', 'Practice task not found.'));
    }
    if (inflightTaskIdsRef.current.has(taskId)) {
      return err(serviceError('RATE_LIMITED', 'Task update already in progress.'));
    }
    const mutation: PendingTaskMutation = {
      kind: 'due_at',
      taskId,
      dueAtIso,
    };
    const optimisticPatch = buildDueAtPatch(currentTask, dueAtIso);
    const optimisticTask = applyTaskOptimisticPatch(currentTask, optimisticPatch, nowTs);
    clearTaskRetry(taskId);
    setTaskPatch(taskId, optimisticPatch);
    markTaskSyncing(taskId);
    let result;
    try {
      result = await withTaskInflightGuard(taskId, () => runTaskMutationNow(mutation));
    } catch (guardError) {
      const normalizedError = coerceServiceError(guardError, 'Task update already in progress.');
      if (shouldQueueTaskRetry(normalizedError)) {
        queueTaskRetry(taskId, mutation);
        return ok(optimisticTask);
      }
      clearTaskPatch(taskId);
      clearTaskSyncing(taskId);
      onRefresh();
      return err(
        normalizedError.code === 'UNKNOWN'
          ? serviceError('RATE_LIMITED', normalizedError.message)
          : normalizedError,
      );
    }
    if (!result.success) {
      if (shouldQueueTaskRetry(result.error)) {
        queueTaskRetry(taskId, mutation);
        return ok(optimisticTask);
      }
      clearTaskPatch(taskId);
      clearTaskSyncing(taskId);
      logger.error('Failed to update task due date', {
        taskId,
        dueAtIso,
        error: result.error,
      });
      onRefresh();
      return result;
    }
    clearTaskRetry(taskId);
    clearTaskPatch(taskId);
    clearTaskSyncing(taskId);
    onRefresh();
    return result;
  };
  const snoozeTask = async (taskId: string, hours: number) => {
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing actor context for snooze.'));
    }
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 14) {
      return err(serviceError('VALIDATION', 'Snooze hours must be between 1 and 336.'));
    }
    const currentTask = tasks.find((entry) => entry.id === taskId);
    if (!currentTask) {
      return err(serviceError('NOT_FOUND', 'Practice task not found.'));
    }
    const dueAtIso = buildSnoozedDueAt(currentTask, hours);
    return updateTaskDueAt(taskId, dueAtIso);
  };
  const markCoachTasksReviewed = async (taskIds: string[]) => {
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing coach context.'));
    }
    let result;
    try {
      result = await withCoachActionInflightGuard(() =>
        progressPracticeTaskService.markTasksReviewed(taskIds, currentUser.id),
      );
    } catch (guardError) {
      return err(
        guardError instanceof Error
          ? serviceError('RATE_LIMITED', guardError.message)
          : serviceError('RATE_LIMITED', 'Coach queue action already in progress.'),
      );
    }
    if (!result.success) {
      logger.error('Failed to mark coach tasks reviewed', {
        taskIds,
        error: result.error,
      });
      return result;
    }
    onRefresh();
    return result;
  };
  const recordCoachFollowUp = async (
    taskIds: string[],
    actionType: Exclude<CoachFollowUpActionType, 'task_update' | 'completion' | 'review'>,
  ) => {
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing coach context.'));
    }
    let result;
    try {
      result = await withCoachActionInflightGuard(() =>
        progressPracticeTaskService.recordCoachFollowUp(taskIds, currentUser.id, actionType),
      );
    } catch (guardError) {
      return err(
        guardError instanceof Error
          ? serviceError('RATE_LIMITED', guardError.message)
          : serviceError('RATE_LIMITED', 'Coach queue action already in progress.'),
      );
    }
    if (!result.success) {
      logger.error('Failed to record coach follow-up action', {
        actionType,
        taskIds,
        error: result.error,
      });
      return result;
    }
    onRefresh();
    return result;
  };
  const setCoachRecoveryCheckpoint = async (taskIds: string[], hours = 48) => {
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing coach context.'));
    }
    let result;
    try {
      result = await withCoachActionInflightGuard(() =>
        progressPracticeTaskService.setRecoveryCheckpoint(taskIds, currentUser.id, hours),
      );
    } catch (guardError) {
      return err(
        guardError instanceof Error
          ? serviceError('RATE_LIMITED', guardError.message)
          : serviceError('RATE_LIMITED', 'Coach queue action already in progress.'),
      );
    }
    if (!result.success) {
      logger.error('Failed to set coach recovery checkpoint', {
        taskIds,
        hours,
        error: result.error,
      });
      return result;
    }
    onRefresh();
    return result;
  };
  const seedBoundaryTestData = async (): Promise<Result<SeedBoundaryDataResult, ServiceError>> => {
    if (!__DEV__) {
      return err(
        serviceError('UNAUTHORIZED', 'Boundary data seeding is only available in development.'),
      );
    }
    if (isCoachView) {
      return err(
        serviceError(
          'VALIDATION',
          'Boundary data seeding is available in athlete or parent scope only.',
        ),
      );
    }
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing actor context for boundary data seeding.'));
    }
    if (!selectedAthleteId) {
      return err(serviceError('VALIDATION', 'No athlete selected for boundary data seeding.'));
    }
    if (isSeedingBoundaryData) {
      return err(serviceError('RATE_LIMITED', 'Boundary data seeding already in progress.'));
    }
    setIsSeedingBoundaryData(true);
    return await runAsyncTryCatchFinally(
      async () => {
        const viewerRole: TaskViewerRole = isParentView ? 'parent' : 'athlete';
        const visibility = isParentView ? 'parent' : 'athlete';
        const seedCoachId = `coach_results_seed_${selectedAthleteId}`;
        const seedCoachName = 'Coach Boundary';
        const now = Date.now();
        const scenarios: Array<{
          key: string;
          title: string;
          homework: string;
          dueOffsetHours: number;
          markCompleted: boolean;
        }> = [
          {
            key: 'overdue_extreme',
            title: 'Boundary: Overdue Recovery Block',
            homework:
              'Complete 3 x 8 minute recovery sets. Log perceived effort after each set and maintain technical quality under fatigue.',
            dueOffsetHours: -72,
            markCompleted: false,
          },
          {
            key: 'due_soon',
            title: 'Boundary: Due Soon Micro Task',
            homework:
              'Quick touch circuit: 2 rounds of 90 seconds. Focus on scanning before first touch.',
            dueOffsetHours: 2,
            markCompleted: false,
          },
          {
            key: 'upcoming_long_copy',
            title: 'Boundary: Long Instruction Task',
            homework:
              'Long-form rehearsal: build a 20 minute plan with phase checkpoints (warm-up, technical, decision, cooldown). Include exact rep targets, execution cues, and one correction rule for each phase so this card stress-tests long text wrapping across mobile breakpoints and dynamic type settings.',
            dueOffsetHours: 96,
            markCompleted: false,
          },
          {
            key: 'completed_recent',
            title: 'Boundary: Recently Completed Task',
            homework: 'Finish 15 minute passing routine and record one improvement note.',
            dueOffsetHours: -6,
            markCompleted: true,
          },
        ];
        const existingTasks = await progressPracticeTaskService.listTasksForAthlete(
          selectedAthleteId,
          viewerRole,
        );
        const existingBySessionId = new Map(existingTasks.map((task) => [task.sessionId, task]));
        const feedbackCreateResults = await Promise.all(
          scenarios.map(async (scenario, index) => {
            const sessionId = `results_seed_${selectedAthleteId}_${scenario.key}`;
            if (existingBySessionId.has(sessionId)) {
              return false;
            }
            await progressFeedbackService.addSessionFeedback(
              {
                sessionId,
                coachId: seedCoachId,
                coachName: seedCoachName,
                athleteId: selectedAthleteId,
                athleteName: selectedAthleteName,
                publicSummary: `Boundary fixture ${index + 1} for Results Program.`,
                skillsWorkedOn: ['Decision making'],
                skillRatings: [
                  {
                    skill: 'Decision making',
                    rating: Math.max(1, 5 - index),
                  },
                ],
                improvements: 'Keep quality under time pressure.',
                homework: scenario.homework,
                effortRating: 4,
                overallPerformance: 4,
                visibility,
              },
              {
                skipSkillUpdate: true,
              },
            );
            return true;
          }),
        );
        const createdCount = feedbackCreateResults.filter(Boolean).length;
        const seededTasks = await progressPracticeTaskService.listTasksForAthlete(
          selectedAthleteId,
          viewerRole,
        );
        const seededBySessionId = new Map(seededTasks.map((task) => [task.sessionId, task]));
        const taskUpdateResults = await Promise.all(
          scenarios.map(async (scenario) => {
            const sessionId = `results_seed_${selectedAthleteId}_${scenario.key}`;
            const task = seededBySessionId.get(sessionId);
            if (!task) {
              return ok(undefined);
            }
            const dueAtIso = new Date(now + scenario.dueOffsetHours * 60 * 60 * 1000).toISOString();
            const dueResult = await progressPracticeTaskService.updateTaskDueAt(
              task.id,
              dueAtIso,
              currentUser.id,
            );
            if (!dueResult.success) {
              return dueResult;
            }
            const completionResult = await progressPracticeTaskService.setTaskCompletion(
              task.id,
              scenario.markCompleted,
              currentUser.id,
              scenario.markCompleted ? 'Boundary fixture marked completed.' : undefined,
            );
            if (!completionResult.success) {
              return completionResult;
            }
            return ok(undefined);
          }),
        );
        const failedTaskUpdateResult = taskUpdateResults.find((result) => !result.success);
        if (failedTaskUpdateResult && !failedTaskUpdateResult.success) {
          return failedTaskUpdateResult;
        }
        onRefresh();
        return ok({
          createdCount,
          seededCount: scenarios.length,
        });
      },
      async (seedError) => {
        logger.error('Failed to seed results boundary data', {
          selectedAthleteId,
          error: seedError,
        });
        return err(serviceError('UNKNOWN', 'Failed to seed results boundary data.', seedError));
      },
      () => {
        setIsSeedingBoundaryData(false);
      },
    );
  };
  const handleSelectNextChild = () => {
    if (!hasMultipleChildren) {
      return;
    }
    const currentIndex = switcherChildren.findIndex((child) => child.id === selectedAthleteId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % switcherChildren.length : 0;
    const nextChildId = switcherChildren[nextIndex]?.id ?? switcherChildren[0]?.id;
    if (!nextChildId) {
      return;
    }
    void setActiveChildId(nextChildId);
  };
  return {
    currentUser,
    isCoachView,
    isParentView,
    switcherChildren,
    hasMultipleChildren,
    selectedAthleteId,
    selectedAthleteName,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    tasks,
    filteredTasks,
    groupedFilteredTasks,
    coachQueue,
    coachQueueLanes,
    parentCoachFollowUpSignal,
    filter,
    setFilter: setFilter as Dispatch<SetStateAction<ProgressLoopFilter>>,
    nowTs,
    pendingCount,
    overdueCount,
    completedCount,
    completionRate,
    readinessScore,
    weeklyPracticeMinutes,
    practiceDaysThisWeek,
    queueTotals,
    setTaskCompletion,
    updateTaskDueAt,
    snoozeTask,
    markCoachTasksReviewed,
    recordCoachFollowUp,
    setCoachRecoveryCheckpoint,
    taskSyncErrorNotice,
    clearTaskSyncErrorNotice,
    isTaskUpdating: (taskId: string) =>
      inflightTaskIdsRef.current.has(taskId) || Boolean(syncingTaskIds[taskId]),
    isTaskSyncing: (taskId: string) => Boolean(syncingTaskIds[taskId]),
    isCoachActionUpdating: () => coachActionInFlightRef.current,
    handleSelectNextChild,
    seedBoundaryTestData,
    isSeedingBoundaryData,
  } satisfies {
    currentUser: typeof currentUser;
    isCoachView: boolean;
    isParentView: boolean;
    switcherChildren: SwitcherChild[];
    hasMultipleChildren: boolean;
    selectedAthleteId: string | null;
    selectedAthleteName: string;
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    tasks: PracticeTask[];
    filteredTasks: PracticeTask[];
    groupedFilteredTasks: ProgressLoopTaskGroup[];
    coachQueue: CoachFollowUpItem[];
    coachQueueLanes: CoachQueueLaneGroup[];
    parentCoachFollowUpSignal: ParentCoachFollowUpSignal | null;
    filter: ProgressLoopFilter;
    setFilter: Dispatch<SetStateAction<ProgressLoopFilter>>;
    nowTs: number;
    pendingCount: number;
    overdueCount: number;
    completedCount: number;
    completionRate: number;
    readinessScore: number;
    weeklyPracticeMinutes: number;
    practiceDaysThisWeek: number;
    queueTotals: {
      athletes: number;
      pending: number;
      overdue: number;
      dueSoon: number;
      watch: number;
      high: number;
      atRisk: number;
    };
    setTaskCompletion: (
      taskId: string,
      completed: boolean,
      completionNote?: string,
    ) => Promise<Result<PracticeTask, ServiceError>>;
    updateTaskDueAt: (
      taskId: string,
      dueAtIso: string,
    ) => Promise<Result<PracticeTask, ServiceError>>;
    snoozeTask: (taskId: string, hours: number) => Promise<Result<PracticeTask, ServiceError>>;
    markCoachTasksReviewed: (
      taskIds: string[],
    ) => Promise<Result<CoachBulkActionResult, ServiceError>>;
    recordCoachFollowUp: (
      taskIds: string[],
      actionType: Exclude<CoachFollowUpActionType, 'task_update' | 'completion' | 'review'>,
    ) => Promise<Result<CoachBulkActionResult, ServiceError>>;
    setCoachRecoveryCheckpoint: (
      taskIds: string[],
      hours?: number,
    ) => Promise<Result<CoachBulkActionResult, ServiceError>>;
    taskSyncErrorNotice: TaskSyncErrorNotice | null;
    clearTaskSyncErrorNotice: () => void;
    isTaskUpdating: (taskId: string) => boolean;
    isTaskSyncing: (taskId: string) => boolean;
    isCoachActionUpdating: () => boolean;
    handleSelectNextChild: () => void;
    seedBoundaryTestData: () => Promise<Result<SeedBoundaryDataResult, ServiceError>>;
    isSeedingBoundaryData: boolean;
  };
}
