import type { SessionOffering } from '@/constants/types';
import { normalizeSessionOfferingSource } from '@/utils/session-offering-projections';

const ACTIVE_OFFERING_STATUSES = new Set<SessionOffering['status']>(['active', 'full']);
const ONE_HOUR_MS = 60 * 60 * 1000;

export interface CoachOfferingSummary {
  nextOffering: SessionOffering | null;
  publicOfferingsCount: number;
  clubOfferingsCount: number;
  eventOfferingsCount: number;
  groupOfferingsCount: number;
  directOfferingsCount: number;
}

export function getCoachProfileOfferings(
  offerings: SessionOffering[],
  coachId: string,
): SessionOffering[] {
  const now = Date.now();

  return offerings
    .map(normalizeSessionOfferingSource)
    .filter((offering) => {
      if (offering.coachId !== coachId) {
        return false;
      }
      if (!ACTIVE_OFFERING_STATUSES.has(offering.status)) {
        return false;
      }
      if (offering.isRecurring) {
        return true;
      }
      return new Date(offering.scheduledAt).getTime() >= now - ONE_HOUR_MS;
    })
    .sort((left, right) => {
      if (left.isRecurring && !right.isRecurring) return -1;
      if (!left.isRecurring && right.isRecurring) return 1;
      return new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
    });
}

export function summarizeCoachOfferings(offerings: SessionOffering[]): CoachOfferingSummary {
  return offerings.reduce<CoachOfferingSummary>(
    (summary, offering, index) => {
      if (index === 0) {
        summary.nextOffering = offering;
      }

      if (offering.visibility === 'public' || offering.clubScope === 'public') {
        summary.publicOfferingsCount += 1;
      }
      if (offering.actingAs === 'club' || Boolean(offering.clubId)) {
        summary.clubOfferingsCount += 1;
      }
      if (offering.source === 'event') {
        summary.eventOfferingsCount += 1;
      }
      if (offering.sessionType === 'group') {
        summary.groupOfferingsCount += 1;
      }
      if (offering.source === 'direct') {
        summary.directOfferingsCount += 1;
      }

      return summary;
    },
    {
      nextOffering: null,
      publicOfferingsCount: 0,
      clubOfferingsCount: 0,
      eventOfferingsCount: 0,
      groupOfferingsCount: 0,
      directOfferingsCount: 0,
    },
  );
}

export function formatCoachAvailabilityLabel(dateLike?: string | null): string {
  if (!dateLike) {
    return 'Check live availability';
  }

  return new Date(dateLike).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
