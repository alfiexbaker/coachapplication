import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { eventService } from '@/services/event-service';
import type {
  CheckInInput,
  ClubEvent,
  EventAttendance,
  EventAttendanceStats,
  EventRSVP,
  RSVPStatus,
} from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';
import { getEventWorkspaceState } from '@/utils/event-workspace';

const logger = createLogger('useEventDetail');

interface EventDetailData {
  event: ClubEvent | null;
  currentRSVP: EventRSVP | null;
  rsvps: EventRSVP[];
  attendance: EventAttendance[];
  attendanceStats: EventAttendanceStats | null;
  currentAttendance: EventAttendance | null;
}

export interface UseEventDetailResult {
  event: ClubEvent | null;
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  isCoach: boolean;
  actorRole: 'COACH' | 'PARENT' | 'ATHLETE';
  actorUserId: string;
  actorName: string;
  typeColor: string;
  typeIcon: string;
  attendeeCounts: { going: number; maybe: number; notGoing: number; totalGuests: number };
  currentRSVP: EventRSVP | null;
  rsvps: EventRSVP[];
  attendance: EventAttendance[];
  attendanceStats: EventAttendanceStats | null;
  currentAttendance: EventAttendance | null;
  isCreator: boolean;
  isOrganizer: boolean;
  isEventToday: boolean;
  checkInAvailable: boolean;
  responseSummaryLabel: string;
  reminderTargetCount: number;
  canShareRecap: boolean;
  handleRSVP: (status: RSVPStatus) => Promise<void>;
  handlePublish: () => Promise<void>;
  handleCancel: () => Promise<void>;
  handleSendReminder: () => Promise<void>;
  handleCheckIn: (input: CheckInInput) => Promise<void>;
  handleUndoCheckIn: () => Promise<void>;
  handleOpenRecap: () => void;
  handleOpenFullAttendance: () => void;
}

