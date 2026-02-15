/**
 * StatusBadge Component
 *
 * Specialized badge for booking/session status display.
 * Built on top of the base Badge component for consistency.
 *
 * Usage:
 *   <StatusBadge status="Confirmed" />
 *   <StatusBadge status="Pending" />
 */

import React from 'react';

import { Badge, type BadgeTone } from '@/components/primitives/badge';

export type BookingStatus = 'Pending' | 'Confirmed' | 'Needs Completion' | 'Completed' | 'Cancelled';

const STATUS_TONE_MAP: Record<BookingStatus, BadgeTone> = {
  Pending: 'warning',
  Confirmed: 'success',
  'Needs Completion': 'warning',
  Completed: 'info',
  Cancelled: 'error',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge label={status} tone={STATUS_TONE_MAP[status]} variant="outlined" size="md" />;
}
