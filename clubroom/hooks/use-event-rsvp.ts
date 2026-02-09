/**
 * Hook: useEventRSVP
 *
 * Manages event RSVP screen state: load event, select status, submit response.
 * Used by app/events/[id]/rsvp.tsx
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { eventService } from '@/services/event-service';
import type { ClubEvent, EventRSVP, RSVPStatus } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useEventRSVP');

export function useEventRSVP(id: string | undefined) {
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [currentRSVP, setCurrentRSVP] = useState<EventRSVP | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedStatus, setSelectedStatus] = useState<RSVPStatus | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [note, setNote] = useState('');

  const loadData = useCallback(async () => {
    if (!id || !currentUser) return;
    try {
      const [eventData, rsvpData] = await Promise.all([
        eventService.getEvent(id),
        eventService.getUserEventRSVP(id, currentUser.id),
      ]);
      setEvent(eventData);
      setCurrentRSVP(rsvpData);

      if (rsvpData) {
        setSelectedStatus(rsvpData.status);
        setGuestCount(rsvpData.guestCount);
        setNote(rsvpData.note || '');
      }
    } catch (error) {
      logger.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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
        userName: currentUser.name || 'Unknown',
        userPhotoUrl: currentUser.avatar,
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
  const attendeeCounts = event ? eventService.getAttendeeCounts(event.attendees) : { going: 0, totalGuests: 0 };

  return {
    event,
    currentRSVP,
    loading,
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
