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
import { getEventWorkspaceState, isEventStaffWorkspaceDenied } from '@/utils/event-workspace';

const logger = createLogger('useEventDetail');

interface EventDetailData {
  event: ClubEvent | null;
  currentRSVP: EventRSVP | null;
  rsvps: EventRSVP[];
  attendance: EventAttendance[];
  attendanceStats: EventAttendanceStats | null;
  currentAttendance: EventAttendance | null;
  canManageEvent: boolean;
}

export interface UseEventDetailResult {
  event: ClubEvent | null;
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
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
  isOrganizer: boolean;
  isEventToday: boolean;
  checkInAvailable: boolean;
  responseSummaryLabel: string;
  reminderTargetCount: number;
  canShareRecap: boolean;
  handleRSVP: (status: RSVPStatus) => Promise<void>;
  handlePublish: () => Promise<void>;
  handleSendInvites: () => Promise<void>;
  handleCancel: () => Promise<void>;
  handleSendReminder: () => Promise<void>;
  handleCheckIn: (input: CheckInInput) => Promise<void>;
  handleUndoCheckIn: () => Promise<void>;
  handleOpenRecap: () => void;
  handleOpenFullAttendance: () => void;
}

export function useEventDetail(id: string | undefined): UseEventDetailResult {
  const { currentUser } = useAuth();
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
        canManageEvent: false,
      });
    }

    try {
      const [event, currentRSVP, currentAttendance] = await Promise.all([
        eventService.getEvent(id),
        eventService.getUserEventRSVP(id, currentUser.id),
        eventService.getUserAttendance(id, currentUser.id),
      ]);

      if (!event) {
        return ok<EventDetailData>({
          event,
          currentRSVP,
          rsvps: [],
          attendance: [],
          attendanceStats: null,
          currentAttendance,
          canManageEvent: false,
        });
      }

      try {
        const attendance = await eventService.getAttendeeList(id);
        const [rsvps, attendanceStats] = await Promise.all([
          eventService.getEventRSVPs(id),
          eventService.getAttendanceStats(id),
        ]);

        return ok<EventDetailData>({
          event,
          currentRSVP,
          rsvps,
          attendance,
          attendanceStats,
          currentAttendance,
          canManageEvent: true,
        });
      } catch (staffWorkspaceError) {
        if (!isEventStaffWorkspaceDenied(staffWorkspaceError)) {
          logger.error('Failed to load event staff workspace:', staffWorkspaceError);
          return err(
            serviceError(
              'UNKNOWN',
              'Failed to load event. Pull down to refresh.',
              staffWorkspaceError,
            ),
          );
        }
        logger.info('Event staff workspace unavailable to current actor', { eventId: id });
        return ok<EventDetailData>({
          event,
          currentRSVP,
          rsvps: [],
          attendance: [],
          attendanceStats: null,
          currentAttendance,
          canManageEvent: false,
        });
      }
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
    dataKey: id
      ? `event-detail:${currentUser?.id ?? 'anonymous'}:${id}`
      : 'event-detail:missing',
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
  const canManageEvent = data?.canManageEvent ?? false;

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

  const sendEventInvites = async (eventToInvite: ClubEvent) => {
    if (eventToInvite.targetAudience === 'SQUAD') {
      if (eventToInvite.squadIds?.length) {
        await eventService.inviteSquads(eventToInvite.id, eventToInvite.squadIds);
        return;
      }
      throw new Error('Select a squad before sending event invitations.');
    }
    if (eventToInvite.targetAudience === 'ATHLETES') {
      if (eventToInvite.athleteIds?.length) {
        await eventService.inviteAthletes(eventToInvite.id, eventToInvite.athleteIds);
        return;
      }
      throw new Error('Select athletes before sending event invitations.');
    }
    if (eventToInvite.targetAudience === 'COACHES' || eventToInvite.targetAudience === 'PARENTS') {
      throw new Error('This legacy audience cannot be invited safely.');
    }
    await eventService.inviteClub(eventToInvite.id);
  };

  const handlePublish = async () => {
    if (!event || !canManageEvent) return;
    try {
      const publishResult = await eventService.publishEvent(event.id);
      if (!publishResult.success) {
        uiFeedback.showToast(publishResult.error.message || 'Failed to publish event.', 'error');
        return;
      }
      onRefresh();
      try {
        await sendEventInvites(event);
        uiFeedback.showToast('Event published and invitations sent.', 'success');
      } catch (inviteError) {
        logger.error('Event published without invitation delivery:', inviteError);
        uiFeedback.showToast(
          'Event published. Invitations were not sent. Use Send invitations to try again.',
          'error',
        );
      }
    } catch (error) {
      logger.error('Failed to publish:', error);
      uiFeedback.showToast('Failed to publish event.', 'error');
    }
  };

  const handleSendInvites = async () => {
    if (!event || !canManageEvent || event.status !== 'PUBLISHED') return;
    try {
      await sendEventInvites(event);
      uiFeedback.showToast('Invitations sent.', 'success');
    } catch (inviteError) {
      logger.error('Failed to send event invitations:', inviteError);
      uiFeedback.showToast(
        inviteError instanceof Error ? inviteError.message : 'Could not send invitations. Please try again.',
        'error',
      );
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
    if (!event || !canManageEvent) return;

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
    if (!event || event.targetAudience !== 'ALL') return;
    router.push(Routes.modalCreateClubPost({ clubId: event.clubId }));
  };

  const handleOpenFullAttendance = () => {
    if (!event) return;
    router.push(Routes.eventAttendees(event.id));
  };

  const typeColor = event ? eventService.getEventTypeColor(event.eventType) : '';
  const typeIcon = event ? eventService.getEventTypeIcon(event.eventType) : '';
  const attendeeCounts = event
    ? (event.rsvpSummary ?? eventService.getAttendeeCounts(event.attendees))
    : { going: 0, maybe: 0, notGoing: 0, totalGuests: 0 };
  const workspaceState = getEventWorkspaceState(event, rsvps);
  const isOrganizer = canManageEvent;

  return {
    event,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
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
    isOrganizer,
    isEventToday: workspaceState.isEventToday,
    checkInAvailable: workspaceState.checkInAvailable,
    responseSummaryLabel: workspaceState.responseSummaryLabel,
    reminderTargetCount: workspaceState.reminderTargetCount,
    canShareRecap:
      canManageEvent && workspaceState.canShareRecap && event?.targetAudience === 'ALL',
    handleRSVP,
    handlePublish,
    handleSendInvites,
    handleCancel,
    handleSendReminder,
    handleCheckIn,
    handleUndoCheckIn,
    handleOpenRecap,
    handleOpenFullAttendance,
  };
}
