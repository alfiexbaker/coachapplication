"use strict";
/**
 * Service Subscribers Tests
 *
 * Tests for initializeSubscribers and teardownSubscribers.
 * Verifies that event handlers are registered and cleaned up properly,
 * and that key events trigger expected side effects.
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
const service_subscribers_1 = require("../../services/service-subscribers");
(0, node_test_1.describe)('ServiceSubscribers', () => {
    (0, node_test_1.afterEach)(() => {
        (0, service_subscribers_1.teardownSubscribers)();
        event_bus_1.eventBus.clearAll();
    });
    // ---------------------------------------------------------------------------
    // initializeSubscribers
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('initializeSubscribers', () => {
        (0, node_test_1.default)('registers handlers for booking events', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.BOOKING_CREATED) > 0, 'Should have handlers for BOOKING_CREATED');
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.BOOKING_CONFIRMED) > 0, 'Should have handlers for BOOKING_CONFIRMED');
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.BOOKING_CANCELLED) > 0, 'Should have handlers for BOOKING_CANCELLED');
        });
        (0, node_test_1.default)('registers handlers for session events', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.SESSION_COMPLETED) > 0, 'Should have handlers for SESSION_COMPLETED');
        });
        (0, node_test_1.default)('registers handlers for payment events', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.PAYMENT_SUCCEEDED) > 0, 'Should have handlers for PAYMENT_SUCCEEDED');
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.PAYMENT_FAILED) > 0, 'Should have handlers for PAYMENT_FAILED');
        });
        (0, node_test_1.default)('registers handlers for user lifecycle events', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.USER_LOGGED_IN) > 0, 'Should have handlers for USER_LOGGED_IN');
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.USER_LOGGED_OUT) > 0, 'Should have handlers for USER_LOGGED_OUT');
        });
        (0, node_test_1.default)('registers handlers for squad events', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.SQUAD_CREATED) > 0, 'Should have handlers for SQUAD_CREATED');
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.SQUAD_DELETED) > 0, 'Should have handlers for SQUAD_DELETED');
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.SQUAD_MEMBER_ADDED) > 0, 'Should have handlers for SQUAD_MEMBER_ADDED');
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.SQUAD_MEMBER_REMOVED) > 0, 'Should have handlers for SQUAD_MEMBER_REMOVED');
        });
        (0, node_test_1.default)('registers handlers for comment events', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.COMMENT_CREATED) > 0, 'Should have handlers for COMMENT_CREATED');
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.COMMENT_DELETED) > 0, 'Should have handlers for COMMENT_DELETED');
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.COMMENT_LIKED) > 0, 'Should have handlers for COMMENT_LIKED');
        });
        (0, node_test_1.default)('registers handlers for connection events', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.CONNECTION_CHANGED) > 0, 'Should have handlers for CONNECTION_CHANGED');
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.QUEUE_FLUSHED) > 0, 'Should have handlers for QUEUE_FLUSHED');
        });
        (0, node_test_1.default)('is idempotent — calling twice does not double handlers', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            const firstCount = event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.BOOKING_CREATED);
            (0, service_subscribers_1.initializeSubscribers)();
            const secondCount = event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.BOOKING_CREATED);
            strict_1.default.equal(firstCount, secondCount, 'Handler count should not double');
        });
    });
    // ---------------------------------------------------------------------------
    // teardownSubscribers
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('teardownSubscribers', () => {
        (0, node_test_1.default)('removes all registered handlers', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            // Verify some handlers exist
            strict_1.default.ok(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.BOOKING_CREATED) > 0);
            (0, service_subscribers_1.teardownSubscribers)();
            // All service-subscriber handlers should be gone
            strict_1.default.equal(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.BOOKING_CREATED), 0);
            strict_1.default.equal(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.SESSION_COMPLETED), 0);
            strict_1.default.equal(event_bus_1.eventBus.listenerCount(event_bus_1.ServiceEvents.PAYMENT_FAILED), 0);
        });
        (0, node_test_1.default)('is safe to call multiple times', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.doesNotThrow(() => (0, service_subscribers_1.teardownSubscribers)());
            strict_1.default.doesNotThrow(() => (0, service_subscribers_1.teardownSubscribers)());
            strict_1.default.doesNotThrow(() => (0, service_subscribers_1.teardownSubscribers)());
        });
        (0, node_test_1.default)('is safe to call without prior initialize', () => {
            strict_1.default.doesNotThrow(() => (0, service_subscribers_1.teardownSubscribers)());
        });
    });
    // ---------------------------------------------------------------------------
    // Event handler execution
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('event handler execution', () => {
        (0, node_test_1.default)('BOOKING_CREATED handler does not throw', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.doesNotThrow(() => {
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.BOOKING_CREATED, {
                    bookingId: 'bk_test_123',
                    userId: 'u_test_456',
                    coachId: 'c_test_789',
                });
            });
        });
        (0, node_test_1.default)('BOOKING_CONFIRMED handler does not throw', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.doesNotThrow(() => {
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.BOOKING_CONFIRMED, {
                    bookingId: 'bk_test_234',
                    userId: 'u_test_567',
                    coachId: 'c_test_890',
                });
            });
        });
        (0, node_test_1.default)('BOOKING_CANCELLED handler does not throw', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.doesNotThrow(() => {
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.BOOKING_CANCELLED, {
                    bookingId: 'bk_test_345',
                    userId: 'u_test_678',
                    coachId: 'c_test_901',
                    reason: 'schedule conflict',
                    cancelledBy: 'coach',
                });
            });
        });
        (0, node_test_1.default)('USER_LOGGED_IN handler does not throw', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.doesNotThrow(() => {
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.USER_LOGGED_IN, {
                    userId: 'u_test_login',
                    role: 'coach',
                });
            });
        });
        (0, node_test_1.default)('USER_LOGGED_OUT handler does not throw', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.doesNotThrow(() => {
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.USER_LOGGED_OUT, {
                    userId: 'u_test_logout',
                });
            });
        });
        (0, node_test_1.default)('FAMILY_MEMBER_ADDED handler does not throw', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.doesNotThrow(() => {
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.FAMILY_MEMBER_ADDED, {
                    familyId: 'fam_test',
                    memberId: 'child_test',
                    memberName: 'Test Child',
                });
            });
        });
        (0, node_test_1.default)('CLUB_MEMBER_JOINED handler does not throw', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.doesNotThrow(() => {
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.CLUB_MEMBER_JOINED, {
                    clubId: 'club_test',
                    userId: 'u_test',
                    userName: 'Test User',
                });
            });
        });
        (0, node_test_1.default)('BADGE_EARNED handler does not throw', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.doesNotThrow(() => {
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.BADGE_EARNED, {
                    userId: 'u_test_badge',
                    badgeId: 'badge_test',
                    badgeLabel: 'First Session',
                });
            });
        });
        (0, node_test_1.default)('COMMENT_CREATED handler does not throw', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.doesNotThrow(() => {
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.COMMENT_CREATED, {
                    commentId: 'comment_test',
                    postId: 'post_test',
                    authorId: 'u_test',
                    authorName: 'Test User',
                });
            });
        });
        (0, node_test_1.default)('COACH_POST_CREATED handler does not throw', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.doesNotThrow(() => {
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.COACH_POST_CREATED, {
                    postId: 'post_test',
                    coachId: 'c_test',
                    coachName: 'Test Coach',
                    feedType: 'PERSONAL',
                    postType: 'update',
                });
            });
        });
        (0, node_test_1.default)('CONNECTION_CHANGED handler does not throw', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.doesNotThrow(() => {
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.CONNECTION_CHANGED, {
                    isConnected: true,
                    wasOffline: false,
                });
            });
        });
        (0, node_test_1.default)('QUEUE_ACTION_FAILED handler does not throw', () => {
            (0, service_subscribers_1.initializeSubscribers)();
            strict_1.default.doesNotThrow(() => {
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.QUEUE_ACTION_FAILED, {
                    actionId: 'act_test',
                    path: '/api/test',
                    method: 'POST',
                    error: 'Network error',
                    willRetry: true,
                });
            });
        });
    });
});
