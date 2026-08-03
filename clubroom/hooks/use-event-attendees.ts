import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { eventService } from '@/services/event-service';
import { createLogger } from '@/utils/logger';
import type {
  ClubEvent,
  EventRSVP,
  EventAttendance,
  EventAttendanceStats,
  CheckInInput,
} from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';
import { isEventStaffWorkspaceDenied } from '@/utils/event-workspace';

const logger = createLogger('useEventAttendees');

interface EventAttendeesData {
  event: ClubEvent | null;
  rsvps: EventRSVP[];
  attendance: EventAttendance[];
  stats: EventAttendanceStats | null;
  currentAttendance: EventAttendance | null;
  canManageEvent: boolean;
}

export interface UseEventAttendeesResult {
  event: ClubEvent | null;
  rsvps: EventRSVP[];
  attendance: EventAttendance[];
  stats: EventAttendanceStats | null;
  currentAttendance: EventAttendance | null;
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  actorRole: 'COACH' | 'PARENT' | 'ATHLETE';
  canManageEvent: boolean;
  isEventToday: boolean;
  checkInAvailable: boolean;
  currentUser: ReturnType<typeof useAuth>['currentUser'];
  handleCheckIn: (input: CheckInInput) => Promise<void>;
  handleUndoCheckIn: () => Promise<void>;
}

export function useEventAttendees(id: string | undefined): UseEventAttendeesResult {
  const { currentUser } = useAuth();
  const actorRole =
    currentUser?.role === 'COACH'
      ? 'COACH'
      : currentUser?.role === 'PARENT'
        ? 'PARENT'
        : 'ATHLETE';

  const loadData = async () => {
    if (!id || !currentUser) {
      return ok<EventAttendeesData>({
        event: null,
        rsvps: [],
        attendance: [],
        stats: null,
        currentAttendance: null,
        canManageEvent: false,
      });
    }

    try {
      const [eventData, userAttendance] = await Promise.all([
        eventService.getEvent(id),
        eventService.getUserAttendance(id, currentUser.id),
      ]);

      if (!eventData) {
        return ok<EventAttendeesData>({
          event: eventData,
          rsvps: [],
          attendance: [],
          stats: null,
          currentAttendance: userAttendance,
          canManageEvent: false,
        });
      }

      try {
        const attendance = await eventService.getAttendeeList(id);
        const [rsvps, stats] = await Promise.all([
          eventService.getEventRSVPs(id),
          eventService.getAttendanceStats(id),
        ]);
        return ok<EventAttendeesData>({
          event: eventData,
          rsvps,
          attendance,
          stats,
          currentAttendance: userAttendance,
          canManageEvent: true,
        });
      } catch (staffWorkspaceError) {
        if (!isEventStaffWorkspaceDenied(staffWorkspaceError)) {
          logger.error('Failed to load event attendee workspace:', staffWorkspaceError);
          return err(
            serviceError(
              'UNKNOWN',
              'Failed to load attendees. Pull down to refresh.',
              staffWorkspaceError,
            ),
          );
        }
        logger.info('Event attendee workspace unavailable to current actor', { eventId: id });
        return ok<EventAttendeesData>({
          event: eventData,
          rsvps: [],
          attendance: [],
          stats: null,
          currentAttendance: userAttendance,
          canManageEvent: false,
        });
      }
    } catch (loadError) {
      logger.error('Failed to load attendee data', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load attendees. Pull down to refresh.', loadError),
      );
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<EventAttendeesData>({
    load: loadData,
    deps: [id, currentUser?.id],
    dataKey: id
      ? `event-attendees:${currentUser?.id ?? 'anonymous'}:${id}`
      : 'event-attendees:missing',
    isEmpty: (value) => value.event === null,
    refetchOnFocus: true,
  });

  const event = data?.event ?? null;
  const rsvps = data?.rsvps ?? [];
  const attendance = data?.attendance ?? [];
  const stats = data?.stats ?? null;
  const currentAttendance = data?.currentAttendance ?? null;
  const canManageEvent = data?.canManageEvent ?? false;
  const loading = status === 'loading';

  const handleCheckIn = async (input: CheckInInput) => {
    try {
      await eventService.checkIn(input);
      onRefresh();
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
    } catch (undoError) {
      logger.error('Failed to undo check-in', undoError);
      uiFeedback.showToast('Could not undo check-in. Please try again.', 'error');
    }
  };

  const isEventToday = event ? eventService.isEventToday(event) : false;
  const checkInAvailable = event ? eventService.isCheckInAvailable(event) : false;

  return {
    event,
    rsvps,
    attendance,
    stats,
    currentAttendance,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    actorRole,
    canManageEvent,
    isEventToday,
    checkInAvailable,
    currentUser,
    handleCheckIn,
    handleUndoCheckIn,
  };
}
