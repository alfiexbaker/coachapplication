import type { SessionInvite } from '@/constants/types';

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
