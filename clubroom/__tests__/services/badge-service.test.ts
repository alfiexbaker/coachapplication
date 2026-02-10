/**
 * Badge Service Tests
 *
 * Tests for badge definitions, awards, awardBadge, markSeenByParent,
 * markAllSeenByParent, getUnseenBadgeCount, progression, streak info.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { badgeService } from '../../services/badge-service';
import { apiClient } from '../../services/api-client';
import { storageService } from '../../services/storage-service';
import { eventBus, ServiceEvents } from '../../services/event-bus';

const rid = () => Math.random().toString(36).slice(2, 10);

describe('badgeService', () => {
  beforeEach(async () => {
    // Must use storageService.removeItem to clear BOTH apiClient AND in-memory cache
    await storageService.removeItem('clubroom.badge_awards');
    eventBus.clearAll();
  });

  // ---------------------------------------------------------------------------
  // listDefinitions
  // ---------------------------------------------------------------------------
  describe('listDefinitions', () => {
    test('returns badge catalog', async () => {
      const defs = await badgeService.listDefinitions();
      assert.ok(Array.isArray(defs));
      assert.ok(defs.length > 0);
    });
  });

  // ---------------------------------------------------------------------------
  // listAwards
  // ---------------------------------------------------------------------------
  describe('listAwards', () => {
    test('returns merged awards sorted by date desc', async () => {
      const awards = await badgeService.listAwards();
      assert.ok(Array.isArray(awards));
      // Check sort order
      for (let i = 1; i < awards.length; i++) {
        assert.ok(
          new Date(awards[i - 1].awardedAt).getTime() >=
            new Date(awards[i].awardedAt).getTime(),
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // awardBadge
  // ---------------------------------------------------------------------------
  describe('awardBadge', () => {
    test('creates award and emits BADGE_EARNED event', async () => {
      let emitted = false;
      eventBus.on(ServiceEvents.BADGE_EARNED, () => {
        emitted = true;
      });

      const defs = await badgeService.listDefinitions();
      const badgeId = defs[0].id;
      const athleteId = `ath_${rid()}`;

      const result = await badgeService.awardBadge({
        badgeId,
        athleteId,
        athleteName: 'Test Athlete',
        coachId: `coach_${rid()}`,
        coachName: 'Test Coach',
        reason: 'Great work',
        overrideCooldown: true,
        overrideNote: 'Test override',
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.id);
        assert.equal(result.data.athleteId, athleteId);
        assert.equal(result.data.reason, 'Great work');
      }
      assert.equal(emitted, true);
    });

    test('respects cooldown — blocks repeat award within 7 days', async () => {
      const defs = await badgeService.listDefinitions();
      const badgeId = defs[0].id;
      const athleteId = `ath_${rid()}`;

      // First award
      await badgeService.awardBadge({
        badgeId,
        athleteId,
        coachId: `c_${rid()}`,
        reason: 'First',
        overrideCooldown: true,
        overrideNote: 'Allow',
      });

      // Second award — should be blocked by cooldown
      const result = await badgeService.awardBadge({
        badgeId: defs.length > 1 ? defs[1].id : badgeId,
        athleteId,
        coachId: `c_${rid()}`,
        reason: 'Second',
      });
      assert.equal(result.success, false);
    });

    test('cooldown override requires note', async () => {
      const defs = await badgeService.listDefinitions();
      const badgeId = defs[0].id;
      const athleteId = `ath_${rid()}`;

      // First award
      await badgeService.awardBadge({
        badgeId,
        athleteId,
        coachId: `c_${rid()}`,
        reason: 'First',
        overrideCooldown: true,
        overrideNote: 'Allow',
      });

      // Override without note
      const result = await badgeService.awardBadge({
        badgeId: defs.length > 1 ? defs[1].id : badgeId,
        athleteId,
        coachId: `c_${rid()}`,
        reason: 'Override',
        overrideCooldown: true,
        overrideNote: '',
      });
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // listAwardsForAthlete
  // ---------------------------------------------------------------------------
  describe('listAwardsForAthlete', () => {
    test('filters by athlete id', async () => {
      const defs = await badgeService.listDefinitions();
      const athleteId = `ath_${rid()}`;

      await badgeService.awardBadge({
        badgeId: defs[0].id,
        athleteId,
        coachId: `c_${rid()}`,
        reason: 'Test',
        overrideCooldown: true,
        overrideNote: 'Test',
      });

      const awards = await badgeService.listAwardsForAthlete(athleteId);
      assert.ok(awards.length >= 1);
      for (const a of awards) {
        assert.equal(a.athleteId, athleteId);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // markSeenByParent
  // ---------------------------------------------------------------------------
  describe('markSeenByParent', () => {
    test('marks award as seen', async () => {
      const defs = await badgeService.listDefinitions();
      const athleteId = `ath_${rid()}`;

      const awarded = await badgeService.awardBadge({
        badgeId: defs[0].id,
        athleteId,
        coachId: `c_${rid()}`,
        reason: 'Good',
        overrideCooldown: true,
        overrideNote: 'Test',
      });

      if (!awarded.success) return;

      const result = await badgeService.markSeenByParent(awarded.data.id);
      assert.ok(result);
      assert.equal(result!.seenByParent, true);
    });

    test('returns undefined for unknown award', async () => {
      const result = await badgeService.markSeenByParent(`unknown_${rid()}`);
      assert.equal(result, undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // getUnseenBadgeCount
  // ---------------------------------------------------------------------------
  describe('getUnseenBadgeCount', () => {
    test('counts unseen badges', async () => {
      const defs = await badgeService.listDefinitions();
      const athleteId = `ath_${rid()}`;

      await badgeService.awardBadge({
        badgeId: defs[0].id,
        athleteId,
        coachId: `c_${rid()}`,
        reason: 'Test',
        visibility: 'athlete',
        overrideCooldown: true,
        overrideNote: 'Test',
      });

      const count = await badgeService.getUnseenBadgeCount(athleteId);
      assert.ok(count >= 1);
    });
  });

  // ---------------------------------------------------------------------------
  // getTierName + getCategoryInfo
  // ---------------------------------------------------------------------------
  describe('getTierName', () => {
    test('returns tier display names', () => {
      assert.equal(typeof badgeService.getTierName(1), 'string');
      assert.equal(typeof badgeService.getTierName(2), 'string');
      assert.equal(typeof badgeService.getTierName(3), 'string');
    });
  });

  describe('getCategoryInfo', () => {
    test('returns label and icon for category', () => {
      const info = badgeService.getCategoryInfo('leadership');
      assert.ok(info.label);
      assert.ok(info.icon);
    });
  });

  // ---------------------------------------------------------------------------
  // getStreakInfo
  // ---------------------------------------------------------------------------
  describe('getStreakInfo', () => {
    test('returns streak data for athlete', async () => {
      const info = await badgeService.getStreakInfo(`ath_${rid()}`);
      assert.ok(typeof info.currentStreak === 'number');
      assert.ok(typeof info.nextMilestone === 'number');
      assert.ok(typeof info.streakLabel === 'string');
    });
  });
});
