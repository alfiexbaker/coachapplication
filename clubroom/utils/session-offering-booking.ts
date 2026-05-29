import type { SessionOffering } from '@/constants/session-types';
import { toDateStr } from '@/utils/format';

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

export function getOfferingDuration(offering: SessionOffering): number {
  return offering.duration ?? 60;
}

function getSessionOfferingCategoryMeta(
  offering: SessionOffering,
): SessionOfferingCategoryMeta {
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

function formatSlot(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseOfferingTimeParts(offering: SessionOffering): { hours: number; minutes: number } {
  if (offering.timeOfDay) {
    const [hoursRaw, minutesRaw] = offering.timeOfDay.split(':');
    const hours = Number.parseInt(hoursRaw ?? '', 10);
    const minutes = Number.parseInt(minutesRaw ?? '', 10);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return { hours, minutes };
    }
  }

  const scheduledAt = new Date(offering.scheduledAt);
  if (Number.isFinite(scheduledAt.getTime())) {
    return { hours: scheduledAt.getHours(), minutes: scheduledAt.getMinutes() };
  }

  return { hours: 9, minutes: 0 };
}

function getNextRecurringScheduleFromOffering(
  offering: SessionOffering,
): { date: string; slot: string } | null {
  const { hours, minutes } = parseOfferingTimeParts(offering);
  const targetDay =
    typeof offering.dayOfWeek === 'number'
      ? offering.dayOfWeek
      : new Date(offering.scheduledAt).getDay();
  if (!Number.isFinite(targetDay)) {
    return null;
  }

  const now = new Date();
  const startBoundary = new Date(offering.scheduledAt);
  const endBoundary = offering.endDate ? new Date(offering.endDate) : null;
  const cancelledDates = new Set(offering.cancelledInstances ?? []);
  const recurrenceDays = offering.recurrenceType === 'biweekly' ? 14 : 7;

  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setHours(hours, minutes, 0, 0);
  const daysUntilTarget = (targetDay - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + daysUntilTarget);
  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 7);
  }

  if (Number.isFinite(startBoundary.getTime()) && candidate < startBoundary) {
    const anchored = new Date(startBoundary);
    anchored.setHours(hours, minutes, 0, 0);
    while (anchored.getDay() !== targetDay) {
      anchored.setDate(anchored.getDate() + 1);
    }
    candidate.setTime(anchored.getTime());
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (endBoundary && Number.isFinite(endBoundary.getTime()) && candidate > endBoundary) {
      return null;
    }

    if (offering.recurrenceType === 'biweekly' && Number.isFinite(startBoundary.getTime())) {
      const anchor = new Date(startBoundary);
      anchor.setHours(hours, minutes, 0, 0);
      const diffDays = Math.floor((candidate.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000));
      const diffWeeks = Math.floor(diffDays / 7);
      if (diffWeeks % 2 !== 0) {
        candidate.setDate(candidate.getDate() + 7);
        continue;
      }
    }

    const candidateDate = toDateStr(candidate);
    if (!cancelledDates.has(candidateDate)) {
      return {
        date: candidateDate,
        slot: formatSlot(candidate),
      };
    }
    candidate.setDate(candidate.getDate() + recurrenceDays);
  }

  return null;
}

export function getFixedScheduleFromOffering(
  offering: SessionOffering,
): { date: string; slot: string } | null {
  if (offering.isRecurring) {
    return getNextRecurringScheduleFromOffering(offering);
  }
  const scheduledAt = new Date(offering.scheduledAt);
  if (!Number.isFinite(scheduledAt.getTime())) {
    return null;
  }
  return {
    date: toDateStr(scheduledAt),
    slot: formatSlot(scheduledAt),
  };
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
  return Array.from(offerings).toSorted((left, right) => {
    const leftCategory = getSessionOfferingCategoryMeta(left);
    const rightCategory = getSessionOfferingCategoryMeta(right);
    if (leftCategory.priority !== rightCategory.priority) {
      return leftCategory.priority - rightCategory.priority;
    }

    const leftFixedSchedule = getFixedScheduleFromOffering(left);
    const rightFixedSchedule = getFixedScheduleFromOffering(right);
    const leftComparableValue = leftFixedSchedule
      ? `${leftFixedSchedule.date}T${leftFixedSchedule.slot}:00`
      : left.scheduledAt;
    const rightComparableValue = rightFixedSchedule
      ? `${rightFixedSchedule.date}T${rightFixedSchedule.slot}:00`
      : right.scheduledAt;
    const leftTimestamp = new Date(leftComparableValue).getTime();
    const rightTimestamp = new Date(rightComparableValue).getTime();
    const resolvedLeftTimestamp = Number.isFinite(leftTimestamp)
      ? leftTimestamp
      : Number.MAX_SAFE_INTEGER;
    const resolvedRightTimestamp = Number.isFinite(rightTimestamp)
      ? rightTimestamp
      : Number.MAX_SAFE_INTEGER;

    if (resolvedLeftTimestamp !== resolvedRightTimestamp) {
      return resolvedLeftTimestamp - resolvedRightTimestamp;
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
