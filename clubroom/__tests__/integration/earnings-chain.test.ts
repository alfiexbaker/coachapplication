/**
 * Integration: Earnings Chain
 *
 * Tests session completion -> earnings calculation across booking and earnings services.
 */

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { bookingCrudService } from '@/services/booking/booking-crud-service';
import type { CreateBookingParams } from '@/services/booking/booking-crud-service';
import { earningsCalculatorService } from '@/services/earnings/earnings-calculator-service';

function makeBookingParams(tag: string, overrides: Partial<CreateBookingParams> = {}): CreateBookingParams {
  return {
    coachId: 'coach-earn1',
    coachName: 'Coach Earnings',
    athleteIds: [`athlete-${tag}`],
    athleteNames: [`Athlete ${tag}`],
    bookedById: `parent-${tag}`,
    bookedByName: `Parent ${tag}`,
    scheduledAt: new Date().toISOString(), // Use current time so it falls in "this week/month"
    duration: 60,
    location: 'Training Ground',
    service: '1-on-1 Coaching',
    serviceType: 'COACHING',
    objectives: ['Fitness'],
    price: 30,
    notes: '',
    skipAvailabilityValidation: true,
    ...overrides,
  };
}

describe('Integration: Earnings Chain (Booking -> Complete -> Calculate)', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.EARNINGS);
    await apiClient.remove(STORAGE_KEYS.COACH_SESSIONS);
    await apiClient.remove(STORAGE_KEYS.NOTIFICATIONS);
    await apiClient.remove(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS);
  });

  it('completed bookings appear in earnings calculation', async () => {
    const coachId = 'coach-earn1';

    // Create and complete a booking at 30 GBP
    const r1 = await bookingCrudService.createBooking(
      makeBookingParams('e1', { price: 30 }),
    );
    assert.equal(r1.success, true);
    if (!r1.success) return;

    await bookingCrudService.updateBooking(r1.data.id, { status: 'COMPLETED' });

    // Create and complete another booking at 50 GBP
    const r2 = await bookingCrudService.createBooking(
      makeBookingParams('e2', { price: 50 }),
    );
    assert.equal(r2.success, true);
    if (!r2.success) return;

    await bookingCrudService.updateBooking(r2.data.id, { status: 'COMPLETED' });

    // Calculate earnings
    const earningsResult = await earningsCalculatorService.calculateEarningsFromBookings(coachId);
    assert.equal(earningsResult.success, true, 'earnings calculation should succeed');
    if (!earningsResult.success) return;

    const earnings = earningsResult.data;
    assert.equal(earnings.totalEarned, 80, 'total earned should be 30 + 50 = 80');
    assert.equal(earnings.totalSessions, 2, 'should count 2 completed sessions');
    assert.equal(earnings.averageSessionValue, 40, 'average should be 80 / 2 = 40');
  });

  it('non-completed bookings are not counted in earnings', async () => {
    const coachId = 'coach-earn1';

    // Create a booking but leave it CONFIRMED (not COMPLETED)
    const r1 = await bookingCrudService.createBooking(
      makeBookingParams('nc1', { price: 100 }),
    );
    assert.equal(r1.success, true);

    // Calculate earnings — should be zero
    const earningsResult = await earningsCalculatorService.calculateEarningsFromBookings(coachId);
    assert.equal(earningsResult.success, true);
    if (!earningsResult.success) return;

    assert.equal(earningsResult.data.totalEarned, 0, 'no completed bookings = 0 earnings');
    assert.equal(earningsResult.data.totalSessions, 0);
  });

  it('earnings for a different coach are not included', async () => {
    // Create and complete a booking for coach-earn1
    const r1 = await bookingCrudService.createBooking(
      makeBookingParams('other', { coachId: 'coach-other', coachName: 'Other Coach', price: 75 }),
    );
    assert.equal(r1.success, true);
    if (!r1.success) return;
    await bookingCrudService.updateBooking(r1.data.id, { status: 'COMPLETED' });

    // Calculate for coach-earn1 — should be zero
    const earningsResult = await earningsCalculatorService.calculateEarningsFromBookings('coach-earn1');
    assert.equal(earningsResult.success, true);
    if (!earningsResult.success) return;

    assert.equal(earningsResult.data.totalEarned, 0, 'other coach earnings should not be included');
  });

  it('calculateNetAmount returns full amount (0% platform fee)', () => {
    const net = earningsCalculatorService.calculateNetAmount(100);
    assert.equal(net, 100, 'net amount should equal gross (no platform fee)');
  });

  it('formatCurrency formats GBP correctly', () => {
    assert.equal(earningsCalculatorService.formatCurrency(25), '+\u00A325.00');
    assert.equal(earningsCalculatorService.formatCurrency(-10), '-\u00A310.00');
    assert.equal(earningsCalculatorService.formatCurrency(0), '\u00A30.00');
  });
});
