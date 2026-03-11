import {
  NotificationItem,
  NotificationType,
  EnhancedNotificationPreferences,
  MutedCoach,
  NotificationChannel,
} from '@/constants/types';
import { apiClient } from './api-client';
import { createLogger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import {
  notificationStore,
  type ExtendedNotificationItem,
} from './notification/notification-store';
import { notificationPreferencesService } from './notification/notification-preferences';
import { notificationSenderService } from './notification/notification-sender';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';

const logger = createLogger('NotificationService');

type NotificationListener = (notification: ExtendedNotificationItem) => void;

class NotificationService {
  // ============================================================================
  // CORE NOTIFICATION OPERATIONS
  // ============================================================================

  async list(): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    return notificationStore.list();
  }

  async create(
    notification: ExtendedNotificationItem,
  ): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    return notificationStore.create(notification);
  }

  async markAsRead(id: string): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    return notificationStore.markAsRead(id);
  }

  async markAllAsRead(): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    return notificationStore.markAllAsRead();
  }

  async markHandled(
    id: string,
  ): Promise<Result<ExtendedNotificationItem | undefined, ServiceError>> {
    return notificationStore.markHandled(id);
  }

  async clearAll(): Promise<Result<void, ServiceError>> {
    return notificationStore.clearAll();
  }

  async dismiss(id: string): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    return notificationStore.dismiss(id);
  }

  async getUnreadCount(recipientId?: string): Promise<Result<number, ServiceError>> {
    return notificationStore.getUnreadCount(recipientId);
  }

  async getByRecipient(
    recipientId: string,
  ): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    return notificationStore.getByRecipient(recipientId);
  }

  async getByType(
    type: NotificationItem['type'],
  ): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    return notificationStore.getByType(type);
  }

  subscribe(listener: NotificationListener): () => void {
    return notificationStore.subscribe(listener);
  }

  // ============================================================================
  // COACH NOTIFICATION TRIGGERS
  // ============================================================================

  async notifyCoachNewBooking(params: {
    coachId: string;
    parentName: string;
    childName: string;
    date: string;
    bookingId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyCoachNewBooking(params);
  }

  async notifyCoachBookingCancelled(params: {
    coachId: string;
    parentName: string;
    date: string;
    bookingId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyCoachBookingCancelled(params);
  }

  async notifyCoachInviteAccepted(params: {
    coachId: string;
    parentName: string;
    childName: string;
    inviteId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyCoachInviteAccepted(params);
  }

  async notifyCoachInviteDeclined(params: {
    coachId: string;
    parentName: string;
    inviteId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyCoachInviteDeclined(params);
  }

  async notifyCoachNewMessage(params: {
    coachId: string;
    parentName: string;
    threadId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyCoachNewMessage(params);
  }

  async notifyCoachNewReview(params: {
    coachId: string;
    parentName: string;
    rating: number;
    reviewId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyCoachNewReview(params);
  }

  async notifyCoachSessionReminder(params: {
    coachId: string;
    athleteName: string;
    bookingId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyCoachSessionReminder(params);
  }

  async notifyCoachBookingHandoff(params: {
    coachId: string;
    title: string;
    date: string;
    bookingId?: string;
    organizationLabel: string;
    actorName: string;
    previousCoachName?: string;
    nextCoachName?: string;
    messageVariant: 'assigned_to_you' | 'moved_away';
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyCoachBookingHandoff(params);
  }

  // ============================================================================
  // PARENT NOTIFICATION TRIGGERS
  // ============================================================================

  async notifyParentBookingConfirmed(params: {
    parentId: string;
    coachName: string;
    date: string;
    bookingId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyParentBookingConfirmed(params);
  }

  async notifyParentSessionInvite(params: {
    parentId: string;
    coachName: string;
    childName: string;
    inviteId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyParentSessionInvite(params);
  }

  async notifyParentBadgeAwarded(params: {
    parentId: string;
    childName: string;
    badgeName: string;
    coachName: string;
    badgeAwardId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyParentBadgeAwarded(params);
  }

  async notifyParentSessionFeedback(params: {
    parentId: string;
    coachName: string;
    childName: string;
    bookingId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyParentSessionFeedback(params);
  }

  async notifyParentNewMessage(params: {
    parentId: string;
    coachName: string;
    threadId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyParentNewMessage(params);
  }

  async notifyParentSessionReminder(params: {
    parentId: string;
    childName: string;
    coachName: string;
    bookingId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyParentSessionReminder(params);
  }

  async notifyParentClubPost(params: {
    parentId: string;
    clubName: string;
    postId: string;
    clubId: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyParentClubPost(params);
  }

  async notifyParentBookingHandoff(params: {
    parentId: string;
    bookingId: string;
    athleteLabel: string;
    previousCoachName?: string;
    nextCoachName: string;
    organizationLabel: string;
    date: string;
    supportLabel: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifyParentBookingHandoff(params);
  }

  async notifySupportIssueReported(params: {
    recipientId: string;
    bookingId: string;
    category: string;
    title: string;
    date: string;
    supportLabel: string;
    descriptionPreview?: string;
  }): Promise<Result<void, ServiceError>> {
    return notificationSenderService.notifySupportIssueReported(params);
  }

  // ============================================================================
  // NOTIFICATION PREFERENCES MANAGEMENT
  // ============================================================================

  async getPreferences(
    userId: string,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    return notificationPreferencesService.getPreferences(userId);
  }

  async updatePreferences(
    userId: string,
    updates: Partial<Omit<EnhancedNotificationPreferences, 'userId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    return notificationPreferencesService.updatePreferences(userId, updates);
  }

  async setQuietHours(
    userId: string,
    startTime: string,
    endTime: string,
    enabled = true,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    return notificationPreferencesService.setQuietHours(userId, startTime, endTime, enabled);
  }

  async toggleQuietHours(
    userId: string,
    enabled: boolean,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    return notificationPreferencesService.toggleQuietHours(userId, enabled);
  }

  async toggleChannel(
    userId: string,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    return notificationPreferencesService.toggleChannel(userId, channel, enabled);
  }

  async toggleNotificationType(
    userId: string,
    type: NotificationType,
    enabled: boolean,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    return notificationPreferencesService.toggleNotificationType(userId, type, enabled);
  }

  async setNotificationTypeChannels(
    userId: string,
    type: NotificationType,
    channels: NotificationChannel[],
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    return notificationPreferencesService.setNotificationTypeChannels(userId, type, channels);
  }

  async muteCoach(
    userId: string,
    coachId: string,
    coachName: string,
    coachAvatar?: string,
    reason?: string,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    return notificationPreferencesService.muteCoach(
      userId,
      coachId,
      coachName,
      coachAvatar,
      reason,
    );
  }

  async unmuteCoach(
    userId: string,
    coachId: string,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    return notificationPreferencesService.unmuteCoach(userId, coachId);
  }

  async getMutedCoaches(userId: string): Promise<Result<MutedCoach[], ServiceError>> {
    return notificationPreferencesService.getMutedCoaches(userId);
  }

  async isCoachMuted(userId: string, coachId: string): Promise<Result<boolean, ServiceError>> {
    return notificationPreferencesService.isCoachMuted(userId, coachId);
  }

  async isInQuietHours(userId: string): Promise<Result<boolean, ServiceError>> {
    return notificationPreferencesService.isInQuietHours(userId);
  }

  async shouldSendNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    coachId?: string,
  ): Promise<Result<boolean, ServiceError>> {
    return notificationPreferencesService.shouldSendNotification(userId, type, channel, coachId);
  }

  async resetPreferences(
    userId: string,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    return notificationPreferencesService.resetPreferences(userId);
  }

  // ============================================================================
  // MOCK DATA FOR DEMO
  // ============================================================================

  async seedDemoNotifications(): Promise<Result<void, ServiceError>> {
    const demoNotifications: ExtendedNotificationItem[] = [
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
      await apiClient.set(STORAGE_KEYS.NOTIFICATIONS, demoNotifications);
      logger.info('demo_notifications_seeded', { count: demoNotifications.length });
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to seed demo notifications', error);
      return err(storageError('Failed to seed demo notifications'));
    }
  }
}

export const notificationService = new NotificationService();
export type { ExtendedNotificationItem };
