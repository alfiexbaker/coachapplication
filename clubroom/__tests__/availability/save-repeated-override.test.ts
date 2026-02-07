/**
 * saveRepeatedOverride Tests
 *
 * Tests the repeated override generation logic in availabilityService.
 * Verifies correct number of overrides, 7-day spacing, shared repeatGroupId,
 * and that custom slots are propagated to each override.
 */

import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

import { apiClient } from '@/services/api-client';
import { availabilityService } from '@/services/availability-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { AvailabilityOverride, TimeSlot } from '@/constants/session-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resetStorage(): Promise<void> {
  await apiClient.set(STORAGE_KEYS.AVAILABILITY_TEMPLATES, []);
  await apiClient.set(STORAGE_KEYS.AVAILABILITY_OVERRIDES, []);
  await apiClient.set(STORAGE_KEYS.BOOKINGS, []);
  await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, []);
  await apiClient.set(STORAGE_KEYS.INVITE_SLOT_HOLDS, []);
}

const COACH_ID = 'coach_repeat_test';

// ---------------------------------------------------------------------------
// Test Suite: saveRepeatedOverride
// ---------------------------------------------------------------------------

describe('availabilityService.saveRepeatedOverride', () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it('generates correct number of overrides for 4 weeks', async () => {
    // 4 weeks: start date + 3 more = 4 overrides
    const results = await availabilityService.saveRepeatedOverride({
      coachId: COACH_ID,
      date: '2026-03-02', // Monday
      isBlocked: false,
      repeatUntil: '2026-03-23', // 3 weeks later (4 Mondays total)
    });

    assert.strictEqual(results.length, 4, 'Should generate 4 overrides for 4 weeks');
  });

  it('generates 1 override when start and end dates are the same', async () => {
    const results = await availabilityService.saveRepeatedOverride({
      coachId: COACH_ID,
      date: '2026-03-02',
      isBlocked: true,
      repeatUntil: '2026-03-02',
    });

    assert.strictEqual(results.length, 1, 'Should generate exactly 1 override');
    assert.strictEqual(results[0].date, '2026-03-02');
  });

  it('each override date is exactly 7 days apart', async () => {
    const results = await availabilityService.saveRepeatedOverride({
      coachId: COACH_ID,
      date: '2026-03-02',
      isBlocked: false,
      repeatUntil: '2026-03-23',
    });

    const expectedDates = ['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23'];
    const actualDates = results.map((r) => r.date);
    assert.deepStrictEqual(actualDates, expectedDates, 'Dates should be 7 days apart');
  });

  it('all overrides share the same repeatGroupId', async () => {
    const results = await availabilityService.saveRepeatedOverride({
      coachId: COACH_ID,
      date: '2026-03-02',
      isBlocked: false,
      repeatUntil: '2026-03-23',
    });

    const groupIds = results.map((r) => r.repeatGroupId);
    const uniqueGroupIds = new Set(groupIds);
    assert.strictEqual(uniqueGroupIds.size, 1, 'All overrides should share one repeatGroupId');
    assert.ok(groupIds[0]!.startsWith('rpg_'), 'repeatGroupId should start with rpg_');
  });

  it('each override has a unique ID', async () => {
    const results = await availabilityService.saveRepeatedOverride({
      coachId: COACH_ID,
      date: '2026-03-02',
      isBlocked: false,
      repeatUntil: '2026-03-23',
    });

    const ids = results.map((r) => r.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(uniqueIds.size, results.length, 'All override IDs should be unique');
  });

  it('custom slots are copied to each override', async () => {
    const customSlots: TimeSlot[] = [
      { date: '2026-03-02', startTime: '09:00', endTime: '10:00', location: 'Hyde Park' },
      { date: '2026-03-02', startTime: '14:00', endTime: '15:00', location: 'Victoria Park' },
    ];

    const results = await availabilityService.saveRepeatedOverride({
      coachId: COACH_ID,
      date: '2026-03-02',
      isBlocked: false,
      customSlots,
      repeatUntil: '2026-03-16', // 3 weeks
    });

    assert.strictEqual(results.length, 3, 'Should generate 3 overrides');

    for (const override of results) {
      assert.ok(override.customSlots, `Override ${override.date} should have customSlots`);
      assert.strictEqual(override.customSlots!.length, 2, `Override ${override.date} should have 2 custom slots`);
      assert.strictEqual(override.customSlots![0].startTime, '09:00');
      assert.strictEqual(override.customSlots![1].startTime, '14:00');
      assert.strictEqual(override.customSlots![0].location, 'Hyde Park');
      assert.strictEqual(override.customSlots![1].location, 'Victoria Park');
    }
  });

  it('overrides are persisted to storage', async () => {
    await availabilityService.saveRepeatedOverride({
      coachId: COACH_ID,
      date: '2026-03-02',
      isBlocked: false,
      repeatUntil: '2026-03-16',
    });

    const stored = await apiClient.get<AvailabilityOverride[]>(STORAGE_KEYS.AVAILABILITY_OVERRIDES, []);
    assert.strictEqual(stored.length, 3, 'All 3 overrides should be persisted');
  });

  it('all overrides have the correct coachId', async () => {
    const results = await availabilityService.saveRepeatedOverride({
      coachId: COACH_ID,
      date: '2026-03-02',
      isBlocked: true,
      repeatUntil: '2026-03-09',
    });

    assert.strictEqual(results.length, 2);
    assert.ok(results.every((r) => r.coachId === COACH_ID), 'All overrides should have the correct coachId');
  });

  it('isBlocked flag is propagated to all overrides', async () => {
    const results = await availabilityService.saveRepeatedOverride({
      coachId: COACH_ID,
      date: '2026-03-02',
      isBlocked: true,
      repeatUntil: '2026-03-16',
    });

    assert.ok(results.every((r) => r.isBlocked === true), 'All overrides should be blocked');
  });

  it('repeatDayOfWeek is set correctly on all overrides', async () => {
    // 2026-03-02 is a Monday (dayOfWeek = 1)
    const results = await availabilityService.saveRepeatedOverride({
      coachId: COACH_ID,
      date: '2026-03-02',
      isBlocked: false,
      repeatUntil: '2026-03-16',
    });

    assert.ok(results.every((r) => r.repeatDayOfWeek === 1), 'All overrides should have repeatDayOfWeek = 1 (Monday)');
  });

  it('repeatUntil is set on all overrides', async () => {
    const results = await availabilityService.saveRepeatedOverride({
      coachId: COACH_ID,
      date: '2026-03-02',
      isBlocked: false,
      repeatUntil: '2026-03-23',
    });

    assert.ok(
      results.every((r) => r.repeatUntil === '2026-03-23'),
      'All overrides should have the same repeatUntil date'
    );
  });
});
