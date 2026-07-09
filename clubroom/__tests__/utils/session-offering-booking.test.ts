import assert from 'node:assert/strict';
import test from 'node:test';

import type { GroupSession, SessionOffering } from '../../constants/session-types';
import {
  buildDiscoverSessionSections,
  buildSessionOfferingCategories,
  filterSessionOfferingsByCategory,
  getFixedScheduleFromOffering,
  getSessionOfferingCategoryLabel,
  sortSessionOfferingsForBooking,
} from '../../utils/session-offering-booking';

function buildOffering(
  overrides: Partial<SessionOffering> & Pick<SessionOffering, 'id' | 'title'>,
): SessionOffering {
  return {
    id: overrides.id,
    coachId: overrides.coachId ?? 'coach_1',
    title: overrides.title,
    description: overrides.description,
    sessionType: overrides.sessionType ?? '1on1',
    maxParticipants: overrides.maxParticipants ?? 1,
    location: overrides.location ?? 'Main Pitch',
    scheduledAt: overrides.scheduledAt ?? '2026-04-01T18:00:00.000Z',
    isRecurring: overrides.isRecurring ?? false,
    recurrenceType: overrides.recurrenceType ?? 'none',
    status: overrides.status ?? 'active',
    registrations: overrides.registrations ?? [],
    createdAt: overrides.createdAt ?? '2026-03-01T12:00:00.000Z',
    price: overrides.price,
    duration: overrides.duration,
    dayOfWeek: overrides.dayOfWeek,
    timeOfDay: overrides.timeOfDay,
    source: overrides.source,
    sourceEntityId: overrides.sourceEntityId,
    clubId: overrides.clubId,
    actingAs: overrides.actingAs,
    commercialMode: overrides.commercialMode,
    ownerCoachId: overrides.ownerCoachId,
    assigneeCoachId: overrides.assigneeCoachId,
    createdByUserId: overrides.createdByUserId,
    createdByRole: overrides.createdByRole,
    venueName: overrides.venueName,
    ageMin: overrides.ageMin,
    ageMax: overrides.ageMax,
    footballSkill: overrides.footballSkill,
    visibility: overrides.visibility,
    inviteType: overrides.inviteType,
  };
}

function buildGroupSession(
  overrides: Partial<GroupSession> & Pick<GroupSession, 'id' | 'title'>,
): GroupSession {
  return {
    id: overrides.id,
    coachId: overrides.coachId ?? 'coach_1',
    title: overrides.title,
    description: overrides.description ?? 'Training session',
    sessionType: overrides.sessionType ?? 'TRAINING',
    schedule: overrides.schedule ?? [{ date: '2026-04-02', startTime: '18:00', endTime: '19:00' }],
    maxParticipants: overrides.maxParticipants ?? 12,
    currentParticipants: overrides.currentParticipants ?? 0,
    offPlatformParticipants: overrides.offPlatformParticipants,
    waitlistEnabled: overrides.waitlistEnabled ?? true,
    waitlistCount: overrides.waitlistCount ?? 0,
    pricePerParticipant: overrides.pricePerParticipant ?? 10,
    currency: overrides.currency ?? 'GBP',
    location: overrides.location ?? 'Main Pitch',
    isVirtual: overrides.isVirtual ?? false,
    status: overrides.status ?? 'PUBLISHED',
    createdAt: overrides.createdAt ?? '2026-03-01T12:00:00.000Z',
    clubId: overrides.clubId,
    inviteType: overrides.inviteType,
  };
}

test('buildSessionOfferingCategories creates coach-facing filters with All-compatible categories', () => {
  const offerings = [
    buildOffering({
      id: 'one',
      title: '1-to-1 Technical',
      sessionType: '1on1',
      maxParticipants: 1,
    }),
    buildOffering({ id: 'two', title: 'Pair Session', sessionType: 'group', maxParticipants: 2 }),
    buildOffering({ id: 'three', title: 'Small Group', sessionType: 'group', maxParticipants: 4 }),
    buildOffering({
      id: 'four',
      title: 'Academy Group',
      sessionType: 'group',
      maxParticipants: 10,
    }),
  ];

  assert.deepEqual(
    buildSessionOfferingCategories(offerings).map((category) => ({
      id: category.id,
      label: category.label,
      count: category.count,
    })),
    [
      { id: 'one-to-one', label: '1-to-1', count: 1 },
      { id: 'pairs', label: 'Pairs', count: 1 },
      { id: 'small-groups', label: 'Small Groups', count: 1 },
      { id: 'groups', label: 'Groups', count: 1 },
    ],
  );
});

