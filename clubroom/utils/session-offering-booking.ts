import type { SessionOffering } from '@/constants/session-types';
import { getFixedScheduleFromOffering, getOfferingDuration } from '@/utils/booking-draft-prefill';

export interface SessionOfferingCategory {
  id: string;
  label: string;
  count: number;
  priority: number;
  description: string;
}

interface SessionOfferingCategoryMeta {
  id: string;
  label: string;
  priority: number;
  description: string;
}

function getSessionOfferingCategoryMeta(offering: SessionOffering): SessionOfferingCategoryMeta {
  if (offering.sessionType === '1on1') {
    return {
      id: 'one-to-one',
      label: '1-to-1',
      priority: 0,
      description: 'Private one-athlete sessions',
    };
  }

  if (offering.maxParticipants <= 2) {
    return {
      id: 'pairs',
      label: 'Pairs',
      priority: 1,
      description: 'Bookable pair sessions for up to 2 athletes',
    };
  }

  if (offering.maxParticipants <= 6) {
    return {
      id: 'small-groups',
      label: 'Small Groups',
      priority: 2,
      description: 'Focused small-group sessions',
    };
  }

  return {
    id: 'groups',
    label: 'Groups',
    priority: 3,
    description: 'Larger coach-led sessions',
  };
}

function getComparableTimestamp(offering: SessionOffering): number {
  const fixedSchedule = getFixedScheduleFromOffering(offering);
  const comparableValue = fixedSchedule
    ? `${fixedSchedule.date}T${fixedSchedule.slot}:00`
    : offering.scheduledAt;
  const timestamp = new Date(comparableValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

export function getSessionOfferingCategoryId(offering: SessionOffering): string {
  return getSessionOfferingCategoryMeta(offering).id;
}

export function getSessionOfferingCategoryLabel(offering: SessionOffering): string {
  return getSessionOfferingCategoryMeta(offering).label;
}

export function buildSessionOfferingCategories(
  offerings: SessionOffering[],
): SessionOfferingCategory[] {
  const categories = new Map<string, SessionOfferingCategory>();

  for (const offering of offerings) {
    const meta = getSessionOfferingCategoryMeta(offering);
    const existing = categories.get(meta.id);

    if (existing) {
      existing.count += 1;
      continue;
    }

    categories.set(meta.id, {
      id: meta.id,
      label: meta.label,
      count: 1,
      priority: meta.priority,
      description: meta.description,
    });
  }

  return Array.from(categories.values()).sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }
    return left.label.localeCompare(right.label);
  });
}

export function filterSessionOfferingsByCategory(
  offerings: SessionOffering[],
  categoryId: string,
): SessionOffering[] {
  if (categoryId === 'all') {
    return offerings;
  }

  return offerings.filter((offering) => getSessionOfferingCategoryId(offering) === categoryId);
}

export function sortSessionOfferingsForBooking(offerings: SessionOffering[]): SessionOffering[] {
  return [...offerings].sort((left, right) => {
    const leftCategory = getSessionOfferingCategoryMeta(left);
    const rightCategory = getSessionOfferingCategoryMeta(right);
    if (leftCategory.priority !== rightCategory.priority) {
      return leftCategory.priority - rightCategory.priority;
    }

    const leftTimestamp = getComparableTimestamp(left);
    const rightTimestamp = getComparableTimestamp(right);
    if (leftTimestamp !== rightTimestamp) {
      return leftTimestamp - rightTimestamp;
    }

    const leftPrice = left.price ?? 0;
    const rightPrice = right.price ?? 0;
    if (leftPrice !== rightPrice) {
      return leftPrice - rightPrice;
    }

    const leftDuration = getOfferingDuration(left);
    const rightDuration = getOfferingDuration(right);
    if (leftDuration !== rightDuration) {
      return leftDuration - rightDuration;
    }

    return left.title.localeCompare(right.title);
  });
}
