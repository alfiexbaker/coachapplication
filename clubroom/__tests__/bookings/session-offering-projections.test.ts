import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import type {
  GroupRegistration,
  GroupSession,
  SessionOffering,
} from '@/constants/types';
import {
  GROUP_SESSION_OFFERING_PREFIX,
  buildGroupSessionOfferingId,
  extractGroupSessionIdFromOfferingId,
  isGroupSessionRelevantToViewer,
  isOfferingVisibleToCoachUser,
  mapGroupSessionToOffering,
  normalizeSessionOfferingSource,
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
    assert.equal(
      isOfferingVisibleToCoachUser({ ...base, ownerCoachId: coachId }, coachId),
      true,
    );
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

  test('group session projection is source-tagged and route-safe', () => {
    const session = makeGroupSession({ id: 'gs_proj', assigneeCoachId: 'coach_assignee' });
    const projected = mapGroupSessionToOffering(
      session,
      [makeRegistration({ sessionId: 'gs_proj', athleteId: 'child_x' })],
      new Date('2026-03-01T00:00:00Z'),
    );

    assert.ok(projected);
    assert.equal(projected?.source, 'group');
    assert.equal(projected?.sourceEntityId, 'gs_proj');
    assert.equal(projected?.id, `${GROUP_SESSION_OFFERING_PREFIX}gs_proj`);
  });
});
