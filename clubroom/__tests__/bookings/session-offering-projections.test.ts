import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { describe } from 'node:test';

import type { GroupRegistration, GroupSession, SessionOffering } from '@/constants/types';
import {
  getGroupRegistrationAthleteName,
  getGroupRegistrationParentName,
} from '@/utils/group-display';
import {
  GROUP_SESSION_OFFERING_PREFIX,
  buildGroupSessionOfferingId,
  extractGroupSessionIdFromOfferingId,
  getSessionOfferingGroupSessionId,
  isGroupSessionRelevantToViewer,
  isOfferingVisibleToCoachUser,
  mapGroupSessionToOffering,
  normalizeSessionOfferingSource,
  resolveSessionOfferingSourceIds,
} from '@/utils/session-offering-projections';

function makeGroupSession(overrides: Partial<GroupSession> = {}): GroupSession {
  return {
    id: 'gs_base',
    coachId: 'coach_main',
    title: 'Club Session',
    description: 'Session description',
    sessionType: 'TRAINING',
    schedule: [{ date: '2026-03-10', startTime: '18:00', endTime: '19:00' }],
    maxParticipants: 16,
    currentParticipants: 8,
    waitlistEnabled: true,
    waitlistCount: 0,
    pricePerParticipant: 10,
    currency: 'GBP',
    location: 'Main Pitch',
    isVirtual: false,
    status: 'PUBLISHED',
    createdAt: '2026-03-01T10:00:00Z',
    ...overrides,
  };
}

