import type { GroupRegistration, GroupSession, SessionOffering } from '@/constants/types';
const DEFAULT_EVENT_TIME = '18:00';
export const GROUP_SESSION_OFFERING_PREFIX = 'group_session_offering:';
export function buildGroupSessionOfferingId(sessionId: string): string {
  return `${GROUP_SESSION_OFFERING_PREFIX}${sessionId}`;
}
export function extractGroupSessionIdFromOfferingId(offeringId: string): string | null {
  if (!offeringId.startsWith(GROUP_SESSION_OFFERING_PREFIX)) {
    return null;
  }
  const groupSessionId = offeringId.replace(GROUP_SESSION_OFFERING_PREFIX, '');
  return groupSessionId || null;
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
    ...(registration.athleteName ? { userName: registration.athleteName } : {}),
    ...(registration.parentId ? { parentId: registration.parentId } : {}),
    ...(registration.parentName ? { parentName: registration.parentName } : {}),
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
    offPlatformParticipants: session.offPlatformParticipants ?? 0,
    location: session.location,
    venueName: session.venueName,
    locationCoordinates: session.locationCoordinates,
    scheduledAt,
    isRecurring: Boolean(session.isRecurring),
    recurrenceType: session.isRecurring ? 'weekly' : 'none',
    dayOfWeek: session.recurringPattern?.dayOfWeek,
    timeOfDay: session.recurringPattern?.startTime,
    endDate: session.recurringPattern?.until,
    cancelledInstances: session.cancelledInstances,
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
  return {
    ...offering,
    source: 'direct',
    sourceEntityId: offering.id,
  };
}
export function resolveSessionOfferingSourceIds(
  offering: Pick<SessionOffering, 'id' | 'source' | 'sourceEntityId'>,
): { directEntityIds: string[]; groupSessionIds: string[] } {
  const inferredGroupSessionId = extractGroupSessionIdFromOfferingId(offering.id);
  const sourceEntityGroupId = offering.sourceEntityId
    ? extractGroupSessionIdFromOfferingId(offering.sourceEntityId) || offering.sourceEntityId
    : null;
  const groupSessionId =
    offering.source === 'group'
      ? sourceEntityGroupId || inferredGroupSessionId || offering.id
      : inferredGroupSessionId;

  if (groupSessionId) {
    return { directEntityIds: [], groupSessionIds: [groupSessionId] };
  }

  return {
    directEntityIds: Array.from(
      new Set([offering.id, offering.sourceEntityId].filter((id): id is string => Boolean(id))),
    ),
    groupSessionIds: [],
  };
}
export function getSessionOfferingGroupSessionId(
  offering: Pick<SessionOffering, 'id' | 'source' | 'sourceEntityId'>,
): string | null {
  return resolveSessionOfferingSourceIds(offering).groupSessionIds[0] ?? null;
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
  includeOpenDiscoverSessions?: boolean;
}): boolean {
  const {
    session,
    sessionRegistrations,
    viewerIds,
    childClubIds,
    currentUserId,
    isCoachUser,
    includeOpenDiscoverSessions = false,
  } = params;
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
  const isOpenDiscoverSession =
    includeOpenDiscoverSessions &&
    (session.status === 'PUBLISHED' || session.status === 'FULL') &&
    session.inviteType !== 'CLOSED' &&
    session.inviteType !== 'SQUAD_ONLY';
  return hasViewerRegistration || isChildClubSession || isOpenDiscoverSession;
}
