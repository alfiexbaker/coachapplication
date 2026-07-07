import assert from 'node:assert';
import test, { beforeEach } from 'node:test';

import type { CreateRecurringBookingParams, RecurringBooking } from '../../constants/types';
import { STORAGE_KEYS } from '../../constants/storage-keys';
import { apiClient } from '../../services/api-client';
import { bookingService } from '../../services/booking';
import { familyRecurringService } from '../../services/family-recurring-service';
import { recurringBookingService } from '../../services/recurring-booking-service';

const baseRecurringParams: CreateRecurringBookingParams = {
  userId: 'parent_1',
  coachId: 'coach_1',
  athleteId: 'child_1',
  dayOfWeek: 2,
  time: '17:00',
  duration: 60,
  location: 'North Pitch',
  sessionType: 'Technical Session',
  frequency: 'WEEKLY',
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  pricePerSession: 55,
};

beforeEach(async () => {
  await recurringBookingService.clearAll();
  await apiClient.set(STORAGE_KEYS.USERS, [
    { id: 'parent_1', fullName: 'Pat Parent' },
    { id: 'coach_1', fullName: 'Casey Coach' },
    { id: 'child_1', fullName: 'Taylor Child' },
  ]);
});

test('user story: parent can review an active recurring plan with named relationships and next session', async () => {
  const createResult = await recurringBookingService.createRecurring(baseRecurringParams);
  const recurring = createResult.data;
  assert.ok(recurring, 'Recurring booking should be created');

  const generated = await recurringBookingService.generateUpcomingBookings(recurring.id, 1);
  assert.strictEqual(generated.success, true);
  const nextBookingId = generated.data?.[0]?.bookingId;
  assert.ok(nextBookingId, 'Expected a generated next booking');

  const plansResult = await familyRecurringService.listPlansForParent('parent_1');
  assert.strictEqual(plansResult.success, true);
  const plan = plansResult.data?.[0];
  assert.ok(plan, 'Expected one recurring plan');
  assert.strictEqual(plan.coachName, 'Casey Coach');
  assert.strictEqual(plan.athleteName, 'Taylor Child');
  assert.strictEqual(plan.nextBookingId, nextBookingId);
  assert.strictEqual(plan.activeFutureBookings, 1);
  assert.ok(plan.relationshipSummary.includes('Cancel ends the plan'));
});

test('user story: parent sees API-generated recurring sessions before booking list mirror hydrates', async () => {
  const scheduledAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const recurring: RecurringBooking = {
    id: 'series_api_1',
    userId: 'parent_1',
    coachId: 'coach_1',
    athleteId: 'child_1',
    dayOfWeek: 3,
    time: '17:00',
    duration: 60,
    location: 'North Pitch',
    sessionType: 'Technical Session',
    frequency: 'WEEKLY',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    pricePerSession: 55,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    generatedBookingIds: ['bok_api_next_1'],
    generatedBookings: [
      {
        bookingId: 'bok_api_next_1',
        recurringBookingId: 'series_api_1',
        scheduledAt,
        status: 'CONFIRMED',
      },
    ],
    sessionsCompleted: 0,
  };

  await (
    recurringBookingService as unknown as {
      saveList: (bookings: RecurringBooking[]) => Promise<void>;
    }
  ).saveList([recurring]);

  const plansResult = await familyRecurringService.listPlansForParent('parent_1');
  const plan = plansResult.data?.[0];
  assert.strictEqual(plansResult.success, true);
  assert.strictEqual(plan?.coachName, 'Casey Coach');
  assert.strictEqual(plan?.athleteName, 'Taylor Child');
  assert.strictEqual(plan?.nextBookingId, 'bok_api_next_1');
  assert.strictEqual(plan?.nextScheduledAt, scheduledAt);
  assert.strictEqual(plan?.activeFutureBookings, 1);
  assert.strictEqual(plan?.cancelledFutureBookings, 0);
});

