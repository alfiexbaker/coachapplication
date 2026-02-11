import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { availabilityService } from '@/services/availability-service';

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function nextDateForDay(dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6): string {
  const today = new Date();
  const result = new Date(today);
  const delta = (dayOfWeek - today.getDay() + 7) % 7;
  result.setDate(today.getDate() + delta);
  return toDateString(result);
}

describe('availabilityService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.AVAILABILITY_TEMPLATES);
    await apiClient.remove(STORAGE_KEYS.AVAILABILITY_OVERRIDES);
    await apiClient.remove(STORAGE_KEYS.BLOCKED_DATES);
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.SESSION_OFFERINGS);
    await apiClient.remove(STORAGE_KEYS.INVITE_SLOT_HOLDS);
  });

  it('saves and retrieves coach templates (happy path)', async () => {
    const saved = await availabilityService.saveTemplate({
      coachId: 'coach-availability-1',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '12:00',
      isRecurring: true,
      maxConcurrent: 1,
      bufferMinutes: 0,
      location: 'Pitch A',
    });

    const templates = await availabilityService.getTemplates('coach-availability-1');

    assert.equal(templates.some((template) => template.id === saved.id), true);
  });

  it('blocks and unblocks a date using overrides', async () => {
    const date = nextDateForDay(2);

    await availabilityService.blockDate('coach-availability-2', date, 'Holiday');

    const blocked = await availabilityService.getOverrides('coach-availability-2', date, date);
    assert.equal(blocked.length, 1);
    assert.equal(blocked[0].isBlocked, true);

    await availabilityService.unblockDate('coach-availability-2', date);

    const afterUnblock = await availabilityService.getOverrides('coach-availability-2', date, date);
    assert.equal(afterUnblock.length, 0);
  });

  it('returns no slots for coach without templates (empty path)', async () => {
    const date = nextDateForDay(3);
    const slots = await availabilityService.getAvailableSlots('coach-availability-empty', date, date, 60);

    assert.deepEqual(slots, []);
  });

  it('removes slots on blocked date', async () => {
    const date = nextDateForDay(4);

    await availabilityService.saveTemplate({
      coachId: 'coach-availability-3',
      dayOfWeek: 4,
      startTime: '10:00',
      endTime: '12:00',
      isRecurring: true,
      maxConcurrent: 1,
      bufferMinutes: 0,
      location: 'Pitch B',
    });

    const beforeBlock = await availabilityService.getAvailableSlots('coach-availability-3', date, date, 60);
    assert.equal(beforeBlock.length > 0, true);

    await availabilityService.blockDate('coach-availability-3', date, 'Venue closed');

    const afterBlock = await availabilityService.getAvailableSlots('coach-availability-3', date, date, 60);
    assert.equal(afterBlock.length, 0);
  });

  it('returns zero conflicts when no dates provided', async () => {
    const result = await availabilityService.checkConflicts('coach-availability-4', []);

    assert.equal(result.bookingCount, 0);
    assert.equal(result.holdCount, 0);
    assert.deepEqual(result.bookings, []);
    assert.deepEqual(result.holds, []);
  });

  it('falls back safely when template storage read fails (error-handling path)', async () => {
    const apiClientInternals = apiClient as unknown as {
      get: typeof apiClient.get;
    };
    const originalGet = apiClientInternals.get;
    apiClientInternals.get = async () => {
      throw new Error('forced availability load failure');
    };

    try {
      const templates = await availabilityService.getTemplates('coach1');
      assert.equal(Array.isArray(templates), true);
      assert.equal(templates.length > 0, true);
    } finally {
      apiClientInternals.get = originalGet;
    }
  });
});
