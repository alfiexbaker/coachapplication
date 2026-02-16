"use strict";
/**
 * Notification Sender Service
 *
 * Handles sending notifications to users (coaches and parents).
 * Single responsibility: notification dispatch logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationSenderService = void 0;
const notification_store_1 = require("./notification-store");
const notification_preferences_1 = require("./notification-preferences");
const push_notification_service_1 = require("../push-notification-service");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('NotificationSender');
class NotificationSenderService {
    /**
     * Send a notification, respecting user preferences.
     */
    async send(notification) {
        // Check if user wants this notification
        if (notification.recipientId && notification.notificationType) {
            const shouldSendResult = await notification_preferences_1.notificationPreferencesService.shouldSendNotification(notification.recipientId, notification.notificationType, 'PUSH');
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
                return (0, result_1.ok)(undefined);
            }
        }
        const createResult = await notification_store_1.notificationStore.create(notification);
        if (!createResult.success) {
            return (0, result_1.err)((0, result_1.storageError)(createResult.error.message));
        }
        // Schedule local push notification (best-effort — don't fail the in-app notification)
        if (notification.deepLink) {
            push_notification_service_1.pushNotificationService.scheduleLocalNotification({
                title: notification.title,
                body: notification.body ?? '',
                data: {
                    deepLink: notification.deepLink,
                    notificationId: notification.id,
                    ...(notification.data ?? {}),
                },
            }).catch((pushErr) => {
                logger.warn('Failed to schedule push notification', { id: notification.id, error: pushErr });
            });
        }
        return (0, result_1.ok)(undefined);
    }
    // ============================================================================
    // COACH NOTIFICATIONS
    // ============================================================================
    async notifyCoachNewBooking(params) {
        return this.send({
            id: `notif_booking_${Date.now()}`,
            type: 'booking',
            notificationType: 'BOOKING_RECEIVED',
            title: 'New Booking',
            body: `📅 New booking from ${params.parentName} for ${params.childName} on ${params.date}`,
            recipientId: params.coachId,
            recipientRole: 'coach',
            deepLink: `/bookings/${params.bookingId}`,
            data: {
                bookingId: params.bookingId,
                parentName: params.parentName,
                childName: params.childName,
            },
            timeLabel: 'Just now',
        });
    }
    async notifyCoachBookingCancelled(params) {
        const body = params.childName && params.isMultiChild
            ? `❌ ${params.parentName} cancelled ${params.childName}'s booking for ${params.date}`
            : `❌ ${params.parentName} cancelled booking for ${params.date}`;
        return this.send({
            id: `notif_cancel_${Date.now()}`,
            type: 'booking',
            notificationType: 'BOOKING_CANCELLED',
            title: 'Booking Cancelled',
            body,
            recipientId: params.coachId,
            recipientRole: 'coach',
            deepLink: `/bookings/${params.bookingId}`,
            data: { bookingId: params.bookingId, parentName: params.parentName },
            timeLabel: 'Just now',
        });
    }
    async notifyCoachInviteAccepted(params) {
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
    async notifyCoachInviteDeclined(params) {
        const body = params.childName
            ? `❌ ${params.parentName} declined session invite for ${params.childName}`
            : `❌ ${params.parentName} declined session invite`;
        return this.send({
            id: `notif_invite_decline_${Date.now()}`,
            type: 'booking',
            notificationType: 'SESSION_INVITE_RESPONSE',
            title: 'Invite Declined',
            body,
            recipientId: params.coachId,
            recipientRole: 'coach',
            deepLink: `/session-invites/${params.inviteId}`,
            data: { inviteId: params.inviteId, parentName: params.parentName },
            timeLabel: 'Just now',
        });
    }
    async notifyCoachNewMessage(params) {
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
    async notifyCoachNewReview(params) {
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
    async notifyCoachSessionReminder(params) {
        return this.send({
            id: `notif_reminder_${Date.now()}`,
            type: 'reminder',
            notificationType: 'SESSION_REMINDER',
            title: 'Session Reminder',
            body: `⏰ Session with ${params.athleteName} in 1 hour`,
            recipientId: params.coachId,
            recipientRole: 'coach',
            deepLink: `/bookings/${params.bookingId}`,
            data: { bookingId: params.bookingId, athleteName: params.athleteName },
            timeLabel: 'Just now',
        });
    }
    // ============================================================================
    // PARENT NOTIFICATIONS
    // ============================================================================
    async notifyParentBookingConfirmed(params) {
        const body = params.childName && params.isMultiChild
            ? `✅ ${params.childName}'s booking confirmed with Coach ${params.coachName} for ${params.date}`
            : `✅ Booking confirmed with Coach ${params.coachName} for ${params.date}`;
        return this.send({
            id: `notif_confirm_${Date.now()}`,
            type: 'booking',
            notificationType: 'BOOKING_CONFIRMED',
            title: 'Booking Confirmed',
            body,
            recipientId: params.parentId,
            recipientRole: 'parent',
            deepLink: `/bookings/${params.bookingId}`,
            data: { bookingId: params.bookingId, coachName: params.coachName },
            timeLabel: 'Just now',
        });
    }
    async notifyParentSessionInvite(params) {
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
    async notifyParentBadgeAwarded(params) {
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
    async notifyParentSessionFeedback(params) {
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
    async notifyParentNewMessage(params) {
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
    async notifyParentSessionReminder(params) {
        return this.send({
            id: `notif_reminder_${Date.now()}`,
            type: 'reminder',
            notificationType: 'SESSION_REMINDER',
            title: 'Session Reminder',
            body: `⏰ ${params.childName}'s session with Coach ${params.coachName} in 1 hour`,
            recipientId: params.parentId,
            recipientRole: 'parent',
            deepLink: `/bookings/${params.bookingId}`,
            data: {
                bookingId: params.bookingId,
                childName: params.childName,
                coachName: params.coachName,
            },
            timeLabel: 'Just now',
        });
    }
    async notifyParentClubPost(params) {
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
exports.notificationSenderService = new NotificationSenderService();
