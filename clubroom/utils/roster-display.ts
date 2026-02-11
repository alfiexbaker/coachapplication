import type { RosterEntry } from '@/constants/types';

export function getRosterAthleteName(entry: RosterEntry): string {
  return entry.athleteId || 'Athlete';
}

export function getRosterParentName(entry: RosterEntry): string {
  return entry.parentId || 'Parent';
}
