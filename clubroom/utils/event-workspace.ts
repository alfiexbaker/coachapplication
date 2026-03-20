import type { ClubEvent, EventRSVP } from '@/constants/types';
import { eventService } from '@/services/event-service';

export interface EventWorkspaceState {
  isEventToday: boolean;
  checkInAvailable: boolean;
  responseSummaryLabel: string;
  reminderTargetCount: number;
  canShareRecap: boolean;
}

function getEventEndTimestamp(event: ClubEvent): number | null {
  const time = event.endTime || event.startTime;
  const timestamp = new Date(`${event.date}T${time}`).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function getEventWorkspaceState(
  event: ClubEvent | null,
  rsvps: EventRSVP[] = [],
): EventWorkspaceState {
  if (!event) {
    return {
      isEventToday: false,
      checkInAvailable: false,
      responseSummaryLabel: 'No event loaded.',
      reminderTargetCount: 0,
      canShareRecap: false,
    };
  }

  const attendeeCounts = eventService.getAttendeeCounts(event.attendees);
  const reminderTargetCount = rsvps.filter((rsvp) => rsvp.status === 'MAYBE').length;
  const eventEnd = getEventEndTimestamp(event);
  const canShareRecap =
    event.status === 'PUBLISHED' &&
    eventEnd !== null &&
    eventEnd <= Date.now() &&
    attendeeCounts.going > 0;

  return {
    isEventToday: eventService.isEventToday(event),
    checkInAvailable: eventService.isCheckInAvailable(event),
    responseSummaryLabel: `${attendeeCounts.going} going · ${attendeeCounts.maybe} maybe · ${attendeeCounts.notGoing} can't go`,
    reminderTargetCount,
    canShareRecap,
  };
}
