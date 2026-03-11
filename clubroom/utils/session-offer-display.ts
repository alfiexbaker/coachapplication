import type { GroupSession, OrganizationCommercialMode } from '@/constants/types';
import { getBookingRelationshipContext } from '@/utils/booking-display';

export type SessionOfferDraftType = '1on1' | 'small_group' | 'group' | 'camp';
export type SessionOfferDraftRecurrence = 'once' | 'weekly' | 'biweekly' | 'monthly';

export interface SessionOfferDisplay {
  kind: 'one_off' | 'recurring_program' | 'group_offer' | 'camp_block';
  label: string;
  summary: string;
  registrationLabel: string;
}

export interface SessionOfferCapacityDisplay {
  capacityLabel: string;
  availabilityLabel: string;
}

function formatSeatLabel(count: number): string {
  return `${count} ${count === 1 ? 'seat' : 'seats'}`;
}

export function getDraftSessionOfferDisplay(input: {
  sessionType: SessionOfferDraftType;
  recurrence: SessionOfferDraftRecurrence;
  maxParticipants: number;
}): SessionOfferDisplay {
  if (input.sessionType === 'camp') {
    return {
      kind: 'camp_block',
      label: 'Camp block',
      summary: 'Families join a fixed multi-athlete training block instead of booking a single slot.',
      registrationLabel: 'Families register into the full camp offer.',
    };
  }

  if (input.recurrence !== 'once') {
    return {
      kind: 'recurring_program',
      label: input.maxParticipants > 1 ? 'Recurring group program' : 'Recurring program',
      summary: 'This publishes as an ongoing repeat offer, so families are joining a program rhythm rather than a one-off booking.',
      registrationLabel: 'Families are registering into a recurring program.',
    };
  }

  if (input.maxParticipants > 1) {
    return {
      kind: 'group_offer',
      label: 'Group/cohort offer',
      summary: 'This runs as a shared session with limited capacity, so registration behaves like seat-taking rather than private booking.',
      registrationLabel: 'Families are taking places in a shared cohort.',
    };
  }

  return {
    kind: 'one_off',
    label: 'One-off session',
    summary: 'This is a single bookable slot for one athlete or family at a time.',
    registrationLabel: 'Families book this specific slot.',
  };
}

export function getGroupSessionOfferDisplay(
  session: Pick<GroupSession, 'sessionType' | 'isRecurring' | 'maxParticipants'>,
): SessionOfferDisplay {
  if (session.sessionType === 'CAMP') {
    return {
      kind: 'camp_block',
      label: 'Camp block',
      summary: 'This is a fixed training block with multiple dates under one offer.',
      registrationLabel: 'Families are joining the camp block.',
    };
  }

  if (session.isRecurring) {
    return {
      kind: 'recurring_program',
      label: session.maxParticipants > 1 ? 'Recurring group program' : 'Recurring program',
      summary: 'This offer repeats on a set cadence, so registration is for an ongoing program rather than a one-off date.',
      registrationLabel: 'Families are joining a recurring program.',
    };
  }

  if (session.maxParticipants > 1) {
    return {
      kind: 'group_offer',
      label: 'Group/cohort offer',
      summary: 'This is a shared session with limited places and group-style registration.',
      registrationLabel: 'Families are taking places in the cohort.',
    };
  }

  return {
    kind: 'one_off',
    label: 'One-off session',
    summary: 'This is a single session date rather than an ongoing program.',
    registrationLabel: 'Families are booking this date only.',
  };
}

export function getOfferCapacityDisplay(input: {
  maxParticipants: number;
  currentParticipants?: number;
  waitlistEnabled?: boolean;
  waitlistCount?: number;
}): SessionOfferCapacityDisplay {
  const currentParticipants = input.currentParticipants ?? 0;
  const spotsLeft = Math.max(0, input.maxParticipants - currentParticipants);
  const capacityLabel =
    input.maxParticipants <= 1
      ? '1 athlete per slot'
      : `${formatSeatLabel(input.maxParticipants)} in total`;

  if (spotsLeft <= 0) {
    if (input.waitlistEnabled) {
      return {
        capacityLabel,
        availabilityLabel: `Currently full. Waitlist open${input.waitlistCount ? ` (${input.waitlistCount} waiting)` : ''}.`,
      };
    }
    return {
      capacityLabel,
      availabilityLabel: 'Currently full.',
    };
  }

  return {
    capacityLabel,
    availabilityLabel:
      input.maxParticipants <= 1
        ? 'One athlete can book this slot.'
        : `${formatSeatLabel(spotsLeft)} still available.`,
  };
}

export function getProgramOwnershipDisplay(input: {
  actingAs?: 'self' | 'club';
  commercialMode?: OrganizationCommercialMode | null;
  organizationLabel?: string | null;
  coachLabel?: string | null;
  deliveredByLabel?: string | null;
}): {
  bookedWithLabel: string;
  billingLabel: string;
  supportLabel: string;
  supportSummary: string;
} {
  const relationshipContext = getBookingRelationshipContext(input);
  return {
    bookedWithLabel: relationshipContext.bookedWithLabel,
    billingLabel: relationshipContext.billingLabel,
    supportLabel: relationshipContext.supportLabel,
    supportSummary: relationshipContext.supportSummary,
  };
}