test('filterSessionOfferingsByCategory keeps all sessions visible from the All Sessions entrypoint', () => {
  const offerings = [
    buildOffering({ id: 'one', title: '1-to-1 Technical', sessionType: '1on1' }),
    buildOffering({ id: 'two', title: 'Pair Session', sessionType: 'group', maxParticipants: 2 }),
  ];

  assert.equal(filterSessionOfferingsByCategory(offerings, 'all').length, 2);
  assert.equal(filterSessionOfferingsByCategory(offerings, 'pairs')[0]?.id, 'two');
});

test('sortSessionOfferingsForBooking keeps private sessions first, then sorts upcoming sessions cleanly', () => {
  const offerings = [
    buildOffering({
      id: 'later-1on1',
      title: '1-to-1 Later',
      sessionType: '1on1',
      scheduledAt: '2026-04-03T18:00:00.000Z',
    }),
    buildOffering({
      id: 'earlier-1on1',
      title: '1-to-1 Earlier',
      sessionType: '1on1',
      scheduledAt: '2026-04-01T18:00:00.000Z',
    }),
    buildOffering({
      id: 'pair-session',
      title: 'Pair Session',
      sessionType: 'group',
      maxParticipants: 2,
      scheduledAt: '2026-04-01T12:00:00.000Z',
    }),
  ];

  assert.deepEqual(
    sortSessionOfferingsForBooking(offerings).map((offering) => offering.id),
    ['earlier-1on1', 'later-1on1', 'pair-session'],
  );
});

test('getSessionOfferingCategoryLabel returns the short filter label used in the booking catalog', () => {
  assert.equal(
    getSessionOfferingCategoryLabel(
      buildOffering({
        id: 'pair-session',
        title: 'Pair Session',
        sessionType: 'group',
        maxParticipants: 2,
      }),
    ),
    'Pairs',
  );
});

test('getFixedScheduleFromOffering returns the next bookable recurring slot for catalog sorting', () => {
  const recurring = buildOffering({
    id: 'weekly-lab',
    title: 'Weekly Lab',
    sessionType: 'group',
    maxParticipants: 6,
    isRecurring: true,
    recurrenceType: 'weekly',
    dayOfWeek: 5,
    timeOfDay: '18:30',
    scheduledAt: '2026-03-01T18:30:00.000Z',
  });

  const fixedSchedule = getFixedScheduleFromOffering(recurring);

  assert.ok(fixedSchedule);
  assert.equal(fixedSchedule?.slot, '18:30');
});

test('buildDiscoverSessionSections shows each group session once across discover sections', () => {
  const duplicateCandidate = buildOffering({
    id: 'group_session_offering:gs_mixed_this_week',
    title: 'Mixed Club Session',
    sessionType: 'group',
    maxParticipants: 12,
    scheduledAt: '2026-04-02T18:00:00.000Z',
    source: 'group',
    sourceEntityId: 'gs_mixed_this_week',
    clubId: 'club_1',
    inviteType: 'OPEN',
  });
  const laterClubOffering = buildOffering({
    id: 'group_session_offering:gs_club_later',
    title: 'Club Session Later',
    sessionType: 'group',
    maxParticipants: 12,
    scheduledAt: '2026-04-20T18:00:00.000Z',
    source: 'group',
    sourceEntityId: 'gs_club_later',
    clubId: 'club_1',
    inviteType: 'CLOSED',
  });
  const laterOpenOffering = buildOffering({
    id: 'group_session_offering:gs_open_later',
    title: 'Open Session Later',
    sessionType: 'group',
    maxParticipants: 12,
    scheduledAt: '2026-04-20T18:00:00.000Z',
    source: 'group',
    sourceEntityId: 'gs_open_later',
    inviteType: 'OPEN',
  });

  const sections = buildDiscoverSessionSections({
    offerings: [duplicateCandidate, laterClubOffering, laterOpenOffering],
    groupSessions: [
      buildGroupSession({
        id: 'gs_mixed_this_week',
        title: 'Mixed Club Session',
        clubId: 'club_1',
        inviteType: 'OPEN',
      }),
      buildGroupSession({
        id: 'gs_club_later',
        title: 'Club Session Later',
        clubId: 'club_1',
        inviteType: 'CLOSED',
      }),
      buildGroupSession({
        id: 'gs_open_later',
        title: 'Open Session Later',
        inviteType: 'OPEN',
      }),
    ],
    now: new Date('2026-04-01T09:00:00.000Z'),
  });

  assert.deepEqual(
    sections.thisWeekOfferings.map((offering) => offering.sourceEntityId),
    ['gs_mixed_this_week'],
  );
  assert.deepEqual(
    sections.clubSessions.map((session) => session.id),
    ['gs_club_later'],
  );
  assert.deepEqual(
    sections.openSessions.map((offering) => offering.sourceEntityId),
    ['gs_open_later'],
  );
});
