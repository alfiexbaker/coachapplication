"use strict";
/**
 * Notification Services - Unified Export
 *
 * This module provides a clean API for notification operations.
 * The original monolithic notificationService is split into focused services:
 *
 * - notificationStore: Core CRUD operations and listeners
 * - notificationSenderService: Sending notifications to users
 * - notificationPreferencesService: User preferences management
 *
 * For backward compatibility, this module also exports a facade
 * that matches the original notificationService API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationServices = exports.notificationPreferencesService = exports.notificationSenderService = exports.notificationStore = void 0;
// Export individual services
// Backward-compatible facade
const notification_store_1 = require("./notification-store");
const notification_sender_1 = require("./notification-sender");
const notification_preferences_1 = require("./notification-preferences");
var notification_store_2 = require("./notification-store");
Object.defineProperty(exports, "notificationStore", { enumerable: true, get: function () { return notification_store_2.notificationStore; } });
var notification_sender_2 = require("./notification-sender");
Object.defineProperty(exports, "notificationSenderService", { enumerable: true, get: function () { return notification_sender_2.notificationSenderService; } });
var notification_preferences_2 = require("./notification-preferences");
Object.defineProperty(exports, "notificationPreferencesService", { enumerable: true, get: function () { return notification_preferences_2.notificationPreferencesService; } });
/**
 * Backward-compatible notification service facade.
 * Use individual services for new code.
 *
 * @deprecated Use individual services: notificationStore, notificationSenderService, notificationPreferencesService
 */
exports.notificationServices = {
    // Store operations
    list: notification_store_1.notificationStore.list.bind(notification_store_1.notificationStore),
    create: notification_store_1.notificationStore.create.bind(notification_store_1.notificationStore),
    markAsRead: notification_store_1.notificationStore.markAsRead.bind(notification_store_1.notificationStore),
    markAllAsRead: notification_store_1.notificationStore.markAllAsRead.bind(notification_store_1.notificationStore),
    markHandled: notification_store_1.notificationStore.markHandled.bind(notification_store_1.notificationStore),
    clearAll: notification_store_1.notificationStore.clearAll.bind(notification_store_1.notificationStore),
    getUnreadCount: notification_store_1.notificationStore.getUnreadCount.bind(notification_store_1.notificationStore),
    getByRecipient: notification_store_1.notificationStore.getByRecipient.bind(notification_store_1.notificationStore),
    getByType: notification_store_1.notificationStore.getByType.bind(notification_store_1.notificationStore),
    subscribe: notification_store_1.notificationStore.subscribe.bind(notification_store_1.notificationStore),
    // Sender operations (coach)
    notifyCoachNewBooking: notification_sender_1.notificationSenderService.notifyCoachNewBooking.bind(notification_sender_1.notificationSenderService),
    notifyCoachBookingCancelled: notification_sender_1.notificationSenderService.notifyCoachBookingCancelled.bind(notification_sender_1.notificationSenderService),
    notifyCoachInviteAccepted: notification_sender_1.notificationSenderService.notifyCoachInviteAccepted.bind(notification_sender_1.notificationSenderService),
    notifyCoachInviteDeclined: notification_sender_1.notificationSenderService.notifyCoachInviteDeclined.bind(notification_sender_1.notificationSenderService),
    notifyCoachNewMessage: notification_sender_1.notificationSenderService.notifyCoachNewMessage.bind(notification_sender_1.notificationSenderService),
    notifyCoachNewReview: notification_sender_1.notificationSenderService.notifyCoachNewReview.bind(notification_sender_1.notificationSenderService),
    notifyCoachSessionReminder: notification_sender_1.notificationSenderService.notifyCoachSessionReminder.bind(notification_sender_1.notificationSenderService),
    // Sender operations (parent)
    notifyParentBookingConfirmed: notification_sender_1.notificationSenderService.notifyParentBookingConfirmed.bind(notification_sender_1.notificationSenderService),
    notifyParentSessionInvite: notification_sender_1.notificationSenderService.notifyParentSessionInvite.bind(notification_sender_1.notificationSenderService),
    notifyParentBadgeAwarded: notification_sender_1.notificationSenderService.notifyParentBadgeAwarded.bind(notification_sender_1.notificationSenderService),
    notifyParentSessionFeedback: notification_sender_1.notificationSenderService.notifyParentSessionFeedback.bind(notification_sender_1.notificationSenderService),
    notifyParentNewMessage: notification_sender_1.notificationSenderService.notifyParentNewMessage.bind(notification_sender_1.notificationSenderService),
    notifyParentSessionReminder: notification_sender_1.notificationSenderService.notifyParentSessionReminder.bind(notification_sender_1.notificationSenderService),
    notifyParentClubPost: notification_sender_1.notificationSenderService.notifyParentClubPost.bind(notification_sender_1.notificationSenderService),
    // Preferences operations
    getPreferences: notification_preferences_1.notificationPreferencesService.getPreferences.bind(notification_preferences_1.notificationPreferencesService),
    updatePreferences: notification_preferences_1.notificationPreferencesService.updatePreferences.bind(notification_preferences_1.notificationPreferencesService),
    setQuietHours: notification_preferences_1.notificationPreferencesService.setQuietHours.bind(notification_preferences_1.notificationPreferencesService),
    toggleQuietHours: notification_preferences_1.notificationPreferencesService.toggleQuietHours.bind(notification_preferences_1.notificationPreferencesService),
    toggleChannel: notification_preferences_1.notificationPreferencesService.toggleChannel.bind(notification_preferences_1.notificationPreferencesService),
    toggleNotificationType: notification_preferences_1.notificationPreferencesService.toggleNotificationType.bind(notification_preferences_1.notificationPreferencesService),
    setNotificationTypeChannels: notification_preferences_1.notificationPreferencesService.setNotificationTypeChannels.bind(notification_preferences_1.notificationPreferencesService),
    muteCoach: notification_preferences_1.notificationPreferencesService.muteCoach.bind(notification_preferences_1.notificationPreferencesService),
    unmuteCoach: notification_preferences_1.notificationPreferencesService.unmuteCoach.bind(notification_preferences_1.notificationPreferencesService),
    getMutedCoaches: notification_preferences_1.notificationPreferencesService.getMutedCoaches.bind(notification_preferences_1.notificationPreferencesService),
    isCoachMuted: notification_preferences_1.notificationPreferencesService.isCoachMuted.bind(notification_preferences_1.notificationPreferencesService),
    isInQuietHours: notification_preferences_1.notificationPreferencesService.isInQuietHours.bind(notification_preferences_1.notificationPreferencesService),
    shouldSendNotification: notification_preferences_1.notificationPreferencesService.shouldSendNotification.bind(notification_preferences_1.notificationPreferencesService),
    resetPreferences: notification_preferences_1.notificationPreferencesService.resetPreferences.bind(notification_preferences_1.notificationPreferencesService),
};
