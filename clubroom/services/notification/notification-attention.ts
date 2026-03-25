import type { NotificationType } from '@/constants/types';
import type { ExtendedNotificationItem } from './notification-store';

export type NotificationBadgeVariant = 'none' | 'count' | 'dot';

export interface NotificationBadgeState {
  actionableCount: number;
  passiveUnreadCount: number;
  label?: string;
  variant: NotificationBadgeVariant;
}

const ACTIONABLE_NOTIFICATION_TYPES = new Set<NotificationType>([
  'BOOKING_RECEIVED',
  'BOOKING_HANDOFF',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'SUPPORT_UPDATE',
  'SESSION_REMINDER',
  'MESSAGE_RECEIVED',
  'SESSION_INVITE',
  'SESSION_INVITE_RESPONSE',
  'REVIEW_REQUEST',
  'REVIEW_RECEIVED',
  'WAITLIST_AVAILABLE',
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'VIDEO_SHARED',
  'MATCH_INVITE',
  'MATCH_RESPONSE',
  'MATCH_LINEUP',
  'MATCH_REMINDER',
  'MATCH_CANCELLED',
  'FOLLOW_REQUEST',
]);

const PASSIVE_NOTIFICATION_TYPES = new Set<NotificationType>([
  'BADGE_AWARDED',
  'GOAL_COMPLETED',
  'NEW_FOLLOWER',
  'FOLLOW_REQUEST_ACCEPTED',
  'CLUB_UPDATE',
]);

function isExpired(item: ExtendedNotificationItem, now: number): boolean {
  if (!item.expiresAt) {
    return false;
  }

  const expiresAt = Date.parse(item.expiresAt);
  return !Number.isNaN(expiresAt) && expiresAt <= now;
}

function isUnread(item: ExtendedNotificationItem, now: number): boolean {
  if (item.read || item.handled) {
    return false;
  }

  return !isExpired(item, now);
}

function getAttentionKey(item: ExtendedNotificationItem): string {
  switch (item.notificationType) {
    case 'MESSAGE_RECEIVED':
      return `thread:${item.data?.threadId ?? item.deepLink ?? item.id}`;
    case 'SESSION_INVITE':
    case 'SESSION_INVITE_RESPONSE':
      return `invite:${item.data?.inviteId ?? item.deepLink ?? item.id}`;
    case 'BOOKING_RECEIVED':
    case 'BOOKING_HANDOFF':
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_CANCELLED':
    case 'SESSION_REMINDER':
    case 'SUPPORT_UPDATE':
      return `booking:${item.data?.bookingId ?? item.deepLink ?? item.id}`;
    case 'REVIEW_REQUEST':
    case 'REVIEW_RECEIVED':
      return `review:${item.data?.reviewId ?? item.data?.bookingId ?? item.deepLink ?? item.id}`;
    case 'MATCH_INVITE':
    case 'MATCH_RESPONSE':
    case 'MATCH_LINEUP':
    case 'MATCH_REMINDER':
    case 'MATCH_CANCELLED':
      return `match:${item.data?.matchId ?? item.deepLink ?? item.id}`;
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_FAILED':
      return `payment:${item.data?.invoiceId ?? item.data?.paymentId ?? item.deepLink ?? item.id}`;
    default:
      return `${item.notificationType ?? item.type}:${item.deepLink ?? item.id}`;
  }
}

function isActionable(item: ExtendedNotificationItem): boolean {
  if (item.notificationType) {
    if (PASSIVE_NOTIFICATION_TYPES.has(item.notificationType as NotificationType)) {
      return false;
    }

    if (ACTIONABLE_NOTIFICATION_TYPES.has(item.notificationType as NotificationType)) {
      return true;
    }
  }

  return item.type !== 'badge' && item.type !== 'community';
}

function isPassive(item: ExtendedNotificationItem): boolean {
  if (item.notificationType) {
    if (PASSIVE_NOTIFICATION_TYPES.has(item.notificationType as NotificationType)) {
      return true;
    }

    if (ACTIONABLE_NOTIFICATION_TYPES.has(item.notificationType as NotificationType)) {
      return false;
    }
  }

  return item.type === 'badge' || item.type === 'community';
}

export function buildNotificationBadgeState(
  notifications: ExtendedNotificationItem[],
  recipientId?: string,
  now: number = Date.now(),
): NotificationBadgeState {
  const actionableKeys = new Set<string>();
  let passiveUnreadCount = 0;

  for (const item of notifications) {
    if (recipientId && item.recipientId && item.recipientId !== recipientId) {
      continue;
    }

    if (!isUnread(item, now)) {
      continue;
    }

    if (isActionable(item)) {
      actionableKeys.add(getAttentionKey(item));
      continue;
    }

    if (isPassive(item)) {
      passiveUnreadCount += 1;
    }
  }

  const actionableCount = actionableKeys.size;

  return {
    actionableCount,
    passiveUnreadCount,
    label: actionableCount > 0 ? (actionableCount > 9 ? '9+' : String(actionableCount)) : undefined,
    variant: actionableCount > 0 ? 'count' : passiveUnreadCount > 0 ? 'dot' : 'none',
  };
}
