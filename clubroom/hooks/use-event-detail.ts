/**
 * Hook: useEventDetail
 *
 * Manages event detail screen state: load event, RSVP, publish, cancel.
 * Used by app/events/[id].tsx
 */

import { useState, useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { eventService } from '@/services/event-service';
import type { ClubEvent, RSVPStatus } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('useEventDetail');

export interface UseEventDetailResult {
  event: ClubEvent | null;
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  showAttendees: boolean;
  isCoach: boolean;
  typeColor: string;
  typeIcon: string;
  attendeeCounts: { going: number; maybe: number; notGoing: number; totalGuests: number };
  currentRSVP: ReturnType<typeof eventService.getUserRSVP>;
  isCreator: boolean;
  handleRSVP: (status: RSVPStatus) => Promise<void>;
  handlePublish: () => void;
  handleCancel: () => void;
  toggleAttendees: () => void;
}

export function useEventDetail(id: string | undefined): UseEventDetailResult {
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const [showAttendees, setShowAttendees] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!id) return ok<ClubEvent | null>(null);
    try {
      const data = await eventService.getEvent(id);
      return ok(data);
    } catch (loadError) {
      logger.error('Failed to load event:', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load event. Pull down to refresh.', loadError));
    }
  }, [id]);

  const {
    data: event,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<ClubEvent | null>({
    load: loadEvent,
    deps: [id],
    isEmpty: (value) => value === null,
    refetchOnFocus: true,
  });
  const loading = status === 'loading';

  const handleRSVP = useCallback(
    async (status: RSVPStatus) => {
      if (!event || !currentUser) return;

      try {
        await eventService.rsvp(
          event.id,
          currentUser.id,
          currentUser.name || 'Unknown',
          isCoach ? 'COACH' : 'PARENT',
          status,
          0,
          currentUser.avatar,
        );
        onRefresh();
      } catch (error) {
        logger.error('Failed to RSVP:', error);
        uiFeedback.showToast('Failed to save your response. Please try again.', 'error');
      }
    },
    [event, currentUser, isCoach, onRefresh],
  );

  const handlePublish = useCallback(async () => {
    if (!event) return;
    try {
      await eventService.publishEvent(event.id);
      await eventService.inviteClub(event.id);
      onRefresh();
      uiFeedback.showToast('Event published and members notified!', 'success');
    } catch (error) {
      logger.error('Failed to publish:', error);
      uiFeedback.showToast('Failed to publish event.', 'error');
    }
  }, [event, onRefresh]);

  const handleCancel = useCallback(async () => {
    if (!event) return;

    uiFeedback.alert('Cancel Event', 'Are you sure you want to cancel this event?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await eventService.cancelEvent(event.id);
            onRefresh();
          } catch (error) {
            logger.error('Failed to cancel:', error);
            uiFeedback.showToast('Failed to cancel event.', 'error');
          }
        },
      },
    ]);
  }, [event, onRefresh]);

  const toggleAttendees = useCallback(() => {
    setShowAttendees((prev) => !prev);
  }, []);

  const typeColor = event ? eventService.getEventTypeColor(event.eventType) : '';
  const typeIcon = event ? eventService.getEventTypeIcon(event.eventType) : '';
  const attendeeCounts = event
    ? eventService.getAttendeeCounts(event.attendees)
    : { going: 0, maybe: 0, notGoing: 0, totalGuests: 0 };
  const currentRSVP =
    event && currentUser ? eventService.getUserRSVP(event.attendees, currentUser.id) : undefined;
  const isCreator = currentUser?.id === event?.createdBy;

  return {
    event,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
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