function makeRegistration(overrides: Partial<GroupRegistration> = {}): GroupRegistration {
  return {
    id: 'reg_1',
    sessionId: 'gs_base',
    athleteId: 'child_1',
    parentId: 'parent_1',
    status: 'REGISTERED',
    registeredAt: '2026-03-01T11:00:00Z',
    attendedDates: [],
    ...overrides,
  };
}

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('session offering projections', () => {
  test('coach visibility matrix includes coach, assignee, owner, and club creator', () => {
    const coachId = 'coach_a';
    const base: SessionOffering = {
      id: 'offering_1',
      coachId: 'coach_b',
      title: '1:1',
      sessionType: '1on1',
      maxParticipants: 1,
      location: 'Pitch',
      scheduledAt: '2026-03-10T10:00:00Z',
      isRecurring: false,
      recurrenceType: 'none',
      status: 'active',
      registrations: [],
      createdAt: '2026-03-01T00:00:00Z',
    };

    assert.equal(isOfferingVisibleToCoachUser({ ...base, coachId }, coachId), true);
    assert.equal(
      isOfferingVisibleToCoachUser({ ...base, assigneeCoachId: coachId }, coachId),
      true,
    );
    assert.equal(isOfferingVisibleToCoachUser({ ...base, ownerCoachId: coachId }, coachId), true);
    assert.equal(
      isOfferingVisibleToCoachUser(
        { ...base, actingAs: 'club', createdByUserId: coachId },
        coachId,
      ),
      true,
    );
    assert.equal(isOfferingVisibleToCoachUser(base, coachId), false);
  });

  test('group session relevance includes child-club, registration, and coach ownership', () => {
    const session = makeGroupSession({
      id: 'gs_matrix',
      clubId: 'club_1',
      assigneeCoachId: 'coach_assignee',
    });
    const registrations = [makeRegistration({ sessionId: 'gs_matrix', athleteId: 'child_2' })];

    assert.equal(
      isGroupSessionRelevantToViewer({
        session,
        sessionRegistrations: registrations,
        viewerIds: new Set(['parent_1', 'child_2']),
        childClubIds: new Set(),
        currentUserId: 'parent_1',
        isCoachUser: false,
      }),
      true,
    );

    assert.equal(
      isGroupSessionRelevantToViewer({
        session,
        sessionRegistrations: [],
        viewerIds: new Set(['parent_2']),
        childClubIds: new Set(['club_1']),
        currentUserId: 'parent_2',
        isCoachUser: false,
      }),
      true,
    );

    assert.equal(
      isGroupSessionRelevantToViewer({
        session,
        sessionRegistrations: [],
        viewerIds: new Set(['coach_assignee']),
        childClubIds: new Set(),
        currentUserId: 'coach_assignee',
        isCoachUser: true,
      }),
      true,
    );

    assert.equal(
      isGroupSessionRelevantToViewer({
        session: { ...session, status: 'DRAFT' },
        sessionRegistrations: registrations,
        viewerIds: new Set(['parent_1']),
        childClubIds: new Set(['club_1']),
        currentUserId: 'parent_1',
        isCoachUser: false,
      }),
      false,
    );

    const publicOpenSession = makeGroupSession({
      id: 'gs_public_open',
      clubId: undefined,
      inviteType: 'OPEN',
    });

    assert.equal(
      isGroupSessionRelevantToViewer({
        session: publicOpenSession,
        sessionRegistrations: [],
        viewerIds: new Set(['parent_3']),
        childClubIds: new Set(),
        currentUserId: 'parent_3',
        isCoachUser: false,
      }),
      false,
      'My Sessions should not show unregistered public sessions',
    );

    assert.equal(
      isGroupSessionRelevantToViewer({
        session: publicOpenSession,
        sessionRegistrations: [],
        viewerIds: new Set(['parent_3']),
        childClubIds: new Set(),
        currentUserId: 'parent_3',
        isCoachUser: false,
        includeOpenDiscoverSessions: true,
      }),
      true,
      'Discover should show open public sessions',
    );
  });

  test('normalization infers source tags and group ids correctly', () => {
    const groupOffering = normalizeSessionOfferingSource({
      id: `${GROUP_SESSION_OFFERING_PREFIX}gs_77`,
      coachId: 'coach_1',
      title: 'Group',
      sessionType: 'group',
      maxParticipants: 12,
      location: 'Pitch',
      scheduledAt: '2026-03-12T18:00:00Z',
      isRecurring: false,
      recurrenceType: 'none',
      status: 'active',
      registrations: [],
      createdAt: '2026-03-01T00:00:00Z',
    });
    assert.equal(groupOffering.source, 'group');
    assert.equal(groupOffering.sourceEntityId, 'gs_77');
    assert.equal(extractGroupSessionIdFromOfferingId(groupOffering.id), 'gs_77');
    assert.equal(buildGroupSessionOfferingId('gs_77'), `${GROUP_SESSION_OFFERING_PREFIX}gs_77`);

    const directOffering = normalizeSessionOfferingSource({
      id: 'offering_direct_1',
      coachId: 'coach_1',
      title: 'Direct',
      sessionType: '1on1',
      maxParticipants: 1,
      location: 'Pitch',
      scheduledAt: '2026-03-12T18:00:00Z',
      isRecurring: false,
      recurrenceType: 'none',
      status: 'active',
      registrations: [],
      createdAt: '2026-03-01T00:00:00Z',
    });
    assert.equal(directOffering.source, 'direct');
    assert.equal(directOffering.sourceEntityId, 'offering_direct_1');
  });

  test('source id resolver keeps group sessions out of direct booking ids', () => {
    const explicitGroupOffering = {
      id: buildGroupSessionOfferingId('gs_77'),
      source: 'group' as const,
      sourceEntityId: 'gs_77',
    };
    assert.equal(getSessionOfferingGroupSessionId(explicitGroupOffering), 'gs_77');
    assert.deepEqual(
      resolveSessionOfferingSourceIds(explicitGroupOffering),
      { directEntityIds: [], groupSessionIds: ['gs_77'] },
    );

    const wrappedGroupOffering = {
      id: buildGroupSessionOfferingId('gs_wrapped'),
      source: 'group' as const,
      sourceEntityId: buildGroupSessionOfferingId('gs_wrapped'),
    };
    assert.equal(getSessionOfferingGroupSessionId(wrappedGroupOffering), 'gs_wrapped');
    assert.deepEqual(
      resolveSessionOfferingSourceIds(wrappedGroupOffering),
      { directEntityIds: [], groupSessionIds: ['gs_wrapped'] },
    );

    const directOffering = {
      id: 'offering_direct_1',
      source: 'direct' as const,
      sourceEntityId: 'session_record_1',
    };
    assert.equal(getSessionOfferingGroupSessionId(directOffering), null);
    assert.deepEqual(
      resolveSessionOfferingSourceIds(directOffering),
      { directEntityIds: ['offering_direct_1', 'session_record_1'], groupSessionIds: [] },
    );
  });

  test('group session projection is source-tagged and route-safe', () => {
    const session = makeGroupSession({ id: 'gs_proj', assigneeCoachId: 'coach_assignee' });
    const projected = mapGroupSessionToOffering(
      session,
      [
        makeRegistration({
          sessionId: 'gs_proj',
          athleteId: 'child_x',
          athleteName: 'Jamie Carter',
          parentId: 'parent_x',
          parentName: 'Alex Carter',
        }),
      ],
      new Date('2026-03-01T00:00:00Z'),
    );

    assert.ok(projected);
    assert.equal(projected?.source, 'group');
    assert.equal(projected?.sourceEntityId, 'gs_proj');
    assert.equal(projected?.id, `${GROUP_SESSION_OFFERING_PREFIX}gs_proj`);
    assert.deepEqual(projected?.registrations[0], {
      id: 'reg_1',
      userId: 'child_x',
      userName: 'Jamie Carter',
      parentId: 'parent_x',
      parentName: 'Alex Carter',
      bookedAt: '2026-03-01T11:00:00Z',
      status: 'confirmed',
    });
    assert.equal(
      getGroupRegistrationAthleteName(
        makeRegistration({ athleteId: 'child_internal_id', athleteName: 'Jamie Carter' }),
      ),
      'Jamie Carter',
    );
    assert.equal(
      getGroupRegistrationParentName(
        makeRegistration({ parentId: 'parent_internal_id', parentName: 'Alex Carter' }),
      ),
      'Alex Carter',
    );
  });

  test('booking surfaces do not project club events into bookable offerings', () => {
    const sources = [
      readProjectFile('utils/session-offering-projections.ts'),
      readProjectFile('hooks/use-bookings.ts'),
      readProjectFile('hooks/use-bookings-discover.ts'),
    ];

    for (const source of sources) {
      assert.equal(source.includes('buildEventOfferingId'), false);
      assert.equal(source.includes('mapEventToOffering'), false);
      assert.equal(source.includes('canViewerSeeEvent'), false);
      assert.equal(source.includes('event_offering'), false);
      assert.equal(source.includes('eventService.getAllClubEvents'), false);
    }

    const projectionSource = readProjectFile('utils/session-offering-projections.ts');
    assert.equal(projectionSource.includes('mapGroupSessionToOffering'), true);
    assert.equal(projectionSource.includes("source: 'group'"), true);

    const activityRouteSource = readProjectFile('app/club/[id]/activity/[activityId].tsx');
    assert.equal(activityRouteSource.includes("activity.source === 'group_session'"), true);
    assert.equal(
      activityRouteSource.includes('Routes.groupSession(activity.sourceEntityId)'),
      true,
    );
    assert.equal(activityRouteSource.includes("activity.source === 'match'"), true);
    assert.equal(activityRouteSource.includes('Routes.match(activity.sourceEntityId)'), true);
    assert.equal(activityRouteSource.includes('Routes.event(activity.sourceEntityId)'), true);

    const displaySource = readProjectFile('utils/club-schedule-display.ts');
    const activityCardSource = readProjectFile('components/club/ClubScheduleActivityCard.tsx');
    assert.equal(displaySource.includes('getClubActivitySourceLabel'), true);
    assert.equal(activityCardSource.includes('getClubActivitySourceLabel(activity)'), true);
    assert.equal(activityCardSource.includes('Training session'), false);

    const discoverSource = readProjectFile('hooks/use-bookings-discover.ts');
    const discoverSessionsSource = readProjectFile('hooks/use-discover-sessions.ts');
    const bookingsSource = readProjectFile('hooks/use-bookings.ts');
    assert.equal(
      discoverSource.includes('getSessionOfferingGroupSessionId(normalizedOffering)'),
      true,
    );
    assert.equal(
      discoverSessionsSource.includes('getSessionOfferingGroupSessionId(normalizedOffering)'),
      true,
    );
    assert.equal(
      bookingsSource.includes('getSessionOfferingGroupSessionId(normalizedOffering)'),
      true,
    );
    assert.equal(
      discoverSource.includes('extractGroupSessionIdFromOfferingId(normalizedOffering.id)'),
      false,
    );
    assert.equal(
      discoverSessionsSource.includes('extractGroupSessionIdFromOfferingId(normalizedOffering.id)'),
      false,
    );
    assert.equal(
      bookingsSource.includes('extractGroupSessionIdFromOfferingId(normalizedOffering.id)'),
      false,
    );
    assert.equal(discoverSource.includes('buildDiscoverSessionSections'), true);
    assert.equal(discoverSource.includes('includeOpenDiscoverSessions: true'), true);
    assert.equal(bookingsSource.includes('includeOpenDiscoverSessions: true'), false);
    assert.equal(discoverSource.includes('thisWeekOfferings = allOfferings.filter'), false);
    assert.equal(discoverSource.includes('ensureRelationalDemoSeeded'), false);
    assert.equal(bookingsSource.includes('ensureRelationalDemoSeeded'), false);
    assert.equal(
      discoverSource.includes("currentUser.name || currentUser.fullName || 'Athlete'"),
      false,
    );
    assert.equal(discoverSessionsSource.includes('resolveDefaultBookingTarget({'), true);
    assert.equal(
      discoverSessionsSource.includes('currentUser.name || currentUser.fullName || "Athlete"'),
      false,
    );

    const sessionDetailModalSource = readProjectFile(
      'components/sessions/session-detail-modal.tsx',
    );
    const sessionDetailHookSource = readProjectFile('hooks/use-session-detail-modal.ts');
    assert.equal(
      sessionDetailModalSource.includes('getSessionOfferingGroupSessionId(offering)'),
      true,
    );
    assert.equal(sessionDetailModalSource.includes('isGroupOffering={isGroupOffering}'), true);
    assert.equal(sessionDetailModalSource.includes('Register family member'), true);
    assert.equal(sessionDetailModalSource.includes('Routes.sessionComplete(offering.id)'), false);
    assert.equal(
      sessionDetailHookSource.includes('getSessionOfferingGroupSessionId(offering)'),
      true,
    );
    assert.equal(
      sessionDetailHookSource.includes(
        'resolveSessionOfferingSourceIds(offering).groupSessionIds[0]',
      ),
      false,
    );
    assert.equal(sessionDetailHookSource.includes('groupSessionService.register('), true);
    assert.equal(
      sessionDetailHookSource.includes("currentUser.name || currentUser.fullName || 'Athlete'"),
      false,
    );
    assert.equal(sessionDetailHookSource.includes('Routes.bookCoach(offering.coachId'), true);
    assert.ok(
      sessionDetailHookSource.indexOf('groupSessionService.register(') <
        sessionDetailHookSource.indexOf('Routes.bookCoach(offering.coachId'),
      'group session registration branch should run before direct booking navigation',
    );
  });
});
