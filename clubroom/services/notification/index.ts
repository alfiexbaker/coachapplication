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

// Export individual services
// Backward-compatible facade
import { notificationStore } from './notification-store';
import { notificationSenderService } from './notification-sender';
import { notificationPreferencesService } from './notification-preferences';

export { notificationStore, type ExtendedNotificationItem } from './notification-store';
export { notificationSenderService } from './notification-sender';
export { notificationPreferencesService } from './notification-preferences';

/**
 * Backward-compatible notification service facade.
 * Use individual services for new code.
 *
 * @deprecated Use individual services: notificationStore, notificationSenderService, notificationPreferencesService
 */
export const notificationServices = {
  // Store operations
  list: notificationStore.list.bind(notificationStore),
  create: notificationStore.create.bind(notificationStore),
  markAsRead: notificationStore.markAsRead.bind(notificationStore),
  markAllAsRead: notificationStore.markAllAsRead.bind(notificationStore),
  markHandled: notificationStore.markHandled.bind(notificationStore),
  clearAll: notificationStore.clearAll.bind(notificationStore),
  getUnreadCount: notificationStore.getUnreadCount.bind(notificationStore),
  getByRecipient: notificationStore.getByRecipient.bind(notificationStore),
  getByType: notificationStore.getByType.bind(notificationStore),
  subscribe: notificationStore.subscribe.bind(notificationStore),

  // Sender operations (coach)
  notifyCoachNewBooking: notificationSenderService.notifyCoachNewBooking.bind(notificationSenderService),
  notifyCoachBookingCancelled: notificationSenderService.notifyCoachBookingCancelled.bind(notificationSenderService),
  notifyCoachInviteAccepted: notificationSenderService.notifyCoachInviteAccepted.bind(notificationSenderService),
  notifyCoachInviteDeclined: notificationSenderService.notifyCoachInviteDeclined.bind(notificationSenderService),
  notifyCoachNewMessage: notificationSenderService.notifyCoachNewMessage.bind(notificationSenderService),
  notifyCoachNewReview: notificationSenderService.notifyCoachNewReview.bind(notificationSenderService),
  notifyCoachSessionReminder: notificationSenderService.notifyCoachSessionReminder.bind(notificationSenderService),

  // Sender operations (parent)
  notifyParentBookingConfirmed: notificationSenderService.notifyParentBookingConfirmed.bind(notificationSenderService),
  notifyParentSessionInvite: notificationSenderService.notifyParentSessionInvite.bind(notificationSenderService),
  notifyParentBadgeAwarded: notificationSenderService.notifyParentBadgeAwarded.bind(notificationSenderService),
  notifyParentSessionFeedback: notificationSenderService.notifyParentSessionFeedback.bind(notificationSenderService),
  notifyParentNewMessage: notificationSenderService.notifyParentNewMessage.bind(notificationSenderService),
  notifyParentSessionReminder: notificationSenderService.notifyParentSessionReminder.bind(notificationSenderService),
  notifyParentClubPost: notificationSenderService.notifyParentClubPost.bind(notificationSenderService),

  // Preferences operations
  getPreferences: notificationPreferencesService.getPreferences.bind(notificationPreferencesService),
  updatePreferences: notificationPreferencesService.updatePreferences.bind(notificationPreferencesService),
  setQuietHours: notificationPreferencesService.setQuietHours.bind(notificationPreferencesService),
  toggleQuietHours: notificationPreferencesService.toggleQuietHours.bind(notificationPreferencesService),
  toggleChannel: notificationPreferencesService.toggleChannel.bind(notificationPreferencesService),
  toggleNotificationType: notificationPreferencesService.toggleNotificationType.bind(notificationPreferencesService),
  setNotificationTypeChannels: notificationPreferencesService.setNotificationTypeChannels.bind(notificationPreferencesService),
  muteCoach: notificationPreferencesService.muteCoach.bind(notificationPreferencesService),
  unmuteCoach: notificationPreferencesService.unmuteCoach.bind(notificationPreferencesService),
  getMutedCoaches: notificationPreferencesService.getMutedCoaches.bind(notificationPreferencesService),
  isCoachMuted: notificationPreferencesService.isCoachMuted.bind(notificationPreferencesService),
  isInQuietHours: notificationPreferencesService.isInQuietHours.bind(notificationPreferencesService),
  shouldSendNotification: notificationPreferencesService.shouldSendNotification.bind(notificationPreferencesService),
  resetPreferences: notificationPreferencesService.resetPreferences.bind(notificationPreferencesService),
};
