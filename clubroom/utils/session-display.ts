import type { Session } from '@/constants/app-types';
import type { SessionOffering, SessionRegistration } from '@/constants/types';

export function getSessionOfferingCoachName(offering: SessionOffering): string {
  return offering.coachId || 'Coach';
}

export function getSessionRegistrationUserName(registration: SessionRegistration): string {
  return registration.userId || 'User';
}

export function getSessionAthleteName(session: Session): string {
  return session.athleteId || 'Athlete';
}
