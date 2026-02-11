"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const api_client_1 = require("./api-client");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const notification_store_1 = require("./notification/notification-store");
const notification_preferences_1 = require("./notification/notification-preferences");
const notification_sender_1 = require("./notification/notification-sender");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('NotificationService');
class NotificationService {
    // ============================================================================
    // CORE NOTIFICATION OPERATIONS
    // ============================================================================
    async list() {
        return notification_store_1.notificationStore.list();
    }
    async create(notification) {
        return notification_store_1.notificationStore.create(notification);
    }
    async markAsRead(id) {
        return notification_store_1.notificationStore.markAsRead(id);
    }
    async markAllAsRead() {
        return notification_store_1.notificationStore.markAllAsRead();
    }
    async markHandled(id) {
        return notification_store_1.notificationStore.markHandled(id);
    }
    async clearAll() {
        return notification_store_1.notificationStore.clearAll();
    }
    async getUnreadCount(recipientId) {
        return notification_store_1.notificationStore.getUnreadCount(recipientId);
    }
    async getByRecipient(recipientId) {
        return notification_store_1.notificationStore.getByRecipient(recipientId);
    }
    async getByType(type) {
        return notification_store_1.notificationStore.getByType(type);
    }
    subscribe(listener) {
        return notification_store_1.notificationStore.subscribe(listener);
    }
    // ============================================================================
    // COACH NOTIFICATION TRIGGERS
    // ============================================================================
    async notifyCoachNewBooking(params) {
        return notification_sender_1.notificationSenderService.notifyCoachNewBooking(params);
    }
    async notifyCoachBookingCancelled(params) {
        return notification_sender_1.notificationSenderService.notifyCoachBookingCancelled(params);
    }
    async notifyCoachInviteAccepted(params) {
        return notification_sender_1.notificationSenderService.notifyCoachInviteAccepted(params);
    }
    async notifyCoachInviteDeclined(params) {
        return notification_sender_1.notificationSenderService.notifyCoachInviteDeclined(params);
    }
    async notifyCoachNewMessage(params) {
        return notification_sender_1.notificationSenderService.notifyCoachNewMessage(params);
    }
    async notifyCoachNewReview(params) {
        return notification_sender_1.notificationSenderService.notifyCoachNewReview(params);
    }
    async notifyCoachSessionReminder(params) {
        return notification_sender_1.notificationSenderService.notifyCoachSessionReminder(params);
    }
    // ============================================================================
    // PARENT NOTIFICATION TRIGGERS
    // ============================================================================
    async notifyParentBookingConfirmed(params) {
        return notification_sender_1.notificationSenderService.notifyParentBookingConfirmed(params);
    }
    async notifyParentSessionInvite(params) {
        return notification_sender_1.notificationSenderService.notifyParentSessionInvite(params);
    }
    async notifyParentBadgeAwarded(params) {
        return notification_sender_1.notificationSenderService.notifyParentBadgeAwarded(params);
    }
    async notifyParentSessionFeedback(params) {
        return notification_sender_1.notificationSenderService.notifyParentSessionFeedback(params);
    }
    async notifyParentNewMessage(params) {
        return notification_sender_1.notificationSenderService.notifyParentNewMessage(params);
    }
    async notifyParentSessionReminder(params) {
        return notification_sender_1.notificationSenderService.notifyParentSessionReminder(params);
    }
    async notifyParentClubPost(params) {
        return notification_sender_1.notificationSenderService.notifyParentClubPost(params);
    }
    // ============================================================================
    // NOTIFICATION PREFERENCES MANAGEMENT
    // ============================================================================
    async getPreferences(userId) {
        return notification_preferences_1.notificationPreferencesService.getPreferences(userId);
    }
    async updatePreferences(userId, updates) {
        return notification_preferences_1.notificationPreferencesService.updatePreferences(userId, updates);
    }
    async setQuietHours(userId, startTime, endTime, enabled = true) {
        return notification_preferences_1.notificationPreferencesService.setQuietHours(userId, startTime, endTime, enabled);
    }
    async toggleQuietHours(userId, enabled) {
        return notification_preferences_1.notificationPreferencesService.toggleQuietHours(userId, enabled);
    }
    async toggleChannel(userId, channel, enabled) {
        return notification_preferences_1.notificationPreferencesService.toggleChannel(userId, channel, enabled);
    }
    async toggleNotificationType(userId, type, enabled) {
        return notification_preferences_1.notificationPreferencesService.toggleNotificationType(userId, type, enabled);
    }
    async setNotificationTypeChannels(userId, type, channels) {
        return notification_preferences_1.notificationPreferencesService.setNotificationTypeChannels(userId, type, channels);
    }
    async muteCoach(userId, coachId, coachName, coachAvatar, reason) {
        return notification_preferences_1.notificationPreferencesService.muteCoach(userId, coachId, coachName, coachAvatar, reason);
    }
    async unmuteCoach(userId, coachId) {
        return notification_preferences_1.notificationPreferencesService.unmuteCoach(userId, coachId);
    }
    async getMutedCoaches(userId) {
        return notification_preferences_1.notificationPreferencesService.getMutedCoaches(userId);
    }
    async isCoachMuted(userId, coachId) {
        return notification_preferences_1.notificationPreferencesService.isCoachMuted(userId, coachId);
    }
    async isInQuietHours(userId) {
        return notification_preferences_1.notificationPreferencesService.isInQuietHours(userId);
    }
    async shouldSendNotification(userId, type, channel, coachId) {
        return notification_preferences_1.notificationPreferencesService.shouldSendNotification(userId, type, channel, coachId);
    }
    async resetPreferences(userId) {
        return notification_preferences_1.notificationPreferencesService.resetPreferences(userId);
    }
    // ============================================================================
    // MOCK DATA FOR DEMO
    // ============================================================================
    async seedDemoNotifications() {
        const demoNotifications = [
            {
                id: 'demo_n1',
                type: 'booking',
                notificationType: 'BOOKING_RECEIVED',
                title: 'New Booking',
                body: 'New booking from Sarah Baker for Tom on Jan 15',
                recipientId: 'coach1',
                recipientRole: 'coach',
                deepLink: '/bookings/b1',
                timeLabel: '5 min ago',
                read: false,
            },
            {
                id: 'demo_n2',
                type: 'message',
                notificationType: 'MESSAGE_RECEIVED',
                title: 'New Message',
                body: 'New message from Coach Emma Williams',
                recipientId: 'parent_1',
                recipientRole: 'parent',
                deepLink: '/chat/thread2',
                timeLabel: '1 hour ago',
                read: false,
            },
        ];
        try {
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, demoNotifications);
            logger.info('demo_notifications_seeded', { count: demoNotifications.length });
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to seed demo notifications', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to seed demo notifications'));
        }
    }
}
exports.notificationService = new NotificationService();
