/**
 * Service Subscribers Tests
 *
 * Tests for initializeSubscribers and teardownSubscribers.
 * Verifies that event handlers are registered and cleaned up properly,
 * and that key events trigger expected side effects.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';

import { eventBus, ServiceEvents, emitTyped } from '../../services/event-bus';
import {
  initializeSubscribers,
  teardownSubscribers,
} from '../../services/service-subscribers';

describe('ServiceSubscribers', () => {
  afterEach(() => {
    teardownSubscribers();
    eventBus.clearAll();
  });

  // ---------------------------------------------------------------------------
  // initializeSubscribers
  // ---------------------------------------------------------------------------

  describe('initializeSubscribers', () => {
    test('registers handlers for booking events', () => {
      initializeSubscribers();

      assert.ok(
        eventBus.listenerCount(ServiceEvents.BOOKING_CREATED) > 0,
        'Should have handlers for BOOKING_CREATED'
      );
      assert.ok(
        eventBus.listenerCount(ServiceEvents.BOOKING_CONFIRMED) > 0,
        'Should have handlers for BOOKING_CONFIRMED'
      );
      assert.ok(
        eventBus.listenerCount(ServiceEvents.BOOKING_CANCELLED) > 0,
        'Should have handlers for BOOKING_CANCELLED'
      );
    });

    test('registers handlers for session events', () => {
      initializeSubscribers();

      assert.ok(
        eventBus.listenerCount(ServiceEvents.SESSION_COMPLETED) > 0,
        'Should have handlers for SESSION_COMPLETED'
      );
    });

    test('registers handlers for payment events', () => {
      initializeSubscribers();

      assert.ok(
        eventBus.listenerCount(ServiceEvents.PAYMENT_SUCCEEDED) > 0,
        'Should have handlers for PAYMENT_SUCCEEDED'
      );
      assert.ok(
        eventBus.listenerCount(ServiceEvents.PAYMENT_FAILED) > 0,
        'Should have handlers for PAYMENT_FAILED'
      );
    });

    test('registers handlers for user lifecycle events', () => {
      initializeSubscribers();

      assert.ok(
        eventBus.listenerCount(ServiceEvents.USER_LOGGED_IN) > 0,
        'Should have handlers for USER_LOGGED_IN'
      );
      assert.ok(
        eventBus.listenerCount(ServiceEvents.USER_LOGGED_OUT) > 0,
        'Should have handlers for USER_LOGGED_OUT'
      );
    });

    test('registers handlers for squad events', () => {
      initializeSubscribers();

      assert.ok(
        eventBus.listenerCount(ServiceEvents.SQUAD_CREATED) > 0,
        'Should have handlers for SQUAD_CREATED'
      );
      assert.ok(
        eventBus.listenerCount(ServiceEvents.SQUAD_DELETED) > 0,
        'Should have handlers for SQUAD_DELETED'
      );
      assert.ok(
        eventBus.listenerCount(ServiceEvents.SQUAD_MEMBER_ADDED) > 0,
        'Should have handlers for SQUAD_MEMBER_ADDED'
      );
      assert.ok(
        eventBus.listenerCount(ServiceEvents.SQUAD_MEMBER_REMOVED) > 0,
        'Should have handlers for SQUAD_MEMBER_REMOVED'
      );
    });

    test('registers handlers for comment events', () => {
      initializeSubscribers();

      assert.ok(
        eventBus.listenerCount(ServiceEvents.COMMENT_CREATED) > 0,
        'Should have handlers for COMMENT_CREATED'
      );
      assert.ok(
        eventBus.listenerCount(ServiceEvents.COMMENT_DELETED) > 0,
        'Should have handlers for COMMENT_DELETED'
      );
      assert.ok(
        eventBus.listenerCount(ServiceEvents.COMMENT_LIKED) > 0,
        'Should have handlers for COMMENT_LIKED'
      );
    });

    test('registers handlers for connection events', () => {
      initializeSubscribers();

      assert.ok(
        eventBus.listenerCount(ServiceEvents.CONNECTION_CHANGED) > 0,
        'Should have handlers for CONNECTION_CHANGED'
      );
      assert.ok(
        eventBus.listenerCount(ServiceEvents.QUEUE_FLUSHED) > 0,
        'Should have handlers for QUEUE_FLUSHED'
      );
    });

    test('is idempotent — calling twice does not double handlers', () => {
      initializeSubscribers();
      const firstCount = eventBus.listenerCount(ServiceEvents.BOOKING_CREATED);

      initializeSubscribers();
      const secondCount = eventBus.listenerCount(ServiceEvents.BOOKING_CREATED);

      assert.equal(firstCount, secondCount, 'Handler count should not double');
    });
  });

  // ---------------------------------------------------------------------------
  // teardownSubscribers
  // ---------------------------------------------------------------------------

  describe('teardownSubscribers', () => {
    test('removes all registered handlers', () => {
      initializeSubscribers();

      // Verify some handlers exist
      assert.ok(eventBus.listenerCount(ServiceEvents.BOOKING_CREATED) > 0);

      teardownSubscribers();

      // All service-subscriber handlers should be gone
      assert.equal(eventBus.listenerCount(ServiceEvents.BOOKING_CREATED), 0);
      assert.equal(eventBus.listenerCount(ServiceEvents.SESSION_COMPLETED), 0);
      assert.equal(eventBus.listenerCount(ServiceEvents.PAYMENT_FAILED), 0);
    });

    test('is safe to call multiple times', () => {
      initializeSubscribers();
      assert.doesNotThrow(() => teardownSubscribers());
      assert.doesNotThrow(() => teardownSubscribers());
      assert.doesNotThrow(() => teardownSubscribers());
    });

    test('is safe to call without prior initialize', () => {
      assert.doesNotThrow(() => teardownSubscribers());
    });
  });

  // ---------------------------------------------------------------------------
  // Event handler execution
  // ---------------------------------------------------------------------------

  describe('event handler execution', () => {
    test('BOOKING_CREATED handler does not throw', () => {
      initializeSubscribers();

      assert.doesNotThrow(() => {
        emitTyped(ServiceEvents.BOOKING_CREATED, {
          bookingId: 'bk_test_123',
          userId: 'u_test_456',
          coachId: 'c_test_789',
        });
      });
    });

    test('BOOKING_CONFIRMED handler does not throw', () => {
      initializeSubscribers();

      assert.doesNotThrow(() => {
        emitTyped(ServiceEvents.BOOKING_CONFIRMED, {
          bookingId: 'bk_test_234',
          userId: 'u_test_567',
          coachId: 'c_test_890',
        });
      });
    });

    test('BOOKING_CANCELLED handler does not throw', () => {
      initializeSubscribers();

      assert.doesNotThrow(() => {
        emitTyped(ServiceEvents.BOOKING_CANCELLED, {
          bookingId: 'bk_test_345',
          userId: 'u_test_678',
          coachId: 'c_test_901',
          reason: 'schedule conflict',
          cancelledBy: 'coach',
        });
      });
    });

    test('USER_LOGGED_IN handler does not throw', () => {
      initializeSubscribers();

      assert.doesNotThrow(() => {
        emitTyped(ServiceEvents.USER_LOGGED_IN, {
          userId: 'u_test_login',
          role: 'coach',
        });
      });
    });

    test('USER_LOGGED_OUT handler does not throw', () => {
      initializeSubscribers();

      assert.doesNotThrow(() => {
        emitTyped(ServiceEvents.USER_LOGGED_OUT, {
          userId: 'u_test_logout',
        });
      });
    });

    test('FAMILY_MEMBER_ADDED handler does not throw', () => {
      initializeSubscribers();

      assert.doesNotThrow(() => {
        emitTyped(ServiceEvents.FAMILY_MEMBER_ADDED, {
          familyId: 'fam_test',
          memberId: 'child_test',
          memberName: 'Test Child',
        });
      });
    });

    test('CLUB_MEMBER_JOINED handler does not throw', () => {
      initializeSubscribers();

      assert.doesNotThrow(() => {
        emitTyped(ServiceEvents.CLUB_MEMBER_JOINED, {
          clubId: 'club_test',
          userId: 'u_test',
          userName: 'Test User',
        });
      });
    });

    test('BADGE_EARNED handler does not throw', () => {
      initializeSubscribers();

      assert.doesNotThrow(() => {
        emitTyped(ServiceEvents.BADGE_EARNED, {
          userId: 'u_test_badge',
          badgeId: 'badge_test',
          badgeLabel: 'First Session',
        });
      });
    });

    test('COMMENT_CREATED handler does not throw', () => {
      initializeSubscribers();

      assert.doesNotThrow(() => {
        emitTyped(ServiceEvents.COMMENT_CREATED, {
          commentId: 'comment_test',
          postId: 'post_test',
          authorId: 'u_test',
          authorName: 'Test User',
        });
      });
    });

    test('COACH_POST_CREATED handler does not throw', () => {
      initializeSubscribers();

      assert.doesNotThrow(() => {
        emitTyped(ServiceEvents.COACH_POST_CREATED, {
          postId: 'post_test',
          coachId: 'c_test',
          coachName: 'Test Coach',
          feedType: 'PERSONAL',
          postType: 'update',
        });
      });
    });

    test('CONNECTION_CHANGED handler does not throw', () => {
      initializeSubscribers();

      assert.doesNotThrow(() => {
        emitTyped(ServiceEvents.CONNECTION_CHANGED, {
          isConnected: true,
          wasOffline: false,
        });
      });
    });

    test('QUEUE_ACTION_FAILED handler does not throw', () => {
      initializeSubscribers();

      assert.doesNotThrow(() => {
        emitTyped(ServiceEvents.QUEUE_ACTION_FAILED, {
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
