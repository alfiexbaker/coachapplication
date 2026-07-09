import type { Booking } from '@/constants/app-types';
import type { BookingSummary, OrganizationCommercialMode } from '@/constants/types';

export interface BookingRelationshipContext {
  organizationLabel: string | null;
  bookedWithLabel: string;
  deliveredByLabel: string;
  billingLabel: string;
  supportLabel: string;
  commercialMode: OrganizationCommercialMode;
  paymentSummary: string;
  supportSummary: string;
  reassignmentSummary: string;
  visibilitySummary: string;
  sharedHealthSummary: string;
  reportProblemLabel: string;
}

const INTERNAL_ID_PATTERN = /^(?:usr|ath|clb|sqd)_[0-9a-z][0-9a-z-]{6,}$/i;
const SERVICE_TYPE_LABELS: Record<string, string> = {
  '1on1': '1-on-1 session',
  '1-on-1': '1-on-1 session',
  '1-to-1': '1-on-1 session',
  one_to_one: '1-on-1 session',
  small_group: 'Small-group session',
  'small-group': 'Small-group session',
  group: 'Group session',
  group_session: 'Group session',
  GROUP_SESSION: 'Group session',
  team: 'Team session',
  camp: 'Camp',
};

export function isInternalIdentifier(value: string | null | undefined): boolean {
  return Boolean(value?.trim() && INTERNAL_ID_PATTERN.test(value.trim()));
}

export function safeDisplayLabel(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed || isInternalIdentifier(trimmed)) {
    return fallback;
  }
  return trimmed;
}

export function formatServiceTypeLabel(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return 'Session';
  }

  const mapped = SERVICE_TYPE_LABELS[trimmed] ?? SERVICE_TYPE_LABELS[trimmed.toLowerCase()];
  if (mapped) {
    return mapped;
  }

  return trimmed.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getBookingServiceLabel(
  booking: Pick<Booking, 'service' | 'serviceType' | 'isGroupSession' | 'maxParticipants'>,
): string {
  const service = safeDisplayLabel(booking.service, '');
  if (service) {
    return formatServiceTypeLabel(service);
  }

  const serviceType = safeDisplayLabel(booking.serviceType, '');
  if (serviceType) {
    return formatServiceTypeLabel(serviceType);
  }

  if (booking.isGroupSession || (booking.maxParticipants ?? 1) > 1) {
    return 'Group session';
  }

  return '1-on-1 session';
}

export function getBookingSummaryCoachName(booking: BookingSummary): string {
  return safeDisplayLabel(booking.coach?.name, safeDisplayLabel(booking.coachId, 'Coach'));
}

export function getBookingSummaryCoachPhotoUrl(booking: BookingSummary): string | undefined {
  return booking.coach?.photoUrl || undefined;
}

export function getBookingSummaryClientName(booking: BookingSummary): string {
  return safeDisplayLabel(booking.client?.name, safeDisplayLabel(booking.clientId, 'Athlete'));
}

export function getBookingOwnershipLabel(booking: BookingSummary): string | null {
  if (booking.actingAs !== 'club') {
    return null;
  }

  if (
    booking.assigneeCoachId &&
    booking.ownerCoachId &&
    booking.assigneeCoachId !== booking.ownerCoachId
  ) {
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
    safeDisplayLabel(booking.athleteNames?.[0], '') ||
    safeDisplayLabel(legacyAthleteName, '') ||
    safeDisplayLabel(booking.athleteId, '') ||
    safeDisplayLabel(booking.athleteIds?.[0], 'Athlete')
  );
}

