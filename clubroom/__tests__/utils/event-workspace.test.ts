import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import type { ClubEvent, EventRSVP } from '@/constants/types';
import { getEventWorkspaceState } from '@/utils/event-workspace';

function makeEvent(overrides: Partial<ClubEvent> = {}): ClubEvent {
  return {
    id: 'event_1',
    clubId: 'club_1',
    createdBy: 'coach_1',
    title: 'Club Presentation',
    description: 'Season briefing',
    eventType: 'PRESENTATION',
    date: '2099-03-20',
    startTime: '18:00',
    endTime: '19:30',
    venue: 'Clubhouse',
    isVirtual: false,
    targetAudience: 'ALL',
    price: 0,
    currency: 'GBP',
    rsvpRequired: true,
    rsvpDeadline: '2099-03-19',
    attendees: [
      {
        userId: 'parent_1',
        userRole: 'PARENT',
        status: 'GOING',
        guestCount: 0,
        respondedAt: '2026-03-18T10:00:00.000Z',
      },
      {
        userId: 'parent_2',
        userRole: 'PARENT',
        status: 'MAYBE',
        guestCount: 0,
        respondedAt: '2026-03-18T11:00:00.000Z',
      },
    ],
    status: 'PUBLISHED',
    createdAt: '2026-03-15T09:00:00.000Z',
    ...overrides,
  };
}

function makeRsvp(overrides: Partial<EventRSVP> = {}): EventRSVP {
  return {
    id: 'rsvp_1',
    eventId: 'event_1',
    userId: 'parent_2',
    userRole: 'PARENT',
    status: 'MAYBE',
    guestCount: 0,
    respondedAt: '2026-03-18T11:00:00.000Z',
    ...overrides,
  };
}

describe('event workspace utilities', () => {
  test('builds response summary and reminder count from event data', () => {
    const state = getEventWorkspaceState(makeEvent(), [makeRsvp()]);

    assert.equal(state.responseSummaryLabel, "1 going · 1 maybe · 0 can't go");
    assert.equal(state.reminderTargetCount, 1);
    assert.equal(state.canShareRecap, false);
  });

  test('allows recap handoff once a published event has ended', () => {
    const event = makeEvent({
      date: '2020-03-20',
      startTime: '18:00',
      endTime: '19:30',
    });

    const state = getEventWorkspaceState(event, [makeRsvp()]);

    assert.equal(state.canShareRecap, true);
  });

  test('blocks recap handoff when nobody attended', () => {
    const event = makeEvent({
      date: '2020-03-20',
      attendees: [],
    });

    const state = getEventWorkspaceState(event, []);

    assert.equal(state.canShareRecap, false);
  });
});
