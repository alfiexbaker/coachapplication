/**
 * Hook: useEventRSVP
 *
 * Manages event RSVP screen state: load event, select status, submit response.
 * Used by app/events/[id]/rsvp.tsx
 */

import { useState } from 'react';

import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { eventService } from '@/services/event-service';
import type { ClubEvent, EventRSVP, RSVPStatus } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('useEventRSVP');

interface EventRSVPData {
  event: ClubEvent | null;
  currentRSVP: EventRSVP | null;
}

interface RSVPFormDraft {
  eventId: string | null;
  selectedStatus: RSVPStatus | null | undefined;
  note: string | undefined;
}

export interface UseEventRSVPResult {
  event: ClubEvent | null;
  currentRSVP: EventRSVP | null;
  isCoach: boolean;
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  submitting: boolean;
  selectedStatus: RSVPStatus | null;
  note: string;
  isFull: boolean;
  rsvpClosed: boolean;
  reminderSending: boolean;
  attendeeCounts: { going: number; maybe: number; notGoing: number; totalGuests: number };
  setNote: (value: string) => void;
  handleStatusSelect: (status: RSVPStatus) => void;
  handleSubmit: () => Promise<void>;
  handleSendReminder: () => Promise<void>;
}

export function useEventRSVP(id: string | undefined): UseEventRSVPResult {
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const [submitting, setSubmitting] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);

  const [formDraft, setFormDraft] = useState<RSVPFormDraft>({
    eventId: null,
    selectedStatus: undefined,
    note: undefined,
  });

  const loadData = async () => {
    if (!id || !currentUser) {
      return ok<EventRSVPData>({ event: null, currentRSVP: null });
    }

    try {
      const [eventData, rsvpData] = await Promise.all([
        eventService.getEvent(id),
        eventService.getUserEventRSVP(id, currentUser.id),
      ]);

      return ok<EventRSVPData>({
        event: eventData,
        currentRSVP: rsvpData,
      });
    } catch (loadError) {
      logger.error('Failed to load RSVP data:', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load RSVP data. Pull down to refresh.', loadError),
      );
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<EventRSVPData>({
    load: loadData,
    deps: [id, currentUser?.id],
    isEmpty: (value) => value.event === null,
    refetchOnFocus: true,
  });

  const event = data?.event ?? null;
  const currentRSVP = data?.currentRSVP ?? null;
  const loading = status === 'loading';
  const activeEventId = event?.id ?? id ?? null;
  const draftMatchesEvent = formDraft.eventId === activeEventId;
  const selectedStatus =
    draftMatchesEvent && formDraft.selectedStatus !== undefined
      ? formDraft.selectedStatus
      : (currentRSVP?.status ?? null);
  const note =
    draftMatchesEvent && formDraft.note !== undefined ? formDraft.note : (currentRSVP?.note ?? '');

  const updateFormDraft = (patch: Partial<Pick<RSVPFormDraft, 'selectedStatus' | 'note'>>) => {
    setFormDraft((previous) => ({
      ...(previous.eventId === activeEventId
        ? previous
        : {
            eventId: activeEventId,
            selectedStatus: undefined,
            note: undefined,
          }),
      ...patch,
      eventId: activeEventId,
    }));
  };

  const handleStatusSelect = (status: RSVPStatus) => {
    updateFormDraft({ selectedStatus: status });
  };

  const handleNoteChange = (value: string) => {
    updateFormDraft({ note: value });
  };

  const handleSubmit = async () => {
    if (!event || !currentUser || !selectedStatus) return;

    if (selectedStatus === 'GOING' && event.maxAttendees) {
      const { going } = eventService.getAttendeeCounts(event.attendees);
      const existingFootprint = currentRSVP?.status === 'GOING' ? 1 : 0;
      const nextFootprint = 1;
      const occupiedExcludingCurrent = going - existingFootprint;
      if (occupiedExcludingCurrent + nextFootprint > event.maxAttendees) {
        uiFeedback.showToast('This event is now full. Please choose Maybe or Can’t Go.');
        return;
      }
    }

    setSubmitting(true);

    await runAsyncTryCatchFinally(
      async () => {
        await eventService.submitRSVP({
          eventId: event.id,
          userId: currentUser.id,
          userRole: isCoach ? 'COACH' : 'PARENT',
          status: selectedStatus,
          guestCount: 0,
          note: note.trim() || undefined,
        });

        uiFeedback.showToast(
          `Your response has been saved: ${eventService.formatRSVPStatus(selectedStatus)}`,
          'success',
        );
        router.back();
      },
      async (error) => {
        logger.error('Failed to submit RSVP:', error);
        const message =
          error instanceof Error &&
          /maximum capacity|event has reached maximum capacity/i.test(error.message)
            ? 'This event is full. Please update your RSVP without selecting Going.'
            : 'Failed to save your response. Please try again.';
        uiFeedback.showToast(message, 'error');
      },
      () => {
        setSubmitting(false);
      },
    );
  };

  const handleSendReminder = async () => {
    if (!event || !isCoach) return;

    setReminderSending(true);

    return await runAsyncTryCatchFinally(
      async () => {
        const result = await eventService.sendReminderToMaybes(event.id);
        if (!result.success) {
          uiFeedback.showToast(result.error.message, 'error');
          return;
        }

        const sentCount = result.data;
        uiFeedback.showToast(
          sentCount > 0
            ? `Reminder sent to ${sentCount} attendee${sentCount === 1 ? '' : 's'} marked as maybe.`
            : 'There are no maybe responses to remind right now.',
        );
      },
      async (sendError) => {
        logger.error('Failed to send RSVP reminders:', sendError);
        uiFeedback.showToast('Could not send reminders. Please try again.', 'error');
      },
      () => {
        setReminderSending(false);
      },
    );
  };

  const attendeeCounts = event
    ? eventService.getAttendeeCounts(event.attendees)
    : { going: 0, maybe: 0, notGoing: 0, totalGuests: 0 };
  const isFull = event?.maxAttendees ? attendeeCounts.going >= event.maxAttendees : false;
  const rsvpClosed = event ? eventService.isRSVPClosed(event) : false;

  return {
    event,
    currentRSVP,
    isCoach,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    submitting,
    selectedStatus,
    note,
    isFull,
    rsvpClosed,
    reminderSending,
    attendeeCounts,
    setNote: handleNoteChange,
    handleStatusSelect,
    handleSubmit,
    handleSendReminder,
  };
}
