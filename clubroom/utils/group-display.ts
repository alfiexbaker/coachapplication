import type { GroupRegistration, GroupSession } from '@/constants/types';
import { safeDisplayLabel } from '@/utils/booking-display';

export function getGroupSessionClubLabel(session: GroupSession): string | undefined {
  return session.clubId ? safeDisplayLabel(session.clubId, 'Club session') : undefined;
}

export function getGroupSessionSquadLabel(session: GroupSession): string | undefined {
  return session.squadId ? safeDisplayLabel(session.squadId, 'Squad') : undefined;
}

export function getGroupSessionCoachName(session: GroupSession): string {
  return safeDisplayLabel(session.coachId, 'Coach');
}

export function getGroupRegistrationAthleteName(registration: GroupRegistration): string {
  return safeDisplayLabel(registration.athleteId, 'Athlete');
}

export function getGroupRegistrationParentName(registration: GroupRegistration): string {
  return safeDisplayLabel(registration.parentId, 'Parent');
}
