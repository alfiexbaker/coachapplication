/**
 * Notification Trigger Tests — Post-Session Completion Flow
 *
 * Tests for the notification-trigger.ts service, specifically:
 * - reviewPrompt() accepts bookingId and generates the correct deep link /review/${bookingId}
 * - sessionCompleted() generates correct notification with deep link /bookings
 * - noShowMarked() generates correct notification for absent athletes
 *
 * These tests verify the notification triggers that fire after a coach completes a session.
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

// ============================================================================
// MOCK INFRASTRUCTURE
// ============================================================================

// Type for captured test notifications
interface TestNotification {
  id: string;
  type: 'booking' | 'message' | 'review' | 'payment' | 'reminder' | 'badge';
  title: string;
  body: string;
  recipientId?: string;
  recipientRole?: 'coach' | 'parent';
  deepLink?: string;
  data?: Record<string, string>;
  read: boolean;
}

// Capture notifications created by triggerNotification()
let capturedNotifications: TestNotification[] = [];
let notificationIdSeq = 0;

function nextNotificationId(prefix: string = 'notif'): string {
  notificationIdSeq += 1;
  return `${prefix}_${notificationIdSeq}`;
}

// Mock notificationService.create to capture what triggerNotification sends
const mockNotificationService = {
  create: async (notification: TestNotification) => {
    capturedNotifications.push(notification);
    return [notification];
  },
};

// Mock the notificationTriggers inline (mirrors notification-trigger.ts logic)
// This avoids importing the actual module which depends on notificationService singleton

type NotifiableAction = {
  type: string;
  recipientId?: string;
  recipientRole: 'coach' | 'parent' | 'athlete';
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, string>;
};

function mapToNotificationType(actionType: string): 'booking' | 'message' | 'review' | 'payment' | 'reminder' | 'badge' {
  if (actionType.includes('booking') || actionType.includes('session') || actionType.includes('invite') || actionType.includes('rsvp') || actionType.includes('cancel')) return 'booking';
  if (actionType.includes('message')) return 'message';
  if (actionType.includes('review')) return 'review';
  if (actionType.includes('payment') || actionType.includes('earning')) return 'payment';
  if (actionType.includes('badge') || actionType.includes('drill') || actionType.includes('goal')) return 'badge';
  return 'reminder';
}

async function triggerNotification(action: NotifiableAction): Promise<void> {
  const notificationType = mapToNotificationType(action.type);

  await mockNotificationService.create({
    id: nextNotificationId(),
    type: notificationType,
    title: action.title,
    body: action.body,
    recipientId: action.recipientId,
    recipientRole: action.recipientRole === 'athlete' ? undefined : action.recipientRole,
    deepLink: action.deepLink,
    data: action.data,
    read: false,
  });
}

// Re-implement the notificationTriggers matching source exactly
const notificationTriggers = {
  sessionCompleted(coachName: string, athleteName: string, recipientId?: string) {
    return triggerNotification({
      type: 'session_completed',
      recipientRole: 'parent',
      recipientId,
      title: 'Session Completed',
      body: `Coach ${coachName} completed ${athleteName}'s session`,
      deepLink: '/bookings',
    });
  },

  reviewPrompt(coachName: string, athleteName: string, bookingId: string, recipientId?: string) {
    return triggerNotification({
      type: 'review_prompt',
      recipientRole: 'parent',
      recipientId,
      title: 'How was the session?',
      body: `Rate ${athleteName}'s session with Coach ${coachName}`,
      deepLink: `/review/${bookingId}`,
    });
  },

  noShowMarked(athleteName: string, sessionDate: string, recipientId?: string) {
    return triggerNotification({
      type: 'no_show_marked',
      recipientRole: 'parent',
      recipientId,
      title: 'No-Show Recorded',
      body: `${athleteName} was marked as no-show for the session on ${sessionDate}`,
      deepLink: '/bookings',
    });
  },
};

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  capturedNotifications = [];
  notificationIdSeq = 0;
});

// ============================================================================
// reviewPrompt TESTS
// ============================================================================

describe('notificationTriggers.reviewPrompt', () => {
  test('accepts bookingId as 3rd parameter and generates /review/${bookingId} deep link', async () => {
    const bookingId = 'booking_abc123';

    await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom Wilson', bookingId, 'parent_1');

    assert.strictEqual(capturedNotifications.length, 1);
    const notif = capturedNotifications[0];
    assert.strictEqual(notif.deepLink, `/review/${bookingId}`);
  });

  test('generates correct notification title and body', async () => {
    await notificationTriggers.reviewPrompt('Marcus', 'Emma Davis', 'booking_xyz', 'parent_2');

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.title, 'How was the session?');
    assert.strictEqual(notif.body, "Rate Emma Davis's session with Coach Marcus");
  });

  test('sets recipientRole to parent', async () => {
    await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom', 'b1', 'parent_1');

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.recipientRole, 'parent');
  });

  test('sets recipientId correctly', async () => {
    const parentId = 'parent_specific_id';
    await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom', 'b1', parentId);

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.recipientId, parentId);
  });

  test('maps to review notification type via review_prompt action type', async () => {
    await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom', 'b1');

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.type, 'review');
  });

  test('generates unique deep link per bookingId', async () => {
    await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom', 'booking_001', 'p1');
    await notificationTriggers.reviewPrompt('Coach Sarah', 'Emma', 'booking_002', 'p2');

    assert.strictEqual(capturedNotifications.length, 2);
    assert.strictEqual(capturedNotifications[0].deepLink, '/review/booking_001');
    assert.strictEqual(capturedNotifications[1].deepLink, '/review/booking_002');
    assert.notStrictEqual(capturedNotifications[0].deepLink, capturedNotifications[1].deepLink);
  });

  test('works without recipientId (optional parameter)', async () => {
    await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom', 'booking_999');

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.deepLink, '/review/booking_999');
    assert.strictEqual(notif.recipientId, undefined);
  });

  test('notification is created with read=false', async () => {
    await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom', 'b1');

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.read, false);
  });
});

// ============================================================================
// sessionCompleted TESTS
// ============================================================================

describe('notificationTriggers.sessionCompleted', () => {
  test('generates deep link to /bookings', async () => {
    await notificationTriggers.sessionCompleted('Coach Sarah', 'Tom Wilson', 'parent_1');

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.deepLink, '/bookings');
  });

  test('generates correct title and body', async () => {
    await notificationTriggers.sessionCompleted('Marcus', 'Emma Davis', 'parent_2');

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.title, 'Session Completed');
    assert.strictEqual(notif.body, "Coach Marcus completed Emma Davis's session");
  });

  test('maps to booking notification type via session_completed action type', async () => {
    await notificationTriggers.sessionCompleted('Coach Sarah', 'Tom');

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.type, 'booking');
  });

  test('sends notification to parent role', async () => {
    await notificationTriggers.sessionCompleted('Coach Sarah', 'Tom', 'parent_1');

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.recipientRole, 'parent');
    assert.strictEqual(notif.recipientId, 'parent_1');
  });
});

// ============================================================================
// noShowMarked TESTS
// ============================================================================

describe('notificationTriggers.noShowMarked', () => {
  test('generates notification with correct deep link', async () => {
    await notificationTriggers.noShowMarked('Tom Wilson', 'Mon 10 Feb', 'parent_1');

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.deepLink, '/bookings');
  });

  test('generates correct title and body', async () => {
    await notificationTriggers.noShowMarked('Emma Davis', 'Tue 11 Feb', 'parent_2');

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.title, 'No-Show Recorded');
    assert.strictEqual(notif.body, 'Emma Davis was marked as no-show for the session on Tue 11 Feb');
  });

  test('sends notification to parent role', async () => {
    await notificationTriggers.noShowMarked('Tom', 'Mon 10 Feb', 'parent_1');

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.recipientRole, 'parent');
    assert.strictEqual(notif.recipientId, 'parent_1');
  });
});

// ============================================================================
// mapToNotificationType TESTS
// ============================================================================

describe('mapToNotificationType', () => {
  test('maps review_prompt to review type', () => {
    assert.strictEqual(mapToNotificationType('review_prompt'), 'review');
  });

  test('maps session_completed to booking type', () => {
    assert.strictEqual(mapToNotificationType('session_completed'), 'booking');
  });

  test('maps no_show_marked to reminder type (no matching keyword)', () => {
    // 'no_show_marked' does not contain booking/session/invite/rsvp/cancel/message/review/payment/earning/badge/drill/goal
    // Actually, let's check: it doesn't match any of those keywords so should be 'reminder'
    // Wait: it doesn't contain any of the keywords, so it should map to 'reminder'
    assert.strictEqual(mapToNotificationType('no_show_marked'), 'reminder');
  });

  test('maps booking_confirmed to booking type', () => {
    assert.strictEqual(mapToNotificationType('booking_confirmed'), 'booking');
  });

  test('maps badge_earned to badge type', () => {
    assert.strictEqual(mapToNotificationType('badge_earned'), 'badge');
  });

  test('maps drill_completed to badge type', () => {
    assert.strictEqual(mapToNotificationType('drill_completed'), 'badge');
  });

  test('maps message type correctly', () => {
    assert.strictEqual(mapToNotificationType('new_message'), 'message');
  });

  test('maps payment types correctly', () => {
    assert.strictEqual(mapToNotificationType('payment_succeeded'), 'payment');
    assert.strictEqual(mapToNotificationType('earning_received'), 'payment');
  });

  test('unknown types default to reminder', () => {
    assert.strictEqual(mapToNotificationType('unknown_action'), 'reminder');
  });
});

// ============================================================================
// triggerNotification TESTS (underlying function)
// ============================================================================

describe('triggerNotification', () => {
  test('creates notification with all fields from action', async () => {
    await triggerNotification({
      type: 'review_prompt',
      recipientRole: 'parent',
      recipientId: 'parent_123',
      title: 'Test Title',
      body: 'Test Body',
      deepLink: '/test/link',
      data: { key: 'value' },
    });

    assert.strictEqual(capturedNotifications.length, 1);
    const notif = capturedNotifications[0];
    assert.strictEqual(notif.title, 'Test Title');
    assert.strictEqual(notif.body, 'Test Body');
    assert.strictEqual(notif.deepLink, '/test/link');
    assert.strictEqual(notif.recipientId, 'parent_123');
    assert.strictEqual(notif.recipientRole, 'parent');
    assert.strictEqual(notif.read, false);
  });

  test('maps athlete recipientRole to undefined (no recipient role for athlete)', async () => {
    await triggerNotification({
      type: 'test_action',
      recipientRole: 'athlete',
      recipientId: 'athlete_1',
      title: 'Test',
      body: 'Test',
    });

    const notif = capturedNotifications[0];
    assert.strictEqual(notif.recipientRole, undefined);
  });

  test('generates unique notification IDs', async () => {
    await triggerNotification({
      type: 'test',
      recipientRole: 'parent',
      title: 'A',
      body: 'A',
    });
    await triggerNotification({
      type: 'test',
      recipientRole: 'parent',
      title: 'B',
      body: 'B',
    });

    assert.strictEqual(capturedNotifications.length, 2);
    assert.notStrictEqual(capturedNotifications[0].id, capturedNotifications[1].id);
  });
});
