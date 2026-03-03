import type {
  CoachFollowUpItem,
  PracticeTask,
  PracticeTaskTiming,
} from '@/services/progress/progress-practice-task-service';

const DUE_SOON_WINDOW_MS = 36 * 60 * 60 * 1000;

export type ProgressTaskGroupKey = 'overdue' | 'due_soon' | 'upcoming' | 'completed';
export type CoachQueueLaneKey = 'intervene_now' | 'watch_today' | 'stable';

function parseTimestamp(value: string | undefined): number {
  if (!value) {
    return Number.NaN;
  }
  return new Date(value).getTime();
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'No date';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'No date';
  }
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatHours(deltaMs: number): number {
  return Math.max(1, Math.ceil(deltaMs / (60 * 60 * 1000)));
}

function formatDays(deltaMs: number): number {
  return Math.max(1, Math.ceil(deltaMs / (24 * 60 * 60 * 1000)));
}

export function deriveTaskTiming(task: PracticeTask, nowTs = Date.now()): PracticeTaskTiming {
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

export function timingBadgeLabel(timing: PracticeTaskTiming): string {
  if (timing === 'completed') {
    return 'Done';
  }
  if (timing === 'overdue') {
    return 'Overdue';
  }
  if (timing === 'due_soon') {
    return 'Due Soon';
  }
  return 'Upcoming';
}

export function relativeDueLabel(task: PracticeTask, nowTs = Date.now()): string {
  if (task.status === 'completed') {
    const completedTs = parseTimestamp(task.completedAt);
    if (Number.isNaN(completedTs)) {
      return `Done ${formatDate(task.completedAt)}`;
    }
    const deltaMs = nowTs - completedTs;
    if (deltaMs < 60 * 60 * 1000) {
      return 'Completed recently';
    }
    if (deltaMs < 24 * 60 * 60 * 1000) {
      return `Completed ${formatHours(deltaMs)}h ago`;
    }
    return `Completed ${formatDays(deltaMs)}d ago`;
  }

  const dueTs = parseTimestamp(task.dueAt);
  if (Number.isNaN(dueTs)) {
    return `Due ${formatDate(task.dueAt)}`;
  }

  const deltaMs = dueTs - nowTs;
  if (deltaMs < 0) {
    return `Overdue by ${formatDays(Math.abs(deltaMs))}d`;
  }
  if (deltaMs < 60 * 60 * 1000) {
    return 'Due in <1h';
  }
  if (deltaMs < 24 * 60 * 60 * 1000) {
    return `Due in ${formatHours(deltaMs)}h`;
  }
  if (deltaMs < 48 * 60 * 60 * 1000) {
    return `Due tomorrow, ${formatTime(task.dueAt)}`;
  }
  if (deltaMs < 7 * 24 * 60 * 60 * 1000) {
    return `Due in ${formatDays(deltaMs)}d`;
  }

  return `Due ${formatDate(task.dueAt)}`;
}

export function sortTasksByUrgency(
  left: PracticeTask,
  right: PracticeTask,
  nowTs = Date.now(),
): number {
  const rank: Record<PracticeTaskTiming, number> = {
    overdue: 0,
    due_soon: 1,
    upcoming: 2,
    completed: 3,
  };

  const leftTiming = deriveTaskTiming(left, nowTs);
  const rightTiming = deriveTaskTiming(right, nowTs);

  if (rank[leftTiming] !== rank[rightTiming]) {
    return rank[leftTiming] - rank[rightTiming];
  }

  const leftDueTs = parseTimestamp(left.dueAt);
  const rightDueTs = parseTimestamp(right.dueAt);
  if (!Number.isNaN(leftDueTs) && !Number.isNaN(rightDueTs) && leftDueTs !== rightDueTs) {
    return leftDueTs - rightDueTs;
  }

  const leftAssignedTs = parseTimestamp(left.assignedAt);
  const rightAssignedTs = parseTimestamp(right.assignedAt);
  if (!Number.isNaN(leftAssignedTs) && !Number.isNaN(rightAssignedTs) && leftAssignedTs !== rightAssignedTs) {
    return rightAssignedTs - leftAssignedTs;
  }

  return right.id.localeCompare(left.id);
}

export function resolveCoachQueueLane(
  row: Pick<CoachFollowUpItem, 'risk' | 'overdueCount' | 'dueSoonCount'>,
): CoachQueueLaneKey {
  if (row.risk === 'high' || row.overdueCount > 0) {
    return 'intervene_now';
  }
  if (row.risk === 'watch' || row.dueSoonCount > 0) {
    return 'watch_today';
  }
  return 'stable';
}
