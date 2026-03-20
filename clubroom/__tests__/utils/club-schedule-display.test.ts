import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import type { ClubActivity } from '@/constants/types';
import {
  filterClubScheduleActivities,
  groupClubScheduleActivitiesByDay,
} from '@/utils/club-schedule-display';

function makeActivity(overrides: Partial<ClubActivity> = {}): ClubActivity {
  return {
    id: 'club_activity:club_event:event_1',
    source: 'club_event',
    sourceEntityId: 'event_1',
    clubId: 'club_1',
    title: 'Club Event',
    startsAt: '2026-03-20T18:00:00.000Z',
    status: 'scheduled',
    kind: 'informational',
    typeLabel: 'Presentation',
    participationMode: 'rsvp',
    participationLabel: 'RSVP',
    accessScope: 'club',
    accessLabel: 'Whole club',
    audienceLabel: 'Whole club',
    locationLabel: 'Clubhouse',
    isVirtual: false,
    squadIds: [],
    allowsExternalRegistration: false,
    ...overrides,
  };
}

describe('club schedule display utilities', () => {
  test('filters matches distinctly from other club activities', () => {
    const activities: ClubActivity[] = [
      makeActivity(),
      makeActivity({
        id: 'club_activity:match:match_1',
        source: 'match',
        sourceEntityId: 'match_1',
        kind: 'match',
        participationMode: 'availability',
        participationLabel: 'Availability & lineup',
        typeLabel: 'League Match',
        startsAt: '2026-03-21T10:00:00.000Z',
      }),
    ];

    const filtered = filterClubScheduleActivities(
      activities,
      'matches',
      new Date('2026-03-19T00:00:00.000Z'),
    );

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.source, 'match');
  });

  test('groups filtered activities into day sections', () => {
    const activities = filterClubScheduleActivities(
      [
        makeActivity({ id: 'one', startsAt: '2026-03-20T18:00:00.000Z' }),
        makeActivity({ id: 'two', startsAt: '2026-03-20T20:00:00.000Z' }),
        makeActivity({ id: 'three', startsAt: '2026-03-21T09:00:00.000Z' }),
      ],
      'all',
      new Date('2026-03-19T00:00:00.000Z'),
    );

    const groups = groupClubScheduleActivitiesByDay(activities);

    assert.equal(groups.length, 2);
    assert.equal(groups[0]?.items.length, 2);
    assert.equal(groups[1]?.items.length, 1);
  });

  test('puts upcoming items ahead of completed items in all view', () => {
    const activities = filterClubScheduleActivities(
      [
        makeActivity({
          id: 'completed',
          startsAt: '2026-03-18T18:00:00.000Z',
          status: 'completed',
        }),
        makeActivity({
          id: 'upcoming',
          startsAt: '2026-03-21T18:00:00.000Z',
          status: 'scheduled',
        }),
      ],
      'all',
      new Date('2026-03-19T00:00:00.000Z'),
    );

    assert.equal(activities[0]?.id, 'upcoming');
    assert.equal(activities[1]?.id, 'completed');
  });
});
