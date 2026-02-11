/**
 * Hook: useEventRSVP
 *
 * Manages event RSVP screen state: load event, select status, submit response.
 * Used by app/events/[id]/rsvp.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { eventService } from '@/services/event-service';
import type { ClubEvent, EventRSVP, RSVPStatus } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useEventRSVP');

interface EventRSVPData {
  event: ClubEvent | null;
  currentRSVP: EventRSVP | null;
}

export interface UseEventRSVPResult {
  event: ClubEvent | null;
  currentRSVP: EventRSVP | null;
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  submitting: boolean;
  selectedStatus: RSVPStatus | null;
  guestCount: number;
  note: string;
  isFull: boolean;
  rsvpClosed: boolean;
  attendeeCounts: { going: number; maybe: number; notGoing: number; totalGuests: number };
  setGuestCount: (value: number) => void;
  setNote: (value: string) => void;
  handleStatusSelect: (status: RSVPStatus) => void;
  handleSubmit: () => Promise<void>;
}

export function useEventRSVP(id: string | undefined): UseEventRSVPResult {
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedStatus, setSelectedStatus] = useState<RSVPStatus | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [note, setNote] = useState('');

  const loadData = useCallback(async () => {
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
      return err(serviceError('UNKNOWN', 'Failed to load RSVP data. Pull down to refresh.', loadError));
    }
  }, [id, currentUser]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<EventRSVPData>({
    load: loadData,
    deps: [id, currentUser?.id],
    isEmpty: (value) => value.event === null,
    refetchOnFocus: true,
  });

  const event = data?.event ?? null;
  const currentRSVP = data?.currentRSVP ?? null;
  const loading = status === 'loading';

  useEffect(() => {
    if (currentRSVP) {
      setSelectedStatus(currentRSVP.status);
      setGuestCount(currentRSVP.guestCount);
      setNote(currentRSVP.note || '');
      return;
    }

    setSelectedStatus(null);
    setGuestCount(0);
    setNote('');
  }, [currentRSVP]);

  const handleStatusSelect = useCallback((status: RSVPStatus) => {
    setSelectedStatus(status);
    if (status !== 'GOING') {
      setGuestCount(0);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!event || !currentUser || !selectedStatus) return;

    setSubmitting(true);
    try {
      await eventService.submitRSVP({
        eventId: event.id,
        userId: currentUser.id,
        userRole: isCoach ? 'COACH' : 'PARENT',
        status: selectedStatus,
        guestCount: selectedStatus === 'GOING' ? guestCount : 0,
        note: note.trim() || undefined,
      });

      Alert.alert(
        'RSVP Submitted',
        `Your response has been saved: ${eventService.formatRSVPStatus(selectedStatus)}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      logger.error('Failed to submit RSVP:', error);
      Alert.alert('Error', 'Failed to save your response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [event, currentUser, selectedStatus, guestCount, note, isCoach]);

  const isFull = event ? eventService.isEventFull(event) : false;
  const rsvpClosed = event ? eventService.isRSVPClosed(event) : false;
  const attendeeCounts = event
    ? eventService.getAttendeeCounts(event.attendees)
    : { going: 0, maybe: 0, notGoing: 0, totalGuests: 0 };

  return {
    event,
    currentRSVP,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    submitting,
    selectedStatus,
    guestCount,
    note,
    isFull,
    rsvpClosed,
    attendeeCounts,
    setGuestCount,
    setNote,
    handleStatusSelect,
    handleSubmit,
  };
}
