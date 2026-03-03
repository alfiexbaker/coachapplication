import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  type ListRenderItemInfo,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { PageHeader } from '@/components/primitives/page-header';
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/ui/toast';
import { EmptyState, ErrorState } from '@/components/ui/screen-states';
import {
  CoachLaneSegment,
  CoachQueueCard,
  InterventionPlaybookSheet,
  ResultsFilterSegment,
  ResultsProgramHero,
  ResultsProgramLoadingState,
  TaskCard,
  TaskDetailSheet,
  type ResultsProgramHeroMetric,
} from '@/components/progress-loop';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  useProgressLoop,
  type ProgressLoopFilter,
  type ProgressLoopTaskGroup,
} from '@/hooks/use-progress-loop';
import { useResultsProgramMotion } from '@/hooks/use-results-program-motion';
import { Routes } from '@/navigation/routes';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import type {
  CoachBulkActionResult,
  CoachFollowUpItem,
  PracticeTask,
} from '@/services/progress/progress-practice-task-service';
import {
  deriveTaskTiming,
  relativeDueLabel,
  sortTasksByUrgency,
  timingBadgeLabel,
  type CoachQueueLaneKey,
} from '@/utils/progress-task-time';
import { runResultsProgramTaskAction } from '@/utils/results-program-action-router';

const FILTER_OPTIONS: Array<{ id: ProgressLoopFilter; label: string }> = [
  { id: 'pending', label: 'Pending' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'All' },
];

const COACH_LANE_STICKY_HEIGHT = 132;
const OVERDUE_RESOLUTION_WINDOW_MS = 48 * 60 * 60 * 1000;

type CoachListItem = { type: 'lane_selector' } | { type: 'athlete'; row: CoachFollowUpItem };

type ResultsProgramRole = 'coach' | 'parent' | 'athlete';

function sectionTone(sectionKey: ProgressLoopTaskGroup['key']): 'default' | 'alert' | 'success' {
  if (sectionKey === 'overdue') {
    return 'alert';
  }
  if (sectionKey === 'completed') {
    return 'success';
  }
  return 'default';
}

