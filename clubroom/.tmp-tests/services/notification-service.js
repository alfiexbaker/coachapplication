"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const storage_service_1 = require("./storage-service");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('NotificationService');
const listeners = [];
class NotificationService {
    // ============================================================================
    // CORE NOTIFICATION OPERATIONS
    // ============================================================================
    async list() {
        return storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
    }
    async create(notification) {
        const fullNotification = {
            ...notification,
            createdAt: notification.createdAt || new Date().toISOString(),
            read: notification.read ?? false,
        };
        const current = await this.list();
        const updated = [fullNotification, ...current];
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
        // Notify listeners for in-app toasts
        listeners.forEach((listener) => {
            try {
                listener(fullNotification);
            }
            catch (error) {
                logger.error('notification_listener_error', { error });
            }
        });
        logger.info('notification_created', {
            id: notification.id,
            type: notification.type,
            recipientId: notification.recipientId,
        });
        return updated;
    }
    async markAsRead(id) {
        const current = await this.list();
        const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
        return updated;
    }
    async markAllAsRead() {
        const current = await this.list();
        const updated = current.map((n) => ({ ...n, read: true }));
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
        return updated;
    }
    async markHandled(id) {
        const current = await this.list();
        const updated = current.map((n) => (n.id === id ? { ...n, read: true, handled: true } : n));
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
        return updated.find((n) => n.id === id);
    }
    async clearAll() {
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
    }
    async getUnreadCount(recipientId) {
        const notifications = await this.list();
        const filtered = recipientId
            ? notifications.filter((n) => n.recipientId === recipientId)
            : notifications;
        return filtered.filter((n) => !n.read).length;
    }
    async getByRecipient(recipientId) {
        const notifications = await this.list();
        return notifications.filter((n) => n.recipientId === recipientId);
    }
    async getByType(type) {
        const notifications = await this.list();
        return notifications.filter((n) => n.type === type);
    }
    // ============================================================================
    // NOTIFICATION LISTENERS (for in-app toasts)
    // ============================================================================
    subscribe(listener) {
        listeners.push(listener);
        return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }
    // ============================================================================
    // COACH NOTIFICATION TRIGGERS
    // ============================================================================
    /**
     * Notify coach of new booking
     */
    async notifyCoachNewBooking(params) {
        await this.create({
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
    /**
     * Notify coach of cancelled booking
     */
    async notifyCoachBookingCancelled(params) {
        await this.create({
            id: `notif_cancel_${Date.now()}`,
            type: 'booking',
            notificationType: 'BOOKING_CANCELLED',
            title: 'Booking Cancelled',
            body: `❌ ${params.parentName} cancelled booking for ${params.date}`,
            recipientId: params.coachId,
            recipientRole: 'coach',
            deepLink: `/booking/${params.bookingId}`,
            data: {
                bookingId: params.bookingId,
                parentName: params.parentName,
            },
            timeLabel: 'Just now',
        });
    }
    /**
     * Notify coach of accepted session invite
     */
    async notifyCoachInviteAccepted(params) {
        await this.create({
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
    /**
     * Notify coach of declined session invite
     */
    async notifyCoachInviteDeclined(params) {
        await this.create({
            id: `notif_invite_decline_${Date.now()}`,
            type: 'booking',
            notificationType: 'SESSION_INVITE_RESPONSE',
            title: 'Invite Declined',
            body: `❌ ${params.parentName} declined session invite`,
            recipientId: params.coachId,
            recipientRole: 'coach',
            deepLink: `/session-invites/${params.inviteId}`,
            data: {
                inviteId: params.inviteId,
                parentName: params.parentName,
            },
            timeLabel: 'Just now',
        });
    }
    /**
     * Notify coach of new message
     */
    async notifyCoachNewMessage(params) {
        await this.create({
            id: `notif_msg_${Date.now()}`,
            type: 'message',
            notificationType: 'MESSAGE_RECEIVED',
            title: 'New Message',
            body: `💬 New message from ${params.parentName}`,
            recipientId: params.coachId,
            recipientRole: 'coach',
            deepLink: `/chat/${params.threadId}`,
            data: {
                threadId: params.threadId,
                parentName: params.parentName,
            },
            timeLabel: 'Just now',
        });
    }
    /**
     * Notify coach of new review
     */
    async notifyCoachNewReview(params) {
        await this.create({
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
    /**
     * Notify coach of upcoming session
     */
    async notifyCoachSessionReminder(params) {
        await this.create({
            id: `notif_reminder_${Date.now()}`,
            type: 'reminder',
            notificationType: 'SESSION_REMINDER',
            title: 'Session Reminder',
            body: `⏰ Session with ${params.athleteName} in 1 hour`,
            recipientId: params.coachId,
            recipientRole: 'coach',
            deepLink: `/booking/${params.bookingId}`,
            data: {
                bookingId: params.bookingId,
                athleteName: params.athleteName,
            },
            timeLabel: 'Just now',
        });
    }
    // ============================================================================
    // PARENT NOTIFICATION TRIGGERS
    // ============================================================================
    /**
     * Notify parent of confirmed booking
     */
    async notifyParentBookingConfirmed(params) {
        await this.create({
            id: `notif_confirm_${Date.now()}`,
            type: 'booking',
            notificationType: 'BOOKING_CONFIRMED',
            title: 'Booking Confirmed',
            body: `✅ Booking confirmed with Coach ${params.coachName} for ${params.date}`,
            recipientId: params.parentId,
            recipientRole: 'parent',
            deepLink: `/booking/${params.bookingId}`,
            data: {
                bookingId: params.bookingId,
                coachName: params.coachName,
            },
            timeLabel: 'Just now',
        });
    }
    /**
     * Notify parent of session invite
     */
    async notifyParentSessionInvite(params) {
        await this.create({
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
    /**
     * Notify parent of badge awarded to child
     */
    async notifyParentBadgeAwarded(params) {
        await this.create({
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
    /**
     * Notify parent of session feedback
     */
    async notifyParentSessionFeedback(params) {
        await this.create({
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
    /**
     * Notify parent of new message
     */
    async notifyParentNewMessage(params) {
        await this.create({
            id: `notif_msg_${Date.now()}`,
            type: 'message',
            notificationType: 'MESSAGE_RECEIVED',
            title: 'New Message',
            body: `💬 New message from Coach ${params.coachName}`,
            recipientId: params.parentId,
            recipientRole: 'parent',
            deepLink: `/chat/${params.threadId}`,
            data: {
                threadId: params.threadId,
                coachName: params.coachName,
            },
            timeLabel: 'Just now',
        });
    }
    /**
     * Notify parent of upcoming session
     */
    async notifyParentSessionReminder(params) {
        await this.create({
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
    /**
     * Notify parent of new club post
     */
    async notifyParentClubPost(params) {
        await this.create({
            id: `notif_post_${Date.now()}`,
            type: 'message',
            notificationType: 'MESSAGE_RECEIVED',
            title: 'Club Update',
            body: `📢 New post in ${params.clubName}`,
            recipientId: params.parentId,
            recipientRole: 'parent',
            deepLink: `/club-hub`,
            data: {
                postId: params.postId,
                clubId: params.clubId,
                clubName: params.clubName,
            },
            timeLabel: 'Just now',
        });
    }
    // ============================================================================
    // NOTIFICATION PREFERENCES MANAGEMENT
    // ============================================================================
    /**
     * Create default preferences for a new user
     */
    createDefaultPreferences(userId) {
        return {
            userId,
            channels: {
                push: true,
                email: true,
                sms: false,
            },
            quietHours: {
                enabled: false,
                startTime: '22:00',
                endTime: '07:00',
            },
            typePreferences: {},
            mutedCoaches: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }
    /**
     * Get notification preferences for a user
     */
    async getPreferences(userId) {
        const allPrefs = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.NOTIFICATION_PREFERENCES, {});
        if (allPrefs[userId]) {
            return allPrefs[userId];
        }
        // Create default preferences if none exist
        const defaults = this.createDefaultPreferences(userId);
        await this.savePreferences(userId, defaults);
        return defaults;
    }
    /**
     * Save notification preferences for a user
     */
    async savePreferences(userId, preferences) {
        const allPrefs = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.NOTIFICATION_PREFERENCES, {});
        allPrefs[userId] = {
            ...preferences,
            updatedAt: new Date().toISOString(),
        };
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATION_PREFERENCES, allPrefs);
        logger.info('preferences_saved', { userId });
    }
    /**
     * Update notification preferences for a user
     */
    async updatePreferences(userId, updates) {
        const current = await this.getPreferences(userId);
        const updated = {
            ...current,
            ...updates,
            userId, // Ensure userId is preserved
            createdAt: current.createdAt, // Preserve original creation time
            updatedAt: new Date().toISOString(),
        };
        await this.savePreferences(userId, updated);
        logger.info('preferences_updated', { userId, updates: Object.keys(updates) });
        return updated;
    }
    /**
     * Set quiet hours for a user
     */
    async setQuietHours(userId, startTime, endTime, enabled = true) {
        const quietHours = {
            enabled,
            startTime,
            endTime,
        };
        return this.updatePreferences(userId, { quietHours });
    }
    /**
     * Toggle quiet hours on/off
     */
    async toggleQuietHours(userId, enabled) {
        const current = await this.getPreferences(userId);
        return this.updatePreferences(userId, {
            quietHours: {
                ...current.quietHours,
                enabled,
            },
        });
    }
    /**
     * Toggle a notification channel (push, email, sms)
     */
    async toggleChannel(userId, channel, enabled) {
        const current = await this.getPreferences(userId);
        return this.updatePreferences(userId, {
            channels: {
                ...current.channels,
                [channel.toLowerCase()]: enabled,
            },
        });
    }
    /**
     * Toggle a specific notification type
     */
    async toggleNotificationType(userId, type, enabled) {
        const current = await this.getPreferences(userId);
        const currentTypePref = current.typePreferences[type] || {
            enabled: true,
            channels: ['PUSH', 'EMAIL'],
        };
        return this.updatePreferences(userId, {
            typePreferences: {
                ...current.typePreferences,
                [type]: {
                    ...currentTypePref,
                    enabled,
                },
            },
        });
    }
    /**
     * Set channels for a specific notification type
     */
    async setNotificationTypeChannels(userId, type, channels) {
        const current = await this.getPreferences(userId);
        const currentTypePref = current.typePreferences[type] || {
            enabled: true,
            channels: [],
        };
        return this.updatePreferences(userId, {
            typePreferences: {
                ...current.typePreferences,
                [type]: {
                    ...currentTypePref,
                    channels,
                },
            },
        });
    }
    /**
     * Mute a coach (stop receiving notifications from them)
     */
    async muteCoach(userId, coachId, coachName, coachAvatar, reason) {
        const current = await this.getPreferences(userId);
        // Check if coach is already muted
        const alreadyMuted = current.mutedCoaches.some((mc) => mc.coachId === coachId);
        if (alreadyMuted) {
            logger.info('coach_already_muted', { userId, coachId });
            return current;
        }
        const mutedCoach = {
            coachId,
            coachName,
            coachAvatar,
            mutedAt: new Date().toISOString(),
            reason,
        };
        const updated = await this.updatePreferences(userId, {
            mutedCoaches: [...current.mutedCoaches, mutedCoach],
        });
        logger.info('coach_muted', { userId, coachId, coachName });
        return updated;
    }
    /**
     * Unmute a coach (resume receiving notifications from them)
     */
    async unmuteCoach(userId, coachId) {
        const current = await this.getPreferences(userId);
        const updated = await this.updatePreferences(userId, {
            mutedCoaches: current.mutedCoaches.filter((mc) => mc.coachId !== coachId),
        });
        logger.info('coach_unmuted', { userId, coachId });
        return updated;
    }
    /**
     * Get list of muted coaches for a user
     */
    async getMutedCoaches(userId) {
        const prefs = await this.getPreferences(userId);
        return prefs.mutedCoaches;
    }
    /**
     * Check if a coach is muted by a user
     */
    async isCoachMuted(userId, coachId) {
        const mutedCoaches = await this.getMutedCoaches(userId);
        return mutedCoaches.some((mc) => mc.coachId === coachId);
    }
    /**
     * Check if currently in quiet hours for a user
     */
    async isInQuietHours(userId) {
        const prefs = await this.getPreferences(userId);
        if (!prefs.quietHours.enabled) {
            return false;
        }
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const { startTime, endTime } = prefs.quietHours;
        // Handle overnight quiet hours (e.g., 22:00 to 07:00)
        if (startTime > endTime) {
            return currentTime >= startTime || currentTime < endTime;
        }
        // Same day quiet hours (e.g., 14:00 to 16:00)
        return currentTime >= startTime && currentTime < endTime;
    }
    /**
     * Check if a notification should be sent based on user preferences
     */
    async shouldSendNotification(userId, type, channel, coachId) {
        const prefs = await this.getPreferences(userId);
        // Check if channel is globally enabled
        const channelKey = channel.toLowerCase();
        if (!prefs.channels[channelKey]) {
            return false;
        }
        // Check if coach is muted
        if (coachId && prefs.mutedCoaches.some((mc) => mc.coachId === coachId)) {
            return false;
        }
        // Check type-specific preferences
        const typePref = prefs.typePreferences[type];
        if (typePref) {
            if (!typePref.enabled) {
                return false;
            }
            if (!typePref.channels.includes(channel)) {
                return false;
            }
        }
        // Check quiet hours (for push notifications)
        if (channel === 'PUSH') {
            const inQuietHours = await this.isInQuietHours(userId);
            if (inQuietHours) {
                return false;
            }
        }
        return true;
    }
    /**
     * Reset preferences to defaults
     */
    async resetPreferences(userId) {
        const defaults = this.createDefaultPreferences(userId);
        defaults.createdAt = new Date().toISOString();
        await this.savePreferences(userId, defaults);
        logger.info('preferences_reset', { userId });
        return defaults;
    }
    // ============================================================================
    // MOCK DATA FOR DEMO
    // ============================================================================
    async seedDemoNotifications() {
        const demoNotifications = [
            // Coach notifications
            {
                id: 'demo_n1',
                type: 'booking',
                notificationType: 'BOOKING_RECEIVED',
                title: 'New Booking',
                body: '📅 New booking from Sarah Baker for Tom on Jan 15',
                recipientId: 'coach1',
                recipientRole: 'coach',
                deepLink: '/booking/b1',
                timeLabel: '5 min ago',
                read: false,
            },
            {
                id: 'demo_n2',
                type: 'message',
                notificationType: 'MESSAGE_RECEIVED',
                title: 'New Message',
                body: '💬 New message from Sarah Baker',
                recipientId: 'coach1',
                recipientRole: 'coach',
                deepLink: '/chat/thread1',
                timeLabel: '1 hour ago',
                read: false,
            },
            {
                id: 'demo_n3',
                type: 'review',
                notificationType: 'REVIEW_RECEIVED',
                title: 'New Review',
                body: '⭐ Mike Wilson left a 5-star review',
                recipientId: 'coach1',
                recipientRole: 'coach',
                deepLink: '/review/r1',
                timeLabel: '2 hours ago',
                read: true,
            },
            {
                id: 'demo_n4',
                type: 'booking',
                notificationType: 'SESSION_INVITE_RESPONSE',
                title: 'Invite Accepted',
                body: '✅ John Davis accepted session invite for Emma',
                recipientId: 'coach1',
                recipientRole: 'coach',
                deepLink: '/session-invites/inv1',
                timeLabel: '3 hours ago',
                read: true,
            },
            {
                id: 'demo_n5',
                type: 'reminder',
                notificationType: 'SESSION_REMINDER',
                title: 'Session Reminder',
                body: '⏰ Session with Tom Henderson in 1 hour',
                recipientId: 'coach1',
                recipientRole: 'coach',
                deepLink: '/booking/b2',
                timeLabel: 'Yesterday',
                read: true,
            },
            // Parent notifications
            {
                id: 'demo_n6',
                type: 'booking',
                notificationType: 'BOOKING_CONFIRMED',
                title: 'Booking Confirmed',
                body: '✅ Booking confirmed with Coach Marcus Thompson for Jan 20',
                recipientId: 'parent_1',
                recipientRole: 'parent',
                deepLink: '/booking/b3',
                timeLabel: '10 min ago',
                read: false,
            },
            {
                id: 'demo_n7',
                type: 'booking',
                notificationType: 'SESSION_INVITE',
                title: 'Session Invite',
                body: '📩 Coach Emma Williams invited Lucy to a session',
                recipientId: 'parent_1',
                recipientRole: 'parent',
                deepLink: '/session-invites/inv2',
                timeLabel: '30 min ago',
                read: false,
            },
            {
                id: 'demo_n8',
                type: 'badge',
                notificationType: 'BADGE_AWARDED',
                title: 'Badge Earned',
                body: '🏅 Tom earned Sharp Shooter Pro from Coach Marcus',
                badgeTitle: 'Sharp Shooter Pro',
                athleteName: 'Tom Baker',
                badgeAwardId: 'award_demo_1',
                actionLabel: 'Share to profile',
                recipientId: 'parent_1',
                recipientRole: 'parent',
                deepLink: '/badges',
                timeLabel: '1 hour ago',
                read: false,
            },
            {
                id: 'demo_n9',
                type: 'review',
                notificationType: 'REVIEW_RECEIVED',
                title: 'Session Feedback',
                body: "📝 Coach Marcus added feedback for Tom's session",
                recipientId: 'parent_1',
                recipientRole: 'parent',
                deepLink: '/bookings/b1',
                timeLabel: '2 hours ago',
                read: true,
            },
            {
                id: 'demo_n10',
                type: 'message',
                notificationType: 'MESSAGE_RECEIVED',
                title: 'New Message',
                body: '💬 New message from Coach Emma Williams',
                recipientId: 'parent_1',
                recipientRole: 'parent',
                deepLink: '/chat/thread2',
                timeLabel: '3 hours ago',
                read: true,
            },
            {
                id: 'demo_n11',
                type: 'reminder',
                notificationType: 'SESSION_REMINDER',
                title: 'Session Reminder',
                body: "⏰ Tom's session with Coach Marcus in 1 hour",
                recipientId: 'parent_1',
                recipientRole: 'parent',
                deepLink: '/booking/b4',
                timeLabel: 'Yesterday',
                read: true,
            },
            {
                id: 'demo_n12',
                type: 'message',
                notificationType: 'MESSAGE_RECEIVED',
                title: 'Club Update',
                body: '📢 New post in Bradwell Boys Academy',
                recipientId: 'parent_1',
                recipientRole: 'parent',
                deepLink: '/club-hub',
                timeLabel: 'Yesterday',
                read: true,
            },
        ];
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, demoNotifications);
        logger.info('demo_notifications_seeded', { count: demoNotifications.length });
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
