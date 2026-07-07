import type { RecurringBooking } from '@/constants/types';
import { safeDisplayLabel } from '@/utils/booking-display';

export function getRecurringCoachName(recurring: RecurringBooking): string {
  return safeDisplayLabel(recurring.coachName, safeDisplayLabel(recurring.coachId, 'Coach'));
}

export function getRecurringUserName(recurring: RecurringBooking): string {
  return safeDisplayLabel(recurring.userName, safeDisplayLabel(recurring.userId, 'User'));
}

export function getRecurringAthleteName(recurring: RecurringBooking): string | undefined {
  return safeDisplayLabel(recurring.athleteName, safeDisplayLabel(recurring.athleteId, 'Athlete'));
}
