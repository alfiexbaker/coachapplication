import type { SessionFeedback } from '@/services/progress-service';
import type { SessionNoteRecord } from '@/services/progress-service';

export interface BookingDeliverySummary {
  headline: string;
  focusAreas: string[];
  improvements?: string;
  homework?: string;
  effortLabel?: string;
}

export function canCoachCompleteBooking(input: {
  status?: 'Confirmed' | 'Pending' | 'Needs Completion' | 'Completed' | 'Cancelled';
  start?: string;
  now?: number;
}): boolean {
  if (!input.status || !input.start) return false;
  if (input.status !== 'Confirmed' && input.status !== 'Needs Completion') {
    return false;
  }

  const startMs = new Date(input.start).getTime();
  if (!Number.isFinite(startMs)) return false;
  return startMs <= (input.now ?? Date.now());
}

export function buildBookingDeliverySummary(input: {
  feedback: SessionFeedback | null;
  note: SessionNoteRecord | null;
}): BookingDeliverySummary | null {
  const { feedback, note } = input;
  if (!feedback && !note) {
    return null;
  }

  const headline =
    feedback?.publicSummary?.trim() ||
    note?.summary?.trim() ||
    'Your coach has added session feedback.';
  const focusAreas = feedback?.skillsWorkedOn?.length
    ? feedback.skillsWorkedOn
    : note?.focus?.length
      ? note.focus
      : [];
  const improvements = feedback?.improvements?.trim() || note?.improvements?.trim() || undefined;
  const homework = feedback?.homework?.trim() || note?.homework?.trim() || undefined;
  const effortValue = feedback?.effortRating ?? note?.effort;
  const effortLabel =
    typeof effortValue === 'number' && Number.isFinite(effortValue)
      ? `${Math.max(1, Math.min(5, Math.round(effortValue)))}/5 effort`
      : undefined;

  return {
    headline,
    focusAreas,
    improvements,
    homework,
    effortLabel,
  };
}