export function useEventDetail(id: string | undefined): UseEventDetailResult {
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';
  const actorRole =
    currentUser?.role === 'COACH'
      ? 'COACH'
      : currentUser?.role === 'PARENT'
        ? 'PARENT'
        : 'ATHLETE';

  const loadEvent = async () => {
    if (!id || !currentUser) {
      return ok<EventDetailData>({
        event: null,
        currentRSVP: null,
        rsvps: [],
        attendance: [],
        attendanceStats: null,
        currentAttendance: null,
      });
    }

    try {
      const [event, currentRSVP, rsvps, attendance, attendanceStats, currentAttendance] =
        await Promise.all([
          eventService.getEvent(id),
          eventService.getUserEventRSVP(id, currentUser.id),
          eventService.getEventRSVPs(id),
          eventService.getAttendeeList(id),
          eventService.getAttendanceStats(id),
          eventService.getUserAttendance(id, currentUser.id),
        ]);

      return ok<EventDetailData>({
        event,
        currentRSVP,
        rsvps,
        attendance,
        attendanceStats,
        currentAttendance,
      });
    } catch (loadError) {
      logger.error('Failed to load event:', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load event. Pull down to refresh.', loadError),
      );
    }
  };

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<EventDetailData>({
    load: loadEvent,
    deps: [id, currentUser?.id],
    isEmpty: (value) => value.event === null,
    refetchOnFocus: true,
  });
  const loading = status === 'loading';
  const event = data?.event ?? null;
  const currentRSVP = data?.currentRSVP ?? null;
  const rsvps = data?.rsvps ?? [];
  const attendance = data?.attendance ?? [];
  const attendanceStats = data?.attendanceStats ?? null;
  const currentAttendance = data?.currentAttendance ?? null;

  const handleRSVP = async (status: RSVPStatus) => {
    if (!event || !currentUser) return;

    try {
      await eventService.submitRSVP({
        eventId: event.id,
        userId: currentUser.id,
        userRole: actorRole,
        status,
        guestCount: 0,
      });
      onRefresh();
      uiFeedback.showToast(`Response saved: ${eventService.formatRSVPStatus(status)}`, 'success');
    } catch (error) {
      logger.error('Failed to RSVP:', error);
      uiFeedback.showToast('Failed to save your response. Please try again.', 'error');
    }
  };

  const handlePublish = async () => {
    if (!event) return;
    try {
      const publishResult = await eventService.publishEvent(event.id);
      if (!publishResult.success) {
        uiFeedback.showToast(publishResult.error.message || 'Failed to publish event.', 'error');
        return;
      }
      await eventService.inviteClub(event.id);
      onRefresh();
      uiFeedback.showToast('Event published.', 'success');
    } catch (error) {
      logger.error('Failed to publish:', error);
      uiFeedback.showToast('Failed to publish event.', 'error');
    }
  };

  const handleCancel = async () => {
    if (!event) return;

    uiFeedback.alert('Cancel Event', 'Are you sure you want to cancel this event?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const cancelResult = await eventService.cancelEvent(event.id);
            if (!cancelResult.success) {
              uiFeedback.showToast(
                cancelResult.error.message || 'Failed to cancel event.',
                'error',
              );
              return;
            }
            onRefresh();
            uiFeedback.showToast('Event cancelled.', 'success');
          } catch (error) {
            logger.error('Failed to cancel:', error);
            uiFeedback.showToast('Failed to cancel event.', 'error');
          }
        },
      },
    ]);
  };

  const handleSendReminder = async () => {
    if (!event || !isCoach) return;

    try {
      const result = await eventService.sendReminderToMaybes(event.id);
      if (!result.success) {
        uiFeedback.showToast(result.error.message || 'Could not send reminders.', 'error');
        return;
      }
      const sentCount = result.data;
      uiFeedback.showToast(
        sentCount > 0
          ? `Reminder sent to ${sentCount} attendee${sentCount === 1 ? '' : 's'}.`
          : 'No maybe responses need a reminder.',
        sentCount > 0 ? 'success' : 'default',
      );
    } catch (sendError) {
      logger.error('Failed to send reminders:', sendError);
      uiFeedback.showToast('Could not send reminders. Please try again.', 'error');
    }
  };

  const handleCheckIn = async (input: CheckInInput) => {
    try {
      await eventService.checkIn(input);
      onRefresh();
      uiFeedback.showToast('Checked in.', 'success');
    } catch (checkInError) {
      logger.error('Failed to check in attendee', checkInError);
      uiFeedback.showToast('Could not complete check-in. Please try again.', 'error');
    }
  };

  const handleUndoCheckIn = async () => {
    if (!id || !currentUser) return;
    try {
      await eventService.removeCheckIn(id, currentUser.id);
      onRefresh();
      uiFeedback.showToast('Check-in removed.', 'success');
    } catch (undoError) {
      logger.error('Failed to undo check-in', undoError);
      uiFeedback.showToast('Could not undo check-in. Please try again.', 'error');
    }
  };

  const handleOpenRecap = () => {
    if (!event) return;
    const isSquadAudience = event.targetAudience === 'SQUAD' && (event.squadIds?.length ?? 0) > 0;
    router.push(
      Routes.modalCreateClubPost({
        clubId: event.clubId,
        audience: isSquadAudience ? 'squad' : 'club',
        squadId: isSquadAudience ? event.squadIds?.[0] : undefined,
      }),
    );
  };

  const handleOpenFullAttendance = () => {
    if (!event) return;
    router.push(Routes.eventAttendees(event.id));
  };

  const typeColor = event ? eventService.getEventTypeColor(event.eventType) : '';
  const typeIcon = event ? eventService.getEventTypeIcon(event.eventType) : '';
  const attendeeCounts = event
    ? eventService.getAttendeeCounts(event.attendees)
    : { going: 0, maybe: 0, notGoing: 0, totalGuests: 0 };
  const isCreator = currentUser?.id === event?.createdBy;
  const workspaceState = getEventWorkspaceState(event, rsvps);
  const isOrganizer = isCreator || isCoach;

  return {
    event,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    isCoach,
    actorRole,
    actorUserId: currentUser?.id ?? '',
    actorName: currentUser?.name || 'Unknown',
    typeColor,
    typeIcon,
    attendeeCounts,
    currentRSVP,
    rsvps,
    attendance,
    attendanceStats,
    currentAttendance,
    isCreator,
    isOrganizer,
    isEventToday: workspaceState.isEventToday,
    checkInAvailable: workspaceState.checkInAvailable,
    responseSummaryLabel: workspaceState.responseSummaryLabel,
    reminderTargetCount: workspaceState.reminderTargetCount,
    canShareRecap: workspaceState.canShareRecap,
    handleRSVP,
    handlePublish,
    handleCancel,
    handleSendReminder,
    handleCheckIn,
    handleUndoCheckIn,
    handleOpenRecap,
    handleOpenFullAttendance,
  };
}