export function getBookingClubOwnershipContext(
  booking: Pick<
    Booking,
    'actingAs' | 'clubId' | 'coachName' | 'ownerCoachId' | 'assigneeCoachId'
  > & {
    coachId?: string;
  },
): { clubLabel: string; deliveredBy: string; owner?: string } | null {
  if (booking.actingAs !== 'club') {
    return null;
  }

  const coachFallback = safeDisplayLabel(
    booking.coachName,
    safeDisplayLabel(booking.coachId, 'Coach'),
  );
  const owner = safeDisplayLabel(booking.ownerCoachId, coachFallback);
  const deliveredBy = safeDisplayLabel(booking.assigneeCoachId, coachFallback);
  const hasSeparateOwner = owner && deliveredBy && owner !== deliveredBy;

  return {
    clubLabel: booking.clubId
      ? `Club: ${safeDisplayLabel(booking.clubId, 'Club session')}`
      : 'Club session',
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
  const coachLabel = safeDisplayLabel(input.coachLabel, 'Coach');
  const deliveredByLabel = safeDisplayLabel(input.deliveredByLabel, coachLabel);
  const organizationLabel =
    input.actingAs === 'club' ? safeDisplayLabel(input.organizationLabel, 'Organization') : null;
  const commercialMode = input.commercialMode ?? 'COACH_OWNED';

  if (organizationLabel && commercialMode === 'ORG_OWNED') {
    return {
      organizationLabel,
      bookedWithLabel: organizationLabel,
      deliveredByLabel,
      billingLabel: organizationLabel,
      supportLabel: organizationLabel,
      commercialMode,
      paymentSummary: `Payment instructions are shared by ${organizationLabel} outside the app once the booking is confirmed. Billing questions and any payment adjustments are handled by ${organizationLabel}.`,
      supportSummary: `${organizationLabel} is responsible for booking support, billing questions, and delivery issues for this session.`,
      reassignmentSummary: `If the delivery coach changes, ${organizationLabel} is responsible for telling you and handling the handoff.`,
      visibilitySummary: `Your child's booking details are visible to ${deliveredByLabel} and supervising ${organizationLabel} staff when they need to support delivery or resolve a problem.`,
      sharedHealthSummary: `Any shared health information should stay limited to ${deliveredByLabel} and supervising ${organizationLabel} staff when safety or delivery support requires it.`,
      reportProblemLabel: 'Report to organization',
    };
  }

  if (organizationLabel) {
    return {
      organizationLabel,
      bookedWithLabel: deliveredByLabel,
      deliveredByLabel,
      billingLabel: deliveredByLabel,
      supportLabel: deliveredByLabel,
      commercialMode,
      paymentSummary: `Payment is arranged directly with ${deliveredByLabel} outside the app once the booking is confirmed. Billing questions and any payment adjustments are handled by ${deliveredByLabel}.`,
      supportSummary: `${deliveredByLabel} is your main contact for booking support and payment follow-up, even though this session sits under ${organizationLabel}.`,
      reassignmentSummary: `If ${organizationLabel} needs to move this session to another coach, ${deliveredByLabel} or ${organizationLabel} should tell you before the handoff.`,
      visibilitySummary: `Your child's booking details are visible to ${deliveredByLabel} and supervising ${organizationLabel} staff when they need to support delivery or resolve a problem.`,
      sharedHealthSummary: `Any shared health information should stay limited to ${deliveredByLabel} and supervising ${organizationLabel} staff when safety or delivery support requires it.`,
      reportProblemLabel: 'Report booking issue',
    };
  }

  return {
    organizationLabel,
    bookedWithLabel: deliveredByLabel,
    deliveredByLabel,
    billingLabel: deliveredByLabel,
    supportLabel: deliveredByLabel,
    commercialMode,
    paymentSummary: `Payment is arranged directly with ${deliveredByLabel} outside the app once the booking is confirmed. Billing questions and any payment adjustments are handled by ${deliveredByLabel}.`,
    supportSummary: `${deliveredByLabel} is responsible for booking support, payment follow-up, and delivery issues for this session.`,
    reassignmentSummary: `If this session needs to change, ${deliveredByLabel} should tell you directly before anything is reassigned.`,
    visibilitySummary: `Your child's booking details are visible to ${deliveredByLabel} for this active booking.`,
    sharedHealthSummary: `Any shared health information should stay limited to ${deliveredByLabel} when it is needed for safety.`,
    reportProblemLabel: 'Report problem',
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
