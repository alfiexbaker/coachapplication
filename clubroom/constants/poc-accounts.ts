import { normalizeAccountId } from '@/utils/account-id';

/**
 * Canonical account graph for the POC environment.
 *
 * Keep tests and demo flows anchored to these IDs so relationships stay stable.
 * Services may store legacy variants (for example "coach-1"); aliases handle that.
 */
export const POC_ACCOUNT_IDS = {
  user: 'user1',
  parent: 'parent1',
  coach: 'coach1',
  coachStorage: 'coach-1',
  athlete: 'athlete1',
  athleteStorage: 'athlete-1',
  childSeed: 'child_tom',
} as const;

export const POC_ACCOUNT_ALIASES = {
  coach: [POC_ACCOUNT_IDS.coach, POC_ACCOUNT_IDS.coachStorage] as const,
  athlete: [POC_ACCOUNT_IDS.athlete, POC_ACCOUNT_IDS.athleteStorage, POC_ACCOUNT_IDS.childSeed] as const,
  parent: [POC_ACCOUNT_IDS.parent] as const,
  user: [POC_ACCOUNT_IDS.user] as const,
} as const;

export function isPocCoachId(candidate: string): boolean {
  const normalized = normalizeAccountId(candidate);
  return POC_ACCOUNT_ALIASES.coach.some((id) => normalizeAccountId(id) === normalized);
}

