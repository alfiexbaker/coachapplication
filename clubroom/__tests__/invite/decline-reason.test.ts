// @ts-nocheck
/**
 * Decline Reason Tests
 *
 * Verifies that when a parent declines an invite:
 * 1. The declineReason and declineNote fields are persisted to the invite
 * 2. The notification sent to the coach includes the reason and note text
 *
 * These tests cover the decline reason persistence feature added to
 * session-invite-service.ts respondToInvite().
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

// ============================================================================
// TYPES (subset of actual types for testing)
// ============================================================================

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}

type DeclineReason = 'schedule_conflict' | 'too_far' | 'price' | 'child_unavailable' | 'other';

interface SessionInvite {
  id: string;
  coachId: string;
  coachName: string;
  athleteIds: string[];
  athleteNames: string[];
  parentId: string;
  parentName: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  priceUsd?: number;
  duration?: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'COUNTERED';
  expiresAt: string;
  createdAt: string;
  respondedAt?: string;
  selectedSlot?: TimeSlot;
  bookingId?: string;
  notes?: string;
  declineReason?: DeclineReason;
  declineNote?: string;
}

interface RespondToInviteInput {
  inviteId: string;
  response: 'ACCEPTED' | 'DECLINED' | 'COUNTERED';
  selectedSlot?: TimeSlot;
  declineReason?: DeclineReason;
  declineNote?: string;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  timeLabel: string;
  read: boolean;
}

interface ServiceError {
  code: string;
  message: string;
}

type Result<T, E = ServiceError> =
  | { success: true; data: T }
  | { success: false; error: E };

// ============================================================================
// MOCK INFRASTRUCTURE
// ============================================================================

let invitesCache: SessionInvite[] = [];
let mockNotifications: NotificationItem[] = [];
let releasedInviteIds: string[] = [];
let notificationIdSeq = 0;

function nextNotificationId(prefix: string = 'notif'): string {
  notificationIdSeq += 1;
  return `${prefix}_${notificationIdSeq}`;
}

// Mock notificationService
const notificationService = {
  async create(notification: NotificationItem): Promise<NotificationItem[]> {
    mockNotifications.push(notification);
    return mockNotifications;
  },
};

// Mock inviteHoldService
const inviteHoldService = {
  async releaseHoldsForInvite(inviteId: string): Promise<void> {
    releasedInviteIds.push(inviteId);
  },
};

// Helper functions
const ok = <T>(data: T): Result<T, never> => ({ success: true, data });
const err = <E>(error: E): Result<never, E> => ({ success: false, error });
const serviceError = (code: string, message: string): ServiceError => ({ code, message });

// ============================================================================
// SERVICE UNDER TEST (mirrors respondToInvite DECLINED path)
// ============================================================================

/**
 * Replicates the DECLINED path of respondToInvite from
 * session-invite-service.ts, including decline reason persistence
 * and enhanced notification body.
 */
async function respondToInviteDecline(input: RespondToInviteInput): Promise<Result<SessionInvite, ServiceError>> {
  const index = invitesCache.findIndex((inv) => inv.id === input.inviteId);

  if (index === -1) {
    return err(serviceError('NOT_FOUND', `Invite not found: ${input.inviteId}`));
  }

  const invite = invitesCache[index];

  // Update invite with response + decline fields
  invitesCache[index] = {
    ...invite,
    status: input.response,
    respondedAt: new Date().toISOString(),
    ...(input.response === 'DECLINED' && {
      declineReason: input.declineReason,
      declineNote: input.declineNote,
    }),
  };

  const athleteNames = invite.athleteNames.join(', ');

  // Build notification
  const notification: NotificationItem = {
    id: nextNotificationId(),
    type: 'booking',
    title: '',
    body: '',
    timeLabel: 'Just now',
    read: false,
  };

  if (input.response === 'DECLINED') {
    notification.title = 'Invite Declined';
    const reasonLabel = input.declineReason
      ? ` Reason: ${input.declineReason.replace(/_/g, ' ')}.`
      : '';
    const noteLabel = input.declineNote ? ` "${input.declineNote}"` : '';
    notification.body = `${invite.parentName} declined your session invite for ${athleteNames}.${reasonLabel}${noteLabel}`;

    // Release all holds
    await inviteHoldService.releaseHoldsForInvite(invite.id);
  }

  await notificationService.create(notification);

  return ok(invitesCache[index]);
}

