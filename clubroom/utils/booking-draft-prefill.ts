import { BOOKING_LOCATION_OPTIONS } from '@/constants/booking-flow';
import type { SessionOffering } from '@/constants/session-types';
import type { BookingDraft } from '@/services/booking-service';
import {
  getFixedScheduleFromOffering,
  getOfferingDuration,
} from '@/utils/session-offering-booking';

export interface BookingPrefillChild {
  id: string;
  name: string;
}

export function mapOfferingToDraftType(
  type: SessionOffering['sessionType'],
): NonNullable<BookingDraft['sessionType']> {
  return type === 'group' ? 'small-group' : '1-to-1';
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
    commercialMode: offering.commercialMode,
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