function formatFollowUpTimestamp(value: string | null): string {
  if (!value) {
    return 'No recent coach follow-up';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'No recent coach follow-up';
  }
  return `Last action ${parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })} ${parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

function formatBulkSummary(actionLabel: string, result: CoachBulkActionResult): {
  message: string;
  tone: 'success' | 'warning' | 'error';
} {
  if (result.updatedCount <= 0) {
    return {
      message: `${actionLabel} failed. No records updated.`,
      tone: 'error',
    };
  }
  if (result.skippedCount > 0) {
    return {
      message: `${actionLabel}: ${result.updatedCount} updated, ${result.skippedCount} skipped.`,
      tone: 'warning',
    };
  }
  return {
    message: `${actionLabel}: ${result.updatedCount} updated.`,
    tone: 'success',
  };
}

function collectTaskIds(rows: CoachFollowUpItem[]): string[] {
  return Array.from(new Set(rows.flatMap((row) => row.taskIds)));
}

function toResultsProgramRole(role: string | undefined): ResultsProgramRole {
  if (role === 'COACH') {
    return 'coach';
  }
  if (role === 'PARENT') {
    return 'parent';
  }
  return 'athlete';
}

export default function ResultsProgramScreen() {
  const { colors } = useTheme();
  const motion = useResultsProgramMotion();
  const { showToast, showUndoToast } = useToast();
  const openedAtRef = useRef(Date.now());
  const openedKeyRef = useRef<string | null>(null);
  const firstActionTrackedRef = useRef(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const [coachLane, setCoachLane] = useState<CoachQueueLaneKey>('intervene_now');
  const [coachSelectionMode, setCoachSelectionMode] = useState(false);
  const [selectedCoachAthleteIds, setSelectedCoachAthleteIds] = useState<string[]>([]);
  const [selectedPlaybookAthleteId, setSelectedPlaybookAthleteId] = useState<string | null>(null);

  const { athleteId: athleteIdRaw } = useLocalSearchParams<{ athleteId?: string | string[] }>();
  const athleteIdParam = Array.isArray(athleteIdRaw) ? athleteIdRaw[0] : athleteIdRaw;

  const {
    currentUser,
    isCoachView,
    isParentView,
    hasMultipleChildren,
    selectedAthleteId,
    selectedAthleteName,
    loading,
    status,
    error,
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
    setFilter,
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
    isTaskUpdating,
    isTaskSyncing,
    isCoachActionUpdating,
    handleSelectNextChild,
    seedBoundaryTestData,
    isSeedingBoundaryData,
  } = useProgressLoop(athleteIdParam);

  const eventRole = useMemo<ResultsProgramRole>(
    () => toResultsProgramRole(currentUser?.role),
    [currentUser?.role],
  );

  const pullTimeToFirstActionMs = useCallback(() => {
    if (firstActionTrackedRef.current) {
      return undefined;
    }
    firstActionTrackedRef.current = true;
    return Math.max(0, Date.now() - openedAtRef.current);
  }, []);

  useEffect(() => {
    if (filter === 'done') {
      setCompletedCollapsed(false);
      return;
    }
    setCompletedCollapsed(true);
  }, [filter]);

  useEffect(() => {
    if (!isCoachView) {
      return;
    }
    const selectedLane = coachQueueLanes.find((lane) => lane.key === coachLane);
    if (selectedLane && selectedLane.count > 0) {
      return;
    }
    const fallbackLane = coachQueueLanes.find((lane) => lane.count > 0)?.key ?? 'intervene_now';
    setCoachLane(fallbackLane);
  }, [coachLane, coachQueueLanes, isCoachView]);

  useEffect(() => {
    if (!isCoachView) {
      return;
    }
    const athleteIdSet = new Set(coachQueue.map((row) => row.athleteId));
    setSelectedCoachAthleteIds((previous) => previous.filter((id) => athleteIdSet.has(id)));
  }, [coachQueue, isCoachView]);

  useEffect(() => {
    if (!taskSyncErrorNotice) {
      return;
    }
    showToast(taskSyncErrorNotice.message, 'error');
    clearTaskSyncErrorNotice();
  }, [clearTaskSyncErrorNotice, showToast, taskSyncErrorNotice]);

  useEffect(() => {
    if (!currentUser?.id || status === 'loading') {
      return;
    }

    const scopeKey = `${currentUser.id}:${eventRole}:${selectedAthleteId ?? 'coach_scope'}`;
    if (openedKeyRef.current === scopeKey) {
      return;
    }
    openedKeyRef.current = scopeKey;
    openedAtRef.current = Date.now();
    firstActionTrackedRef.current = false;

    emitTyped(ServiceEvents.RESULTS_PROGRAM_OPENED, {
      userId: currentUser.id,
      role: eventRole,
      athleteId: selectedAthleteId ?? null,
      openedAt: new Date().toISOString(),
      pendingCount: isCoachView ? queueTotals.pending : pendingCount,
      overdueCount: isCoachView ? queueTotals.overdue : overdueCount,
      queueAthleteCount: isCoachView ? queueTotals.athletes : undefined,
    });
  }, [
    currentUser?.id,
    eventRole,
    isCoachView,
    overdueCount,
    pendingCount,
    queueTotals.athletes,
    queueTotals.overdue,
    queueTotals.pending,
    selectedAthleteId,
    status,
  ]);

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) ?? null : null),
    [selectedTaskId, tasks],
  );

  const selectedPlaybookRow = useMemo(
    () =>
      selectedPlaybookAthleteId
        ? coachQueue.find((row) => row.athleteId === selectedPlaybookAthleteId) ?? null
        : null,
    [coachQueue, selectedPlaybookAthleteId],
  );

  const filterOptions = useMemo(
    () =>
      FILTER_OPTIONS.map((option) => ({
        ...option,
        count:
          option.id === 'pending'
            ? pendingCount
            : option.id === 'overdue'
              ? overdueCount
              : option.id === 'done'
                ? completedCount
                : tasks.length,
      })),
    [completedCount, overdueCount, pendingCount, tasks.length],
  );

  const handleSelectFilter = useCallback(
    (nextFilter: ProgressLoopFilter) => {
      if (nextFilter === filter) {
        return;
      }
      setFilter(nextFilter);
      if (!currentUser?.id || isCoachView) {
        return;
      }

      const countForFilter =
        nextFilter === 'pending'
          ? pendingCount
          : nextFilter === 'overdue'
            ? overdueCount
            : nextFilter === 'done'
              ? completedCount
              : tasks.length;
      emitTyped(ServiceEvents.RESULTS_PROGRAM_FILTER_CHANGED, {
        userId: currentUser.id,
        role: eventRole,
        athleteId: selectedAthleteId ?? null,
        filter: nextFilter,
        count: countForFilter,
        pendingCount,
        overdueCount,
        completedCount,
      });
    },
    [
      completedCount,
      currentUser?.id,
      eventRole,
      filter,
      isCoachView,
      overdueCount,
      pendingCount,
      selectedAthleteId,
      setFilter,
      tasks.length,
    ],
  );

  const coachInterventionScore = useMemo(() => {
    const pressure = queueTotals.overdue * 20 + queueTotals.high * 14 + queueTotals.watch * 8;
    return Math.max(0, Math.min(100, 100 - pressure));
  }, [queueTotals.high, queueTotals.overdue, queueTotals.watch]);

  const coachMetrics = useMemo<ResultsProgramHeroMetric[]>(
    () => [
      { label: 'At risk', value: queueTotals.atRisk, tone: queueTotals.atRisk > 0 ? 'alert' : 'default' },
      { label: 'Overdue', value: queueTotals.overdue, tone: queueTotals.overdue > 0 ? 'alert' : 'default' },
      { label: 'Due soon', value: queueTotals.dueSoon, tone: queueTotals.dueSoon > 0 ? 'alert' : 'default' },
    ],
    [queueTotals.atRisk, queueTotals.dueSoon, queueTotals.overdue],
  );

  const athleteMetrics = useMemo<ResultsProgramHeroMetric[]>(
    () => [
      { label: 'Pending now', value: pendingCount },
      { label: 'Overdue', value: overdueCount, tone: 'alert' },
      {
        label: 'Practice days',
        value: practiceDaysThisWeek,
        tone: practiceDaysThisWeek > 0 ? 'success' : 'default',
      },
    ],
    [overdueCount, pendingCount, practiceDaysThisWeek],
  );

  const orderedPendingTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status === 'pending')
        .sort((left, right) => sortTasksByUrgency(left, right, nowTs)),
    [nowTs, tasks],
  );

  const dueSoonCount = useMemo(
    () =>
      orderedPendingTasks.filter((task) => deriveTaskTiming(task, nowTs) === 'due_soon').length,
    [nowTs, orderedPendingTasks],
  );

  const upcomingCount = useMemo(
    () =>
      orderedPendingTasks.filter((task) => deriveTaskTiming(task, nowTs) === 'upcoming').length,
    [nowTs, orderedPendingTasks],
  );

  const topPriorityTask = useMemo(
    () => orderedPendingTasks[0] ?? null,
    [orderedPendingTasks],
  );

  const topPriorityTiming = useMemo(
    () => (topPriorityTask ? deriveTaskTiming(topPriorityTask, nowTs) : null),
    [nowTs, topPriorityTask],
  );

  const topPriorityColor = useMemo(() => {
    if (topPriorityTiming === 'overdue') {
      return colors.error;
    }
    if (topPriorityTiming === 'due_soon') {
      return colors.warning;
    }
    return colors.tint;
  }, [colors.error, colors.tint, colors.warning, topPriorityTiming]);

  const executionQueueSubtitle = useMemo(() => {
    if (overdueCount > 0) {
      return `${overdueCount} overdue needs action now.`;
    }
    if (dueSoonCount > 0) {
      return `${dueSoonCount} due soon before next session.`;
    }
    if (orderedPendingTasks.length > 0) {
      return `${orderedPendingTasks.length} queued to keep momentum.`;
    }
    return 'No pending actions right now.';
  }, [dueSoonCount, orderedPendingTasks.length, overdueCount]);

  const coachLaneOptions = useMemo(
    () =>
      coachQueueLanes.map((lane) => ({
        id: lane.key,
        label: lane.title,
        count: lane.count,
      })),
    [coachQueueLanes],
  );

  const selectedLaneRows = useMemo(
    () => coachQueueLanes.find((lane) => lane.key === coachLane)?.rows ?? [],
    [coachLane, coachQueueLanes],
  );

  const coachListData = useMemo<CoachListItem[]>(
    () => [{ type: 'lane_selector' }, ...selectedLaneRows.map((row) => ({ type: 'athlete' as const, row }))],
    [selectedLaneRows],
  );

  const selectedCoachAthleteIdSet = useMemo(
    () => new Set(selectedCoachAthleteIds),
    [selectedCoachAthleteIds],
  );

  const selectedCoachTaskIds = useMemo(() => {
    const rows = coachQueue.filter((row) => selectedCoachAthleteIdSet.has(row.athleteId));
    return collectTaskIds(rows);
  }, [coachQueue, selectedCoachAthleteIdSet]);

  const overdueLaneTaskIds = useMemo(
    () => collectTaskIds(selectedLaneRows.filter((row) => row.overdueCount > 0)),
    [selectedLaneRows],
  );
  const dueSoonLaneTaskIds = useMemo(
    () => collectTaskIds(selectedLaneRows.filter((row) => row.dueSoonCount > 0)),
    [selectedLaneRows],
  );

  const runCoachActionWithSummary = useCallback(
    async (
      actionLabel: string,
      runner: () => Promise<{ success: true; data: CoachBulkActionResult } | { success: false; error: { message: string } }>,
      afterSuccess?: () => void,
    ): Promise<CoachBulkActionResult | null> => {
      const result = await runner();
      if (!result.success) {
        showToast(result.error.message, 'error');
        return null;
      }
      const summary = formatBulkSummary(actionLabel, result.data);
      showToast(summary.message, summary.tone);
      afterSuccess?.();
      return result.data;
    },
    [showToast],
  );

  const emitPlaybookAction = useCallback(
    (row: CoachFollowUpItem, action: 'message' | 'recovery_checkpoint' | 'history') => {
      if (!currentUser?.id) {
        return;
      }
      emitTyped(ServiceEvents.RESULTS_PLAYBOOK_ACTION_TAPPED, {
        coachId: currentUser.id,
        athleteId: row.athleteId,
        risk: row.risk,
        overdueCount: row.overdueCount,
        dueSoonCount: row.dueSoonCount,
        taskCount: row.taskIds.length,
        action,
      });
    },
    [currentUser?.id],
  );

  const handleOpenTask = useCallback((task: PracticeTask) => {
    setSelectedTaskId(task.id);
  }, []);

  const handleCloseTaskSheet = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const handleSeedBoundaryData = useCallback(async () => {
    const result = await seedBoundaryTestData();
    if (!result.success) {
      showToast(result.error.message, 'error');
      return;
    }

    if (result.data.createdCount > 0) {
      showToast(`Loaded ${result.data.createdCount} test scenarios.`, 'success');
      return;
    }

    showToast('Test scenarios already loaded and refreshed.', 'warning');
  }, [seedBoundaryTestData, showToast]);

  const handleToggleTask = useCallback(
    async (task: PracticeTask, completionNote?: string) => {
      const nextCompleted = task.status !== 'completed';
      const result = await runResultsProgramTaskAction(
        {
          type: 'toggle_completion',
          task,
          completionNote,
        },
        {
          setTaskCompletion,
          updateTaskDueAt,
          snoozeTask,
        },
      );
      if (!result.success) {
        showToast(result.error.message, 'error');
        return;
      }

      if (currentUser?.id) {
        const dueTs = new Date(task.dueAt).getTime();
        const now = Date.now();
        const wasOverdue = deriveTaskTiming(task, nowTs) === 'overdue';
        emitTyped(ServiceEvents.RESULTS_PROGRAM_TASK_COMPLETED, {
          userId: currentUser.id,
          role: eventRole,
          athleteId: task.athleteId || selectedAthleteId || null,
          taskId: task.id,
          coachId: task.coachId || null,
          status: nextCompleted ? 'completed' : 'reopened',
          dueAt: task.dueAt,
          completedAt: new Date().toISOString(),
          wasOverdue,
          resolvedWithin48h:
            nextCompleted && wasOverdue && !Number.isNaN(dueTs)
              ? now - dueTs <= OVERDUE_RESOLUTION_WINDOW_MS
              : undefined,
          timeToFirstActionMs: pullTimeToFirstActionMs(),
        });
      }

      if (nextCompleted) {
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        }
        showUndoToast('Task marked done', async () => {
          const undoResult = await setTaskCompletion(task.id, false);
          if (!undoResult.success) {
            showToast(undoResult.error.message, 'error');
            return;
          }
          showToast('Task restored', 'success');
        });
      } else {
        showToast('Task marked as not done', 'success');
      }

      if (isTaskSyncing(task.id)) {
        showToast('Saved locally. Syncing changes now.', 'warning');
      }

      setSelectedTaskId(null);
    },
    [
      currentUser?.id,
      eventRole,
      isTaskSyncing,
      nowTs,
      pullTimeToFirstActionMs,
      selectedAthleteId,
      setTaskCompletion,
      snoozeTask,
      showToast,
      showUndoToast,
      updateTaskDueAt,
    ],
  );

  const handleSnoozeTask = useCallback(
    async (task: PracticeTask, hours: number) => {
      const previousDueAt = task.dueAt;
      const previousDueTs = new Date(previousDueAt).getTime();
      const baseDueTs = Number.isNaN(previousDueTs) ? Date.now() : Math.max(Date.now(), previousDueTs);
      const nextDueAt = new Date(baseDueTs + hours * 60 * 60 * 1000).toISOString();
      const result = await runResultsProgramTaskAction(
        {
          type: 'snooze',
          task,
          hours,
        },
        {
          setTaskCompletion,
          updateTaskDueAt,
          snoozeTask,
        },
      );
      if (!result.success) {
        showToast(result.error.message, 'error');
        return;
      }

      if (currentUser?.id) {
        emitTyped(ServiceEvents.RESULTS_PROGRAM_TASK_RESCHEDULED, {
          userId: currentUser.id,
          role: eventRole,
          athleteId: task.athleteId || selectedAthleteId || null,
          taskId: task.id,
          coachId: task.coachId || null,
          previousDueAt,
          nextDueAt,
          action: 'snooze',
          snoozeHours: hours,
          wasOverdue: deriveTaskTiming(task, nowTs) === 'overdue',
          timeToFirstActionMs: pullTimeToFirstActionMs(),
        });
      }

      showToast(
        isTaskSyncing(task.id) ? `Snoozed by ${hours}h. Syncing now.` : `Task snoozed by ${hours}h`,
        isTaskSyncing(task.id) ? 'warning' : 'success',
      );
      setSelectedTaskId(null);
    },
    [
      currentUser?.id,
      eventRole,
      isTaskSyncing,
      nowTs,
      pullTimeToFirstActionMs,
      selectedAthleteId,
      setTaskCompletion,
      showToast,
      snoozeTask,
      updateTaskDueAt,
    ],
  );

  const handleRescheduleTask = useCallback(
    async (task: PracticeTask, dueAtIso: string) => {
      const previousDueAt = task.dueAt;
      const result = await runResultsProgramTaskAction(
        {
          type: 'reschedule',
          task,
          dueAtIso,
        },
        {
          setTaskCompletion,
          updateTaskDueAt,
          snoozeTask,
        },
      );
      if (!result.success) {
        showToast(result.error.message, 'error');
        return;
      }

      if (currentUser?.id) {
        emitTyped(ServiceEvents.RESULTS_PROGRAM_TASK_RESCHEDULED, {
          userId: currentUser.id,
          role: eventRole,
          athleteId: task.athleteId || selectedAthleteId || null,
          taskId: task.id,
          coachId: task.coachId || null,
          previousDueAt,
          nextDueAt: dueAtIso,
          action: 'reschedule',
          snoozeHours: undefined,
          wasOverdue: deriveTaskTiming(task, nowTs) === 'overdue',
          timeToFirstActionMs: pullTimeToFirstActionMs(),
        });
      }

      showToast(isTaskSyncing(task.id) ? 'Rescheduled. Syncing changes now.' : 'Task rescheduled', isTaskSyncing(task.id) ? 'warning' : 'success');
      setSelectedTaskId(null);
    },
    [
      currentUser?.id,
      eventRole,
      isTaskSyncing,
      nowTs,
      pullTimeToFirstActionMs,
      selectedAthleteId,
      setTaskCompletion,
      showToast,
      snoozeTask,
      updateTaskDueAt,
    ],
  );

  const handleMessageTask = useCallback(
    (task: PracticeTask) => {
      if (!task.coachId) {
        showToast('Coach conversation unavailable', 'error');
        return;
      }

      router.push(
        Routes.messagesWith({
          coachId: task.coachId,
          athleteId: task.athleteId || selectedAthleteId || undefined,
        }),
      );
      if (currentUser?.id) {
        emitTyped(ServiceEvents.RESULTS_PROGRAM_MESSAGE_FROM_TASK, {
          userId: currentUser.id,
          role: eventRole,
          athleteId: task.athleteId || selectedAthleteId || null,
          taskId: task.id,
          coachId: task.coachId,
          source: 'task_sheet',
          timeToFirstActionMs: pullTimeToFirstActionMs(),
        });
      }
      setSelectedTaskId(null);
    },
    [currentUser?.id, eventRole, pullTimeToFirstActionMs, selectedAthleteId, showToast],
  );

  const handleOpenHistory = useCallback((task: PracticeTask) => {
    router.push(
      Routes.developmentSessionHistory({
        athleteId: task.athleteId,
      }),
    );
    setSelectedTaskId(null);
  }, []);

  const handleClosePlaybook = useCallback(() => {
    setSelectedPlaybookAthleteId(null);
  }, []);

  const handleSelectLane = useCallback((value: CoachQueueLaneKey) => {
    setCoachLane(value);
    setCoachSelectionMode(false);
    setSelectedCoachAthleteIds([]);
  }, []);

  const handleToggleCoachSelectionMode = useCallback(() => {
    setCoachSelectionMode((previous) => {
      const next = !previous;
      if (!next) {
        setSelectedCoachAthleteIds([]);
      }
      return next;
    });
  }, []);

  const handleToggleCoachSelected = useCallback((athleteId: string) => {
    setSelectedCoachAthleteIds((previous) =>
      previous.includes(athleteId) ? previous.filter((value) => value !== athleteId) : [...previous, athleteId],
    );
  }, []);

  const handleOpenPlaybook = useCallback((row: CoachFollowUpItem) => {
    setSelectedPlaybookAthleteId(row.athleteId);
  }, []);

  const handleOpenCoachMessage = useCallback((row: CoachFollowUpItem) => {
    void runCoachActionWithSummary(
      'Follow-up logged',
      () => recordCoachFollowUp(row.taskIds, 'message'),
      () => {
        if (currentUser?.id) {
          emitTyped(ServiceEvents.RESULTS_PROGRAM_MESSAGE_FROM_TASK, {
            userId: currentUser.id,
            role: 'coach',
            athleteId: row.athleteId,
            taskId: row.taskIds[0] ?? `athlete_${row.athleteId}`,
            coachId: row.coachId,
            source: 'coach_playbook',
            timeToFirstActionMs: pullTimeToFirstActionMs(),
          });
        }
        router.push(Routes.chatWithAthlete(row.athleteId));
      },
    );
  }, [currentUser?.id, pullTimeToFirstActionMs, recordCoachFollowUp, runCoachActionWithSummary]);

  const handleOpenCoachHistory = useCallback((row: CoachFollowUpItem) => {
    router.push(
      Routes.developmentSessionHistory({
        athleteId: row.athleteId,
      }),
    );
  }, []);

  const handlePlaybookMessage = useCallback(
    async (row: CoachFollowUpItem) => {
      emitPlaybookAction(row, 'message');
      const followUpResult = await recordCoachFollowUp(row.taskIds, 'message');
      if (!followUpResult.success) {
        showToast(followUpResult.error.message, 'error');
        return;
      }
      if (currentUser?.id) {
        emitTyped(ServiceEvents.RESULTS_PROGRAM_MESSAGE_FROM_TASK, {
          userId: currentUser.id,
          role: 'coach',
          athleteId: row.athleteId,
          taskId: row.taskIds[0] ?? `athlete_${row.athleteId}`,
          coachId: row.coachId,
          source: 'coach_playbook',
          timeToFirstActionMs: pullTimeToFirstActionMs(),
        });
      }
      showToast('Follow-up logged', 'success');
      router.push(Routes.chatWithAthlete(row.athleteId));
      setSelectedPlaybookAthleteId(null);
    },
    [currentUser?.id, emitPlaybookAction, pullTimeToFirstActionMs, recordCoachFollowUp, showToast],
  );

  const handlePlaybookRecoveryCheckpoint = useCallback(
    async (row: CoachFollowUpItem) => {
      emitPlaybookAction(row, 'recovery_checkpoint');
      const result = await setCoachRecoveryCheckpoint(row.taskIds, 48);
      if (!result.success) {
        showToast(result.error.message, 'error');
        return;
      }
      const summary = formatBulkSummary('Recovery checkpoint', result.data);
      showToast(summary.message, summary.tone);
      setSelectedPlaybookAthleteId(null);
    },
    [emitPlaybookAction, setCoachRecoveryCheckpoint, showToast],
  );

  const handlePlaybookHistory = useCallback(
    async (row: CoachFollowUpItem) => {
      emitPlaybookAction(row, 'history');
      router.push(
        Routes.developmentSessionHistory({
          athleteId: row.athleteId,
        }),
      );
      setSelectedPlaybookAthleteId(null);
    },
    [emitPlaybookAction],
  );

  const runBulkWithConfirm = useCallback((title: string, message: string, run: () => Promise<void>) => {
    Alert.alert(title, message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Confirm',
        onPress: () => {
          void run();
        },
      },
    ]);
  }, []);

  const handleBulkNudgeOverdue = useCallback(() => {
    const athleteCount = selectedLaneRows.filter((row) => row.overdueCount > 0).length;
    if (athleteCount === 0) {
      showToast('No overdue athletes in this lane.', 'warning');
      return;
    }
    runBulkWithConfirm(
      'Nudge overdue athletes',
      `Send a nudge to ${athleteCount} athlete${athleteCount > 1 ? 's' : ''}?`,
      async () => {
        const result = await runCoachActionWithSummary('Overdue nudge', () => recordCoachFollowUp(overdueLaneTaskIds, 'nudge'));
        if (!result || !currentUser?.id) {
          return;
        }
        emitTyped(ServiceEvents.RESULTS_PROGRAM_BULK_NUDGE_SENT, {
          userId: currentUser.id,
          role: 'coach',
          lane: coachLane,
          variant: 'overdue',
          athleteCount,
          taskCount: overdueLaneTaskIds.length,
          updatedCount: result.updatedCount,
          skippedCount: result.skippedCount,
          timeToFirstActionMs: pullTimeToFirstActionMs(),
        });
      },
    );
  }, [
    coachLane,
    currentUser?.id,
    overdueLaneTaskIds,
    pullTimeToFirstActionMs,
    recordCoachFollowUp,
    runBulkWithConfirm,
    runCoachActionWithSummary,
    selectedLaneRows,
    showToast,
  ]);

  const handleBulkNudgeDueSoon = useCallback(() => {
    const athleteCount = selectedLaneRows.filter((row) => row.dueSoonCount > 0).length;
    if (athleteCount === 0) {
      showToast('No due-soon athletes in this lane.', 'warning');
      return;
    }
    runBulkWithConfirm(
      'Nudge due-soon athletes',
      `Send a nudge to ${athleteCount} athlete${athleteCount > 1 ? 's' : ''}?`,
      async () => {
        const result = await runCoachActionWithSummary('Due-soon nudge', () => recordCoachFollowUp(dueSoonLaneTaskIds, 'nudge'));
        if (!result || !currentUser?.id) {
          return;
        }
        emitTyped(ServiceEvents.RESULTS_PROGRAM_BULK_NUDGE_SENT, {
          userId: currentUser.id,
          role: 'coach',
          lane: coachLane,
          variant: 'due_soon',
          athleteCount,
          taskCount: dueSoonLaneTaskIds.length,
          updatedCount: result.updatedCount,
          skippedCount: result.skippedCount,
          timeToFirstActionMs: pullTimeToFirstActionMs(),
        });
      },
    );
  }, [
    coachLane,
    currentUser?.id,
    dueSoonLaneTaskIds,
    pullTimeToFirstActionMs,
    recordCoachFollowUp,
    runBulkWithConfirm,
    runCoachActionWithSummary,
    selectedLaneRows,
    showToast,
  ]);

  const handleBulkMarkReviewed = useCallback(() => {
    if (selectedCoachTaskIds.length === 0) {
      showToast('Select athletes first.', 'warning');
      return;
    }
    runBulkWithConfirm(
      'Mark selected as reviewed',
      `Mark follow-up reviewed for ${selectedCoachAthleteIds.length} athlete${selectedCoachAthleteIds.length > 1 ? 's' : ''}?`,
      async () => {
        await runCoachActionWithSummary(
          'Review status',
          () => markCoachTasksReviewed(selectedCoachTaskIds),
          () => {
            setCoachSelectionMode(false);
            setSelectedCoachAthleteIds([]);
          },
        );
      },
    );
  }, [
    markCoachTasksReviewed,
    runBulkWithConfirm,
    runCoachActionWithSummary,
    selectedCoachAthleteIds.length,
    selectedCoachTaskIds,
    showToast,
  ]);

  const emptyActionLabel = isCoachView
    ? 'Review session history'
    : selectedAthleteId
      ? 'View session history'
      : 'Find coach';

  const handleEmptyAction = useCallback(() => {
    if (isCoachView || selectedAthleteId) {
      router.push(
        Routes.developmentSessionHistory(
          selectedAthleteId
            ? {
                athleteId: selectedAthleteId,
              }
            : undefined,
        ),
      );
      return;
    }

    router.push(Routes.DISCOVER_MAP);
  }, [isCoachView, selectedAthleteId]);

  const renderCoachQueueItem = useCallback(
    ({ item }: ListRenderItemInfo<CoachListItem>) => {
      if (item.type === 'lane_selector') {
        return (
          <View style={[styles.coachStickyWrap, { backgroundColor: colors.background }]}>
            <CoachLaneSegment
              options={coachLaneOptions}
              selectedId={coachLane}
              onSelect={handleSelectLane}
              reduceMotion={motion.reduceMotion}
            />

            <Row gap="xs" style={styles.bulkActionRow}>
              <Clickable
                style={[styles.bulkActionButton, { borderColor: colors.border }]}
                onPress={handleToggleCoachSelectionMode}
                disabled={isCoachActionUpdating()}
                accessibilityLabel={coachSelectionMode ? 'Exit athlete selection mode' : 'Enter athlete selection mode'}
                accessibilityRole="button"
              >
                <ThemedText style={[styles.bulkActionText, { color: colors.text }]}>
                  {coachSelectionMode ? 'Done' : 'Select'}
                </ThemedText>
              </Clickable>

              <Clickable
                style={[styles.bulkActionButton, { borderColor: colors.border }]}
                onPress={handleBulkNudgeOverdue}
                disabled={isCoachActionUpdating()}
                accessibilityLabel="Send nudge to overdue athletes in this lane"
                accessibilityRole="button"
              >
                <ThemedText style={[styles.bulkActionText, { color: colors.text }]}>Nudge overdue</ThemedText>
              </Clickable>

              <Clickable
                style={[styles.bulkActionButton, { borderColor: colors.border }]}
                onPress={handleBulkNudgeDueSoon}
                disabled={isCoachActionUpdating()}
                accessibilityLabel="Send nudge to due soon athletes in this lane"
                accessibilityRole="button"
              >
                <ThemedText style={[styles.bulkActionText, { color: colors.text }]}>Nudge due soon</ThemedText>
              </Clickable>
            </Row>

            {coachSelectionMode ? (
              <Row align="center" justify="between" gap="sm" style={styles.selectionSummaryRow}>
                <ThemedText style={[styles.selectionSummaryText, { color: colors.muted }]}>
                  {selectedCoachAthleteIds.length} selected
                </ThemedText>
                <Clickable
                  style={[styles.selectionActionButton, { backgroundColor: colors.tint }]}
                  onPress={handleBulkMarkReviewed}
                  disabled={isCoachActionUpdating()}
                  accessibilityLabel="Mark selected tasks reviewed"
                  accessibilityRole="button"
                >
                  <ThemedText style={[styles.selectionActionText, { color: colors.onPrimary }]}>Mark reviewed</ThemedText>
                </Clickable>
              </Row>
            ) : null}
          </View>
        );
      }

      return (
        <View style={styles.coachRowWrap}>
          <CoachQueueCard
            row={item.row}
            nowTs={nowTs}
            selectionMode={coachSelectionMode}
            selected={selectedCoachAthleteIdSet.has(item.row.athleteId)}
            onToggleSelect={handleToggleCoachSelected}
            onOpenPlaybook={handleOpenPlaybook}
            onPressMessage={handleOpenCoachMessage}
            onPressHistory={handleOpenCoachHistory}
          />
        </View>
      );
    },
    [
      coachLane,
      coachLaneOptions,
      coachSelectionMode,
      colors.background,
      colors.border,
      colors.muted,
      colors.onPrimary,
      colors.text,
      colors.tint,
      handleBulkMarkReviewed,
      handleBulkNudgeDueSoon,
      handleBulkNudgeOverdue,
      handleOpenCoachHistory,
      handleOpenCoachMessage,
      handleOpenPlaybook,
      handleSelectLane,
      handleToggleCoachSelected,
      handleToggleCoachSelectionMode,
      isCoachActionUpdating,
      motion.reduceMotion,
      nowTs,
      selectedCoachAthleteIdSet,
      selectedCoachAthleteIds.length,
    ],
  );

  const coachKeyExtractor = useCallback((item: CoachListItem) => {
    if (item.type === 'lane_selector') {
      return 'lane_selector';
    }
    return item.row.athleteId;
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <PageHeader
        title="Results Program"
        showBack
        centerTitle
        action={__DEV__ && !isCoachView ? 'Test data' : undefined}
        rightActionLoading={__DEV__ && !isCoachView ? isSeedingBoundaryData : false}
        onActionPress={__DEV__ && !isCoachView ? () => void handleSeedBoundaryData() : undefined}
        onBackPress={() => router.back()}
      />

      {loading ? <ResultsProgramLoadingState isCoachView={isCoachView} /> : null}

      {status === 'error' ? (
        <ErrorState
          title="Results Program unavailable"
          message={error?.message ?? 'Unable to load results right now. Check connection and retry.'}
          onRetry={retry}
          error={error ?? undefined}
        />
      ) : null}

      {status === 'empty' ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon={isCoachView ? 'pulse-outline' : 'checkmark-done-outline'}
            title={isCoachView ? 'No intervention queue yet' : 'No active session plan yet'}
            message={
              isCoachView
                ? 'Follow-up actions appear here after session feedback is captured.'
                : 'Complete these before next session. Resolve overdue tasks first.'
            }
            actionLabel={emptyActionLabel}
            onPressAction={handleEmptyAction}
          />
        </View>
      ) : null}

      {status === 'success' && isCoachView ? (
        <>
          <FlatList
            data={coachListData}
            keyExtractor={coachKeyExtractor}
            renderItem={renderCoachQueueItem}
            stickyHeaderIndices={[1]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.coachListContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={10}
            removeClippedSubviews
            ListHeaderComponent={
              <Column gap="sm">
                <Animated.View entering={motion.getEnter(0, 30)}>
                  <ResultsProgramHero
                    title="Coach Command Centre"
                    subtitle="Triage fast. Intervene now on highest-risk athletes."
                    score={coachInterventionScore}
                    ringMeta={`${queueTotals.atRisk} at risk · ${queueTotals.overdue} overdue`}
                    metrics={coachMetrics}
                    reduceMotion={motion.reduceMotion}
                  />
                </Animated.View>

                <Row gap="xs" wrap>
                  <View
                    style={[
                      styles.kpiCard,
                      {
                        borderColor: withAlpha(colors.error, 0.26),
                        backgroundColor: withAlpha(colors.error, 0.09),
                      },
                    ]}
                  >
                    <ThemedText style={[styles.kpiValue, { color: colors.error }]}>{queueTotals.atRisk}</ThemedText>
                    <ThemedText style={[styles.kpiLabel, { color: colors.muted }]}>Athletes at risk</ThemedText>
                  </View>

                  <View
                    style={[
                      styles.kpiCard,
                      {
                        borderColor: withAlpha(colors.warning, 0.26),
                        backgroundColor: withAlpha(colors.warning, 0.09),
                      },
                    ]}
                  >
                    <ThemedText style={[styles.kpiValue, { color: colors.warning }]}>{queueTotals.overdue}</ThemedText>
                    <ThemedText style={[styles.kpiLabel, { color: colors.muted }]}>Overdue tasks</ThemedText>
                  </View>

                  <View
                    style={[
                      styles.kpiCard,
                      {
                        borderColor: withAlpha(colors.tint, 0.24),
                        backgroundColor: withAlpha(colors.tint, 0.09),
                      },
                    ]}
                  >
                    <ThemedText style={[styles.kpiValue, { color: colors.tint }]}>{queueTotals.dueSoon}</ThemedText>
                    <ThemedText style={[styles.kpiLabel, { color: colors.muted }]}>Due soon today</ThemedText>
                  </View>
                </Row>
              </Column>
            }
          />

          <InterventionPlaybookSheet
            row={selectedPlaybookRow}
            isBusy={isCoachActionUpdating()}
            onClose={handleClosePlaybook}
            onMessage={handlePlaybookMessage}
            onSetRecoveryCheckpoint={handlePlaybookRecoveryCheckpoint}
            onOpenHistory={handlePlaybookHistory}
          />
        </>
      ) : null}

      {status === 'success' && !isCoachView ? (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[1]}
          >
            <Animated.View entering={motion.getEnter(0, 30)}>
              <ResultsProgramHero
                title="Session Execution Board"
                subtitle={
                  isParentView
                    ? `${selectedAthleteName}: execute this queue before the next coached session.`
                    : 'Execute this queue before your next coached session.'
                }
                score={readinessScore}
                ringMeta={`${completionRate}% complete · ${weeklyPracticeMinutes} min`}
                metrics={athleteMetrics}
                showSwitch={isParentView && hasMultipleChildren}
                onSwitchChild={handleSelectNextChild}
                reduceMotion={motion.reduceMotion}
              />
            </Animated.View>

            <View style={[styles.stickyFilterWrap, { backgroundColor: colors.background }]}>
              <Animated.View entering={motion.getEnter(0, 80)}>
                <ResultsFilterSegment
                  options={filterOptions}
                  selectedId={filter}
                  onSelect={handleSelectFilter}
                  reduceMotion={motion.reduceMotion}
                />
              </Animated.View>
            </View>

            <View
              style={[
                styles.executionGuide,
                {
                  borderColor: withAlpha(colors.tint, 0.28),
                  backgroundColor: withAlpha(colors.tint, 0.08),
                },
              ]}
            >
              <ThemedText style={[styles.executionEyebrow, { color: colors.tint }]}>Action Queue</ThemedText>
              <ThemedText style={styles.executionTitle}>Built for execution, not analytics</ThemedText>
              <ThemedText style={[styles.executionBody, { color: colors.muted }]}>
                Results Program is today&apos;s action queue. My Progress tracks long-term trends.
              </ThemedText>
              <ThemedText style={[styles.executionBodyStrong, { color: colors.text }]}>
                {executionQueueSubtitle}
              </ThemedText>

              <Row gap="xs" wrap>
                <View
                  style={[
                    styles.executionLaneCard,
                    {
                      borderColor: withAlpha(colors.error, 0.28),
                      backgroundColor: withAlpha(colors.error, 0.1),
                    },
                  ]}
                >
                  <ThemedText style={[styles.executionLaneValue, { color: colors.error }]}>{overdueCount}</ThemedText>
                  <ThemedText style={[styles.executionLaneLabel, { color: colors.muted }]}>Overdue first</ThemedText>
                </View>

                <View
                  style={[
                    styles.executionLaneCard,
                    {
                      borderColor: withAlpha(colors.warning, 0.28),
                      backgroundColor: withAlpha(colors.warning, 0.1),
                    },
                  ]}
                >
                  <ThemedText style={[styles.executionLaneValue, { color: colors.warning }]}>{dueSoonCount}</ThemedText>
                  <ThemedText style={[styles.executionLaneLabel, { color: colors.muted }]}>Due soon today</ThemedText>
                </View>

                <View
                  style={[
                    styles.executionLaneCard,
                    {
                      borderColor: withAlpha(colors.tint, 0.24),
                      backgroundColor: withAlpha(colors.tint, 0.08),
                    },
                  ]}
                >
                  <ThemedText style={[styles.executionLaneValue, { color: colors.tint }]}>{upcomingCount}</ThemedText>
                  <ThemedText style={[styles.executionLaneLabel, { color: colors.muted }]}>Queued next</ThemedText>
                </View>
              </Row>
            </View>

            {topPriorityTask ? (
              <View
                style={[
                  styles.topPriorityCard,
                  {
                    borderColor: withAlpha(topPriorityColor, 0.34),
                    backgroundColor: withAlpha(topPriorityColor, 0.1),
                  },
                ]}
              >
                <Row align="center" justify="between" gap="sm">
                  <Column gap="micro" style={styles.grow}>
                    <ThemedText style={[styles.topPriorityEyebrow, { color: topPriorityColor }]}>
                      Top Priority · {timingBadgeLabel(topPriorityTiming ?? 'upcoming')}
                    </ThemedText>
                    <ThemedText style={styles.topPriorityTitle} numberOfLines={1}>
                      {topPriorityTask.sessionTitle?.trim() || 'Practice task'}
                    </ThemedText>
                  </Column>
                  <Clickable
                    style={[
                      styles.topPriorityAction,
                      {
                        borderColor: withAlpha(colors.text, 0.18),
                        backgroundColor: withAlpha(colors.surface, 0.34),
                      },
                    ]}
                    onPress={() => handleOpenTask(topPriorityTask)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open top priority task ${topPriorityTask.sessionTitle?.trim() || 'practice task'}`}
                  >
                    <ThemedText style={[styles.topPriorityActionText, { color: colors.text }]}>Open</ThemedText>
                  </Clickable>
                </Row>

                <ThemedText style={[styles.topPriorityDescription, { color: colors.muted }]} numberOfLines={2}>
                  {topPriorityTask.description}
                </ThemedText>

                <Row gap="sm" wrap>
                  <ThemedText style={[styles.topPriorityMeta, { color: colors.muted }]}>
                    {relativeDueLabel(topPriorityTask, nowTs)}
                  </ThemedText>
                  <ThemedText style={[styles.topPriorityMeta, { color: colors.muted }]}>
                    Coach {topPriorityTask.coachName.split(' ')[0] || topPriorityTask.coachName}
                  </ThemedText>
                </Row>
              </View>
            ) : null}

            {isParentView && parentCoachFollowUpSignal ? (
              <View
                style={[
                  styles.followUpSignal,
                  {
                    borderColor:
                      parentCoachFollowUpSignal.status === 'active'
                        ? withAlpha(colors.success, 0.4)
                        : withAlpha(colors.warning, 0.4),
                    backgroundColor:
                      parentCoachFollowUpSignal.status === 'active'
                        ? withAlpha(colors.success, 0.12)
                        : withAlpha(colors.warning, 0.12),
                  },
                ]}
              >
                <Row align="center" justify="between" gap="sm">
                  <Column gap="micro" style={styles.grow}>
                    <ThemedText
                      style={[
                        styles.followUpTitle,
                        {
                          color: parentCoachFollowUpSignal.status === 'active' ? colors.success : colors.warning,
                        },
                      ]}
                    >
                      {parentCoachFollowUpSignal.status === 'active'
                        ? 'Coach follow-up active'
                        : 'Awaiting coach follow-up'}
                    </ThemedText>
                    <ThemedText style={[styles.followUpMeta, { color: colors.muted }]}>
                      {formatFollowUpTimestamp(parentCoachFollowUpSignal.latestCoachActionAt)}
                    </ThemedText>
                  </Column>
                  <ThemedText style={[styles.followUpMeta, { color: colors.muted }]}>
                    {parentCoachFollowUpSignal.overdueCount > 0
                      ? `${parentCoachFollowUpSignal.overdueCount} overdue`
                      : `${parentCoachFollowUpSignal.pendingCount} pending`}
                  </ThemedText>
                </Row>
              </View>
            ) : null}

            <Animated.View
              key={`result-list-${filter}`}
              entering={motion.getEnter(0, 120)}
              exiting={motion.getExit()}
              layout={LinearTransition.duration(motion.reduceMotion ? 0 : 180)}
            >
              {filteredTasks.length === 0 ? (
                <ThemedText style={[styles.emptyFilteredText, { color: colors.muted }]}>No tasks in this filter.</ThemedText>
              ) : (
                <Column gap="sm">
                  {groupedFilteredTasks.map((section, sectionIndex) => {
                    const tone = sectionTone(section.key);
                    const toneColor =
                      tone === 'alert'
                        ? colors.error
                        : tone === 'success'
                          ? colors.success
                          : colors.muted;
                    const isCompletedSection = section.key === 'completed';
                    const collapsed = isCompletedSection && section.collapsible && completedCollapsed;

                    return (
                      <Animated.View
                        key={section.key}
                        entering={motion.getEnter(sectionIndex, 120)}
                        layout={LinearTransition.duration(motion.reduceMotion ? 0 : 170)}
                      >
                        <Column gap="xs">
                          <Clickable
                            onPress={() => {
                              if (!section.collapsible) {
                                return;
                              }
                              setCompletedCollapsed((previous) => !previous);
                            }}
                            disabled={!section.collapsible}
                            style={[
                              styles.sectionHeader,
                              {
                                borderColor: withAlpha(toneColor, 0.28),
                                backgroundColor: withAlpha(toneColor, 0.08),
                              },
                            ]}
                            accessibilityRole="button"
                            accessibilityState={
                              section.collapsible ? { expanded: !collapsed } : { disabled: true }
                            }
                            accessibilityLabel={section.collapsible ? `${collapsed ? 'Expand' : 'Collapse'} ${section.title} tasks` : `${section.title} tasks`}
                          >
                            <Row align="center" justify="between" gap="xs">
                              <ThemedText style={[styles.sectionTitle, { color: toneColor }]}>
                                {section.title} · {section.count}
                              </ThemedText>
                              {section.collapsible ? (
                                <Ionicons
                                  name={collapsed ? 'chevron-down' : 'chevron-up'}
                                  size={16}
                                  color={toneColor}
                                />
                              ) : null}
                            </Row>
                          </Clickable>

                          {collapsed ? null : (
                            <Column gap="sm">
                              {section.tasks.map((task, taskIndex) => (
                                <Animated.View
                                  key={task.id}
                                  entering={motion.getEnter(taskIndex, 140)}
                                  layout={LinearTransition.duration(motion.reduceMotion ? 0 : 160)}
                                >
                                  <TaskCard
                                    task={task}
                                    nowTs={nowTs}
                                    isSyncing={isTaskSyncing(task.id)}
                                    onOpenTask={handleOpenTask}
                                  />
                                </Animated.View>
                              ))}
                            </Column>
                          )}
                        </Column>
                      </Animated.View>
                    );
                  })}
                </Column>
              )}
            </Animated.View>
          </ScrollView>

          <TaskDetailSheet
            task={selectedTask}
            nowTs={nowTs}
            isBusy={selectedTaskId ? isTaskUpdating(selectedTaskId) : false}
            isSyncing={selectedTaskId ? isTaskSyncing(selectedTaskId) : false}
            onClose={handleCloseTaskSheet}
            onToggleTask={handleToggleTask}
            onSnoozeTask={handleSnoozeTask}
            onRescheduleTask={handleRescheduleTask}
            onMessageTask={handleMessageTask}
            onOpenHistory={handleOpenHistory}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.sm,
  },
  coachListContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.sm,
  },
  coachStickyWrap: {
    minHeight: COACH_LANE_STICKY_HEIGHT,
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  coachRowWrap: {
    paddingVertical: Spacing.xxs,
  },
  bulkActionRow: {
    flexWrap: 'wrap',
  },
  bulkActionButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    flexGrow: 1,
    flexBasis: 108,
  },
  bulkActionText: {
    ...Typography.caption,
  },
  selectionSummaryRow: {
    marginTop: Spacing.xxs,
  },
  selectionSummaryText: {
    ...Typography.caption,
  },
  selectionActionButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  selectionActionText: {
    ...Typography.caption,
  },
  stickyFilterWrap: {
    paddingVertical: Spacing.xs,
  },
  executionGuide: {
    borderWidth: 1,
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  executionEyebrow: {
    ...Typography.micro,
    fontWeight: '700',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
  executionTitle: {
    ...Typography.bodySemiBold,
  },
  executionBody: {
    ...Typography.bodySmall,
  },
  executionBodyStrong: {
    ...Typography.caption,
    fontWeight: '600',
  },
  executionLaneCard: {
    flexGrow: 1,
    minWidth: 92,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  executionLaneValue: {
    ...Typography.bodySemiBold,
  },
  executionLaneLabel: {
    ...Typography.micro,
  },
  topPriorityCard: {
    borderWidth: 1,
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  topPriorityEyebrow: {
    ...Typography.caption,
    fontWeight: '700',
  },
  topPriorityTitle: {
    ...Typography.bodySemiBold,
  },
  topPriorityDescription: {
    ...Typography.bodySmall,
  },
  topPriorityMeta: {
    ...Typography.caption,
  },
  topPriorityAction: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  topPriorityActionText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  sectionHeader: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.caption,
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  emptyFilteredText: {
    ...Typography.bodySmall,
  },
  kpiCard: {
    flexGrow: 1,
    flexBasis: 104,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 68,
    justifyContent: 'center',
  },
  kpiValue: {
    ...Typography.bodySemiBold,
  },
  kpiLabel: {
    ...Typography.caption,
  },
  followUpSignal: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  followUpTitle: {
    ...Typography.caption,
  },
  followUpMeta: {
    ...Typography.micro,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
});
