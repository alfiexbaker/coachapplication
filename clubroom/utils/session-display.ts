import type { Session } from '@/constants/app-types';
import type { SessionOffering, SessionRegistration } from '@/constants/types';

export function getSessionOfferingCoachName(offering: SessionOffering): string {
  return offering.coachId || 'Coach';
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

  return registration.userId ? prettifyUserId(registration.userId) : 'User';
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

  return prettifyUserId(session.athleteId);
}
