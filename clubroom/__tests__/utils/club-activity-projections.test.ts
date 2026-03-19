import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import type { ClubEvent } from '@/constants/event-types';
import type { GroupSession } from '@/constants/session-types';
import {
  buildClubActivities,
  mapEventToClubActivity,
  mapGroupSessionToClubActivity,
} from '@/utils/club-activity-projections';

function makeEvent(overrides: Partial<ClubEvent> = {}): ClubEvent {
  return {
    id: 'event_1',
    clubId: 'club_1',
    createdBy: 'coach_1',
    title: 'Parent Presentation',
    description: 'Season briefing',
    eventType: 'PRESENTATION',
    date: '2026-03-21',
    startTime: '18:00',
    venue: 'Clubhouse',
    isVirtual: false,
    targetAudience: 'ALL',
    price: 0,
    currency: 'GBP',
    rsvpRequired: true,
    attendees: [],
    status: 'PUBLISHED',
    createdAt: '2026-03-01T10:00:00Z',
    ...overrides,
  };
}

function makeSession(overrides: Partial<GroupSession> = {}): GroupSession {
  return {
    id: 'session_1',
    coachId: 'coach_1',
    clubId: 'club_1',
    title: 'Club Training',
    description: 'Sharp passing work',
    sessionType: 'TRAINING',
    schedule: [{ date: '2026-03-22', startTime: '18:00', endTime: '19:00' }],
    maxParticipants: 18,
    currentParticipants: 8,
    waitlistEnabled: true,
    waitlistCount: 0,
    pricePerParticipant: 0,
    currency: 'GBP',
    location: 'Main Pitch',
    isVirtual: false,
    status: 'PUBLISHED',
    createdAt: '2026-03-01T10:00:00Z',
    inviteType: 'CLOSED',
    ...overrides,
  };
}

describe('club activity projections', () => {
  test('maps informational club events into club activities', () => {
    const activity = mapEventToClubActivity(makeEvent());

    assert.equal(activity.kind, 'informational');
    assert.equal(activity.accessScope, 'club');
    assert.equal(activity.accessLabel, 'Whole club');
    assert.equal(activity.participationMode, 'rsvp');
    assert.equal(activity.participationLabel, 'RSVP');
  });

  test('maps club-linked open training into mixed-access activity', () => {
    const activity = mapGroupSessionToClubActivity(
      makeSession({
        id: 'session_mixed',
        inviteType: 'OPEN',
      }),
      new Date('2026-03-01T00:00:00Z'),
    );

    assert.ok(activity);
    assert.equal(activity?.kind, 'training');
    assert.equal(activity?.accessScope, 'mixed');
    assert.equal(activity?.accessLabel, 'Club + outside athletes');
    assert.equal(activity?.allowsExternalRegistration, true);
  });

  test('maps squad training into private squad activity', () => {
    const activity = mapGroupSessionToClubActivity(
      makeSession({
        id: 'session_squad',
        squadId: 'squad_7',
        inviteType: 'SQUAD_ONLY',
        sessionType: 'TEAM_TRAINING',
      }),
      new Date('2026-03-01T00:00:00Z'),
    );

    assert.ok(activity);
    assert.equal(activity?.accessScope, 'squad');
    assert.equal(activity?.accessLabel, 'Squad only');
    assert.equal(activity?.typeLabel, 'Team Training');
  });

  test('buildClubActivities sorts events and training into one timeline', () => {
    const activities = buildClubActivities({
      events: [makeEvent({ date: '2026-03-20' })],
      sessions: [makeSession({ schedule: [{ date: '2026-03-21', startTime: '09:00', endTime: '10:00' }] })],
      now: new Date('2026-03-01T00:00:00Z'),
    });

    assert.equal(activities.length, 2);
    assert.equal(activities[0]?.source, 'club_event');
    assert.equal(activities[1]?.source, 'group_session');
  });
});
