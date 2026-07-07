import type { Session } from '@/constants/app-types';
import type { SessionOffering, SessionRegistration } from '@/constants/types';
import { safeDisplayLabel } from '@/utils/booking-display';

export function getSessionOfferingCoachName(offering: SessionOffering): string {
  return safeDisplayLabel(offering.coachId, 'Coach');
}

function prettifyUserId(userId: string): string {
  return userId
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function getSessionRegistrationUserName(
  registration: SessionRegistration,
  userNameMap?: Record<string, string>,
): string {
  const registrationName = registration.userName?.trim();
  if (registrationName) return registrationName;

  const mappedName = userNameMap?.[registration.userId]?.trim();
  if (mappedName) return mappedName;

  if (registration.userId) {
    const safeUserId = safeDisplayLabel(registration.userId, '');
    return safeUserId ? prettifyUserId(safeUserId) : 'User';
  }

  return 'User';
}

export function getSessionAthleteName(session: Session): string {
  const sessionWithName = session as Session & { athleteName?: string };
  const explicitName = sessionWithName.athleteName?.trim();
  if (explicitName) {
    return explicitName;
  }

  if (!session.athleteId) {
    return 'Athlete';
  }

  const safeAthleteId = safeDisplayLabel(session.athleteId, '');
  return safeAthleteId ? prettifyUserId(safeAthleteId) : 'Athlete';
}
