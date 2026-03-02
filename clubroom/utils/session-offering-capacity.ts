import type { SessionOffering } from '@/constants/types';

type OfferingWithRegistrations = Pick<SessionOffering, 'registrations'>;
type OfferingWithOffPlatform = Pick<SessionOffering, 'offPlatformParticipants'>;
type OfferingForCapacity = Pick<
  SessionOffering,
  'registrations' | 'offPlatformParticipants' | 'maxParticipants'
>;

export function getSessionOfferingRegisteredCount(offering: OfferingWithRegistrations): number {
  return offering.registrations.filter((registration) => registration.status === 'confirmed').length;
}

export function getSessionOfferingOffPlatformCount(offering: OfferingWithOffPlatform): number {
  const count = offering.offPlatformParticipants ?? 0;
  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }
  return Math.floor(count);
}

export function getSessionOfferingHeadcount(
  offering: OfferingWithRegistrations & OfferingWithOffPlatform,
): number {
  return getSessionOfferingRegisteredCount(offering) + getSessionOfferingOffPlatformCount(offering);
}

export function getSessionOfferingSpotsLeft(offering: OfferingForCapacity): number {
  return Math.max(0, offering.maxParticipants - getSessionOfferingHeadcount(offering));
}

export function isSessionOfferingFull(offering: OfferingForCapacity): boolean {
  return getSessionOfferingHeadcount(offering) >= offering.maxParticipants;
}
