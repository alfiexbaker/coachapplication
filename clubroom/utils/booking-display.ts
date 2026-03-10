import type { Booking } from '@/constants/app-types';
import type { BookingSummary, OrganizationCommercialMode } from '@/constants/types';

export interface BookingRelationshipContext {
  organizationLabel: string | null;
  bookedWithLabel: string;
  deliveredByLabel: string;
  billingLabel: string;
  commercialMode: OrganizationCommercialMode;
  paymentSummary: string;
}

export function getBookingSummaryCoachName(booking: BookingSummary): string {
  return booking.coach?.name || booking.coachId || 'Coach';
}

export function getBookingSummaryCoachPhotoUrl(booking: BookingSummary): string {
  return booking.coach?.photoUrl || `https://i.pravatar.cc/100?u=${booking.coachId || 'coach'}`;
}

export function getBookingSummaryClientName(booking: BookingSummary): string {
  return booking.client?.name || booking.clientId || 'Athlete';
}

export function getBookingOwnershipLabel(booking: BookingSummary): string | null {
  if (booking.actingAs !== 'club') {
    return null;
  }

  if (booking.assigneeCoachId && booking.ownerCoachId && booking.assigneeCoachId !== booking.ownerCoachId) {
    return 'Club-assigned';
  }

  if (booking.assigneeCoachId) {
    return 'Assigned by Club';
  }

  return 'Club-owned';
}

export function getBookingAthleteName(booking: Booking): string {
  const legacyAthleteName = (booking as Booking & { athleteName?: string }).athleteName;
  return (
    booking.athleteNames?.[0] ||
    legacyAthleteName ||
    booking.athleteId ||
    booking.athleteIds?.[0] ||
    'Athlete'
  );
}

export function getBookingClubOwnershipContext(
  booking: Pick<Booking, 'actingAs' | 'clubId' | 'coachName' | 'ownerCoachId' | 'assigneeCoachId'> & {
    coachId?: string;
  },
): { clubLabel: string; deliveredBy: string; owner?: string } | null {
  if (booking.actingAs !== 'club') {
    return null;
  }

  const coachFallback = booking.coachName || booking.coachId || 'Coach';
  const owner = booking.ownerCoachId || coachFallback;
  const deliveredBy = booking.assigneeCoachId || coachFallback;
  const hasSeparateOwner = owner && deliveredBy && owner !== deliveredBy;

  return {
    clubLabel: booking.clubId ? `Club: ${booking.clubId}` : 'Club session',
    deliveredBy,
    ...(hasSeparateOwner ? { owner } : {}),
  };
}

export function getBookingRelationshipContext(input: {
  actingAs?: 'self' | 'club';
  organizationLabel?: string | null;
  coachLabel?: string | null;
  deliveredByLabel?: string | null;
  commercialMode?: OrganizationCommercialMode | null;
}): BookingRelationshipContext {
  const coachLabel = input.coachLabel?.trim() || 'Coach';
  const deliveredByLabel = input.deliveredByLabel?.trim() || coachLabel;
  const organizationLabel =
    input.actingAs === 'club' ? input.organizationLabel?.trim() || 'Organization' : null;
  const commercialMode = input.commercialMode ?? 'COACH_OWNED';

  if (organizationLabel && commercialMode === 'ORG_OWNED') {
    return {
      organizationLabel,
      bookedWithLabel: organizationLabel,
      deliveredByLabel,
      billingLabel: organizationLabel,
      commercialMode,
      paymentSummary: `Payment instructions are shared by ${organizationLabel} outside the app once the booking is confirmed. Billing questions and any refund decisions are handled by ${organizationLabel}.`,
    };
  }

  return {
    organizationLabel,
    bookedWithLabel: deliveredByLabel,
    deliveredByLabel,
    billingLabel: deliveredByLabel,
    commercialMode,
    paymentSummary: `Payment is arranged directly with ${deliveredByLabel} outside the app once the booking is confirmed. Billing questions and any refund decisions are handled by ${deliveredByLabel}.`,
  };
}

export function getBookingStatusLabel(
  status: BookingSummary['status'],
  options?: { isCoachView?: boolean },
): string {
  if (status === 'Needs Completion' && !options?.isCoachView) {
    return 'Review Pending';
  }
  return status;
}