test('user story: parent can pause and resume a recurring plan without cancelling upcoming sessions', async () => {
  const createResult = await recurringBookingService.createRecurring(baseRecurringParams);
  const recurring = createResult.data;
  assert.ok(recurring, 'Recurring booking should be created');

  const generated = await recurringBookingService.generateUpcomingBookings(recurring.id, 1);
  assert.strictEqual(generated.success, true);
  const nextBookingId = generated.data?.[0]?.bookingId;
  assert.ok(nextBookingId, 'Expected a generated next booking');

  const pauseResult = await recurringBookingService.pauseRecurring(recurring.id, 'School holidays');
  assert.strictEqual(pauseResult.success, true);

  const pausedPlans = await familyRecurringService.listPlansForParent('parent_1');
  assert.strictEqual(pausedPlans.data?.[0].recurring.status, 'PAUSED');
  assert.strictEqual(pausedPlans.data?.[0].activeFutureBookings, 1);
  assert.ok(pausedPlans.data?.[0].relationshipSummary.includes('keep already-booked sessions'));

  const bookingsAfterPause = await bookingService.list();
  assert.strictEqual(
    bookingsAfterPause.find((booking) => booking.id === nextBookingId)?.status,
    'CONFIRMED',
  );

  const resumeResult = await recurringBookingService.resumeRecurring(recurring.id);
  assert.strictEqual(resumeResult.success, true);

  const resumedPlans = await familyRecurringService.listPlansForParent('parent_1');
  assert.strictEqual(resumedPlans.data?.[0].recurring.status, 'ACTIVE');
});

test('user story: parent can skip only the next generated recurring session', async () => {
  const createResult = await recurringBookingService.createRecurring(baseRecurringParams);
  const recurring = createResult.data;
  assert.ok(recurring, 'Recurring booking should be created');

  const generated = await recurringBookingService.generateUpcomingBookings(recurring.id, 2);
  assert.strictEqual(generated.success, true);
  const [firstSession, secondSession] = generated.data ?? [];
  assert.ok(firstSession?.bookingId, 'Expected first generated booking');
  assert.ok(secondSession?.bookingId, 'Expected second generated booking');

  const skipped = await bookingService.cancel(
    firstSession.bookingId,
    'School fixture clash',
    'parent',
    { note: `Skipped from recurring plan ${recurring.id}` },
  );
  assert.ok(skipped, 'Expected next booking to be skipped');

  const plansResult = await familyRecurringService.listPlansForParent('parent_1');
  const plan = plansResult.data?.[0];
  assert.strictEqual(plan?.recurring.status, 'ACTIVE');
  assert.strictEqual(plan?.cancelledFutureBookings, 1);
  assert.strictEqual(plan?.activeFutureBookings, 1);
  assert.strictEqual(plan?.nextBookingId, secondSession.bookingId);

  const storedBookings = await bookingService.list();
  assert.strictEqual(
    storedBookings.find((booking) => booking.id === firstSession.bookingId)?.status,
    'CANCELLED',
  );
  assert.strictEqual(
    storedBookings.find((booking) => booking.id === secondSession.bookingId)?.status,
    'CONFIRMED',
  );
});

test('user story: parent cancellation removes future recurring sessions from the live plan', async () => {
  const createResult = await recurringBookingService.createRecurring(baseRecurringParams);
  const recurring = createResult.data;
  assert.ok(recurring, 'Recurring booking should be created');

  const generated = await recurringBookingService.generateUpcomingBookings(recurring.id, 1);
  assert.strictEqual(generated.success, true);
  const futureBookingId = generated.data?.[0]?.bookingId;
  assert.ok(futureBookingId, 'Expected a generated future booking');

  const cancelResult = await recurringBookingService.cancelRecurring(recurring.id, 'Moved clubs');
  assert.strictEqual(cancelResult.success, true);

  const plansResult = await familyRecurringService.listPlansForParent('parent_1');
  const plan = plansResult.data?.[0];
  assert.strictEqual(plan?.recurring.status, 'CANCELLED');
  assert.strictEqual(plan?.activeFutureBookings, 0);
  assert.strictEqual(plan?.cancelledFutureBookings, 1);

  const storedBookings = await bookingService.list();
  assert.strictEqual(
    storedBookings.find((booking) => booking.id === futureBookingId)?.status,
    'CANCELLED',
  );
});
