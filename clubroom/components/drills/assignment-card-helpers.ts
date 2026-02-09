import type { ThemeColors } from '@/hooks/useTheme';
import type { AssignedDrill } from '@/constants/types';
import { drillService } from '@/services/drill-service';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AssignmentCardProps {
  /** The assignment to display */
  assignment: AssignedDrill;
  /** Callback when card is pressed */
  onPress?: () => void;
  /** Callback when complete button is pressed */
  onComplete?: () => void;
  /** Whether to show in compact mode */
  compact?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getStatusColor(
  assignment: AssignedDrill,
  palette: ThemeColors,
  isOverdue: boolean,
  isDueSoon: boolean
): string {
  if (assignment.isCompleted) return palette.success;
  if (isOverdue) return palette.error;
  if (isDueSoon) return palette.warning;
  return palette.muted;
}

export function getDueDateText(
  assignment: AssignedDrill,
  isOverdue: boolean,
  isDueSoon: boolean
): string {
  if (assignment.isCompleted) {
    return `Completed ${new Date(assignment.completedAt as string).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })}`;
  }
  const prefix = isOverdue ? 'Overdue: ' : isDueSoon ? 'Due soon: ' : 'Due ';
  return prefix + drillService.formatDueDate(assignment.dueDate);
}
