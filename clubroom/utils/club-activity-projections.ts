import type { ClubActivity, ClubActivityAccessScope } from '@/constants/club-activity-types';
import type { ClubEvent, Match } from '@/constants/event-types';
import type { GroupSession } from '@/constants/session-types';

const DEFAULT_EVENT_TIME = '18:00';
const CLUB_ACTIVITY_PREFIX = 'club_activity:';

interface MapGroupSessionOptions {
  allowPastFallback?: boolean;
}

interface BuildClubActivitiesOptions {
  includePastSessions?: boolean;
}

function buildClubActivityId(source: ClubActivity['source'], entityId: string): string {
  return `${CLUB_ACTIVITY_PREFIX}${source}:${entityId}`;
}

function formatTypeLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseIso(date: string, startTime: string = DEFAULT_EVENT_TIME): string {
  const parsed = new Date(`${date}T${startTime}`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(`${date}T${DEFAULT_EVENT_TIME}`).toISOString();
  }
  return parsed.toISOString();
}

function parseEndIso(date: string, endTime?: string): string | undefined {
  if (!endTime) return undefined;
  const parsed = new Date(`${date}T${endTime}`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
}

function mapEventKind(event: ClubEvent): ClubActivity['kind'] {
  return event.eventType === 'TRIAL_DAY' || event.eventType === 'TRAINING_CAMP'
    ? 'training'
    : 'informational';
}

function mapEventStatus(event: ClubEvent): ClubActivity['status'] {
  if (event.status === 'DRAFT') return 'draft';
  if (event.status === 'CANCELLED') return 'cancelled';
  if (event.status === 'COMPLETED') return 'completed';
  return 'scheduled';
}

function getEventAccessScope(event: ClubEvent): ClubActivity['accessScope'] {
  return event.targetAudience === 'SQUAD' ? 'squad' : 'club';
}

function getEventAudienceLabel(event: ClubEvent): string {
  switch (event.targetAudience) {
    case 'ALL':
      return 'Whole club';
    case 'COACHES':
      return 'Coaches only';
    case 'PARENTS':
      return 'Parents only';
    case 'ATHLETES':
      return 'Athletes only';
    case 'SQUAD':
      return event.squadIds && event.squadIds.length > 1 ? 'Selected squads' : 'Squad only';
  }
}

function getEventParticipationLabel(event: ClubEvent): ClubActivity['participationLabel'] {
  if (!event.rsvpRequired) {
    return 'Info only';
  }
  return event.price > 0 ? 'Paid RSVP' : 'RSVP';
}

function getGroupAccessScope(session: GroupSession): ClubActivityAccessScope {
  const isSquadScoped = Boolean(session.squadId || session.inviteType === 'SQUAD_ONLY');

  if (isSquadScoped && session.inviteType === 'OPEN') {
    return 'mixed';
  }
  if (isSquadScoped) {
    return 'squad';
  }
  if (session.clubId && session.inviteType === 'OPEN') {
    return 'mixed';
  }
  if (session.clubId) {
    return 'club';
  }
  if (session.inviteType === 'OPEN') {
    return 'public';
  }
  return 'private';
}

function getGroupAccessLabel(session: GroupSession): string {
  const accessScope = getGroupAccessScope(session);

  switch (accessScope) {
    case 'mixed':
      return session.squadId ? 'Squad + outside athletes' : 'Club + outside athletes';
    case 'squad':
      return 'Squad only';
    case 'club':
      return 'Club only';
    case 'public':
      return 'Open public';
    case 'private':
      return 'Invite only';
  }
}

function getGroupAudienceLabel(session: GroupSession): string {
  const accessScope = getGroupAccessScope(session);

  switch (accessScope) {
    case 'mixed':
      return session.squadId
        ? 'Selected squad with open outside registration'
        : 'Club session with open outside registration';
    case 'squad':
      return 'Selected squad';
    case 'club':
      return 'Club members';
    case 'public':
      return 'Anyone browsing sessions';
    case 'private':
      return 'Invited athletes only';
  }
}

function getGroupStatus(session: GroupSession): ClubActivity['status'] {
  if (session.status === 'DRAFT') return 'draft';
  if (session.status === 'FULL') return 'full';
  if (session.status === 'CANCELLED') return 'cancelled';
  if (session.status === 'COMPLETED') return 'completed';
  return 'scheduled';
}

function getGroupParticipationLabel(session: GroupSession): ClubActivity['participationLabel'] {
  if (session.waitlistEnabled) {
    return 'Registration / waitlist';
  }
  return 'Registration';
}

function pickGroupSchedule(
  session: GroupSession,
  now: Date,
  allowPastFallback: boolean,
): GroupSession['schedule'][number] | null {
  if (!session.schedule || session.schedule.length === 0) {
    return null;
  }

  const sorted = Array.from(session.schedule).toSorted((left, right) => {
    const leftIso = parseIso(left.date, left.startTime);
    const rightIso = parseIso(right.date, right.startTime);
    return new Date(leftIso).getTime() - new Date(rightIso).getTime();
  });

  const upcoming = sorted.find(
    (entry) => new Date(parseIso(entry.date, entry.startTime)).getTime() >= now.getTime(),
  );

  if (upcoming) {
    return upcoming;
  }

  return allowPastFallback ? sorted[sorted.length - 1] ?? null : null;
}

export function mapEventToClubActivity(event: ClubEvent): ClubActivity {
  const startsAt = parseIso(event.date, event.startTime);

  return {
    id: buildClubActivityId('club_event', event.id),
    source: 'club_event',
    sourceEntityId: event.id,
    clubId: event.clubId,
    title: event.title,
    description: event.description,
    startsAt,
    endsAt: parseEndIso(event.date, event.endTime),
    status: mapEventStatus(event),
    kind: mapEventKind(event),
    typeLabel: formatTypeLabel(event.eventType),
    participationMode: event.rsvpRequired ? 'rsvp' : 'none',
    participationLabel: getEventParticipationLabel(event),
    accessScope: getEventAccessScope(event),
    accessLabel: getEventAudienceLabel(event),
    audienceLabel: getEventAudienceLabel(event),
    locationLabel: event.isVirtual
      ? 'Online'
      : event.venue || event.location || event.address || 'Club venue',
    isVirtual: event.isVirtual,
    price: event.price,
    currency: event.currency,
    squadIds: event.squadIds ?? [],
    allowsExternalRegistration: false,
  };
}

export function mapGroupSessionToClubActivity(
  session: GroupSession,
  now: Date = new Date(),
  options: MapGroupSessionOptions = {},
): ClubActivity | null {
  const scheduleEntry = pickGroupSchedule(session, now, options.allowPastFallback ?? true);
  if (!scheduleEntry) {
    return null;
  }

  return {
    id: buildClubActivityId('group_session', session.id),
    source: 'group_session',
    sourceEntityId: session.id,
    clubId: session.clubId,
    title: session.title,
    description: session.description,
    startsAt: parseIso(scheduleEntry.date, scheduleEntry.startTime),
    endsAt: parseEndIso(scheduleEntry.date, scheduleEntry.endTime),
    status: getGroupStatus(session),
    kind: 'training',
    typeLabel: formatTypeLabel(session.sessionType),
    participationMode: 'registration',
    participationLabel: getGroupParticipationLabel(session),
    accessScope: getGroupAccessScope(session),
    accessLabel: getGroupAccessLabel(session),
    audienceLabel: getGroupAudienceLabel(session),
    locationLabel: session.isVirtual
      ? 'Online'
      : session.venueName
        ? `${session.venueName} · ${session.location}`
        : session.location,
    isVirtual: session.isVirtual,
    price: session.pricePerParticipant,
    currency: session.currency,
    squadId: session.squadId,
    squadIds: session.squadId ? [session.squadId] : [],
    allowsExternalRegistration: session.inviteType === 'OPEN',
  };
}

function mapMatchStatus(match: Match): ClubActivity['status'] {
  if (match.status === 'COMPLETED') return 'completed';
  if (match.status === 'CANCELLED') return 'cancelled';
  if (match.status === 'IN_PROGRESS') return 'in_progress';
  return 'scheduled';
}

function mapMatchParticipationLabel(match: Match): ClubActivity['participationLabel'] {
  if (match.status === 'COMPLETED' && match.result) {
    return `Result ${match.result.home}-${match.result.away}`;
  }
  if (match.status === 'LINEUP_SET') {
    return 'Lineup set';
  }
  if (match.status === 'IN_PROGRESS') {
    return 'In progress';
  }
  return 'Availability & lineup';
}

export function mapMatchToClubActivity(match: Match): ClubActivity {
  return {
    id: buildClubActivityId('match', match.id),
    source: 'match',
    sourceEntityId: match.id,
    clubId: match.clubId,
    title: match.title,
    description: match.notes,
    startsAt: parseIso(match.date, match.kickoffTime),
    status: mapMatchStatus(match),
    kind: 'match',
    typeLabel: `${formatTypeLabel(match.matchType)} Match`,
    participationMode: 'availability',
    participationLabel: mapMatchParticipationLabel(match),
    accessScope: match.squadId ? 'squad' : 'club',
    accessLabel: match.squadId ? 'Team' : 'Club',
    audienceLabel: match.squadId ? 'Selected squad and families' : 'Club fixture group',
    locationLabel: match.venue,
    isVirtual: false,
    squadId: match.squadId,
    squadIds: match.squadId ? [match.squadId] : [],
    allowsExternalRegistration: false,
    opponent: match.opponent,
    homeAwayLabel: match.isHome ? 'Home' : 'Away',
    resultLabel: match.result ? `${match.result.home}-${match.result.away}` : undefined,
  };
}

export function buildClubActivities(params: {
  events: ClubEvent[];
  sessions: GroupSession[];
  matches?: Match[];
  now?: Date;
}, options: BuildClubActivitiesOptions = {}): ClubActivity[] {
  const now = params.now ?? new Date();
  const activities = [
    ...params.events.map(mapEventToClubActivity),
    ...params.sessions
      .map((session) =>
        mapGroupSessionToClubActivity(session, now, {
          allowPastFallback: options.includePastSessions ?? false,
        }),
      )
      .filter((activity): activity is ClubActivity => activity !== null),
    ...(params.matches ?? []).map(mapMatchToClubActivity),
  ];

  return activities.sort(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );
}
