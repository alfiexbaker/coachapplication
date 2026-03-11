import assert from 'node:assert';
import test, { beforeEach } from 'node:test';

import type { Booking, CreateRecurringBookingParams } from '../../constants/types';
import { STORAGE_KEYS } from '../../constants/storage-keys';
import { apiClient } from '../../services/api-client';
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
  await apiClient.set(STORAGE_KEYS.BOOKINGS, []);
  await apiClient.set(STORAGE_KEYS.USERS, [
    { id: 'parent_1', fullName: 'Pat Parent' },
    { id: 'coach_1', fullName: 'Casey Coach' },
    { id: 'child_1', fullName: 'Taylor Child' },
  ]);
});

function createLinkedBooking(
  id: string,
  recurringBookingId: string,
  scheduledAt: string,
  status: Booking['status'] = 'CONFIRMED',
): Booking {
  return {
    id,
    recurringBookingId,
    coachId: 'coach_1',
    coachName: 'Casey Coach',
    athleteId: 'child_1',
    athleteIds: ['child_1'],
    athleteNames: ['Taylor Child'],
    bookedById: 'parent_1',
    bookedByName: 'Pat Parent',
    scheduledAt,
    duration: 60,
    location: 'North Pitch',
    service: 'Technical Session',
    serviceType: 'Technical Session',
    status,
    createdAt: new Date().toISOString(),
    isRecurringGenerated: true,
  };
}

test('user story: parent can review an active recurring plan with named relationships and next session', async () => {
  const createResult = await recurringBookingService.createRecurring(baseRecurringParams);
  const recurring = createResult.data;
  assert.ok(recurring, 'Recurring booking should be created');

  const nextBooking = createLinkedBooking(
    'booking_next',
    recurring.id,
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  );
  await apiClient.set(STORAGE_KEYS.BOOKINGS, [nextBooking]);
  await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, [
    { ...recurring, generatedBookingIds: [nextBooking.id] },
  ]);

  const plansResult = await familyRecurringService.listPlansForParent('parent_1');
  assert.strictEqual(plansResult.success, true);
  const plan = plansResult.data?.[0];
  assert.ok(plan, 'Expected one recurring plan');
  assert.strictEqual(plan.coachName, 'Casey Coach');
  assert.strictEqual(plan.athleteName, 'Taylor Child');
  assert.strictEqual(plan.nextBookingId, 'booking_next');
  assert.strictEqual(plan.activeFutureBookings, 1);
  assert.ok(plan.relationshipSummary.includes('Cancel ends the plan'));
});

test('user story: parent can pause and resume a recurring plan without cancelling upcoming sessions', async () => {
  const createResult = await recurringBookingService.createRecurring(baseRecurringParams);
  const recurring = createResult.data;
  assert.ok(recurring, 'Recurring booking should be created');

  const nextBooking = createLinkedBooking(
    'booking_paused_future',
    recurring.id,
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  );
  await apiClient.set(STORAGE_KEYS.BOOKINGS, [nextBooking]);
  await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, [
    { ...recurring, generatedBookingIds: [nextBooking.id] },
  ]);

  const pauseResult = await recurringBookingService.pauseRecurring(recurring.id, 'School holidays');
  assert.strictEqual(pauseResult.success, true);

  const pausedPlans = await familyRecurringService.listPlansForParent('parent_1');
  assert.strictEqual(pausedPlans.data?.[0].recurring.status, 'PAUSED');
  assert.strictEqual(pausedPlans.data?.[0].activeFutureBookings, 1);
  assert.ok(pausedPlans.data?.[0].relationshipSummary.includes('keep already-booked sessions'));

  const bookingsAfterPause = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
  assert.strictEqual(bookingsAfterPause[0]?.status, 'CONFIRMED');

  const resumeResult = await recurringBookingService.resumeRecurring(recurring.id);
  assert.strictEqual(resumeResult.success, true);

  const resumedPlans = await familyRecurringService.listPlansForParent('parent_1');
  assert.strictEqual(resumedPlans.data?.[0].recurring.status, 'ACTIVE');
});

test('user story: parent cancellation removes future recurring sessions from the live plan', async () => {
  const createResult = await recurringBookingService.createRecurring(baseRecurringParams);
  const recurring = createResult.data;
  assert.ok(recurring, 'Recurring booking should be created');

  const futureActiveBooking = createLinkedBooking(
    'booking_cancelled_future',
    recurring.id,
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  );
  await apiClient.set(STORAGE_KEYS.BOOKINGS, [futureActiveBooking]);
  await apiClient.set(STORAGE_KEYS.RECURRING_BOOKINGS, [
    { ...recurring, generatedBookingIds: [futureActiveBooking.id] },
  ]);

  const cancelResult = await recurringBookingService.cancelRecurring(recurring.id, 'Moved clubs');
  assert.strictEqual(cancelResult.success, true);

  const plansResult = await familyRecurringService.listPlansForParent('parent_1');
  const plan = plansResult.data?.[0];
  assert.strictEqual(plan?.recurring.status, 'CANCELLED');
  assert.strictEqual(plan?.activeFutureBookings, 0);
  assert.strictEqual(plan?.cancelledFutureBookings, 1);

  const storedBookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
  assert.strictEqual(storedBookings[0]?.status, 'CANCELLED');
});
