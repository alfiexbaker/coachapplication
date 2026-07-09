import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import type { GroupSession } from '@/constants/session-types';
import { getGroupSessionClubLabel, getGroupSessionCoachName } from '@/utils/group-display';

function makeSession(overrides: Partial<GroupSession> = {}): GroupSession {
  return {
    id: 'session_1',
    coachId: 'usr_1234567',
    clubId: 'clb_1234567',
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
    ...overrides,
  };
}

describe('group session display labels', () => {
  test('uses resolved coach and club names instead of internal identifiers', () => {
    const session = makeSession({
      coachName: 'Sam Taylor',
      clubName: 'Eastside FC',
    });

    assert.equal(getGroupSessionCoachName(session), 'Sam Taylor');
    assert.equal(getGroupSessionClubLabel(session), 'Eastside FC');
  });

  test('does not show internal ids when resolved labels are absent', () => {
    const session = makeSession();

    assert.equal(getGroupSessionCoachName(session), 'Coach');
    assert.equal(getGroupSessionClubLabel(session), 'Club session');
  });
});
