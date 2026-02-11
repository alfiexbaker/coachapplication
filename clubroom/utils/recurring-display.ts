import type { RecurringBooking } from '@/constants/types';

export function getRecurringCoachName(recurring: RecurringBooking): string {
  return recurring.coachId || 'Coach';
}

export function getRecurringUserName(recurring: RecurringBooking): string {
  return recurring.userId || 'User';
}

export function getRecurringAthleteName(recurring: RecurringBooking): string | undefined {
  return recurring.athleteId;
}
