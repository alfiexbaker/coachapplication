/**
 * Notification Sender Service
 *
 * Handles sending notifications to users (coaches and parents).
 * Single responsibility: notification dispatch logic.
 */

import { notificationStore, type ExtendedNotificationItem } from './notification-store';
import { notificationPreferencesService } from './notification-preferences';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';

const logger = createLogger('NotificationSender');

class NotificationSenderService {
  /**
   * Send a notification, respecting user preferences.
   */
  private async send(notification: ExtendedNotificationItem): Promise<Result<void, ServiceError>> {
    // Check if user wants this notification
    if (notification.recipientId && notification.notificationType) {
      const shouldSendResult = await notificationPreferencesService.shouldSendNotification(
        notification.recipientId,
        notification.notificationType as import('@/constants/types').NotificationType,
        'PUSH'
      );
      if (!shouldSendResult.success) {
        logger.error('Failed to evaluate notification preferences', {
          recipientId: notification.recipientId,
          type: notification.notificationType,
          error: shouldSendResult.error,
        });
        return shouldSendResult;
      }

      if (!shouldSendResult.data) {
        logger.info('Notification suppressed by preferences', {
          recipientId: notification.recipientId,
          type: notification.notificationType,
        });
        return ok(undefined);
      }
    }

    const createResult = await notificationStore.create(notification);
    if (!createResult.success) {
      return err(storageError(createResult.error.message));
    }
    return ok(undefined);
  }

  // ============================================================================
  // COACH NOTIFICATIONS
  // ============================================================================

