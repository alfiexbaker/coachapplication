import type { SessionOffering } from '@/constants/session-types';
import type { BookingDraft } from '@/services/booking-service';
import { getFixedScheduleFromOffering } from '@/utils/booking-draft-prefill';

interface BookingScheduleLockParams {
  draft: Pick<BookingDraft, 'entrySource' | 'sessionOfferingId' | 'date' | 'slot'>;
  offering?: SessionOffering | null;
}

export function isBookingScheduleLocked({
  draft,
  offering,
}: BookingScheduleLockParams): boolean {
  const normalizedEntrySource = draft.entrySource?.trim().toLowerCase() ?? '';
  const scheduleLockedFromDraft = Boolean(
    (normalizedEntrySource.startsWith('discover') ||
      normalizedEntrySource.startsWith('session_detail_modal') ||
      normalizedEntrySource.startsWith('favourites')) &&
      draft.sessionOfferingId &&
      draft.date &&
      draft.slot,
  );

  const fixedOfferingSchedule = offering ? getFixedScheduleFromOffering(offering) : null;
  const scheduleLockedFromOffering = Boolean(
    fixedOfferingSchedule &&
      draft.date === fixedOfferingSchedule.date &&
      draft.slot === fixedOfferingSchedule.slot,
  );

  return scheduleLockedFromOffering || scheduleLockedFromDraft;
}
