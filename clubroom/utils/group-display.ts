import type { GroupRegistration, GroupSession } from '@/constants/types';
import { safeDisplayLabel } from '@/utils/booking-display';

export function getGroupSessionClubLabel(session: GroupSession): string | undefined {
  return session.clubId ? safeDisplayLabel(session.clubName, 'Club session') : undefined;
}

export function getGroupSessionSquadLabel(session: GroupSession): string | undefined {
  return session.squadId ? safeDisplayLabel(session.squadId, 'Squad') : undefined;
}

export function getGroupSessionCoachName(session: GroupSession): string {
  return safeDisplayLabel(session.coachName, 'Coach');
}

export function getGroupRegistrationAthleteName(registration: GroupRegistration): string {
  return safeDisplayLabel(registration.athleteName, 'Name unavailable');
}

export function getGroupRegistrationParentName(registration: GroupRegistration): string {
  return safeDisplayLabel(registration.parentName, 'Guardian unavailable');
}
