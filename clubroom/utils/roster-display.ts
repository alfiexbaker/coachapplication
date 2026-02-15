import type { RosterEntry } from '@/constants/types';

export function getRosterAthleteName(entry: RosterEntry): string {
  return entry.athleteName || entry.athleteId || 'Athlete';
}

export function getRosterParentName(entry: RosterEntry): string {
  return entry.parentName || entry.parentId || 'Parent';
}