  async notifyCoachNewBooking(params: {
    coachId: string;
    parentName: string;
    childName: string;
    date: string;
    bookingId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_booking_${Date.now()}`,
      type: 'booking',
      notificationType: 'BOOKING_RECEIVED',
      title: 'New Booking',
      body: `📅 New booking from ${params.parentName} for ${params.childName} on ${params.date}`,
      recipientId: params.coachId,
      recipientRole: 'coach',
      deepLink: `/booking/${params.bookingId}`,
      data: {
        bookingId: params.bookingId,
        parentName: params.parentName,
        childName: params.childName,
      },
      timeLabel: 'Just now',
    });
  }

  async notifyCoachBookingCancelled(params: {
    coachId: string;
    parentName: string;
    date: string;
    bookingId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_cancel_${Date.now()}`,
      type: 'booking',
      notificationType: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled',
      body: `❌ ${params.parentName} cancelled booking for ${params.date}`,
      recipientId: params.coachId,
      recipientRole: 'coach',
      deepLink: `/booking/${params.bookingId}`,
      data: { bookingId: params.bookingId, parentName: params.parentName },
      timeLabel: 'Just now',
    });
  }

  async notifyCoachInviteAccepted(params: {
    coachId: string;
    parentName: string;
    childName: string;
    inviteId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_invite_accept_${Date.now()}`,
      type: 'booking',
      notificationType: 'SESSION_INVITE_RESPONSE',
      title: 'Invite Accepted',
      body: `✅ ${params.parentName} accepted session invite for ${params.childName}`,
      recipientId: params.coachId,
      recipientRole: 'coach',
      deepLink: `/session-invites/${params.inviteId}`,
      data: {
        inviteId: params.inviteId,
        parentName: params.parentName,
        childName: params.childName,
      },
      timeLabel: 'Just now',
    });
  }

  async notifyCoachInviteDeclined(params: {
    coachId: string;
    parentName: string;
    inviteId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_invite_decline_${Date.now()}`,
      type: 'booking',
      notificationType: 'SESSION_INVITE_RESPONSE',
      title: 'Invite Declined',
      body: `❌ ${params.parentName} declined session invite`,
      recipientId: params.coachId,
      recipientRole: 'coach',
      deepLink: `/session-invites/${params.inviteId}`,
      data: { inviteId: params.inviteId, parentName: params.parentName },
      timeLabel: 'Just now',
    });
  }

  async notifyCoachNewMessage(params: {
    coachId: string;
    parentName: string;
    threadId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_msg_${Date.now()}`,
      type: 'message',
      notificationType: 'MESSAGE_RECEIVED',
      title: 'New Message',
      body: `💬 New message from ${params.parentName}`,
      recipientId: params.coachId,
      recipientRole: 'coach',
      deepLink: `/chat/${params.threadId}`,
      data: { threadId: params.threadId, parentName: params.parentName },
      timeLabel: 'Just now',
    });
  }

  async notifyCoachNewReview(params: {
    coachId: string;
    parentName: string;
    rating: number;
    reviewId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_review_${Date.now()}`,
      type: 'review',
      notificationType: 'REVIEW_RECEIVED',
      title: 'New Review',
      body: `⭐ ${params.parentName} left a ${params.rating}-star review`,
      recipientId: params.coachId,
      recipientRole: 'coach',
      deepLink: `/review/${params.reviewId}`,
      data: {
        reviewId: params.reviewId,
        parentName: params.parentName,
        rating: String(params.rating),
      },
      timeLabel: 'Just now',
    });
  }

  async notifyCoachSessionReminder(params: {
    coachId: string;
    athleteName: string;
    bookingId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_reminder_${Date.now()}`,
      type: 'reminder',
      notificationType: 'SESSION_REMINDER',
      title: 'Session Reminder',
      body: `⏰ Session with ${params.athleteName} in 1 hour`,
      recipientId: params.coachId,
      recipientRole: 'coach',
      deepLink: `/booking/${params.bookingId}`,
      data: { bookingId: params.bookingId, athleteName: params.athleteName },
      timeLabel: 'Just now',
    });
  }

  // ============================================================================
  // PARENT NOTIFICATIONS
  // ============================================================================

  async notifyParentBookingConfirmed(params: {
    parentId: string;
    coachName: string;
    date: string;
    bookingId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_confirm_${Date.now()}`,
      type: 'booking',
      notificationType: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed',
      body: `✅ Booking confirmed with Coach ${params.coachName} for ${params.date}`,
      recipientId: params.parentId,
      recipientRole: 'parent',
      deepLink: `/booking/${params.bookingId}`,
      data: { bookingId: params.bookingId, coachName: params.coachName },
      timeLabel: 'Just now',
    });
  }

  async notifyParentSessionInvite(params: {
    parentId: string;
    coachName: string;
    childName: string;
    inviteId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_invite_${Date.now()}`,
      type: 'booking',
      notificationType: 'SESSION_INVITE',
      title: 'Session Invite',
      body: `📩 Coach ${params.coachName} invited ${params.childName} to a session`,
      recipientId: params.parentId,
      recipientRole: 'parent',
      deepLink: `/session-invites/${params.inviteId}`,
      data: {
        inviteId: params.inviteId,
        coachName: params.coachName,
        childName: params.childName,
      },
      timeLabel: 'Just now',
    });
  }

  async notifyParentBadgeAwarded(params: {
    parentId: string;
    childName: string;
    badgeName: string;
    coachName: string;
    badgeAwardId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_badge_${Date.now()}`,
      type: 'badge',
      notificationType: 'BADGE_AWARDED',
      title: 'Badge Earned',
      body: `🏅 ${params.childName} earned ${params.badgeName} from Coach ${params.coachName}`,
      badgeTitle: params.badgeName,
      athleteName: params.childName,
      badgeAwardId: params.badgeAwardId,
      actionLabel: 'Share to profile',
      recipientId: params.parentId,
      recipientRole: 'parent',
      deepLink: `/badges`,
      data: {
        badgeAwardId: params.badgeAwardId,
        childName: params.childName,
        badgeName: params.badgeName,
      },
      timeLabel: 'Just now',
    });
  }

  async notifyParentSessionFeedback(params: {
    parentId: string;
    coachName: string;
    childName: string;
    bookingId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_feedback_${Date.now()}`,
      type: 'review',
      notificationType: 'REVIEW_RECEIVED',
      title: 'Session Feedback',
      body: `📝 Coach ${params.coachName} added feedback for ${params.childName}'s session`,
      recipientId: params.parentId,
      recipientRole: 'parent',
      deepLink: `/bookings/${params.bookingId}`,
      data: {
        bookingId: params.bookingId,
        coachName: params.coachName,
        childName: params.childName,
      },
      timeLabel: 'Just now',
    });
  }

  async notifyParentNewMessage(params: {
    parentId: string;
    coachName: string;
    threadId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_msg_${Date.now()}`,
      type: 'message',
      notificationType: 'MESSAGE_RECEIVED',
      title: 'New Message',
      body: `💬 New message from Coach ${params.coachName}`,
      recipientId: params.parentId,
      recipientRole: 'parent',
      deepLink: `/chat/${params.threadId}`,
      data: { threadId: params.threadId, coachName: params.coachName },
      timeLabel: 'Just now',
    });
  }

  async notifyParentSessionReminder(params: {
    parentId: string;
    childName: string;
    coachName: string;
    bookingId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_reminder_${Date.now()}`,
      type: 'reminder',
      notificationType: 'SESSION_REMINDER',
      title: 'Session Reminder',
      body: `⏰ ${params.childName}'s session with Coach ${params.coachName} in 1 hour`,
      recipientId: params.parentId,
      recipientRole: 'parent',
      deepLink: `/booking/${params.bookingId}`,
      data: {
        bookingId: params.bookingId,
        childName: params.childName,
        coachName: params.coachName,
      },
      timeLabel: 'Just now',
    });
  }

  async notifyParentClubPost(params: {
    parentId: string;
    clubName: string;
    postId: string;
    clubId: string;
  }): Promise<Result<void, ServiceError>> {
    return this.send({
      id: `notif_post_${Date.now()}`,
      type: 'message',
      notificationType: 'MESSAGE_RECEIVED',
      title: 'Club Update',
      body: `📢 New post in ${params.clubName}`,
      recipientId: params.parentId,
      recipientRole: 'parent',
      deepLink: `/club-hub`,
      data: { postId: params.postId, clubId: params.clubId, clubName: params.clubName },
      timeLabel: 'Just now',
    });
  }
}

export const notificationSenderService = new NotificationSenderService();
