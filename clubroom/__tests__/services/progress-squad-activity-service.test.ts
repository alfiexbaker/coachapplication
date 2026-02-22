import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { Booking } from '@/constants/app-types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { BadgeAward, SquadMember, User } from '@/constants/types';
import { apiClient } from '@/services/api-client';
import type { SessionFeedback } from '@/services/progress/progress-feedback-service';
import type { PracticeLogEntry } from '@/services/progress/progress-practice-log-service';
import { progressSquadActivityService } from '@/services/progress/progress-squad-activity-service';

describe('progressSquadActivityService', () => {
  beforeEach(async () => {
    await Promise.all([
      apiClient.remove(STORAGE_KEYS.SQUAD_MEMBERS),
      apiClient.remove(STORAGE_KEYS.BOOKINGS),
      apiClient.remove(STORAGE_KEYS.SESSION_FEEDBACK),
      apiClient.remove(STORAGE_KEYS.BADGE_AWARDS),
      apiClient.remove(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS),
      apiClient.remove(STORAGE_KEYS.USERS),
    ]);
  });

  it('builds a real-time squad feed from bookings, badges, feedback, and practice logs', async () => {
    const now = new Date('2026-02-21T18:00:00.000Z');

    const users: User[] = [
      {
        id: 'athlete_feed_self',
        email: 'self@example.com',
        role: 'USER',
        name: 'Kai Brooks',
        postcode: 'E1 1AA',
        dateOfBirth: '2012-01-01',
      },
      {
        id: 'athlete_feed_peer',
        email: 'peer@example.com',
        role: 'USER',
        name: 'Riley Stone',
        postcode: 'E2 2BB',
        dateOfBirth: '2012-02-01',
      },
    ];
    const members: SquadMember[] = [
      {
        id: 'member_self',
        squadId: 'squad_feed_1',
        athleteId: 'athlete_feed_self',
        parentId: 'parent_self',
        status: 'ACTIVE',
        joinedAt: '2026-01-01T12:00:00.000Z',
      },
      {
        id: 'member_peer',
        squadId: 'squad_feed_1',
        athleteId: 'athlete_feed_peer',
        parentId: 'parent_peer',
        status: 'ACTIVE',
        joinedAt: '2026-01-02T12:00:00.000Z',
      },
    ];
    const bookings: Booking[] = [
      {
        id: 'booking_feed_recent',
        coachId: 'coach_feed_1',
        coachName: 'Coach Feed',
        athleteIds: ['athlete_feed_peer'],
        athleteNames: ['Riley Stone'],
        athleteId: 'athlete_feed_peer',
        status: 'COMPLETED',
        scheduledAt: '2026-02-21T09:00:00.000Z',
        duration: 60,
        location: 'Main Pitch',
        service: 'Team Training',
        serviceType: 'GROUP',
      },
    ];
    const feedback: SessionFeedback[] = [
      {
        id: 'feedback_feed_visible',
        sessionId: 'session_feed_1',
        coachId: 'coach_feed_1',
        coachName: 'Coach Feed',
        athleteId: 'athlete_feed_peer',
        athleteName: 'Riley Stone',
        createdAt: '2026-02-20T18:00:00.000Z',
        publicSummary: 'Great intensity in transitions.',
        skillsWorkedOn: ['Pressing'],
        skillRatings: [],
        improvements: '',
        homework: '',
        effortRating: 4,
        overallPerformance: 4,
        visibility: 'parent',
      },
      {
        id: 'feedback_feed_hidden',
        sessionId: 'session_feed_2',
        coachId: 'coach_feed_1',
        coachName: 'Coach Feed',
        athleteId: 'athlete_feed_peer',
        athleteName: 'Riley Stone',
        createdAt: '2026-02-20T19:00:00.000Z',
        publicSummary: 'Coach-only note should not leak.',
        skillsWorkedOn: ['Shape'],
        skillRatings: [],
        improvements: '',
        homework: '',
        effortRating: 4,
        overallPerformance: 4,
        visibility: 'coach_only',
      },
    ];
    const badgeAwards: BadgeAward[] = [
      {
        id: 'award_feed_1',
        badgeId: 'badge_best_training',
        badgeLabel: 'Standout Session',
        athleteId: 'athlete_feed_peer',
        coachId: 'coach_feed_1',
        sessionId: 'session_feed_1',
        reason: 'Top pressing effort',
        awardedBy: 'coach_feed_1',
        awardedAt: '2026-02-21T10:00:00.000Z',
        visibility: 'supporters',
      },
    ];
    const practiceLogs: PracticeLogEntry[] = [
      {
        id: 'practice_feed_1',
        athleteId: 'athlete_feed_self',
        dateKey: '2026-02-21',
        minutes: 30,
        createdAt: '2026-02-21T07:00:00.000Z',
      },
    ];

    await Promise.all([
      apiClient.set(STORAGE_KEYS.USERS, users),
      apiClient.set(STORAGE_KEYS.SQUAD_MEMBERS, members),
      apiClient.set(STORAGE_KEYS.BOOKINGS, bookings),
      apiClient.set(STORAGE_KEYS.SESSION_FEEDBACK, feedback),
      apiClient.set(STORAGE_KEYS.BADGE_AWARDS, badgeAwards),
      apiClient.set(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS, practiceLogs),
    ]);

    const result = await progressSquadActivityService.getFeedForAthlete({
      athleteId: 'athlete_feed_self',
      now,
      lookbackDays: 30,
      limit: 20,
    });

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.data.squadIds.length, 1);
    assert.equal(result.data.summary.peerCount, 1);
    assert.ok(result.data.items.some((item) => item.type === 'session_completed'));
    assert.ok(result.data.items.some((item) => item.type === 'badge_earned'));
    assert.ok(result.data.items.some((item) => item.type === 'feedback_received'));
    assert.ok(result.data.items.some((item) => item.type === 'practice_logged'));
    assert.ok(
      !result.data.items.some((item) => item.id === 'feedback:feedback_feed_hidden'),
      'coach-only feedback should not appear in squad feed',
    );
  });

  it('returns an empty feed when athlete is not in any active squad', async () => {
    const result = await progressSquadActivityService.getFeedForAthlete({
      athleteId: 'athlete_without_squad',
    });

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.data.items.length, 0);
    assert.equal(result.data.summary.totalItems, 0);
    assert.equal(result.data.summary.peerCount, 0);
  });
});