// ============================================================================
// TEST DATA
// ============================================================================

const MOCK_INVITE: SessionInvite = {
  id: 'inv_decline_1',
  coachId: 'coach_1',
  coachName: 'Marcus Thompson',
  athleteIds: ['athlete_1'],
  athleteNames: ['Tom Baker'],
  parentId: 'parent_1',
  parentName: 'Sarah Baker',
  proposedSlots: [
    { date: '2026-03-15', startTime: '16:00', endTime: '17:00', location: 'Hackney Marshes' },
  ],
  sessionType: '1:1 Coaching',
  focus: 'Finishing',
  priceUsd: 60,
  duration: 60,
  status: 'PENDING',
  expiresAt: '2026-03-14T23:59:59Z',
  createdAt: '2026-03-10T10:00:00Z',
};

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
  invitesCache = [JSON.parse(JSON.stringify(MOCK_INVITE))];
  mockNotifications = [];
  releasedInviteIds = [];
  notificationIdSeq = 0;
});

// --------------------------------------------------------------------------
// DECLINE REASON PERSISTENCE
// --------------------------------------------------------------------------

describe('Decline Reason - Persistence', () => {
  test('decline with reason persists declineReason to invite', async () => {
    const result = await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
      declineReason: 'schedule_conflict',
    });

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.declineReason, 'schedule_conflict');
    }
  });

  test('decline with note persists declineNote to invite', async () => {
    const result = await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
      declineReason: 'other',
      declineNote: 'We are on holiday that week.',
    });

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.declineNote, 'We are on holiday that week.');
    }
  });

  test('decline persists both reason and note together', async () => {
    const result = await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
      declineReason: 'too_far',
      declineNote: 'The venue is 45 min drive.',
    });

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.declineReason, 'too_far');
      assert.strictEqual(result.data.declineNote, 'The venue is 45 min drive.');
    }
  });

  test('decline without reason has undefined declineReason', async () => {
    const result = await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
    });

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.declineReason, undefined);
    }
  });

  test('decline without note has undefined declineNote', async () => {
    const result = await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
      declineReason: 'price',
    });

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.declineNote, undefined);
    }
  });

  test('decline sets status to DECLINED', async () => {
    const result = await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
      declineReason: 'child_unavailable',
    });

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.status, 'DECLINED');
    }
  });

  test('decline sets respondedAt timestamp', async () => {
    const before = new Date().toISOString();

    const result = await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
    });

    const after = new Date().toISOString();

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.ok(result.data.respondedAt);
      assert.ok(result.data.respondedAt >= before);
      assert.ok(result.data.respondedAt <= after);
    }
  });

  test('decline persists all reason categories correctly', async () => {
    const reasons: DeclineReason[] = ['schedule_conflict', 'too_far', 'price', 'child_unavailable', 'other'];

    for (const reason of reasons) {
      // Reset cache for each iteration
      invitesCache = [{ ...JSON.parse(JSON.stringify(MOCK_INVITE)), id: `inv_${reason}` }];

      const result = await respondToInviteDecline({
        inviteId: `inv_${reason}`,
        response: 'DECLINED',
        declineReason: reason,
      });

      assert.strictEqual(result.success, true, `Failed for reason: ${reason}`);
      if (result.success) {
        assert.strictEqual(result.data.declineReason, reason, `Reason mismatch for: ${reason}`);
      }
    }
  });
});

