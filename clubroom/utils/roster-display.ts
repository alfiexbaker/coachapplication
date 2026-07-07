import type { RosterEntry } from '@/constants/types';
import { safeDisplayLabel } from '@/utils/booking-display';

export function getRosterAthleteName(entry: RosterEntry): string {
  return safeDisplayLabel(entry.athleteName, safeDisplayLabel(entry.athleteId, 'Athlete'));
}

export function getRosterParentName(entry: RosterEntry): string {
  return safeDisplayLabel(entry.parentName, safeDisplayLabel(entry.parentId, 'Parent'));
}
