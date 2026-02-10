/**
 * Event Bus Tests
 *
 * Tests for the core EventBus class, ServiceEvents constants,
 * and typed helper functions (emitTyped, onTyped).
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { eventBus, ServiceEvents, emitTyped, onTyped } from '../../services/event-bus';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clearAll();
  });

  // ---------------------------------------------------------------------------
  // on / emit
  // ---------------------------------------------------------------------------

  describe('on + emit', () => {
    test('handler receives emitted data', () => {
      const received: unknown[] = [];
      eventBus.on('test:event', (data) => received.push(data));

      eventBus.emit('test:event', { id: 'abc' });

      assert.equal(received.length, 1);
      assert.deepEqual(received[0], { id: 'abc' });
    });

    test('multiple handlers for the same event all fire', () => {
      let count = 0;
      eventBus.on('multi', () => count++);
      eventBus.on('multi', () => count++);
      eventBus.on('multi', () => count++);

      eventBus.emit('multi', null);
      assert.equal(count, 3);
    });

    test('handlers for different events are isolated', () => {
      const aReceived: string[] = [];
      const bReceived: string[] = [];

      eventBus.on<string>('a', (d) => aReceived.push(d));
      eventBus.on<string>('b', (d) => bReceived.push(d));

      eventBus.emit('a', 'hello');
      eventBus.emit('b', 'world');

      assert.deepEqual(aReceived, ['hello']);
      assert.deepEqual(bReceived, ['world']);
    });

    test('emitting an event with no handlers does not throw', () => {
      assert.doesNotThrow(() => eventBus.emit('no:listeners', {}));
    });

    test('handler errors are caught and do not prevent other handlers from firing', () => {
      let secondCalled = false;
      eventBus.on('err:test', () => {
        throw new Error('boom');
      });
      eventBus.on('err:test', () => {
        secondCalled = true;
      });

      assert.doesNotThrow(() => eventBus.emit('err:test', null));
      assert.equal(secondCalled, true);
    });
  });

  // ---------------------------------------------------------------------------
  // off
  // ---------------------------------------------------------------------------

  describe('off', () => {
    test('removes a specific handler', () => {
      let count = 0;
      const handler = () => count++;

      eventBus.on('off:test', handler);
      eventBus.emit('off:test', null);
      assert.equal(count, 1);

      eventBus.off('off:test', handler);
      eventBus.emit('off:test', null);
      assert.equal(count, 1); // not incremented
    });

    test('unsubscribe function returned by on() works', () => {
      let count = 0;
      const unsub = eventBus.on('unsub:test', () => count++);

      eventBus.emit('unsub:test', null);
      assert.equal(count, 1);

      unsub();
      eventBus.emit('unsub:test', null);
      assert.equal(count, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // once
  // ---------------------------------------------------------------------------

  describe('once', () => {
    test('handler fires exactly once then is removed', () => {
      let count = 0;
      eventBus.once('once:test', () => count++);

      eventBus.emit('once:test', null);
      eventBus.emit('once:test', null);
      eventBus.emit('once:test', null);

      assert.equal(count, 1);
    });

    test('unsubscribe function from once() prevents the handler from firing', () => {
      let count = 0;
      const unsub = eventBus.once('once:unsub', () => count++);

      unsub();
      eventBus.emit('once:unsub', null);
      assert.equal(count, 0);
    });

    test('once handler receives correct data', () => {
      let received: unknown = null;
      eventBus.once('once:data', (d) => {
        received = d;
      });

      eventBus.emit('once:data', { key: 'value' });
      assert.deepEqual(received, { key: 'value' });
    });

    test('once handler errors are caught', () => {
      eventBus.once('once:err', () => {
        throw new Error('once boom');
      });
      assert.doesNotThrow(() => eventBus.emit('once:err', null));
    });
  });

  // ---------------------------------------------------------------------------
  // clear / clearAll
  // ---------------------------------------------------------------------------

  describe('clear', () => {
    test('removes all handlers for a specific event', () => {
      let aCount = 0;
      let bCount = 0;

      eventBus.on('clear:a', () => aCount++);
      eventBus.on('clear:a', () => aCount++);
      eventBus.on('clear:b', () => bCount++);

      eventBus.clear('clear:a');

      eventBus.emit('clear:a', null);
      eventBus.emit('clear:b', null);

      assert.equal(aCount, 0);
      assert.equal(bCount, 1);
    });

    test('clear also removes once handlers', () => {
      let count = 0;
      eventBus.once('clear:once', () => count++);

      eventBus.clear('clear:once');
      eventBus.emit('clear:once', null);
      assert.equal(count, 0);
    });
  });

  describe('clearAll', () => {
    test('removes all handlers for all events', () => {
      let total = 0;
      eventBus.on('all:a', () => total++);
      eventBus.on('all:b', () => total++);
      eventBus.once('all:c', () => total++);

      eventBus.clearAll();

      eventBus.emit('all:a', null);
      eventBus.emit('all:b', null);
      eventBus.emit('all:c', null);

      assert.equal(total, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // listenerCount
  // ---------------------------------------------------------------------------

  describe('listenerCount', () => {
    test('returns 0 for events with no handlers', () => {
      assert.equal(eventBus.listenerCount('no:handlers'), 0);
    });

    test('counts regular handlers', () => {
      eventBus.on('count:test', () => {});
      eventBus.on('count:test', () => {});
      assert.equal(eventBus.listenerCount('count:test'), 2);
    });

    test('counts once handlers', () => {
      eventBus.once('count:once', () => {});
      assert.equal(eventBus.listenerCount('count:once'), 1);
    });

    test('counts both regular and once handlers', () => {
      eventBus.on('count:both', () => {});
      eventBus.once('count:both', () => {});
      assert.equal(eventBus.listenerCount('count:both'), 2);
    });

    test('count decreases after off', () => {
      const handler = () => {};
      eventBus.on('count:off', handler);
      assert.equal(eventBus.listenerCount('count:off'), 1);

      eventBus.off('count:off', handler);
      assert.equal(eventBus.listenerCount('count:off'), 0);
    });
  });
});

// ---------------------------------------------------------------------------
// ServiceEvents constants
// ---------------------------------------------------------------------------

describe('ServiceEvents', () => {
  test('all event values are unique strings', () => {
    const values = Object.values(ServiceEvents);
    const unique = new Set(values);
    assert.equal(values.length, unique.size, 'Duplicate event values detected');
  });

  test('contains expected core events', () => {
    assert.equal(ServiceEvents.BOOKING_CREATED, 'booking:created');
    assert.equal(ServiceEvents.SESSION_COMPLETED, 'session:completed');
    assert.equal(ServiceEvents.USER_LOGGED_IN, 'user:logged_in');
    assert.equal(ServiceEvents.PAYMENT_SUCCEEDED, 'payment:succeeded');
    assert.equal(ServiceEvents.BADGE_EARNED, 'achievement:badge_earned');
    assert.equal(ServiceEvents.CLUB_POST_CREATED, 'club:post:created');
  });

  test('has at least 40 events defined', () => {
    const count = Object.keys(ServiceEvents).length;
    assert.ok(count >= 40, `Expected at least 40 events, got ${count}`);
  });
});

// ---------------------------------------------------------------------------
// Typed helpers: emitTyped / onTyped
// ---------------------------------------------------------------------------

describe('emitTyped / onTyped', () => {
  beforeEach(() => {
    eventBus.clearAll();
  });

  test('onTyped receives typed payload from emitTyped', () => {
    let received: unknown = null;
    onTyped(ServiceEvents.BOOKING_CREATED, (data) => {
      received = data;
    });

    const payload = {
      bookingId: 'bk_123',
      userId: 'u_456',
      coachId: 'c_789',
    };
    emitTyped(ServiceEvents.BOOKING_CREATED, payload);

    assert.deepEqual(received, payload);
  });

  test('onTyped returns an unsubscribe function', () => {
    let count = 0;
    const unsub = onTyped(ServiceEvents.USER_LOGGED_IN, () => {
      count++;
    });

    emitTyped(ServiceEvents.USER_LOGGED_IN, { userId: 'u1', role: 'coach' });
    assert.equal(count, 1);

    unsub();
    emitTyped(ServiceEvents.USER_LOGGED_IN, { userId: 'u2', role: 'parent' });
    assert.equal(count, 1);
  });

  test('multiple typed subscribers receive the same event', () => {
    const received: string[] = [];

    onTyped(ServiceEvents.SESSION_COMPLETED, (d) => received.push(d.sessionId));
    onTyped(ServiceEvents.SESSION_COMPLETED, (d) => received.push(d.coachId));

    emitTyped(ServiceEvents.SESSION_COMPLETED, {
      sessionId: 's1',
      coachId: 'c1',
      athleteIds: ['a1'],
    });

    assert.deepEqual(received, ['s1', 'c1']);
  });
});
