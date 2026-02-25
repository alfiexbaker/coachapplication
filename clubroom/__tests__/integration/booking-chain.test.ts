/**
 * Integration: Booking Lifecycle Chain
 *
 * Tests the full booking lifecycle across multiple services:
 * createBooking -> confirmBooking -> updateBooking(COMPLETED) -> verify COACH_SESSIONS ingested -> verify self-assessment prompts
 */

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { bookingCrudService } from '@/services/booking/booking-crud-service';
import { bookingStatusService } from '@/services/booking/booking-status-service';
import type { CreateBookingParams } from '@/services/booking/booking-crud-service';
import type { Session } from '@/constants/app-types';
import type { SelfAssessmentPrompt } from '@/services/progress/progress-self-assessment-service';

function makeBookingParams(tag: string, overrides: Partial<CreateBookingParams> = {}): CreateBookingParams {
  return {
    coachId: `coach-${tag}`,
    coachName: `Coach ${tag}`,
    athleteIds: [`athlete-${tag}`],
    athleteNames: [`Athlete ${tag}`],
    bookedById: `parent-${tag}`,
    bookedByName: `Parent ${tag}`,
    scheduledAt: '2030-06-15T10:00:00.000Z',
    duration: 60,
    location: 'Hackney Marshes',
    service: '1-on-1 Coaching',
    serviceType: 'COACHING',
    objectives: ['Passing', 'Shooting'],
    price: 25,
    notes: '',
    skipAvailabilityValidation: true,
    ...overrides,
  };
}

describe('Integration: Booking Lifecycle Chain', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.COACH_SESSIONS);
    await apiClient.remove(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS);
    await apiClient.remove(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENTS);
    await apiClient.remove(STORAGE_KEYS.SESSION_JOURNAL);
    await apiClient.remove(STORAGE_KEYS.NOTIFICATIONS);
  });

  it('full lifecycle: create -> confirm -> complete -> verify coach sessions + self-assessment prompts', async () => {
    // Step 1: Create booking
    const createResult = await bookingCrudService.createBooking(makeBookingParams('chain1'));
    assert.equal(createResult.success, true, 'createBooking should succeed');
    if (!createResult.success) return;

    const booking = createResult.data;
    assert.ok(booking.id, 'booking should have an id');
    assert.equal(booking.status, 'CONFIRMED', 'new booking starts CONFIRMED');
    assert.equal(booking.coachId, 'coach-chain1');
    assert.deepEqual(booking.athleteIds, ['athlete-chain1']);

    // Step 2: Confirm booking (idempotent — already CONFIRMED, but should succeed)
    const confirmResult = await bookingStatusService.confirmBooking(booking.id);
    assert.equal(confirmResult.success, true, 'confirmBooking should succeed');

    // Verify booking is still CONFIRMED
    const afterConfirm = await bookingCrudService.getBooking(booking.id);
    assert.ok(afterConfirm, 'booking should exist after confirm');
    assert.equal(afterConfirm!.status, 'CONFIRMED');

    // Step 3: Update to COMPLETED
    const completeResult = await bookingCrudService.updateBooking(booking.id, { status: 'COMPLETED' });
    assert.equal(completeResult.success, true, 'updateBooking to COMPLETED should succeed');
    if (!completeResult.success) return;
    assert.equal(completeResult.data.status, 'COMPLETED');

    // Step 4: Verify coach session was ingested into COACH_SESSIONS
    const coachSessions = await apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []);
    assert.ok(coachSessions.length > 0, 'at least one coach session should exist after completion');

    const ingestedSession = coachSessions.find((s) => s.bookingId === booking.id);
    assert.ok(ingestedSession, 'should find a session record for the completed booking');
    assert.equal(ingestedSession!.coachId, 'coach-chain1');
    assert.equal(ingestedSession!.athleteId, 'athlete-chain1');
    assert.equal(ingestedSession!.attendance, 'ATTENDED');

    // Step 5: Verify self-assessment prompt was created
    const prompts = await apiClient.get<SelfAssessmentPrompt[]>(
      STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS,
      [],
    );
    assert.ok(prompts.length > 0, 'at least one self-assessment prompt should be created');

    const athletePrompt = prompts.find((p) => p.athleteId === 'athlete-chain1');
    assert.ok(athletePrompt, 'prompt should target the correct athlete');
    assert.equal(athletePrompt!.bookingId, booking.id);
    assert.equal(athletePrompt!.status, 'pending');
  });

  it('multi-athlete booking creates sessions for each athlete', async () => {
    const createResult = await bookingCrudService.createBooking(
      makeBookingParams('multi', {
        athleteIds: ['athlete-a', 'athlete-b'],
        athleteNames: ['Alice', 'Bob'],
      }),
    );
    assert.equal(createResult.success, true);
    if (!createResult.success) return;

    // Complete the booking
    const completeResult = await bookingCrudService.updateBooking(createResult.data.id, {
      status: 'COMPLETED',
    });
    assert.equal(completeResult.success, true);

    // Verify both athletes got session records
    const coachSessions = await apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []);
    const sessionsForBooking = coachSessions.filter((s) => s.bookingId === createResult.data.id);
    assert.equal(sessionsForBooking.length, 2, 'should have 2 session records (one per athlete)');

    const athleteIds = sessionsForBooking.map((s) => s.athleteId).sort();
    assert.deepEqual(athleteIds, ['athlete-a', 'athlete-b']);
  });

  it('completing an already-completed booking does not duplicate sessions', async () => {
    const createResult = await bookingCrudService.createBooking(makeBookingParams('dedup'));
    assert.equal(createResult.success, true);
    if (!createResult.success) return;

    // Complete once
    await bookingCrudService.updateBooking(createResult.data.id, { status: 'COMPLETED' });

    const sessionsAfterFirst = await apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []);
    const countFirst = sessionsAfterFirst.filter((s) => s.bookingId === createResult.data.id).length;

    // Complete again (should be a no-op for ingestion since already COMPLETED->COMPLETED)
    await bookingCrudService.updateBooking(createResult.data.id, { status: 'COMPLETED' });

    const sessionsAfterSecond = await apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []);
    const countSecond = sessionsAfterSecond.filter((s) => s.bookingId === createResult.data.id).length;

    assert.equal(countFirst, countSecond, 'second completion should not duplicate session records');
  });

  it('booking list reflects all operations', async () => {
    // Create two bookings
    const r1 = await bookingCrudService.createBooking(makeBookingParams('list1'));
    const r2 = await bookingCrudService.createBooking(makeBookingParams('list2'));
    assert.equal(r1.success, true);
    assert.equal(r2.success, true);

    const allBookings = await bookingCrudService.list();
    assert.ok(allBookings.length >= 2, 'should have at least 2 bookings');

    // Complete one
    if (r1.success) {
      await bookingCrudService.updateBooking(r1.data.id, { status: 'COMPLETED' });
    }

    const refreshed = await bookingCrudService.list();
    if (r1.success) {
      const b1 = refreshed.find((b) => b.id === r1.data.id);
      assert.equal(b1?.status, 'COMPLETED');
    }
    if (r2.success) {
      const b2 = refreshed.find((b) => b.id === r2.data.id);
      assert.equal(b2?.status, 'CONFIRMED');
    }
  });
});
