// ─── Types ──────────────────────────────────────────────────────────────────

export interface RescheduleProposal {
  id: string;
  bookingId: string;
  coachName: string;
  coachId: string;
  sessionTitle: string;
  originalDateTime: Date;
  proposedDateTime: Date;
  reason: string;
  durationMinutes: number;
  venue?: string;
}

export type RescheduleDecision = 'accepted' | 'counter' | 'declined';

export interface RescheduleRequestProps {
  proposal: RescheduleProposal;
  onAccept: (proposalId: string) => void | Promise<void>;
  onSuggestDifferent: (proposalId: string) => void;
  onDecline: (proposalId: string, reason?: string) => void | Promise<void>;
}

// ─── Formatters ─────────────────────────────────────────────────────────────

export function formatDay(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

export function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  const mins = m === 0 ? '' : `:${m.toString().padStart(2, '0')}`;
  return `${hour}${mins}${ampm}`;
}

export function formatDateTime(date: Date): string {
  return `${formatDay(date)} \u00B7 ${formatTime(date)}`;
}
