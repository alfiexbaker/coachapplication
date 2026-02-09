/**
 * Hook: useEventDetail
 *
 * Manages event detail screen state: load event, RSVP, publish, cancel.
 * Used by app/events/[id].tsx
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { eventService } from '@/services/event-service';
import type { ClubEvent, RSVPStatus } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useEventDetail');

export function useEventDetail(id: string | undefined) {
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAttendees, setShowAttendees] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!id) return;
    try {
      const data = await eventService.getEvent(id);
      setEvent(data);
    } catch (error) {
      logger.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [loadEvent])
  );

  const handleRSVP = useCallback(async (status: RSVPStatus, guestCount: number) => {
    if (!event || !currentUser) return;

    try {
      await eventService.rsvp(
        event.id,
        currentUser.id,
        currentUser.name || 'Unknown',
        isCoach ? 'COACH' : 'PARENT',
        status,
        guestCount,
        currentUser.avatar
      );
      await loadEvent();
    } catch (error) {
      logger.error('Failed to RSVP:', error);
      Alert.alert('Error', 'Failed to save your response. Please try again.');
    }
  }, [event, currentUser, isCoach, loadEvent]);

  const handlePublish = useCallback(async () => {
    if (!event) return;

    Alert.alert('Publish Event', 'This will notify all club members about this event.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        onPress: async () => {
          try {
            await eventService.publishEvent(event.id);
            await eventService.inviteClub(event.id);
            await loadEvent();
            Alert.alert('Success', 'Event published and members notified!');
          } catch (error) {
            logger.error('Failed to publish:', error);
            Alert.alert('Error', 'Failed to publish event.');
          }
        },
      },
    ]);
  }, [event, loadEvent]);

  const handleCancel = useCallback(async () => {
    if (!event) return;

    Alert.alert('Cancel Event', 'Are you sure you want to cancel this event?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await eventService.cancelEvent(event.id);
            await loadEvent();
          } catch (error) {
            logger.error('Failed to cancel:', error);
            Alert.alert('Error', 'Failed to cancel event.');
          }
        },
      },
    ]);
  }, [event, loadEvent]);

  const toggleAttendees = useCallback(() => {
    setShowAttendees((prev) => !prev);
  }, []);

  const typeColor = event ? eventService.getEventTypeColor(event.eventType) : '';
  const typeIcon = event ? eventService.getEventTypeIcon(event.eventType) : '';
  const attendeeCounts = event ? eventService.getAttendeeCounts(event.attendees) : { going: 0, maybe: 0, notGoing: 0, totalGuests: 0 };
  const currentRSVP = event && currentUser ? eventService.getUserRSVP(event.attendees, currentUser.id) : undefined;
  const isCreator = currentUser?.id === event?.createdBy;

  return {
    event,
    loading,
    showAttendees,
    isCoach,
    typeColor,
    typeIcon,
    attendeeCounts,
    currentRSVP,
    isCreator,
    handleRSVP,
    handlePublish,
    handleCancel,
    toggleAttendees,
  };
}
