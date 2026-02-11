import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { findRepeatSlot } from '@/services/invite/repeat-invite-helper';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilitySlot } from '@/constants/types';

const originalGetInvitableSlots = availabilityService.getInvitableSlots.bind(availabilityService);

describe('findRepeatSlot', () => {
  beforeEach(() => {
    availabilityService.getInvitableSlots = originalGetInvitableSlots;
  });

  it('returns null primary and no alternatives when no slots are available', async () => {
    availabilityService.getInvitableSlots = async () => [];

    const result = await findRepeatSlot('coach_1', '2026-03-15', '14:00');
    assert.equal(result.primarySlot, null);
    assert.deepEqual(result.alternatives, []);
  });

  it('returns exact same-time slot next week as primary', async () => {
    const slots: AvailabilitySlot[] = [
      {
        date: '2026-03-22',
        startTime: '14:00',
        endTime: '15:00',
        isAvailable: true,
        bookedCount: 0,
        maxBookings: 1,
      },
    ];
    availabilityService.getInvitableSlots = async () => slots;

    const result = await findRepeatSlot('coach_1', '2026-03-15', '14:00');
    assert.ok(result.primarySlot);
    assert.equal(result.primarySlot?.date, '2026-03-22');
    assert.equal(result.primarySlot?.startTime, '14:00');
  });

  it('returns alternatives excluding primary slot and limits to 5', async () => {
    const slots: AvailabilitySlot[] = [
      {
        date: '2026-03-22',
        startTime: '14:00',
        endTime: '15:00',
        isAvailable: true,
        bookedCount: 0,
        maxBookings: 1,
      },
      ...Array.from({ length: 8 }, (_, index) => ({
        date: '2026-03-22',
        startTime: `${15 + index}:00`,
        endTime: `${16 + index}:00`,
        isAvailable: true,
        bookedCount: 0,
        maxBookings: 1,
      })),
    ];
    availabilityService.getInvitableSlots = async () => slots;

    const result = await findRepeatSlot('coach_1', '2026-03-15', '14:00');
    assert.ok(result.primarySlot);
    assert.ok(result.alternatives.length <= 5);
    assert.ok(!result.alternatives.some((slot) => slot.startTime === '14:00'));
  });
});
