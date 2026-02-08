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

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

import { eventBus, ServiceEvents, emitTyped, onTyped } from '../../services/event-bus';

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  eventBus.clearAll();
});

// ============================================================================
// ServiceEvents CONSTANT TESTS
// ============================================================================

describe('ServiceEvents.SESSION_COMPLETED', () => {
  test('maps to "session:completed" event string', () => {
    assert.strictEqual(ServiceEvents.SESSION_COMPLETED, 'session:completed');
  });

  test('is defined as a constant alongside other session events', () => {
    assert.ok(ServiceEvents.SESSION_CREATED);
    assert.ok(ServiceEvents.SESSION_UPDATED);
    assert.ok(ServiceEvents.SESSION_STARTED);
    assert.ok(ServiceEvents.SESSION_COMPLETED);
    assert.ok(ServiceEvents.SESSION_CANCELLED);
  });
});

// ============================================================================
// EVENT BUS SESSION_COMPLETED EMISSION TESTS
// ============================================================================

describe('EventBus SESSION_COMPLETED emission', () => {
  test('emits SESSION_COMPLETED event and handler receives payload', () => {
    let received: any = null;

    eventBus.on(ServiceEvents.SESSION_COMPLETED, (data: any) => {
      received = data;
    });

    eventBus.emit(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 'session_123',
      coachId: 'coach_1',
      athleteIds: ['athlete_1', 'athlete_2'],
      bookingId: 'booking_456',
      athleteName: 'Tom Wilson',
    });

    assert.ok(received, 'Handler should have been called');
    assert.strictEqual(received.sessionId, 'session_123');
    assert.strictEqual(received.coachId, 'coach_1');
    assert.deepStrictEqual(received.athleteIds, ['athlete_1', 'athlete_2']);
    assert.strictEqual(received.bookingId, 'booking_456');
    assert.strictEqual(received.athleteName, 'Tom Wilson');
  });

  test('emits SESSION_COMPLETED with optional bookingId undefined (session offering)', () => {
    let received: any = null;

    eventBus.on(ServiceEvents.SESSION_COMPLETED, (data: any) => {
      received = data;
    });

    eventBus.emit(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 'session_789',
      coachId: 'coach_2',
      athleteIds: ['athlete_3'],
      bookingId: undefined,
    });

    assert.ok(received);
    assert.strictEqual(received.sessionId, 'session_789');
    assert.strictEqual(received.bookingId, undefined);
  });

  test('multiple handlers all receive the event', () => {
    let count = 0;

    eventBus.on(ServiceEvents.SESSION_COMPLETED, () => { count++; });
    eventBus.on(ServiceEvents.SESSION_COMPLETED, () => { count++; });
    eventBus.on(ServiceEvents.SESSION_COMPLETED, () => { count++; });

    eventBus.emit(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 's1',
      coachId: 'c1',
      athleteIds: ['a1'],
    });

    assert.strictEqual(count, 3, 'All three handlers should fire');
  });

  test('once handler fires exactly once for SESSION_COMPLETED', () => {
    let count = 0;

    eventBus.once(ServiceEvents.SESSION_COMPLETED, () => { count++; });

    eventBus.emit(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 's1',
      coachId: 'c1',
      athleteIds: ['a1'],
    });

    eventBus.emit(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 's2',
      coachId: 'c1',
      athleteIds: ['a1'],
    });

    assert.strictEqual(count, 1, 'Once handler should fire only once');
  });

  test('unsubscribe removes handler', () => {
    let count = 0;

    const unsub = eventBus.on(ServiceEvents.SESSION_COMPLETED, () => { count++; });

    eventBus.emit(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 's1',
      coachId: 'c1',
      athleteIds: ['a1'],
    });

    assert.strictEqual(count, 1);

    unsub();

    eventBus.emit(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 's2',
      coachId: 'c1',
      athleteIds: ['a1'],
    });

    assert.strictEqual(count, 1, 'Handler should not fire after unsubscribe');
  });

  test('clear removes all handlers for SESSION_COMPLETED', () => {
    let count = 0;

    eventBus.on(ServiceEvents.SESSION_COMPLETED, () => { count++; });
    eventBus.on(ServiceEvents.SESSION_COMPLETED, () => { count++; });

    eventBus.clear(ServiceEvents.SESSION_COMPLETED);

    eventBus.emit(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 's1',
      coachId: 'c1',
      athleteIds: ['a1'],
    });

    assert.strictEqual(count, 0, 'No handlers should fire after clear');
  });

  test('listenerCount returns correct count for SESSION_COMPLETED', () => {
    assert.strictEqual(eventBus.listenerCount(ServiceEvents.SESSION_COMPLETED), 0);

    eventBus.on(ServiceEvents.SESSION_COMPLETED, () => {});
    assert.strictEqual(eventBus.listenerCount(ServiceEvents.SESSION_COMPLETED), 1);

    eventBus.once(ServiceEvents.SESSION_COMPLETED, () => {});
    assert.strictEqual(eventBus.listenerCount(ServiceEvents.SESSION_COMPLETED), 2);
  });
});

// ============================================================================
// emitTyped / onTyped TYPE-SAFE TESTS
// ============================================================================

