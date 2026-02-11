"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
const event_bus_1 = require("../../services/event-bus");
const messaging_service_1 = require("../../services/messaging-service");
const waitlist_service_1 = require("../../services/waitlist-service");
const favourite_service_1 = require("../../services/favourite-service");
const recurring_booking_service_1 = require("../../services/recurring-booking-service");
const verification_service_1 = require("../../services/verification-service");
const cancellation_service_1 = require("../../services/cancellation-service");
const counter_offer_service_1 = require("../../services/counter-offer-service");
const api_client_1 = require("../../services/api-client");
const storage_keys_1 = require("../../constants/storage-keys");
const RESET_KEYS = [
    storage_keys_1.STORAGE_KEYS.MESSAGES,
    storage_keys_1.STORAGE_KEYS.WAITLIST,
    storage_keys_1.STORAGE_KEYS.FAVOURITES,
    storage_keys_1.STORAGE_KEYS.RECURRING_BOOKINGS,
    storage_keys_1.STORAGE_KEYS.VERIFICATION,
    storage_keys_1.STORAGE_KEYS.CANCELLATION_RECORDS,
    storage_keys_1.STORAGE_KEYS.NO_SHOW_COUNTS,
    storage_keys_1.STORAGE_KEYS.COUNTER_OFFERS,
    storage_keys_1.STORAGE_KEYS.NEGOTIATIONS,
];
async function resetStorage() {
    await Promise.all(RESET_KEYS.map(async (key) => {
        try {
            await api_client_1.apiClient.remove(key);
        }
        catch {
            // ignore missing keys
        }
    }));
}
(0, node_test_1.beforeEach)(async () => {
    event_bus_1.eventBus.clearAll();
    await resetStorage();
});
(0, node_test_1.afterEach)(() => {
    event_bus_1.eventBus.clearAll();
});
(0, node_test_1.default)('messagingService.sendMessage emits MESSAGE_SENT', async () => {
    let emitted;
    const unsub = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.MESSAGE_SENT, (payload) => {
        emitted = payload;
    });
    const createdResult = await messaging_service_1.messagingService.sendMessage('thread_1', 'hello coach', 'parent', 'Parent One');
    unsub();
    node_assert_1.default.strictEqual(createdResult.success, true);
    node_assert_1.default.ok(emitted);
    node_assert_1.default.strictEqual(emitted?.threadId, 'thread_1');
    node_assert_1.default.strictEqual(emitted?.messageId, createdResult.success ? createdResult.data.id : '');
    node_assert_1.default.strictEqual(emitted?.sender, 'parent');
});
(0, node_test_1.default)('waitlistService emits WAITLIST_JOINED and WAITLIST_PROMOTED', async () => {
    let joined;
    let promoted;
    const unsubJoined = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.WAITLIST_JOINED, (payload) => {
        joined = payload;
    });
    const unsubPromoted = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.WAITLIST_PROMOTED, (payload) => {
        promoted = payload;
    });
    const entryResult = await waitlist_service_1.waitlistService.joinWaitlist({
        userId: 'user_wait_1',
        sessionId: 'session_wait_1',
        coachId: 'coach_wait_1',
        autoBook: true,
    });
    const result = await waitlist_service_1.waitlistService.promoteFromWaitlist('session_wait_1');
    unsubJoined();
    unsubPromoted();
    node_assert_1.default.strictEqual(entryResult.success, true);
    node_assert_1.default.ok(result.success);
    const entry = entryResult.success ? entryResult.data : undefined;
    node_assert_1.default.ok(entry);
    node_assert_1.default.strictEqual(joined?.entryId, entry?.id);
    node_assert_1.default.strictEqual(promoted?.entryId, entry?.id);
    node_assert_1.default.strictEqual(promoted?.sessionId, entry?.sessionId);
});
(0, node_test_1.default)('favouriteService emits FAVOURITE_ADDED and FAVOURITE_REMOVED', async () => {
    let added;
    let removed;
    const unsubAdded = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.FAVOURITE_ADDED, (payload) => {
        added = payload;
    });
    const unsubRemoved = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.FAVOURITE_REMOVED, (payload) => {
        removed = payload;
    });
    const favouriteResult = await favourite_service_1.favouriteService.addFavourite({
        userId: 'fav_user_1',
        coachId: 'fav_coach_1',
        coachName: 'Favourite Coach',
    });
    node_assert_1.default.strictEqual(favouriteResult.success, true);
    await favourite_service_1.favouriteService.removeFavourite('fav_user_1', 'fav_coach_1');
    unsubAdded();
    unsubRemoved();
    node_assert_1.default.strictEqual(added?.favouriteId, favouriteResult.success ? favouriteResult.data.id : '');
    node_assert_1.default.strictEqual(removed?.favouriteId, favouriteResult.success ? favouriteResult.data.id : '');
    node_assert_1.default.strictEqual(removed?.coachId, 'fav_coach_1');
});
(0, node_test_1.default)('recurringBookingService emits RECURRING_CREATED and RECURRING_CANCELLED', async () => {
    let createdEvent;
    let cancelledEvent;
    const unsubCreated = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.RECURRING_CREATED, (payload) => {
        createdEvent = payload;
    });
    const unsubCancelled = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.RECURRING_CANCELLED, (payload) => {
        cancelledEvent = payload;
    });
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring({
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
    node_assert_1.default.strictEqual(createResult.success, true);
    const recurringId = createResult.data?.id;
    node_assert_1.default.ok(recurringId);
    const cancelResult = await recurring_booking_service_1.recurringBookingService.cancelRecurring(recurringId, 'test cancellation');
    unsubCreated();
    unsubCancelled();
    node_assert_1.default.strictEqual(cancelResult.success, true);
    node_assert_1.default.strictEqual(createdEvent?.recurringId, recurringId);
    node_assert_1.default.strictEqual(cancelledEvent?.recurringId, recurringId);
});
(0, node_test_1.default)('verificationService.updateVerificationItem emits VERIFICATION_UPDATED', async () => {
    let emitted;
    const unsub = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.VERIFICATION_UPDATED, (payload) => {
        emitted = payload;
    });
    const updateResult = await verification_service_1.verificationService.updateVerificationItem('coach_verify_1', 'identity', {
        status: 'PENDING',
        notes: 'Reviewing',
    });
    node_assert_1.default.strictEqual(updateResult.success, true);
    unsub();
    node_assert_1.default.ok(emitted);
    node_assert_1.default.strictEqual(emitted?.coachId, 'coach_verify_1');
    node_assert_1.default.strictEqual(emitted?.field, 'identity');
    node_assert_1.default.strictEqual(emitted?.status, 'PENDING');
});
(0, node_test_1.default)('cancellationService.cancelBooking emits CANCELLATION_RECORDED', async () => {
    let emitted;
    const unsub = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.CANCELLATION_RECORDED, (payload) => {
        emitted = payload;
    });
    const recordResult = await cancellation_service_1.cancellationService.cancelBooking('booking_cancel_1', 'parent', {
        reason: 'schedule_conflict',
        coachId: 'coach_cancel_1',
        familyId: 'family_cancel_1',
    });
    node_assert_1.default.strictEqual(recordResult.success, true);
    unsub();
    node_assert_1.default.strictEqual(emitted?.cancellationId, recordResult.success ? recordResult.data.id : '');
    node_assert_1.default.strictEqual(emitted?.bookingId, 'booking_cancel_1');
    node_assert_1.default.strictEqual(emitted?.cancelledBy, 'parent');
});
(0, node_test_1.default)('counterOfferService.createCounterOffer emits COUNTER_OFFER_CREATED', async () => {
    let emitted;
    const unsub = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.COUNTER_OFFER_CREATED, (payload) => {
        emitted = payload;
    });
    const offerResult = await counter_offer_service_1.counterOfferService.createCounterOffer({
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
    node_assert_1.default.strictEqual(offerResult.success, true);
    unsub();
    node_assert_1.default.strictEqual(emitted?.offerId, offerResult.success ? offerResult.data.id : '');
    node_assert_1.default.strictEqual(emitted?.bookingId, offerResult.success ? offerResult.data.bookingId : '');
    node_assert_1.default.strictEqual(emitted?.proposerId, offerResult.success ? offerResult.data.proposerId : '');
});
