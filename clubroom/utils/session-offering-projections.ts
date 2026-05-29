import type {
  ClubEvent,
  GroupRegistration,
  GroupSession,
  SessionOffering,
} from '@/constants/types';
const DEFAULT_EVENT_TIME = '18:00';
export const GROUP_SESSION_OFFERING_PREFIX = 'group_session_offering:';
const EVENT_OFFERING_PREFIX = 'event_offering_';
export function buildGroupSessionOfferingId(sessionId: string): string {
  return `${GROUP_SESSION_OFFERING_PREFIX}${sessionId}`;
}
export function buildEventOfferingId(eventId: string): string {
  return `${EVENT_OFFERING_PREFIX}${eventId}`;
}
export function extractGroupSessionIdFromOfferingId(offeringId: string): string | null {
  if (!offeringId.startsWith(GROUP_SESSION_OFFERING_PREFIX)) {
    return null;
  }
  const groupSessionId = offeringId.replace(GROUP_SESSION_OFFERING_PREFIX, '');
  return groupSessionId || null;
}
function parseIsoFromEvent(event: ClubEvent): string {
  const startTime = event.startTime || DEFAULT_EVENT_TIME;
  const parsed = new Date(`${event.date}T${startTime}`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(`${event.date}T${DEFAULT_EVENT_TIME}`).toISOString();
  }
  return parsed.toISOString();
}
function getEventDurationMinutes(event: ClubEvent): number | undefined {
  if (!event.endTime || !event.startTime) {
    return undefined;
  }
  const start = new Date(`${event.date}T${event.startTime}`);
  const end = new Date(`${event.date}T${event.endTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return undefined;
  }
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  return minutes > 0 ? minutes : undefined;
}
function parseIsoFromGroupSchedule(date: string, startTime: string = DEFAULT_EVENT_TIME): string {
  const parsed = new Date(`${date}T${startTime}`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(`${date}T${DEFAULT_EVENT_TIME}`).toISOString();
  }
  return parsed.toISOString();
}
function getGroupSessionDurationMinutes(startTime?: string, endTime?: string): number | undefined {
  if (!startTime || !endTime) {
    return undefined;
  }
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return undefined;
  }
  const duration = Math.round((end.getTime() - start.getTime()) / 60_000);
  return duration > 0 ? duration : undefined;
}
function mapGroupStatusToOfferingStatus(status: GroupSession['status']): SessionOffering['status'] {
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'COMPLETED') return 'completed';
  if (status === 'FULL') return 'full';
  return 'active';
}
function mapGroupRegistrationToSessionRegistration(
  registration: GroupRegistration,
): SessionOffering['registrations'][number] | null {
  if (registration.status === 'CANCELLED' || registration.status === 'WAITLISTED') {
    return null;
  }
  return {
    id: registration.id,
    userId: registration.athleteId,
    userName: registration.athleteId,
    bookedAt: registration.registeredAt,
    status: registration.status === 'ATTENDED' ? 'completed' : 'confirmed',
  };
}
function pickRepresentativeGroupSchedule(
  session: GroupSession,
  now: Date,
): GroupSession['schedule'][number] | null {
  if (!session.schedule || session.schedule.length === 0) return null;
  const sorted = Array.from(session.schedule).toSorted((a, b) => {
    const aIso = parseIsoFromGroupSchedule(a.date, a.startTime);
    const bIso = parseIsoFromGroupSchedule(b.date, b.startTime);
    return new Date(aIso).getTime() - new Date(bIso).getTime();
  });
  const upcoming = sorted.find(
    (entry) =>
      new Date(parseIsoFromGroupSchedule(entry.date, entry.startTime)).getTime() >= now.getTime(),
  );
  return upcoming ?? sorted[sorted.length - 1] ?? null;
}
export function mapEventToOffering(event: ClubEvent): SessionOffering {
  const registrations = event.attendees.reduce<SessionOffering['registrations']>(
    (next, attendee) => {
      if (attendee.status !== 'GOING') {
        return next;
      }
      const index = next.length;
      next.push({
        id: `event_reg_${event.id}_${index}_${attendee.userId}`,
        userId: attendee.userId,
        userName: attendee.userId,
        bookedAt: attendee.respondedAt || event.createdAt,
        status: 'confirmed' as const,
      });
      return next;
    },
    [],
  );
  return normalizeSessionOfferingSource({
    id: buildEventOfferingId(event.id),
    coachId: event.createdBy || 'coach1',
    clubId: event.clubId,
    actingAs: 'club',
    createdByUserId: event.createdBy,
    title: event.title,
    description: event.description,
    sessionType: 'group',
    maxParticipants: event.maxAttendees || event.maxParticipants || 30,
    location: event.venue || event.location || event.address || 'Club venue',
    scheduledAt: parseIsoFromEvent(event),
    isRecurring: false,
    recurrenceType: 'none',
    status:
      event.status === 'CANCELLED'
        ? 'cancelled'
        : event.status === 'COMPLETED'
          ? 'completed'
          : 'active',
    visibility: 'club',
    registrations,
    createdAt: event.createdAt,
    updatedAt: event.createdAt,
    duration: getEventDurationMinutes(event),
    price: event.price,
    source: 'event',
    sourceEntityId: event.id,
  });
}
export function mapGroupSessionToOffering(
  session: GroupSession,
  registrations: GroupRegistration[],
  now: Date,
): SessionOffering | null {
  const representative = pickRepresentativeGroupSchedule(session, now);
  if (!representative) return null;
  const scheduledAt = parseIsoFromGroupSchedule(representative.date, representative.startTime);
  const mappedRegistrations = registrations.flatMap((item) => {
    const mapped = mapGroupRegistrationToSessionRegistration(item);
    return mapped !== null ? [mapped] : [];
  });
  return normalizeSessionOfferingSource({
    id: buildGroupSessionOfferingId(session.id),
    coachId: session.assigneeCoachId || session.coachId,
    clubId: session.clubId,
    actingAs: session.actingAs,
    ownerCoachId: session.ownerCoachId,
    assigneeCoachId: session.assigneeCoachId,
    createdByUserId: session.createdByUserId,
    createdByRole: session.createdByRole,
    createdByName: session.createdByName,
    inviteType: session.inviteType,
    title: session.title,
    description: session.description,
    sessionType: 'group',
    maxParticipants: session.maxParticipants,
    location: session.location,
    venueName: session.venueName,
    locationCoordinates: session.locationCoordinates,
    scheduledAt,
    isRecurring: Boolean(session.isRecurring),
    recurrenceType: session.isRecurring ? 'weekly' : 'none',
    status: mapGroupStatusToOfferingStatus(session.status),
    visibility: session.clubId ? 'club' : 'public',
    registrations: mappedRegistrations,
    createdAt: session.createdAt,
    updatedAt: session.createdAt,
    duration: getGroupSessionDurationMinutes(representative.startTime, representative.endTime),
    price: session.pricePerParticipant,
    footballSkill: session.focus?.[0],
    source: 'group',
    sourceEntityId: session.id,
  });
}
export function canViewerSeeEvent(
  event: ClubEvent,
  viewerIds: Set<string>,
  isCoachUser: boolean,
  isParent: boolean,
  currentUserId?: string,
): boolean {
  if (event.status === 'DRAFT') {
    return false;
  }
  if (currentUserId && event.createdBy === currentUserId) {
    return true;
  }
  if (event.attendees.some((attendee) => viewerIds.has(attendee.userId))) {
    return true;
  }
  if (event.targetAudience === 'ALL') {
    return true;
  }
  if (isCoachUser) {
    return event.targetAudience === 'COACHES';
  }
  if (isParent) {
    return event.targetAudience === 'PARENTS' || event.targetAudience === 'ATHLETES';
  }
  return event.targetAudience === 'ATHLETES';
}
export function normalizeSessionOfferingSource(offering: SessionOffering): SessionOffering {
  if (offering.source) {
    if (offering.sourceEntityId) {
      return offering;
    }
    const fallbackEntityId =
      offering.source === 'group'
        ? extractGroupSessionIdFromOfferingId(offering.id) || offering.id
        : offering.id;
    return {
      ...offering,
      sourceEntityId: fallbackEntityId,
    };
  }
  const inferredGroupSessionId = extractGroupSessionIdFromOfferingId(offering.id);
  if (inferredGroupSessionId) {
    return {
      ...offering,
      source: 'group',
      sourceEntityId: inferredGroupSessionId,
    };
  }
  if (offering.id.startsWith(EVENT_OFFERING_PREFIX)) {
    return {
      ...offering,
      source: 'event',
      sourceEntityId: offering.id.replace(EVENT_OFFERING_PREFIX, '') || offering.id,
    };
  }
  return {
    ...offering,
    source: 'direct',
    sourceEntityId: offering.id,
  };
}
export function isOfferingVisibleToCoachUser(
  offering: Pick<
    SessionOffering,
    'coachId' | 'assigneeCoachId' | 'ownerCoachId' | 'actingAs' | 'createdByUserId'
  >,
  currentUserId?: string,
): boolean {
  if (!currentUserId) return false;
  if (offering.coachId === currentUserId) return true;
  if (offering.assigneeCoachId === currentUserId) return true;
  if (offering.ownerCoachId === currentUserId) return true;
  if (offering.actingAs !== 'club') return false;
  return offering.createdByUserId === currentUserId;
}
export function isGroupSessionRelevantToViewer(params: {
  session: GroupSession;
  sessionRegistrations: GroupRegistration[];
  viewerIds: Set<string>;
  childClubIds: Set<string>;
  currentUserId?: string;
  isCoachUser: boolean;
}): boolean {
  const { session, sessionRegistrations, viewerIds, childClubIds, currentUserId, isCoachUser } =
    params;
  if (session.status === 'DRAFT') {
    return false;
  }
  const hasViewerRegistration = sessionRegistrations.some(
    (registration) =>
      registration.status !== 'CANCELLED' &&
      (viewerIds.has(registration.athleteId) ||
        (currentUserId ? registration.parentId === currentUserId : false)),
  );
  const isChildClubSession = Boolean(session.clubId && childClubIds.has(session.clubId));
  const isCoachOwned = Boolean(
    currentUserId &&
    (session.coachId === currentUserId ||
      session.assigneeCoachId === currentUserId ||
      session.ownerCoachId === currentUserId ||
      session.createdByUserId === currentUserId),
  );
  if (isCoachUser) {
    return isCoachOwned;
  }
  return hasViewerRegistration || isChildClubSession;
}
