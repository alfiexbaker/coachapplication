import type { SessionInvite } from '@/constants/types';
import type { ChildInfo } from '@/types/child-context';
import { formatServiceTypeLabel, safeDisplayLabel } from '@/utils/booking-display';

export function getSessionInviteCoachName(invite: SessionInvite): string {
  return safeDisplayLabel(invite.coachName, 'Coach');
}

export function getSessionInviteAthleteNames(invite: SessionInvite): string[] {
  const labels = invite.athleteNames
    ?.map((name) => safeDisplayLabel(name, ''))
    .filter((name) => name.length > 0);
  if (labels && labels.length > 0) {
    return labels;
  }
  if (invite.athleteIds.length === 0) {
    return ['Athlete'];
  }
  return invite.athleteIds.map((athleteId) => safeDisplayLabel(athleteId, 'Athlete'));
}

export function getSessionInviteParentName(invite: SessionInvite): string {
  return safeDisplayLabel(invite.parentName, 'Parent');
}

export function getSessionInviteServiceLabel(invite: SessionInvite): string {
  return formatServiceTypeLabel(invite.sessionType);
}

/**
 * Resolve invite athleteIds → display label for child identity.
 * Returns undefined when single-child parent (seamless UX) or no match.
 */
export function resolveInviteChildLabel(
  athleteIds: string[],
  getChildById: (id: string) => ChildInfo | undefined,
  isMultiChild: boolean,
): string | undefined {
  if (!isMultiChild) return undefined;
  if (athleteIds.length === 0) return undefined;

  const resolved: string[] = [];
  for (const id of athleteIds) {
    const child = getChildById(id);
    if (child) resolved.push(child.name);
  }

  if (resolved.length === 0) return undefined;
  if (resolved.length === 1) return resolved[0];
  return resolved.join(' + ');
}
