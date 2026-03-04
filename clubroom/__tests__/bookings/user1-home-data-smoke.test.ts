import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { Booking, User } from '@/constants/app-types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { badgeService } from '@/services/badge-service';
import { bookingService } from '@/services/booking-service';
import { ensureProgressDemoSeeded } from '@/services/progress/progress-demo-seed-lazy-service';
import { progressService } from '@/services/progress-service';
import { ensureRelationalDemoSeeded } from '@/services/relational-demo-seed-service';

const RELATIONAL_DEMO_FALLBACK_CLUB_ID = 'club_lions';
const CLUB_MEMBERS_KEY = `${STORAGE_KEYS.CLUB_MEMBERS}_${RELATIONAL_DEMO_FALLBACK_CLUB_ID}`;

const RESET_KEYS = [
  STORAGE_KEYS.RELATIONAL_DEMO_SEED_VERSION,
  STORAGE_KEYS.USERS,
  STORAGE_KEYS.BOOKINGS,
  STORAGE_KEYS.SESSION_OFFERINGS,
  STORAGE_KEYS.SESSION_INVITES,
  STORAGE_KEYS.COACH_SESSIONS,
  STORAGE_KEYS.ROSTER,
  STORAGE_KEYS.FAVOURITES,
  STORAGE_KEYS.MESSAGES,
  STORAGE_KEYS.REVIEWS,
  STORAGE_KEYS.CLUB_SQUADS,
  STORAGE_KEYS.SQUAD_MEMBERS,
  CLUB_MEMBERS_KEY,
  STORAGE_KEYS.CHILDREN_PROFILES,
  STORAGE_KEYS.FAMILY_MEMBERS,
  STORAGE_KEYS.FAMILY_BOOKINGS,
  'coach_reviews',
  'clubroom.coach_reviews',
  'coach_bookings',
  STORAGE_KEYS.SESSION_FEEDBACK,
  STORAGE_KEYS.SKILL_LEVELS,
  STORAGE_KEYS.GOALS,
  STORAGE_KEYS.BADGE_AWARDS,
  STORAGE_KEYS.SESSION_JOURNAL,
] as const;

interface ChildProfileRecord {
  id: string;
  parentId: string;
}

describe('user1 home data smoke', () => {
  beforeEach(async () => {
    await Promise.all(RESET_KEYS.map((key) => apiClient.remove(key)));
  });

  it('seeds non-empty progress and upcoming bookings for both user1 child profiles', async () => {
    await ensureRelationalDemoSeeded({ force: true });

    const kidASeed = await ensureProgressDemoSeeded('child_user1_a', 'Kid F');
    const kidBSeed = await ensureProgressDemoSeeded('child_user1_b', 'Kid L');

    assert.equal(kidASeed.success, true);
    assert.equal(kidBSeed.success, true);

    const [progressA, progressB, badgesA, badgesB, bookings, users, childProfiles] = await Promise.all([
      progressService.getAthleteProgress('child_user1_a', 'parent'),
      progressService.getAthleteProgress('child_user1_b', 'parent'),
      badgeService.listAwardsForAthlete('child_user1_a'),
      badgeService.listAwardsForAthlete('child_user1_b'),
      bookingService.getBookingsForUser('user1', 'parent'),
      apiClient.get<User[]>(STORAGE_KEYS.USERS, []),
      apiClient.get<ChildProfileRecord[]>(STORAGE_KEYS.CHILDREN_PROFILES, []),
    ]);

    assert.ok(progressA.totalSessions > 0, 'child_user1_a should have progress sessions');
    assert.ok(progressB.totalSessions > 0, 'child_user1_b should have progress sessions');
    assert.ok(progressA.totalBadges > 0, 'child_user1_a should have badges in stats');
    assert.ok(progressB.totalBadges > 0, 'child_user1_b should have badges in stats');
    assert.ok(badgesA.length > 0, 'child_user1_a should have badge awards');
    assert.ok(badgesB.length > 0, 'child_user1_b should have badge awards');

    const now = Date.now();
    const upcomingConfirmed = bookings.filter(
      (booking) =>
        booking.status === 'CONFIRMED' &&
        new Date(booking.scheduledAt).getTime() > now,
    );

    const hasUpcomingForKidA = upcomingConfirmed.some(
      (booking) =>
        booking.athleteId === 'child_user1_a' || booking.athleteIds?.includes('child_user1_a'),
    );
    const hasUpcomingForKidB = upcomingConfirmed.some(
      (booking) =>
        booking.athleteId === 'child_user1_b' || booking.athleteIds?.includes('child_user1_b'),
    );

    assert.equal(hasUpcomingForKidA, true, 'user1 should have upcoming confirmed booking for child_user1_a');
    assert.equal(hasUpcomingForKidB, true, 'user1 should have upcoming confirmed booking for child_user1_b');

    const userIds = new Set(users.map((user) => user.id));
    assert.equal(userIds.has('user1'), true);
    assert.equal(userIds.has('user_no_kids'), true);
    assert.equal(userIds.has('user_club_linked'), true);
    assert.equal(userIds.has('parent_nokids'), true);

    const hasUser1Kids = childProfiles.some((profile) => profile.parentId === 'user1');
    const hasNoKidsProfileForParentNoKids = childProfiles.some(
      (profile) => profile.parentId === 'parent_nokids',
    );

    assert.equal(hasUser1Kids, true, 'user1 should have linked child profiles');
    assert.equal(
      hasNoKidsProfileForParentNoKids,
      false,
      'parent_nokids should not have linked child profiles',
    );
  });

  it('keeps no-kids account with no parent-role bookings', async () => {
    await ensureRelationalDemoSeeded({ force: true });

    const noKidsBookings = (await bookingService.getBookingsForUser('user_no_kids', 'parent')).filter(
      (booking: Booking) => booking.bookedById === 'user_no_kids',
    );

    assert.equal(noKidsBookings.length, 1);
    assert.equal(noKidsBookings[0]?.athleteId, 'user_no_kids');
  });
});
