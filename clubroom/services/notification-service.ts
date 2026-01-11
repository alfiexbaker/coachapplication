import { NotificationItem, NotificationType } from '@/constants/types';
import { storageService } from './storage-service';
import { createLogger } from '@/utils/logger';
import { notificationPreferencesService, ReminderTiming } from './notification-preferences-service';

const STORAGE_KEY = 'clubroom.notifications';
const logger = createLogger('NotificationService');

// Extended notification item with deep link support
export interface ExtendedNotificationItem extends NotificationItem {
  recipientId?: string;
  recipientRole?: 'coach' | 'parent';
  deepLink?: string;
  createdAt?: string;
  expiresAt?: string;
  data?: Record<string, string>;
  notificationType?: NotificationType;
}

// Notification listeners for in-app toasts
type NotificationListener = (notification: ExtendedNotificationItem) => void;
const listeners: NotificationListener[] = [];

export class NotificationService {
  // ============================================================================
  // CORE NOTIFICATION OPERATIONS
  // ============================================================================

  async list(): Promise<ExtendedNotificationItem[]> {
    return storageService.getItem<ExtendedNotificationItem[]>(STORAGE_KEY, []);
  }

  /**
   * Create a notification (internal - bypasses preference checks)
   * Use createWithPreferenceCheck for user-facing notifications
   */
  async create(notification: ExtendedNotificationItem): Promise<ExtendedNotificationItem[]> {
    const fullNotification: ExtendedNotificationItem = {
      ...notification,
      createdAt: notification.createdAt || new Date().toISOString(),
      read: notification.read ?? false,
    };

    const current = await this.list();
    const updated = [fullNotification, ...current];
    await storageService.setItem(STORAGE_KEY, updated);

    // Notify listeners for in-app toasts
    listeners.forEach((listener) => {
      try {
        listener(fullNotification);
      } catch (error) {
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

  /**
   * Create a notification with preference checks
   * Returns null if notification was blocked due to user preferences
   */
  async createWithPreferenceCheck(
    notification: ExtendedNotificationItem
  ): Promise<ExtendedNotificationItem[] | null> {
    const recipientId = notification.recipientId;
    const notificationType = notification.notificationType;

    // If we have both recipientId and notificationType, check preferences
    if (recipientId && notificationType) {
      const shouldNotify = await notificationPreferencesService.shouldNotify(
        recipientId,
        notificationType
      );

      if (!shouldNotify) {
        logger.info('notification_blocked_by_preferences', {
          id: notification.id,
          type: notificationType,
          recipientId,
        });
        return null;
      }
    }

    return this.create(notification);
  }

  async markAsRead(id: string): Promise<ExtendedNotificationItem[]> {
    const current = await this.list();
    const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
    await storageService.setItem(STORAGE_KEY, updated);
    return updated;
  }

  async markAllAsRead(): Promise<ExtendedNotificationItem[]> {
    const current = await this.list();
    const updated = current.map((n) => ({ ...n, read: true }));
    await storageService.setItem(STORAGE_KEY, updated);
    return updated;
  }

  async markHandled(id: string): Promise<ExtendedNotificationItem | undefined> {
    const current = await this.list();
    const updated = current.map((n) => (n.id === id ? { ...n, read: true, handled: true } : n));
    await storageService.setItem(STORAGE_KEY, updated);
    return updated.find((n) => n.id === id);
  }

  async clearAll(): Promise<void> {
    await storageService.setItem(STORAGE_KEY, []);
  }

  async getUnreadCount(recipientId?: string): Promise<number> {
    const notifications = await this.list();
    const filtered = recipientId
      ? notifications.filter((n) => n.recipientId === recipientId)
      : notifications;
    return filtered.filter((n) => !n.read).length;
  }

  async getByRecipient(recipientId: string): Promise<ExtendedNotificationItem[]> {
    const notifications = await this.list();
    return notifications.filter((n) => n.recipientId === recipientId);
  }

  async getByType(type: NotificationItem['type']): Promise<ExtendedNotificationItem[]> {
    const notifications = await this.list();
    return notifications.filter((n) => n.type === type);
  }

  // ============================================================================
  // NOTIFICATION LISTENERS (for in-app toasts)
  // ============================================================================

  subscribe(listener: NotificationListener): () => void {
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
  async notifyCoachNewBooking(params: {
    coachId: string;
    parentName: string;
    childName: string;
    date: string;
    bookingId: string;
  }): Promise<void> {
    await this.createWithPreferenceCheck({
      id: `notif_booking_${Date.now()}`,
      type: 'booking',
      notificationType: 'BOOKING_RECEIVED',
      title: 'New Booking',
      body: `New booking from ${params.parentName} for ${params.childName} on ${params.date}`,
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
  async notifyCoachBookingCancelled(params: {
    coachId: string;
    parentName: string;
    date: string;
    bookingId: string;
  }): Promise<void> {
    await this.createWithPreferenceCheck({
      id: `notif_cancel_${Date.now()}`,
      type: 'booking',
      notificationType: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled',
      body: `${params.parentName} cancelled booking for ${params.date}`,
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
  async notifyCoachInviteAccepted(params: {
    coachId: string;
    parentName: string;
    childName: string;
    inviteId: string;
  }): Promise<void> {
    await this.createWithPreferenceCheck({
      id: `notif_invite_accept_${Date.now()}`,
      type: 'booking',
      notificationType: 'SESSION_INVITE_RESPONSE',
      title: 'Invite Accepted',
      body: `${params.parentName} accepted session invite for ${params.childName}`,
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
  async notifyCoachInviteDeclined(params: {
    coachId: string;
    parentName: string;
    inviteId: string;
  }): Promise<void> {
    await this.createWithPreferenceCheck({
      id: `notif_invite_decline_${Date.now()}`,
      type: 'booking',
      notificationType: 'SESSION_INVITE_RESPONSE',
      title: 'Invite Declined',
      body: `${params.parentName} declined session invite`,
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
  async notifyCoachNewMessage(params: {
    coachId: string;
    parentName: string;
    threadId: string;
  }): Promise<void> {
    await this.createWithPreferenceCheck({
      id: `notif_msg_${Date.now()}`,
      type: 'message',
      notificationType: 'MESSAGE_RECEIVED',
      title: 'New Message',
      body: `New message from ${params.parentName}`,
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
  async notifyCoachNewReview(params: {
    coachId: string;
    parentName: string;
    rating: number;
    reviewId: string;
  }): Promise<void> {
    await this.createWithPreferenceCheck({
      id: `notif_review_${Date.now()}`,
      type: 'review',
      notificationType: 'REVIEW_RECEIVED',
      title: 'New Review',
      body: `${params.parentName} left a ${params.rating}-star review`,
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
  async notifyCoachSessionReminder(params: {
    coachId: string;
    athleteName: string;
    bookingId: string;
    hoursBeforeSession?: number;
  }): Promise<void> {
    const hoursLabel = params.hoursBeforeSession === 1
      ? '1 hour'
      : params.hoursBeforeSession === 24
      ? 'tomorrow'
      : params.hoursBeforeSession === 48
      ? 'in 2 days'
      : '1 hour';

    await this.createWithPreferenceCheck({
      id: `notif_reminder_${Date.now()}`,
      type: 'reminder',
      notificationType: 'SESSION_REMINDER',
      title: 'Session Reminder',
      body: `Session with ${params.athleteName} ${hoursLabel}`,
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
  async notifyParentBookingConfirmed(params: {
    parentId: string;
    coachName: string;
    date: string;
    bookingId: string;
  }): Promise<void> {
    await this.createWithPreferenceCheck({
      id: `notif_confirm_${Date.now()}`,
      type: 'booking',
      notificationType: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed',
      body: `Booking confirmed with Coach ${params.coachName} for ${params.date}`,
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
  async notifyParentSessionInvite(params: {
    parentId: string;
    coachName: string;
    childName: string;
    inviteId: string;
  }): Promise<void> {
    await this.createWithPreferenceCheck({
      id: `notif_invite_${Date.now()}`,
      type: 'booking',
      notificationType: 'SESSION_INVITE',
      title: 'Session Invite',
      body: `Coach ${params.coachName} invited ${params.childName} to a session`,
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
  async notifyParentBadgeAwarded(params: {
    parentId: string;
    childName: string;
    badgeName: string;
    coachName: string;
    badgeAwardId: string;
  }): Promise<void> {
    await this.createWithPreferenceCheck({
      id: `notif_badge_${Date.now()}`,
      type: 'badge',
      notificationType: 'BADGE_AWARDED',
      title: 'Badge Earned',
      body: `${params.childName} earned ${params.badgeName} from Coach ${params.coachName}`,
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
  async notifyParentSessionFeedback(params: {
    parentId: string;
    coachName: string;
    childName: string;
    bookingId: string;
  }): Promise<void> {
    await this.createWithPreferenceCheck({
      id: `notif_feedback_${Date.now()}`,
      type: 'review',
      notificationType: 'REVIEW_RECEIVED',
      title: 'Session Feedback',
      body: `Coach ${params.coachName} added feedback for ${params.childName}'s session`,
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
  async notifyParentNewMessage(params: {
    parentId: string;
    coachName: string;
    threadId: string;
  }): Promise<void> {
    await this.createWithPreferenceCheck({
      id: `notif_msg_${Date.now()}`,
      type: 'message',
      notificationType: 'MESSAGE_RECEIVED',
      title: 'New Message',
      body: `New message from Coach ${params.coachName}`,
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
  async notifyParentSessionReminder(params: {
    parentId: string;
    childName: string;
    coachName: string;
    bookingId: string;
    hoursBeforeSession?: number;
  }): Promise<void> {
    const hoursLabel = params.hoursBeforeSession === 1
      ? 'in 1 hour'
      : params.hoursBeforeSession === 24
      ? 'tomorrow'
      : params.hoursBeforeSession === 48
      ? 'in 2 days'
      : 'in 1 hour';

    await this.createWithPreferenceCheck({
      id: `notif_reminder_${Date.now()}`,
      type: 'reminder',
      notificationType: 'SESSION_REMINDER',
      title: 'Session Reminder',
      body: `${params.childName}'s session with Coach ${params.coachName} ${hoursLabel}`,
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
  async notifyParentClubPost(params: {
    parentId: string;
    clubName: string;
    postId: string;
    clubId: string;
  }): Promise<void> {
    await this.createWithPreferenceCheck({
      id: `notif_post_${Date.now()}`,
      type: 'message',
      notificationType: 'MESSAGE_RECEIVED',
      title: 'Club Update',
      body: `New post in ${params.clubName}`,
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
  // CLUB SESSION / EVENT / MATCH NOTIFICATIONS
  // ============================================================================

  /**
   * Notify parent of new session offering available in club
   */
  async notifyParentSessionAvailable(params: {
    parentId: string;
    clubId: string;
    clubName: string;
    sessionId: string;
    sessionTitle: string;
    sessionDate: string;
    sessionTime: string;
    coachName: string;
  }): Promise<void> {
    const formattedDate = new Date(params.sessionDate).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    await this.createWithPreferenceCheck({
      id: `notif_session_${Date.now()}_${params.parentId}`,
      type: 'booking',
      notificationType: 'SESSION_AVAILABLE',
      title: 'New Training Session',
      body: `New session available: ${params.sessionTitle} on ${formattedDate} at ${params.sessionTime}`,
      recipientId: params.parentId,
      recipientRole: 'parent',
      deepLink: `/group-sessions/${params.sessionId}`,
      data: {
        sessionId: params.sessionId,
        sessionTitle: params.sessionTitle,
        clubId: params.clubId,
        clubName: params.clubName,
        coachName: params.coachName,
      },
      timeLabel: 'Just now',
    });

    logger.info('session_available_notification_sent', {
      parentId: params.parentId,
      sessionId: params.sessionId,
    });
  }

  /**
   * Notify parent of new match/fixture created
   */
  async notifyParentMatchCreated(params: {
    parentId: string;
    clubId: string;
    clubName: string;
    matchId: string;
    matchTitle: string;
    matchDate: string;
    kickoffTime: string;
    venue: string;
    athleteName: string;
  }): Promise<void> {
    const formattedDate = new Date(params.matchDate).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    await this.createWithPreferenceCheck({
      id: `notif_match_${Date.now()}_${params.parentId}`,
      type: 'booking',
      notificationType: 'MATCH_CREATED',
      title: 'New Match Scheduled',
      body: `${params.matchTitle} on ${formattedDate} at ${params.kickoffTime}`,
      recipientId: params.parentId,
      recipientRole: 'parent',
      deepLink: `/matches/${params.matchId}`,
      data: {
        matchId: params.matchId,
        matchTitle: params.matchTitle,
        clubId: params.clubId,
        clubName: params.clubName,
        athleteName: params.athleteName,
      },
      timeLabel: 'Just now',
    });

    logger.info('match_created_notification_sent', {
      parentId: params.parentId,
      matchId: params.matchId,
    });
  }

  /**
   * Notify parent of new club event created
   */
  async notifyParentEventCreated(params: {
    parentId: string;
    clubId: string;
    clubName: string;
    eventId: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    venue: string;
  }): Promise<void> {
    const formattedDate = new Date(params.eventDate).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    await this.createWithPreferenceCheck({
      id: `notif_event_${Date.now()}_${params.parentId}`,
      type: 'booking',
      notificationType: 'EVENT_CREATED',
      title: 'New Club Event',
      body: `${params.eventTitle} on ${formattedDate} at ${params.eventTime}`,
      recipientId: params.parentId,
      recipientRole: 'parent',
      deepLink: `/events/${params.eventId}`,
      data: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        clubId: params.clubId,
        clubName: params.clubName,
      },
      timeLabel: 'Just now',
    });

    logger.info('event_created_notification_sent', {
      parentId: params.parentId,
      eventId: params.eventId,
    });
  }

  /**
   * Notify parent of upcoming session (24h reminder)
   */
  async notifyParentSessionReminder24h(params: {
    parentId: string;
    childName: string;
    sessionTitle: string;
    sessionDate: string;
    sessionTime: string;
    location: string;
    sessionId: string;
    clubName: string;
  }): Promise<void> {
    await this.createWithPreferenceCheck({
      id: `notif_session_reminder_${Date.now()}_${params.parentId}`,
      type: 'reminder',
      notificationType: 'SESSION_REMINDER',
      title: 'Session Tomorrow',
      body: `Reminder: ${params.childName} has ${params.sessionTitle} tomorrow at ${params.sessionTime}`,
      recipientId: params.parentId,
      recipientRole: 'parent',
      deepLink: `/group-sessions/${params.sessionId}`,
      data: {
        sessionId: params.sessionId,
        sessionTitle: params.sessionTitle,
        childName: params.childName,
        location: params.location,
        clubName: params.clubName,
      },
      timeLabel: 'Just now',
    });

    logger.info('session_reminder_sent', {
      parentId: params.parentId,
      sessionId: params.sessionId,
    });
  }

  /**
   * Bulk notify all parents in a club about a new session
   */
  async notifyClubParentsSessionAvailable(params: {
    clubId: string;
    clubName: string;
    sessionId: string;
    sessionTitle: string;
    sessionDate: string;
    sessionTime: string;
    coachName: string;
    parentIds: string[];
  }): Promise<void> {
    for (const parentId of params.parentIds) {
      await this.notifyParentSessionAvailable({
        parentId,
        clubId: params.clubId,
        clubName: params.clubName,
        sessionId: params.sessionId,
        sessionTitle: params.sessionTitle,
        sessionDate: params.sessionDate,
        sessionTime: params.sessionTime,
        coachName: params.coachName,
      });
    }

    logger.info('club_session_notifications_sent', {
      clubId: params.clubId,
      sessionId: params.sessionId,
      parentCount: params.parentIds.length,
    });
  }

  /**
   * Bulk notify all parents in a club about a new match
   */
  async notifyClubParentsMatchCreated(params: {
    clubId: string;
    clubName: string;
    matchId: string;
    matchTitle: string;
    matchDate: string;
    kickoffTime: string;
    venue: string;
    players: Array<{ parentId: string; athleteName: string }>;
  }): Promise<void> {
    for (const player of params.players) {
      await this.notifyParentMatchCreated({
        parentId: player.parentId,
        clubId: params.clubId,
        clubName: params.clubName,
        matchId: params.matchId,
        matchTitle: params.matchTitle,
        matchDate: params.matchDate,
        kickoffTime: params.kickoffTime,
        venue: params.venue,
        athleteName: player.athleteName,
      });
    }

    logger.info('club_match_notifications_sent', {
      clubId: params.clubId,
      matchId: params.matchId,
      parentCount: params.players.length,
    });
  }

  /**
   * Bulk notify all parents in a club about a new event
   */
  async notifyClubParentsEventCreated(params: {
    clubId: string;
    clubName: string;
    eventId: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    venue: string;
    parentIds: string[];
  }): Promise<void> {
    for (const parentId of params.parentIds) {
      await this.notifyParentEventCreated({
        parentId,
        clubId: params.clubId,
        clubName: params.clubName,
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        eventDate: params.eventDate,
        eventTime: params.eventTime,
        venue: params.venue,
      });
    }

    logger.info('club_event_notifications_sent', {
      clubId: params.clubId,
      eventId: params.eventId,
      parentCount: params.parentIds.length,
    });
  }

  // ============================================================================
  // MOCK DATA FOR DEMO
  // ============================================================================

  async seedDemoNotifications(): Promise<void> {
    const demoNotifications: ExtendedNotificationItem[] = [
      // Coach notifications
      {
        id: 'demo_n1',
        type: 'booking',
        notificationType: 'BOOKING_RECEIVED',
        title: 'New Booking',
        body: '📅 New booking from Sarah Baker for Tom on Jan 15',
        recipientId: 'coach_1',
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
        recipientId: 'coach_1',
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
        recipientId: 'coach_1',
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
        recipientId: 'coach_1',
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
        recipientId: 'coach_1',
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

    await storageService.setItem(STORAGE_KEY, demoNotifications);
    logger.info('demo_notifications_seeded', { count: demoNotifications.length });
  }
}

export const notificationService = new NotificationService();
