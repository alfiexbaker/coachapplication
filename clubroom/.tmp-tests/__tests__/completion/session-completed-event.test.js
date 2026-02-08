"use strict";
// @ts-nocheck
/**
 * Session Completed Event Tests — Post-Session Completion Flow
 *
 * Tests for the EVENT BUS emission of SESSION_COMPLETED event
 * during the session completion flow.
 *
 * Verifies:
 * - eventBus emits SESSION_COMPLETED with correct payload shape
 * - emitTyped enforces typed payloads for SESSION_COMPLETED
 * - ServiceEvents.SESSION_COMPLETED maps to 'session:completed'
 * - Event handlers receive correct data
 * - Event once handlers fire exactly once
 */
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
// ============================================================================
// SETUP
// ============================================================================
(0, node_test_1.beforeEach)(() => {
    event_bus_1.eventBus.clearAll();
});
// ============================================================================
// ServiceEvents CONSTANT TESTS
// ============================================================================
(0, node_test_1.describe)('ServiceEvents.SESSION_COMPLETED', () => {
    (0, node_test_1.default)('maps to "session:completed" event string', () => {
        node_assert_1.default.strictEqual(event_bus_1.ServiceEvents.SESSION_COMPLETED, 'session:completed');
    });
    (0, node_test_1.default)('is defined as a constant alongside other session events', () => {
        node_assert_1.default.ok(event_bus_1.ServiceEvents.SESSION_CREATED);
        node_assert_1.default.ok(event_bus_1.ServiceEvents.SESSION_UPDATED);
        node_assert_1.default.ok(event_bus_1.ServiceEvents.SESSION_STARTED);
        node_assert_1.default.ok(event_bus_1.ServiceEvents.SESSION_COMPLETED);
        node_assert_1.default.ok(event_bus_1.ServiceEvents.SESSION_CANCELLED);
    });
});
// ============================================================================
// EVENT BUS SESSION_COMPLETED EMISSION TESTS
// ============================================================================
(0, node_test_1.describe)('EventBus SESSION_COMPLETED emission', () => {
    (0, node_test_1.default)('emits SESSION_COMPLETED event and handler receives payload', () => {
        let received = null;
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_COMPLETED, (data) => {
            received = data;
        });
        event_bus_1.eventBus.emit(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 'session_123',
            coachId: 'coach_1',
            athleteIds: ['athlete_1', 'athlete_2'],
            bookingId: 'booking_456',
            athleteName: 'Tom Wilson',
        });
        node_assert_1.default.ok(received, 'Handler should have been called');
        node_assert_1.default.strictEqual(received.sessionId, 'session_123');
        node_assert_1.default.strictEqual(received.coachId, 'coach_1');
        node_assert_1.default.deepStrictEqual(received.athleteIds, ['athlete_1', 'athlete_2']);
        node_assert_1.default.strictEqual(received.bookingId, 'booking_456');
        node_assert_1.default.strictEqual(received.athleteName, 'Tom Wilson');
    });
    (0, node_test_1.default)('emits SESSION_COMPLETED with optional bookingId undefined (session offering)', () => {
        let received = null;
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_COMPLETED, (data) => {
            received = data;
        });
        event_bus_1.eventBus.emit(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 'session_789',
            coachId: 'coach_2',
            athleteIds: ['athlete_3'],
            bookingId: undefined,
        });
        node_assert_1.default.ok(received);
        node_assert_1.default.strictEqual(received.sessionId, 'session_789');
        node_assert_1.default.strictEqual(received.bookingId, undefined);
    });
    (0, node_test_1.default)('multiple handlers all receive the event', () => {
        let count = 0;
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_COMPLETED, () => { count++; });
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_COMPLETED, () => { count++; });
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_COMPLETED, () => { count++; });
        event_bus_1.eventBus.emit(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 's1',
            coachId: 'c1',
            athleteIds: ['a1'],
        });
        node_assert_1.default.strictEqual(count, 3, 'All three handlers should fire');
    });
    (0, node_test_1.default)('once handler fires exactly once for SESSION_COMPLETED', () => {
        let count = 0;
        event_bus_1.eventBus.once(event_bus_1.ServiceEvents.SESSION_COMPLETED, () => { count++; });
        event_bus_1.eventBus.emit(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 's1',
            coachId: 'c1',
            athleteIds: ['a1'],
        });
        event_bus_1.eventBus.emit(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 's2',
            coachId: 'c1',
            athleteIds: ['a1'],
        });
        node_assert_1.default.strictEqual(count, 1, 'Once handler should fire only once');
    });
    (0, node_test_1.default)('unsubscribe removes handler', () => {
        let count = 0;
        const unsub = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_COMPLETED, () => { count++; });
        event_bus_1.eventBus.emit(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 's1',
            coachId: 'c1',
            athleteIds: ['a1'],
        });
        node_assert_1.default.strictEqual(count, 1);
        unsub();
        event_bus_1.eventBus.emit(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 's2',
            coachId: 'c1',
            athleteIds: ['a1'],
        });
        node_assert_1.default.strictEqual(count, 1, 'Handler should not fire after unsubscribe');
    });
    (0, node_test_1.default)('clear removes all handlers for SESSION_COMPLETED', () => {
        let count = 0;
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_COMPLETED, () => { count++; });
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_COMPLETED, () => { count++; });
        event_bus_1.eventBus.clear(event_bus_1.ServiceEvents.SESSION_COMPLETED);
        event_bus_1.eventBus.emit(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 's1',
            coachId: 'c1',
            athleteIds: ['a1'],
        });
        node_assert_1.default.strictEqual(count, 0, 'No handlers should fire after clear');
    });
    (0, node_test_1.default)('listenerCount returns correct count for SESSION_COMPLETED', () => {
        node_assert_1.default.strictEqual(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.SESSION_COMPLETED), 0);
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_COMPLETED, () => { });
        node_assert_1.default.strictEqual(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.SESSION_COMPLETED), 1);
        event_bus_1.eventBus.once(event_bus_1.ServiceEvents.SESSION_COMPLETED, () => { });
        node_assert_1.default.strictEqual(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.SESSION_COMPLETED), 2);
    });
});
// ============================================================================
// emitTyped / onTyped TYPE-SAFE TESTS
// ============================================================================
(0, node_test_1.describe)('emitTyped / onTyped for SESSION_COMPLETED', () => {
    (0, node_test_1.default)('emitTyped emits SESSION_COMPLETED with typed payload', () => {
        let received = null;
        (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, (data) => {
            received = data;
        });
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 'session_typed_1',
            coachId: 'coach_typed',
            athleteIds: ['athlete_typed_1', 'athlete_typed_2'],
            bookingId: 'booking_typed',
            price: 45,
            athleteName: 'Typed Athlete',
        });
        node_assert_1.default.ok(received);
        node_assert_1.default.strictEqual(received.sessionId, 'session_typed_1');
        node_assert_1.default.strictEqual(received.coachId, 'coach_typed');
        node_assert_1.default.deepStrictEqual(received.athleteIds, ['athlete_typed_1', 'athlete_typed_2']);
        node_assert_1.default.strictEqual(received.bookingId, 'booking_typed');
        node_assert_1.default.strictEqual(received.price, 45);
        node_assert_1.default.strictEqual(received.athleteName, 'Typed Athlete');
    });
    (0, node_test_1.default)('onTyped returns unsubscribe function', () => {
        let count = 0;
        const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, () => { count++; });
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 's1',
            coachId: 'c1',
            athleteIds: ['a1'],
        });
        node_assert_1.default.strictEqual(count, 1);
        unsub();
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 's2',
            coachId: 'c1',
            athleteIds: ['a1'],
        });
        node_assert_1.default.strictEqual(count, 1, 'Should not increment after unsub');
    });
    (0, node_test_1.default)('SESSION_COMPLETED payload includes optional fields', () => {
        let received = null;
        (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, (data) => {
            received = data;
        });
        // Emit with all optional fields
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 'session_full',
            coachId: 'coach_1',
            athleteIds: ['a1'],
            bookingId: 'booking_1',
            price: 75,
            athleteName: 'Emma',
        });
        node_assert_1.default.ok(received);
        node_assert_1.default.strictEqual(received.bookingId, 'booking_1');
        node_assert_1.default.strictEqual(received.price, 75);
        node_assert_1.default.strictEqual(received.athleteName, 'Emma');
    });
    (0, node_test_1.default)('SESSION_COMPLETED payload works with minimal required fields', () => {
        let received = null;
        (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, (data) => {
            received = data;
        });
        // Emit with only required fields
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 'session_min',
            coachId: 'coach_1',
            athleteIds: ['a1'],
        });
        node_assert_1.default.ok(received);
        node_assert_1.default.strictEqual(received.sessionId, 'session_min');
        node_assert_1.default.strictEqual(received.bookingId, undefined);
        node_assert_1.default.strictEqual(received.price, undefined);
        node_assert_1.default.strictEqual(received.athleteName, undefined);
    });
});
// ============================================================================
// COMPLETION FLOW INTEGRATION TESTS
// ============================================================================
(0, node_test_1.describe)('Session Completion Flow — event emission pattern', () => {
    (0, node_test_1.default)('simulates completion flow: emit SESSION_COMPLETED with booking context', () => {
        // This simulates what handleComplete() does in complete.tsx
        const events = [];
        (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, (data) => {
            events.push(data);
        });
        // Simulate: coach completes a booking-based session with 2 athletes
        const sessionId = 'offering_123';
        const coachId = 'coach_sarah';
        const attendingAthleteIds = ['athlete_tom', 'athlete_emma'];
        const sourceType = 'booking';
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId,
            bookingId: sourceType === 'booking' ? sessionId : undefined,
            coachId,
            athleteIds: attendingAthleteIds,
            athleteName: 'Tom Wilson', // first attending athlete
        });
        node_assert_1.default.strictEqual(events.length, 1);
        const event = events[0];
        node_assert_1.default.strictEqual(event.sessionId, 'offering_123');
        node_assert_1.default.strictEqual(event.bookingId, 'offering_123'); // booking source type
        node_assert_1.default.strictEqual(event.coachId, 'coach_sarah');
        node_assert_1.default.deepStrictEqual(event.athleteIds, ['athlete_tom', 'athlete_emma']);
        node_assert_1.default.strictEqual(event.athleteName, 'Tom Wilson');
    });
    (0, node_test_1.default)('simulates completion flow: emit SESSION_COMPLETED for session offering (no bookingId)', () => {
        const events = [];
        (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, (data) => {
            events.push(data);
        });
        // Simulate: coach completes a session offering (not a booking)
        const sessionId = 'session_xyz';
        const coachId = 'coach_marcus';
        const sourceType = 'offering';
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId,
            bookingId: sourceType === 'booking' ? sessionId : undefined,
            coachId,
            athleteIds: ['athlete_1'],
            athleteName: 'Emma Davis',
        });
        node_assert_1.default.strictEqual(events.length, 1);
        const event = events[0];
        node_assert_1.default.strictEqual(event.bookingId, undefined); // offering source type
    });
    (0, node_test_1.default)('handler errors do not prevent other handlers from firing', () => {
        let handlerBFired = false;
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_COMPLETED, () => {
            throw new Error('Handler A exploded');
        });
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_COMPLETED, () => {
            handlerBFired = true;
        });
        event_bus_1.eventBus.emit(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 's1',
            coachId: 'c1',
            athleteIds: ['a1'],
        });
        node_assert_1.default.strictEqual(handlerBFired, true, 'Second handler should still fire despite first handler error');
    });
    (0, node_test_1.default)('SESSION_COMPLETED does not trigger other event handlers', () => {
        let completedFired = false;
        let cancelledFired = false;
        let createdFired = false;
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_COMPLETED, () => { completedFired = true; });
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_CANCELLED, () => { cancelledFired = true; });
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SESSION_CREATED, () => { createdFired = true; });
        event_bus_1.eventBus.emit(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 's1',
            coachId: 'c1',
            athleteIds: ['a1'],
        });
        node_assert_1.default.strictEqual(completedFired, true, 'SESSION_COMPLETED handler should fire');
        node_assert_1.default.strictEqual(cancelledFired, false, 'SESSION_CANCELLED handler should NOT fire');
        node_assert_1.default.strictEqual(createdFired, false, 'SESSION_CREATED handler should NOT fire');
    });
});
