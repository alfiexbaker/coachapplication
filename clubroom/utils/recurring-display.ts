import type { RecurringBooking } from '@/constants/types';

export function getRecurringCoachName(recurring: RecurringBooking): string {
  return recurring.coachName || recurring.coachId || 'Coach';
}

export function getRecurringUserName(recurring: RecurringBooking): string {
  return recurring.userName || recurring.userId || 'User';
}

export function getRecurringAthleteName(recurring: RecurringBooking): string | undefined {
  return recurring.athleteName || recurring.athleteId;
}
