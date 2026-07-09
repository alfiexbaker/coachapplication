import { BOOKING_LOCATION_OPTIONS } from '@/constants/booking-flow';
import type { SessionOffering } from '@/constants/session-types';
import type { BookingDraft } from '@/services/booking-service';
import {
  getFixedScheduleFromOffering,
  getOfferingDuration,
} from '@/utils/session-offering-booking';
import { normalizeSessionOfferingSource } from '@/utils/session-offering-projections';
import { resolveNonGenericPersonName } from '@/utils/person-name';

export interface BookingPrefillChild {
  id: string;
  name?: string;
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
  const normalizedOffering = normalizeSessionOfferingSource(offering);
  const patch: Partial<BookingDraft> = {
    entrySource,
    targetLocked: Boolean(child),
    coachId,
    sessionOfferingId: normalizedOffering.id,
    sessionSource: normalizedOffering.source ?? 'direct',
    sessionSourceEntityId: normalizedOffering.sourceEntityId ?? normalizedOffering.id,
    sessionTemplateId: undefined,
    sessionType: mapOfferingToDraftType(normalizedOffering.sessionType),
    sessionTypeLabel: normalizedOffering.title,
    duration: getOfferingDuration(normalizedOffering),
    price:
      typeof normalizedOffering.price === 'number' && Number.isFinite(normalizedOffering.price)
        ? normalizedOffering.price
        : undefined,
    totalPrice: undefined,
    participants:
      normalizedOffering.sessionType === 'group' ? normalizedOffering.maxParticipants : undefined,
    locationOption: BOOKING_LOCATION_OPTIONS.COACH_PRESET,
    locationText: normalizedOffering.location,
    clubId: normalizedOffering.clubId,
    actingAs: normalizedOffering.actingAs,
    commercialMode: normalizedOffering.commercialMode,
    ownerCoachId: normalizedOffering.ownerCoachId,
    assigneeCoachId: normalizedOffering.assigneeCoachId,
    createdByUserId: normalizedOffering.createdByUserId,
    createdByRole: normalizedOffering.createdByRole,
  };

  const fixedSchedule = getFixedScheduleFromOffering(normalizedOffering);
  patch.date = fixedSchedule?.date;
  patch.slot = fixedSchedule?.slot;

  if (child) {
    patch.childId = child.id;
    const childName = resolveNonGenericPersonName(child.name);
    if (childName) {
      patch.athleteName = childName;
    }
  }

  return patch;
}
