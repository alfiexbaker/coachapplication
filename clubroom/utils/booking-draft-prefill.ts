import { BOOKING_LOCATION_OPTIONS } from '@/constants/booking-flow';
import type { SessionOffering } from '@/constants/session-types';
import type { BookingDraft } from '@/services/booking-service';
import { toDateStr } from '@/utils/format';

export interface BookingPrefillChild {
  id: string;
  name: string;
}

export function mapOfferingToDraftType(type: SessionOffering['sessionType']): NonNullable<BookingDraft['sessionType']> {
  return type === 'group' ? 'small-group' : '1-to-1';
}

export function getOfferingDuration(offering: SessionOffering): number {
  return offering.duration ?? 60;
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
    typeof offering.dayOfWeek === 'number' ? offering.dayOfWeek : new Date(offering.scheduledAt).getDay();
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

export function buildBookingDraftPatchFromOffering({
  coachId,
  offering,
  child,
  entrySource,
}: {
  coachId: string;
  offering: SessionOffering;
  child?: BookingPrefillChild | null;
  entrySource?: string;
}): Partial<BookingDraft> {
  const patch: Partial<BookingDraft> = {
    entrySource,
    targetLocked: Boolean(child),
    coachId,
    sessionOfferingId: offering.id,
    sessionSource: offering.source ?? 'direct',
    sessionSourceEntityId: offering.sourceEntityId ?? offering.id,
    sessionTemplateId: undefined,
    sessionType: mapOfferingToDraftType(offering.sessionType),
    sessionTypeLabel: offering.title,
    duration: getOfferingDuration(offering),
    price: offering.price ?? 0,
    participants: offering.sessionType === 'group' ? offering.maxParticipants : undefined,
    locationOption: BOOKING_LOCATION_OPTIONS.COACH_PRESET,
    locationText: offering.location,
    clubId: offering.clubId,
    actingAs: offering.actingAs,
    ownerCoachId: offering.ownerCoachId,
    assigneeCoachId: offering.assigneeCoachId,
    createdByUserId: offering.createdByUserId,
    createdByRole: offering.createdByRole,
  };

  const fixedSchedule = getFixedScheduleFromOffering(offering);
  patch.date = fixedSchedule?.date;
  patch.slot = fixedSchedule?.slot;

  if (child) {
    patch.childId = child.id;
    patch.athleteName = child.name;
  }

  return patch;
}
