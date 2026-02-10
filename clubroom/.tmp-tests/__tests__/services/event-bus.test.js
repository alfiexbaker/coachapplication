"use strict";
/**
 * Event Bus Tests
 *
 * Tests for the core EventBus class, ServiceEvents constants,
 * and typed helper functions (emitTyped, onTyped).
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
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const event_bus_1 = require("../../services/event-bus");
(0, node_test_1.describe)('EventBus', () => {
    (0, node_test_1.beforeEach)(() => {
        event_bus_1.eventBus.clearAll();
    });
    // ---------------------------------------------------------------------------
    // on / emit
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('on + emit', () => {
        (0, node_test_1.default)('handler receives emitted data', () => {
            const received = [];
            event_bus_1.eventBus.on('test:event', (data) => received.push(data));
            event_bus_1.eventBus.emit('test:event', { id: 'abc' });
            strict_1.default.equal(received.length, 1);
            strict_1.default.deepEqual(received[0], { id: 'abc' });
        });
        (0, node_test_1.default)('multiple handlers for the same event all fire', () => {
            let count = 0;
            event_bus_1.eventBus.on('multi', () => count++);
            event_bus_1.eventBus.on('multi', () => count++);
            event_bus_1.eventBus.on('multi', () => count++);
            event_bus_1.eventBus.emit('multi', null);
            strict_1.default.equal(count, 3);
        });
        (0, node_test_1.default)('handlers for different events are isolated', () => {
            const aReceived = [];
            const bReceived = [];
            event_bus_1.eventBus.on('a', (d) => aReceived.push(d));
            event_bus_1.eventBus.on('b', (d) => bReceived.push(d));
            event_bus_1.eventBus.emit('a', 'hello');
            event_bus_1.eventBus.emit('b', 'world');
            strict_1.default.deepEqual(aReceived, ['hello']);
            strict_1.default.deepEqual(bReceived, ['world']);
        });
        (0, node_test_1.default)('emitting an event with no handlers does not throw', () => {
            strict_1.default.doesNotThrow(() => event_bus_1.eventBus.emit('no:listeners', {}));
        });
        (0, node_test_1.default)('handler errors are caught and do not prevent other handlers from firing', () => {
            let secondCalled = false;
            event_bus_1.eventBus.on('err:test', () => {
                throw new Error('boom');
            });
            event_bus_1.eventBus.on('err:test', () => {
                secondCalled = true;
            });
            strict_1.default.doesNotThrow(() => event_bus_1.eventBus.emit('err:test', null));
            strict_1.default.equal(secondCalled, true);
        });
    });
    // ---------------------------------------------------------------------------
    // off
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('off', () => {
        (0, node_test_1.default)('removes a specific handler', () => {
            let count = 0;
            const handler = () => count++;
            event_bus_1.eventBus.on('off:test', handler);
            event_bus_1.eventBus.emit('off:test', null);
            strict_1.default.equal(count, 1);
            event_bus_1.eventBus.off('off:test', handler);
            event_bus_1.eventBus.emit('off:test', null);
            strict_1.default.equal(count, 1); // not incremented
        });
        (0, node_test_1.default)('unsubscribe function returned by on() works', () => {
            let count = 0;
            const unsub = event_bus_1.eventBus.on('unsub:test', () => count++);
            event_bus_1.eventBus.emit('unsub:test', null);
            strict_1.default.equal(count, 1);
            unsub();
            event_bus_1.eventBus.emit('unsub:test', null);
            strict_1.default.equal(count, 1);
        });
    });
    // ---------------------------------------------------------------------------
    // once
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('once', () => {
        (0, node_test_1.default)('handler fires exactly once then is removed', () => {
            let count = 0;
            event_bus_1.eventBus.once('once:test', () => count++);
            event_bus_1.eventBus.emit('once:test', null);
            event_bus_1.eventBus.emit('once:test', null);
            event_bus_1.eventBus.emit('once:test', null);
            strict_1.default.equal(count, 1);
        });
        (0, node_test_1.default)('unsubscribe function from once() prevents the handler from firing', () => {
            let count = 0;
            const unsub = event_bus_1.eventBus.once('once:unsub', () => count++);
            unsub();
            event_bus_1.eventBus.emit('once:unsub', null);
            strict_1.default.equal(count, 0);
        });
        (0, node_test_1.default)('once handler receives correct data', () => {
            let received = null;
            event_bus_1.eventBus.once('once:data', (d) => {
                received = d;
            });
            event_bus_1.eventBus.emit('once:data', { key: 'value' });
            strict_1.default.deepEqual(received, { key: 'value' });
        });
        (0, node_test_1.default)('once handler errors are caught', () => {
            event_bus_1.eventBus.once('once:err', () => {
                throw new Error('once boom');
            });
            strict_1.default.doesNotThrow(() => event_bus_1.eventBus.emit('once:err', null));
        });
    });
    // ---------------------------------------------------------------------------
    // clear / clearAll
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('clear', () => {
        (0, node_test_1.default)('removes all handlers for a specific event', () => {
            let aCount = 0;
            let bCount = 0;
            event_bus_1.eventBus.on('clear:a', () => aCount++);
            event_bus_1.eventBus.on('clear:a', () => aCount++);
            event_bus_1.eventBus.on('clear:b', () => bCount++);
            event_bus_1.eventBus.clear('clear:a');
            event_bus_1.eventBus.emit('clear:a', null);
            event_bus_1.eventBus.emit('clear:b', null);
            strict_1.default.equal(aCount, 0);
            strict_1.default.equal(bCount, 1);
        });
        (0, node_test_1.default)('clear also removes once handlers', () => {
            let count = 0;
            event_bus_1.eventBus.once('clear:once', () => count++);
            event_bus_1.eventBus.clear('clear:once');
            event_bus_1.eventBus.emit('clear:once', null);
            strict_1.default.equal(count, 0);
        });
    });
    (0, node_test_1.describe)('clearAll', () => {
        (0, node_test_1.default)('removes all handlers for all events', () => {
            let total = 0;
            event_bus_1.eventBus.on('all:a', () => total++);
            event_bus_1.eventBus.on('all:b', () => total++);
            event_bus_1.eventBus.once('all:c', () => total++);
            event_bus_1.eventBus.clearAll();
            event_bus_1.eventBus.emit('all:a', null);
            event_bus_1.eventBus.emit('all:b', null);
            event_bus_1.eventBus.emit('all:c', null);
            strict_1.default.equal(total, 0);
        });
    });
    // ---------------------------------------------------------------------------
    // listenerCount
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('listenerCount', () => {
        (0, node_test_1.default)('returns 0 for events with no handlers', () => {
            strict_1.default.equal(event_bus_1.eventBus.listenerCount('no:handlers'), 0);
        });
        (0, node_test_1.default)('counts regular handlers', () => {
            event_bus_1.eventBus.on('count:test', () => { });
            event_bus_1.eventBus.on('count:test', () => { });
            strict_1.default.equal(event_bus_1.eventBus.listenerCount('count:test'), 2);
        });
        (0, node_test_1.default)('counts once handlers', () => {
            event_bus_1.eventBus.once('count:once', () => { });
            strict_1.default.equal(event_bus_1.eventBus.listenerCount('count:once'), 1);
        });
        (0, node_test_1.default)('counts both regular and once handlers', () => {
            event_bus_1.eventBus.on('count:both', () => { });
            event_bus_1.eventBus.once('count:both', () => { });
            strict_1.default.equal(event_bus_1.eventBus.listenerCount('count:both'), 2);
        });
        (0, node_test_1.default)('count decreases after off', () => {
            const handler = () => { };
            event_bus_1.eventBus.on('count:off', handler);
            strict_1.default.equal(event_bus_1.eventBus.listenerCount('count:off'), 1);
            event_bus_1.eventBus.off('count:off', handler);
            strict_1.default.equal(event_bus_1.eventBus.listenerCount('count:off'), 0);
        });
    });
});
// ---------------------------------------------------------------------------
// ServiceEvents constants
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('ServiceEvents', () => {
    (0, node_test_1.default)('all event values are unique strings', () => {
        const values = Object.values(event_bus_1.ServiceEvents);
        const unique = new Set(values);
        strict_1.default.equal(values.length, unique.size, 'Duplicate event values detected');
    });
    (0, node_test_1.default)('contains expected core events', () => {
        strict_1.default.equal(event_bus_1.ServiceEvents.BOOKING_CREATED, 'booking:created');
        strict_1.default.equal(event_bus_1.ServiceEvents.SESSION_COMPLETED, 'session:completed');
        strict_1.default.equal(event_bus_1.ServiceEvents.USER_LOGGED_IN, 'user:logged_in');
        strict_1.default.equal(event_bus_1.ServiceEvents.PAYMENT_SUCCEEDED, 'payment:succeeded');
        strict_1.default.equal(event_bus_1.ServiceEvents.BADGE_EARNED, 'achievement:badge_earned');
        strict_1.default.equal(event_bus_1.ServiceEvents.CLUB_POST_CREATED, 'club:post:created');
    });
    (0, node_test_1.default)('has at least 40 events defined', () => {
        const count = Object.keys(event_bus_1.ServiceEvents).length;
        strict_1.default.ok(count >= 40, `Expected at least 40 events, got ${count}`);
    });
});
// ---------------------------------------------------------------------------
// Typed helpers: emitTyped / onTyped
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('emitTyped / onTyped', () => {
    (0, node_test_1.beforeEach)(() => {
        event_bus_1.eventBus.clearAll();
    });
    (0, node_test_1.default)('onTyped receives typed payload from emitTyped', () => {
        let received = null;
        (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.BOOKING_CREATED, (data) => {
            received = data;
        });
        const payload = {
            bookingId: 'bk_123',
            userId: 'u_456',
            coachId: 'c_789',
        };
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.BOOKING_CREATED, payload);
        strict_1.default.deepEqual(received, payload);
    });
    (0, node_test_1.default)('onTyped returns an unsubscribe function', () => {
        let count = 0;
        const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.USER_LOGGED_IN, () => {
            count++;
        });
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.USER_LOGGED_IN, { userId: 'u1', role: 'coach' });
        strict_1.default.equal(count, 1);
        unsub();
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.USER_LOGGED_IN, { userId: 'u2', role: 'parent' });
        strict_1.default.equal(count, 1);
    });
    (0, node_test_1.default)('multiple typed subscribers receive the same event', () => {
        const received = [];
        (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, (d) => received.push(d.sessionId));
        (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, (d) => received.push(d.coachId));
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SESSION_COMPLETED, {
            sessionId: 's1',
            coachId: 'c1',
            athleteIds: ['a1'],
        });
        strict_1.default.deepEqual(received, ['s1', 'c1']);
    });
});
