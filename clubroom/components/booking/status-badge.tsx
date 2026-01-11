import { Badge, BadgeTone } from '@/components/primitives/badge';

export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

const statusToneMap: Record<BookingStatus, BadgeTone> = {
  Pending: 'warning',
  Confirmed: 'success',
  Completed: 'secondary',
  Cancelled: 'error',
};

/**
 * StatusBadge is a thin wrapper around Badge for booking status display.
 * Consider using Badge directly with appropriate tone for new code.
 *
 * @example
 * ```tsx
 * <StatusBadge status="Confirmed" />
 * // Equivalent to:
 * <Badge label="Confirmed" tone="success" outlined />
 * ```
 */
export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge label={status} tone={statusToneMap[status]} outlined />;
}

