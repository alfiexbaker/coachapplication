import assert from 'node:assert';
import test, { beforeEach, afterEach } from 'node:test';

import { eventBus, ServiceEvents, type EventPayloads } from '../../services/event-bus';
import { messagingService } from '../../services/messaging-service';
import { favouriteService } from '../../services/favourite-service';
import { recurringBookingService } from '../../services/recurring-booking-service';
import { verificationService } from '../../services/verification-service';
import { cancellationService } from '../../services/cancellation-service';
import { counterOfferService } from '../../services/counter-offer-service';
import { bookingService } from '../../services/booking-service';
import { apiClient } from '../../services/api-client';
import { STORAGE_KEYS } from '../../constants/storage-keys';

const RESET_KEYS = [
  STORAGE_KEYS.MESSAGES,
  STORAGE_KEYS.WAITLIST,
  STORAGE_KEYS.FAVOURITES,
  STORAGE_KEYS.RECURRING_BOOKINGS,
  STORAGE_KEYS.BOOKINGS,
  STORAGE_KEYS.VERIFICATION,
  STORAGE_KEYS.CANCELLATION_RECORDS,
  STORAGE_KEYS.NO_SHOW_COUNTS,
  STORAGE_KEYS.COUNTER_OFFERS,
  STORAGE_KEYS.NEGOTIATIONS,
];

async function resetStorage(): Promise<void> {
  await Promise.all(
    RESET_KEYS.map(async (key) => {
      try {
        await apiClient.remove(key);
      } catch {
        // ignore missing keys
      }
    }),
  );
}

beforeEach(async () => {
  eventBus.clearAll();
  await resetStorage();
});

afterEach(() => {
  eventBus.clearAll();
});

test('messagingService.sendMessage emits MESSAGE_SENT', async () => {
  let emitted: EventPayloads[typeof ServiceEvents.MESSAGE_SENT] | undefined;
  const unsub = eventBus.on<EventPayloads[typeof ServiceEvents.MESSAGE_SENT]>(
    ServiceEvents.MESSAGE_SENT,
    (payload) => {
      emitted = payload;
    },
  );

  const createdResult = await messagingService.sendMessage('thread_1', 'hello coach', 'parent', 'Parent One');
  unsub();

  assert.strictEqual(createdResult.success, true);
  assert.ok(emitted);
  assert.strictEqual(emitted?.threadId, 'thread_1');
  assert.strictEqual(emitted?.messageId, createdResult.success ? createdResult.data.id : '');
  assert.strictEqual(emitted?.sender, 'parent');
});


test('favouriteService emits FAVOURITE_ADDED and FAVOURITE_REMOVED', async () => {
  let added: EventPayloads[typeof ServiceEvents.FAVOURITE_ADDED] | undefined;
  let removed: EventPayloads[typeof ServiceEvents.FAVOURITE_REMOVED] | undefined;

  const unsubAdded = eventBus.on<EventPayloads[typeof ServiceEvents.FAVOURITE_ADDED]>(
    ServiceEvents.FAVOURITE_ADDED,
    (payload) => {
      added = payload;
    },
  );
  const unsubRemoved = eventBus.on<EventPayloads[typeof ServiceEvents.FAVOURITE_REMOVED]>(
    ServiceEvents.FAVOURITE_REMOVED,
    (payload) => {
      removed = payload;
    },
  );

  const favouriteResult = await favouriteService.addFavourite({
    userId: 'fav_user_1',
    coachId: 'fav_coach_1',
    coachName: 'Favourite Coach',
  });
  assert.strictEqual(favouriteResult.success, true);
  await favouriteService.removeFavourite('fav_user_1', 'fav_coach_1');
  unsubAdded();
  unsubRemoved();

  assert.strictEqual(added?.favouriteId, favouriteResult.success ? favouriteResult.data.id : '');
  assert.strictEqual(removed?.favouriteId, favouriteResult.success ? favouriteResult.data.id : '');
  assert.strictEqual(removed?.coachId, 'fav_coach_1');
});