// --------------------------------------------------------------------------
// DECLINE NOTIFICATION ENHANCEMENT
// --------------------------------------------------------------------------

describe('Decline Reason - Notification Enhancement', () => {
  test('decline notification includes reason text (underscores replaced with spaces)', async () => {
    await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
      declineReason: 'schedule_conflict',
    });

    assert.strictEqual(mockNotifications.length, 1);
    const body = mockNotifications[0].body;
    assert.ok(body.includes('Reason: schedule conflict.'), `Expected reason in body, got: "${body}"`);
  });

  test('decline notification includes note in quotes', async () => {
    await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
      declineReason: 'other',
      declineNote: 'Going on vacation.',
    });

    const body = mockNotifications[0].body;
    assert.ok(body.includes('"Going on vacation."'), `Expected note in body, got: "${body}"`);
  });

  test('decline notification includes parent name and athlete names', async () => {
    await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
      declineReason: 'price',
    });

    const body = mockNotifications[0].body;
    assert.ok(body.includes('Sarah Baker'), `Expected parent name, got: "${body}"`);
    assert.ok(body.includes('Tom Baker'), `Expected athlete name, got: "${body}"`);
  });

  test('decline notification title is "Invite Declined"', async () => {
    await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
    });

    assert.strictEqual(mockNotifications[0].title, 'Invite Declined');
  });

  test('decline notification without reason has no reason suffix', async () => {
    await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
    });

    const body = mockNotifications[0].body;
    assert.ok(!body.includes('Reason:'), `Should NOT include "Reason:" when no reason given, got: "${body}"`);
  });

  test('decline notification without note has no quoted text', async () => {
    await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
      declineReason: 'too_far',
    });

    const body = mockNotifications[0].body;
    // Should end with the reason, no quotes
    assert.ok(!body.includes('"'), `Should NOT include quotes when no note given, got: "${body}"`);
  });

  test('decline notification with both reason and note includes both', async () => {
    await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
      declineReason: 'child_unavailable',
      declineNote: 'Has a school trip.',
    });

    const body = mockNotifications[0].body;
    assert.ok(body.includes('Reason: child unavailable.'), `Expected reason, got: "${body}"`);
    assert.ok(body.includes('"Has a school trip."'), `Expected note, got: "${body}"`);
  });

  test('decline notification body format matches expected pattern', async () => {
    await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
      declineReason: 'price',
      declineNote: 'A bit over budget right now.',
    });

    const body = mockNotifications[0].body;
    const expected = 'Sarah Baker declined your session invite for Tom Baker. Reason: price. "A bit over budget right now."';
    assert.strictEqual(body, expected);
  });
});

// --------------------------------------------------------------------------
// DECLINE - HOLDS & SIDE EFFECTS
// --------------------------------------------------------------------------

describe('Decline Reason - Holds and Side Effects', () => {
  test('decline releases holds for the invite', async () => {
    await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
      declineReason: 'schedule_conflict',
    });

    assert.ok(releasedInviteIds.includes('inv_decline_1'));
  });

  test('decline for non-existent invite returns NOT_FOUND', async () => {
    const result = await respondToInviteDecline({
      inviteId: 'inv_does_not_exist',
      response: 'DECLINED',
    });

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.strictEqual(result.error.code, 'NOT_FOUND');
    }
  });

  test('decline with multiple athletes shows all names in notification', async () => {
    invitesCache = [{
      ...JSON.parse(JSON.stringify(MOCK_INVITE)),
      athleteIds: ['athlete_1', 'athlete_2'],
      athleteNames: ['Tom Baker', 'Lucy Baker'],
    }];

    await respondToInviteDecline({
      inviteId: 'inv_decline_1',
      response: 'DECLINED',
      declineReason: 'schedule_conflict',
    });

    const body = mockNotifications[0].body;
    assert.ok(body.includes('Tom Baker, Lucy Baker'), `Expected both names, got: "${body}"`);
  });
});