describe('emitTyped / onTyped for SESSION_COMPLETED', () => {
  test('emitTyped emits SESSION_COMPLETED with typed payload', () => {
    let received: any = null;

    onTyped(ServiceEvents.SESSION_COMPLETED, (data) => {
      received = data;
    });

    emitTyped(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 'session_typed_1',
      coachId: 'coach_typed',
      athleteIds: ['athlete_typed_1', 'athlete_typed_2'],
      bookingId: 'booking_typed',
      price: 45,
      athleteName: 'Typed Athlete',
    });

    assert.ok(received);
    assert.strictEqual(received.sessionId, 'session_typed_1');
    assert.strictEqual(received.coachId, 'coach_typed');
    assert.deepStrictEqual(received.athleteIds, ['athlete_typed_1', 'athlete_typed_2']);
    assert.strictEqual(received.bookingId, 'booking_typed');
    assert.strictEqual(received.price, 45);
    assert.strictEqual(received.athleteName, 'Typed Athlete');
  });

  test('onTyped returns unsubscribe function', () => {
    let count = 0;

    const unsub = onTyped(ServiceEvents.SESSION_COMPLETED, () => { count++; });

    emitTyped(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 's1',
      coachId: 'c1',
      athleteIds: ['a1'],
    });

    assert.strictEqual(count, 1);

    unsub();

    emitTyped(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 's2',
      coachId: 'c1',
      athleteIds: ['a1'],
    });

    assert.strictEqual(count, 1, 'Should not increment after unsub');
  });

  test('SESSION_COMPLETED payload includes optional fields', () => {
    let received: any = null;

    onTyped(ServiceEvents.SESSION_COMPLETED, (data) => {
      received = data;
    });

    // Emit with all optional fields
    emitTyped(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 'session_full',
      coachId: 'coach_1',
      athleteIds: ['a1'],
      bookingId: 'booking_1',
      price: 75,
      athleteName: 'Emma',
    });

    assert.ok(received);
    assert.strictEqual(received.bookingId, 'booking_1');
    assert.strictEqual(received.price, 75);
    assert.strictEqual(received.athleteName, 'Emma');
  });

  test('SESSION_COMPLETED payload works with minimal required fields', () => {
    let received: any = null;

    onTyped(ServiceEvents.SESSION_COMPLETED, (data) => {
      received = data;
    });

    // Emit with only required fields
    emitTyped(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 'session_min',
      coachId: 'coach_1',
      athleteIds: ['a1'],
    });

    assert.ok(received);
    assert.strictEqual(received.sessionId, 'session_min');
    assert.strictEqual(received.bookingId, undefined);
    assert.strictEqual(received.price, undefined);
    assert.strictEqual(received.athleteName, undefined);
  });
});

// ============================================================================
// COMPLETION FLOW INTEGRATION TESTS
// ============================================================================

describe('Session Completion Flow — event emission pattern', () => {
  test('simulates completion flow: emit SESSION_COMPLETED with booking context', () => {
    // This simulates what handleComplete() does in complete.tsx
    const events: any[] = [];

    onTyped(ServiceEvents.SESSION_COMPLETED, (data) => {
      events.push(data);
    });

    // Simulate: coach completes a booking-based session with 2 athletes
    const sessionId = 'offering_123';
    const coachId = 'coach_sarah';
    const attendingAthleteIds = ['athlete_tom', 'athlete_emma'];
    const sourceType = 'booking';

    emitTyped(ServiceEvents.SESSION_COMPLETED, {
      sessionId,
      bookingId: sourceType === 'booking' ? sessionId : undefined,
      coachId,
      athleteIds: attendingAthleteIds,
      athleteName: 'Tom Wilson', // first attending athlete
    });

    assert.strictEqual(events.length, 1);
    const event = events[0];
    assert.strictEqual(event.sessionId, 'offering_123');
    assert.strictEqual(event.bookingId, 'offering_123'); // booking source type
    assert.strictEqual(event.coachId, 'coach_sarah');
    assert.deepStrictEqual(event.athleteIds, ['athlete_tom', 'athlete_emma']);
    assert.strictEqual(event.athleteName, 'Tom Wilson');
  });

  test('simulates completion flow: emit SESSION_COMPLETED for session offering (no bookingId)', () => {
    const events: any[] = [];

    onTyped(ServiceEvents.SESSION_COMPLETED, (data) => {
      events.push(data);
    });

    // Simulate: coach completes a session offering (not a booking)
    const sessionId = 'session_xyz';
    const coachId = 'coach_marcus';
    const sourceType = 'offering';

    emitTyped(ServiceEvents.SESSION_COMPLETED, {
      sessionId,
      bookingId: sourceType === 'booking' ? sessionId : undefined,
      coachId,
      athleteIds: ['athlete_1'],
      athleteName: 'Emma Davis',
    });

    assert.strictEqual(events.length, 1);
    const event = events[0];
    assert.strictEqual(event.bookingId, undefined); // offering source type
  });

  test('handler errors do not prevent other handlers from firing', () => {
    let handlerBFired = false;

    eventBus.on(ServiceEvents.SESSION_COMPLETED, () => {
      throw new Error('Handler A exploded');
    });

    eventBus.on(ServiceEvents.SESSION_COMPLETED, () => {
      handlerBFired = true;
    });

    eventBus.emit(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 's1',
      coachId: 'c1',
      athleteIds: ['a1'],
    });

    assert.strictEqual(handlerBFired, true, 'Second handler should still fire despite first handler error');
  });

  test('SESSION_COMPLETED does not trigger other event handlers', () => {
    let completedFired = false;
    let cancelledFired = false;
    let createdFired = false;

    eventBus.on(ServiceEvents.SESSION_COMPLETED, () => { completedFired = true; });
    eventBus.on(ServiceEvents.SESSION_CANCELLED, () => { cancelledFired = true; });
    eventBus.on(ServiceEvents.SESSION_CREATED, () => { createdFired = true; });

    eventBus.emit(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 's1',
      coachId: 'c1',
      athleteIds: ['a1'],
    });

    assert.strictEqual(completedFired, true, 'SESSION_COMPLETED handler should fire');
    assert.strictEqual(cancelledFired, false, 'SESSION_CANCELLED handler should NOT fire');
    assert.strictEqual(createdFired, false, 'SESSION_CREATED handler should NOT fire');
  });
});
