import type { SessionInvite } from '@/constants/types';
import type { ChildInfo } from '@/types/child-context';

export function getSessionInviteCoachName(invite: SessionInvite): string {
  return invite.coachId || 'Coach';
}

export function getSessionInviteAthleteNames(invite: SessionInvite): string[] {
  if (invite.athleteIds.length === 0) {
    return ['Athlete'];
  }
  return invite.athleteIds;
}

export function getSessionInviteParentName(invite: SessionInvite): string {
  return invite.parentId || 'Parent';
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
