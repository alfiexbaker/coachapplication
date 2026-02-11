import type { GroupRegistration, GroupSession } from '@/constants/types';

export function getGroupSessionClubLabel(session: GroupSession): string | undefined {
  return session.clubId;
}

export function getGroupSessionSquadLabel(session: GroupSession): string | undefined {
  return session.squadId;
}

export function getGroupSessionCoachName(session: GroupSession): string {
  return session.coachId || 'Coach';
}

export function getGroupRegistrationAthleteName(registration: GroupRegistration): string {
  return registration.athleteId || 'Athlete';
}

export function getGroupRegistrationParentName(registration: GroupRegistration): string {
  return registration.parentId || 'Parent';
}