test('recurringBookingService emits RECURRING_CREATED and RECURRING_CANCELLED', async () => {
  let createdEvent: EventPayloads[typeof ServiceEvents.RECURRING_CREATED] | undefined;
  let cancelledEvent: EventPayloads[typeof ServiceEvents.RECURRING_CANCELLED] | undefined;

  const unsubCreated = eventBus.on<EventPayloads[typeof ServiceEvents.RECURRING_CREATED]>(
    ServiceEvents.RECURRING_CREATED,
    (payload) => {
      createdEvent = payload;
    },
  );
  const unsubCancelled = eventBus.on<EventPayloads[typeof ServiceEvents.RECURRING_CANCELLED]>(
    ServiceEvents.RECURRING_CANCELLED,
    (payload) => {
      cancelledEvent = payload;
    },
  );

  const createResult = await recurringBookingService.createRecurring({
    userId: 'rec_user_1',
    coachId: 'rec_coach_1',
    dayOfWeek: 2,
    time: '10:00',
    duration: 60,
    location: 'Pitch 1',
    sessionType: '1-on-1',
    frequency: 'WEEKLY',
    startDate: new Date().toISOString(),
    pricePerSession: 50,
  });
  assert.strictEqual(createResult.success, true);

  const recurringId = createResult.data?.id;
  assert.ok(recurringId);

  const cancelResult = await recurringBookingService.cancelRecurring(recurringId, 'test cancellation');
  unsubCreated();
  unsubCancelled();

  assert.strictEqual(cancelResult.success, true);
  assert.strictEqual(createdEvent?.recurringId, recurringId);
  assert.strictEqual(cancelledEvent?.recurringId, recurringId);
});

test('verificationService.updateVerificationItem emits VERIFICATION_UPDATED', async () => {
  let emitted: EventPayloads[typeof ServiceEvents.VERIFICATION_UPDATED] | undefined;
  const unsub = eventBus.on<EventPayloads[typeof ServiceEvents.VERIFICATION_UPDATED]>(
    ServiceEvents.VERIFICATION_UPDATED,
    (payload) => {
      emitted = payload;
    },
  );

  const updateResult = await verificationService.updateVerificationItem('coach_verify_1', 'identity', {
    status: 'PENDING',
    notes: 'Reviewing',
  });
  assert.strictEqual(updateResult.success, true);
  unsub();

  assert.ok(emitted);
  assert.strictEqual(emitted?.coachId, 'coach_verify_1');
  assert.strictEqual(emitted?.field, 'identity');
  assert.strictEqual(emitted?.status, 'PENDING');
});

test('cancellationService.cancelBooking emits CANCELLATION_RECORDED', async () => {
  const bookingId = 'booking_cancel_1';
  const saveResult = await bookingService.saveBookingDirect({
    id: bookingId,
    coachId: 'coach_cancel_1',
    status: 'CONFIRMED',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    location: 'Pitch 1',
  });
  assert.strictEqual(saveResult.success, true);

  let emitted: EventPayloads[typeof ServiceEvents.CANCELLATION_RECORDED] | undefined;
  const unsub = eventBus.on<EventPayloads[typeof ServiceEvents.CANCELLATION_RECORDED]>(
    ServiceEvents.CANCELLATION_RECORDED,
    (payload) => {
      emitted = payload;
    },
  );

  const recordResult = await cancellationService.cancelBooking(bookingId, 'parent', {
    reason: 'schedule_conflict',
    coachId: 'coach_cancel_1',
    familyId: 'family_cancel_1',
  });
  assert.strictEqual(recordResult.success, true);
  unsub();

  assert.strictEqual(emitted?.cancellationId, recordResult.success ? recordResult.data.id : '');
  assert.strictEqual(emitted?.bookingId, bookingId);
  assert.strictEqual(emitted?.cancelledBy, 'parent');
});

test('counterOfferService.createCounterOffer emits COUNTER_OFFER_CREATED', async () => {
  let emitted: EventPayloads[typeof ServiceEvents.COUNTER_OFFER_CREATED] | undefined;
  const unsub = eventBus.on<EventPayloads[typeof ServiceEvents.COUNTER_OFFER_CREATED]>(
    ServiceEvents.COUNTER_OFFER_CREATED,
    (payload) => {
      emitted = payload;
    },
  );

  const offerResult = await counterOfferService.createCounterOffer({
    bookingId: 'booking_counter_1',
    proposedBy: 'PARENT',
    proposerId: 'parent_counter_1',
    proposerName: 'Counter Parent',
    originalTime: {
      date: '2026-02-12',
      startTime: '10:00',
      endTime: '11:00',
      location: 'Pitch 2',
    },
    proposedTime: {
      date: '2026-02-13',
      startTime: '11:00',
      endTime: '12:00',
      location: 'Pitch 2',
    },
  });
  assert.strictEqual(offerResult.success, true);
  unsub();

  assert.strictEqual(emitted?.offerId, offerResult.success ? offerResult.data.id : '');
  assert.strictEqual(emitted?.bookingId, offerResult.success ? offerResult.data.bookingId : '');
  assert.strictEqual(emitted?.proposerId, offerResult.success ? offerResult.data.proposerId : '');
});
