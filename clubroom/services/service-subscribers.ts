/**
 * Service Subscribers
 *
 * Central module that wires up cross-service reactions via the event bus.
 * Services emit events; this module listens and dispatches side-effects
 * (analytics logging, earnings recording, badge checks, notifications)
 * without coupling services to each other directly.
 *
 * Call `initializeSubscribers()` once at app startup.
 * Call `teardownSubscribers()` in tests or before re-initializing.
 */

import { onTyped, ServiceEvents, type EventPayloads } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import {
  handleBookingCreated as handleCalendarBookingCreated,
  handleBookingUpdated as handleCalendarBookingUpdated,
  handleBookingCancelled as handleCalendarBookingCancelled,
} from './calendar-sync-subscriber';

const logger = createLogger('ServiceSubscribers');

// ---------------------------------------------------------------------------
// Unsubscribe registry — keeps references so we can tear down cleanly.
// ---------------------------------------------------------------------------

const unsubscribers: (() => void)[] = [];

/**
 * Helper to register a typed subscription and track its unsubscribe handle.
 */
function subscribe<E extends keyof EventPayloads>(
  event: E,
  handler: (data: EventPayloads[E]) => void,
): void {
  const unsub = onTyped(event, handler);
  unsubscribers.push(unsub);
}

// ---------------------------------------------------------------------------
// Lazy service accessors — avoids import-time circular dependencies.
// Each getter is called only inside an event handler (i.e. after all modules
// have finished loading), so the singleton is guaranteed to exist.
// ---------------------------------------------------------------------------

function getAnalyticsService() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/services/analytics-service').analyticsService;
}

function getEarningsReportService() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/services/earnings/earnings-report-service').earningsReportService;
}

function getBadgeService() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/services/badge-service').badgeService;
}

function getNotificationService() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/services/notification-service').notificationService;
}

function getSocialFeedService() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/services/social-feed-service').socialFeedService;
}

function getBookingService() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/services/booking-service').bookingService;
}

function getSquadGroupService() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/services/squad-group-service').squadGroupService;
}

function getOfflineQueue() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/services/offline-queue');
}

// ---------------------------------------------------------------------------
// Subscriber wiring
// ---------------------------------------------------------------------------

/**
 * Initialize all event-bus subscriptions.
 * Idempotent: tears down existing subscriptions before re-registering.
 */
export function initializeSubscribers(): void {
  // Ensure clean state if called more than once.
  teardownSubscribers();

  logger.info('Initializing service event subscribers');

  // ---------- Booking events ------------------------------------------------

  subscribe(ServiceEvents.BOOKING_CREATED, (data) => {
    logger.debug('Handling BOOKING_CREATED', data);

    // Analytics: track new booking
    try {
      const analytics = getAnalyticsService();
      analytics.getAthleteAnalytics?.(data.athleteIds?.[0] ?? data.userId);
    } catch (err) {
      logger.error('Analytics tracking failed for BOOKING_CREATED', err);
    }

    // Notification: inform coach (already handled inline by booking service,
    // but the event allows other consumers to react as well).
    logger.info('Booking created event processed', {
      bookingId: data.bookingId,
      coachId: data.coachId,
    });
  });

  subscribe(ServiceEvents.BOOKING_CONFIRMED, (data) => {
    logger.debug('Handling BOOKING_CONFIRMED', data);

    logger.info('Booking confirmed event processed', {
      bookingId: data.bookingId,
      coachId: data.coachId,
    });
  });

  subscribe(ServiceEvents.BOOKING_CANCELLED, (data) => {
    logger.debug('Handling BOOKING_CANCELLED', data);

    logger.info('Booking cancelled event processed', {
      bookingId: data.bookingId,
      reason: data.reason,
      cancelledBy: data.cancelledBy,
    });
  });

  // ---------- Calendar sync events ------------------------------------------

  subscribe(ServiceEvents.BOOKING_CREATED, (data) => {
    handleCalendarBookingCreated(data).catch((err) => {
      logger.error('Calendar sync failed for BOOKING_CREATED', err);
    });
  });

  subscribe(ServiceEvents.BOOKING_UPDATED, (data) => {
    handleCalendarBookingUpdated(data).catch((err) => {
      logger.error('Calendar sync failed for BOOKING_UPDATED', err);
    });
  });

  subscribe(ServiceEvents.BOOKING_CANCELLED, (data) => {
    handleCalendarBookingCancelled(data).catch((err) => {
      logger.error('Calendar sync failed for BOOKING_CANCELLED', err);
    });
  });

  // ---------- Reschedule events ----------------------------------------------

  subscribe(ServiceEvents.RESCHEDULE_PROPOSED, (data) => {
    logger.debug('Handling RESCHEDULE_PROPOSED', data);

    // Notify respondent about new reschedule proposal
    try {
      const notifService = getNotificationService();
      notifService.create({
        id: `notif_resched_proposed_${data.proposalId}`,
        type: 'booking',
        title: 'Reschedule Request',
        body: `A reschedule has been proposed for your booking.`,
        timeLabel: 'Just now',
        read: false,
      });
    } catch (err) {
      logger.error('Notification creation failed for RESCHEDULE_PROPOSED', err);
    }

    logger.info('Reschedule proposed event processed', {
      proposalId: data.proposalId,
      bookingId: data.bookingId,
      initiatedBy: data.initiatedBy,
    });
  });

  subscribe(ServiceEvents.RESCHEDULE_ACCEPTED, (data) => {
    logger.debug('Handling RESCHEDULE_ACCEPTED', data);

    // Notify initiator that reschedule was accepted
    try {
      const notifService = getNotificationService();
      notifService.create({
        id: `notif_resched_accepted_${data.proposalId}`,
        type: 'booking',
        title: 'Reschedule Accepted',
        body: `Your reschedule request has been accepted.`,
        timeLabel: 'Just now',
        read: false,
      });
    } catch (err) {
      logger.error('Notification creation failed for RESCHEDULE_ACCEPTED', err);
    }

    logger.info('Reschedule accepted event processed', {
      proposalId: data.proposalId,
      bookingId: data.bookingId,
    });
  });

  subscribe(ServiceEvents.RESCHEDULE_DECLINED, (data) => {
    logger.debug('Handling RESCHEDULE_DECLINED', data);

    // Notify initiator that reschedule was declined
    try {
      const notifService = getNotificationService();
      notifService.create({
        id: `notif_resched_declined_${data.proposalId}`,
        type: 'booking',
        title: 'Reschedule Declined',
        body: `Your reschedule request has been declined.`,
        timeLabel: 'Just now',
        read: false,
      });
    } catch (err) {
      logger.error('Notification creation failed for RESCHEDULE_DECLINED', err);
    }

    logger.info('Reschedule declined event processed', {
      proposalId: data.proposalId,
      bookingId: data.bookingId,
    });
  });

  subscribe(ServiceEvents.RESCHEDULE_COUNTERED, (data) => {
    logger.debug('Handling RESCHEDULE_COUNTERED', data);

    // Notify original initiator about the counter-proposal
    try {
      const notifService = getNotificationService();
      notifService.create({
        id: `notif_resched_countered_${data.proposalId}`,
        type: 'booking',
        title: 'Reschedule Counter-Proposal',
        body: `A new time has been suggested for your reschedule request.`,
        timeLabel: 'Just now',
        read: false,
      });
    } catch (err) {
      logger.error('Notification creation failed for RESCHEDULE_COUNTERED', err);
    }

    logger.info('Reschedule countered event processed', {
      proposalId: data.proposalId,
      bookingId: data.bookingId,
    });
  });

  // ---------- Session events ------------------------------------------------

  subscribe(ServiceEvents.SESSION_COMPLETED, async (data) => {
    logger.debug('Handling SESSION_COMPLETED', data);

    // 1. Record earnings for the coach.
    try {
      const earningsReport = getEarningsReportService();
      const booking = await getBookingService().getBooking(data.bookingId ?? data.sessionId);
      if (booking) {
        const price = data.price ?? booking.price ?? 0;
        const athleteName = data.athleteName ?? booking.athleteName ?? 'Athlete';
        await earningsReport.recordSessionPayment(
          data.coachId,
          booking.id,
          price,
          athleteName,
          booking.scheduledAt?.split('T')[0],
        );
        logger.info('Earnings recorded for session', {
          sessionId: data.sessionId,
          coachId: data.coachId,
          price,
        });
      }
    } catch (err) {
      logger.error('Earnings recording failed for SESSION_COMPLETED', err);
    }

    // 2. Check badge eligibility for each athlete.
    try {
      const badgeSvc = getBadgeService();
      for (const athleteId of data.athleteIds) {
        // Progression check (milestones, streaks) is evaluated lazily
        // when the athlete's badge screen is loaded. Here we just log intent.
        await badgeSvc.getProgressToNextLevel(athleteId);
      }
    } catch (err) {
      logger.error('Badge check failed for SESSION_COMPLETED', err);
    }

    logger.info('Session completed event processed', {
      sessionId: data.sessionId,
      coachId: data.coachId,
      athleteCount: data.athleteIds.length,
    });
  });

  // ---------- Group session events -------------------------------------------

  subscribe(ServiceEvents.OPEN_SESSION_PUBLISHED, (data) => {
    logger.debug('Handling OPEN_SESSION_PUBLISHED', data);

    // Auto-create a session announcement feed post attributed to the coach
    try {
      const feedService = getSocialFeedService();
      feedService.createSessionAnnouncementPost({
        sessionId: data.sessionId,
        coachId: data.coachId,
        coachName: data.coachName,
        title: data.title,
        description: data.description,
        sessionType: data.sessionType,
        location: data.location,
        price: data.price,
        currency: data.currency,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        maxParticipants: data.maxParticipants,
        clubId: data.clubId,
        clubName: data.clubName,
        imageUrl: data.imageUrl,
      });
    } catch (error) {
      logger.error('Feed post creation failed for OPEN_SESSION_PUBLISHED', error);
    }

    logger.info('Open session published event processed', {
      sessionId: data.sessionId,
      coachId: data.coachId,
      title: data.title,
    });
  });

  // ---------- Payment events ------------------------------------------------

  subscribe(ServiceEvents.PAYMENT_SUCCEEDED, (data) => {
    logger.debug('Handling PAYMENT_SUCCEEDED', data);

    logger.info('Payment succeeded event processed', {
      transactionId: data.transactionId,
      userId: data.userId,
      bookingId: data.bookingId,
      amount: data.amount,
    });
  });

  subscribe(ServiceEvents.PAYMENT_FAILED, (data) => {
    logger.debug('Handling PAYMENT_FAILED', data);

    // Notify the user about the failed payment.
    try {
      const notifService = getNotificationService();
      notifService.create({
        id: `notif_pay_fail_${Date.now()}`,
        type: 'payment',
        title: 'Payment Failed',
        body: `Your payment of ${data.amount} could not be processed. ${data.error}`,
        timeLabel: 'Just now',
        read: false,
      });
    } catch (err) {
      logger.error('Notification creation failed for PAYMENT_FAILED', err);
    }

    logger.info('Payment failed event processed', {
      userId: data.userId,
      bookingId: data.bookingId,
      error: data.error,
    });
  });

  // ---------- Achievement events --------------------------------------------

  subscribe(ServiceEvents.BADGE_EARNED, (data) => {
    logger.debug('Handling BADGE_EARNED', data);

    logger.info('Badge earned event processed', {
      userId: data.userId,
      badgeId: data.badgeId,
      badgeLabel: data.badgeLabel,
    });
  });

  subscribe(ServiceEvents.STREAK_MILESTONE, (data) => {
    logger.debug('Handling STREAK_MILESTONE', data);

    // Notify the athlete about their streak.
    try {
      const notifService = getNotificationService();
      notifService.create({
        id: `notif_streak_${Date.now()}`,
        type: 'badge',
        title: 'Streak Milestone!',
        body: `You've trained for ${data.streakWeeks} consecutive weeks! ${data.milestoneLabel ?? 'Keep it up!'}`,
        timeLabel: 'Just now',
        read: false,
      });
    } catch (err) {
      logger.error('Notification creation failed for STREAK_MILESTONE', err);
    }

    logger.info('Streak milestone event processed', {
      userId: data.userId,
      streakWeeks: data.streakWeeks,
    });
  });

  // ---------- Family events -------------------------------------------------

  subscribe(ServiceEvents.FAMILY_MEMBER_ADDED, (data) => {
    logger.debug('Handling FAMILY_MEMBER_ADDED', data);

    logger.info('Family member added event processed', {
      familyId: data.familyId,
      memberId: data.memberId,
      memberName: data.memberName,
    });
  });

  subscribe(ServiceEvents.FAMILY_LINK_CREATED, (data) => {
    logger.debug('Handling FAMILY_LINK_CREATED', data);

    logger.info('Family link created event processed', {
      familyId: data.familyId,
      guardianId: data.guardianId,
      role: data.role,
    });
  });

  // ---------- Club events ---------------------------------------------------

  subscribe(ServiceEvents.CLUB_MEMBER_JOINED, (data) => {
    logger.debug('Handling CLUB_MEMBER_JOINED', data);

    logger.info('Club member joined event processed', {
      clubId: data.clubId,
      userId: data.userId,
      userName: data.userName,
    });
  });

  // ---------- User lifecycle events -----------------------------------------

  subscribe(ServiceEvents.USER_LOGGED_IN, (data) => {
    logger.debug('Handling USER_LOGGED_IN', data);

    logger.info('User logged in event processed', {
      userId: data.userId,
      role: data.role,
    });
  });

  subscribe(ServiceEvents.USER_LOGGED_OUT, (data) => {
    logger.debug('Handling USER_LOGGED_OUT', data);

    logger.info('User logged out event processed', {
      userId: data.userId,
    });
  });

  // ---------- Invite RSVP events ---------------------------------------------

  subscribe(ServiceEvents.INVITE_RSVP_RESPONDED, (data) => {
    logger.debug('Handling INVITE_RSVP_RESPONDED', data);

    // Create a feed post for the RSVP response
    try {
      const feedService = getSocialFeedService();
      const statusLabel =
        data.status === 'going' ? 'is going to' :
        data.status === 'maybe' ? 'might attend' :
        "can't make it to";
      const childDisplay = data.childName ? ` (${data.childName})` : '';

      // TODO: Determine feed type from invite/squad context when club features are wired
      const feedType = 'PERSONAL';
      const clubId = '';

      const postResult = feedService.createPost({
        clubId,
        authorId: data.userId,
        authorName: data.userName,
        title: 'RSVP Update',
        body: `${data.userName}${childDisplay} ${statusLabel} a session invite.`,
        postType: 'announcement',
        feedType: 'PERSONAL',
      });
      if (!postResult.success) {
        logger.error('Feed post creation returned error for INVITE_RSVP_RESPONDED', postResult.error);
      }
    } catch (error) {
      logger.error('Feed post creation failed for INVITE_RSVP_RESPONDED', error);
    }

    logger.info('Invite RSVP responded event processed', {
      inviteId: data.inviteId,
      userId: data.userId,
      status: data.status,
    });
  });

  // ---------- Comment events -------------------------------------------------

  subscribe(ServiceEvents.COMMENT_CREATED, (data) => {
    logger.debug('Handling COMMENT_CREATED', data);

    logger.info('Comment created event processed', {
      commentId: data.commentId,
      postId: data.postId,
      authorId: data.authorId,
    });
  });

  subscribe(ServiceEvents.COMMENT_REPLIED, (data) => {
    logger.debug('Handling COMMENT_REPLIED', data);

    logger.info('Comment reply event processed', {
      commentId: data.commentId,
      parentId: data.parentId,
      postId: data.postId,
    });
  });

  subscribe(ServiceEvents.COMMENT_DELETED, (data) => {
    logger.debug('Handling COMMENT_DELETED', data);

    logger.info('Comment deleted event processed', {
      commentId: data.commentId,
      postId: data.postId,
    });
  });

  subscribe(ServiceEvents.COMMENT_LIKED, (data) => {
    logger.debug('Handling COMMENT_LIKED', data);

    logger.info('Comment liked event processed', {
      commentId: data.commentId,
      postId: data.postId,
      liked: data.liked,
    });
  });

  // ---------- Coach feed events -----------------------------------------------

  subscribe(ServiceEvents.COACH_POST_CREATED, (data) => {
    logger.debug('Handling COACH_POST_CREATED', data);

    // Note: analytics tracking for coach posts is a no-op until a dedicated
    // tracking method is added to the analytics service (getAthleteAnalytics
    // is a read method, not a side-effect tracker).
    logger.debug('COACH_POST_CREATED analytics tracking pending implementation', {
      coachId: data.coachId,
      postId: data.postId,
    });

    logger.info('Coach post created event processed', {
      postId: data.postId,
      coachId: data.coachId,
      feedType: data.feedType,
      postType: data.postType,
    });
  });

  // ---------- Invite booking events ---------------------------------------------

  subscribe(ServiceEvents.INVITE_ACCEPTED, (data) => {
    logger.debug('Handling INVITE_ACCEPTED', data);

    logger.info('Invite accepted with booking', {
      inviteId: data.inviteId,
      bookingId: data.bookingId,
      coachId: data.coachId,
      parentId: data.parentId,
      athleteIds: data.athleteIds,
      slot: `${data.selectedSlot.date} ${data.selectedSlot.startTime}`,
    });
  });

  subscribe(ServiceEvents.INVITE_BOOKING_FAILED, (data) => {
    logger.debug('Handling INVITE_BOOKING_FAILED', data);

    // Create a notification for the parent about the booking failure
    try {
      const notifService = getNotificationService();
      notifService.create({
        id: `notif_invite_booking_fail_${data.inviteId}`,
        type: 'booking',
        title: 'Booking Failed',
        body: `We couldn't create the booking for your accepted invite. ${data.reason}`,
        timeLabel: 'Just now',
        read: false,
      });
    } catch (error) {
      logger.error('Notification creation failed for INVITE_BOOKING_FAILED', error);
    }

    logger.info('Invite booking failed event processed', {
      inviteId: data.inviteId,
      coachId: data.coachId,
      parentId: data.parentId,
      reason: data.reason,
    });
  });

  // ---------- Squad group events -----------------------------------------------

  subscribe(ServiceEvents.SQUAD_CREATED, (data) => {
    logger.debug('Handling SQUAD_CREATED', data);

    // Auto-provision a parent group chat for the new squad
    try {
      const squadGroupSvc = getSquadGroupService();
      squadGroupSvc
        .getOrCreateSquadGroup(data.squadId, data.createdBy, 'Coach')
        .catch((error: unknown) => {
          logger.error('Failed to auto-create squad group', error);
        });
    } catch (error) {
      logger.error('Squad group service unavailable for SQUAD_CREATED', error);
    }

    logger.info('Squad created event processed', {
      squadId: data.squadId,
      clubId: data.clubId,
    });
  });

  subscribe(ServiceEvents.SQUAD_DELETED, (data) => {
    logger.debug('Handling SQUAD_DELETED', data);

    // Delete the associated parent group
    try {
      const squadGroupSvc = getSquadGroupService();
      squadGroupSvc
        .deleteSquadGroup(data.squadId)
        .catch((error: unknown) => {
          logger.error('Failed to delete squad group', error);
        });
    } catch (error) {
      logger.error('Squad group service unavailable for SQUAD_DELETED', error);
    }

    logger.info('Squad deleted event processed', {
      squadId: data.squadId,
      clubId: data.clubId,
    });
  });

  subscribe(ServiceEvents.SQUAD_MEMBER_ADDED, (data) => {
    logger.debug('Handling SQUAD_MEMBER_ADDED', data);

    // Sync member to squad group
    try {
      const squadGroupSvc = getSquadGroupService();
      squadGroupSvc
        .syncMemberToGroup(data.squadId, data.userId, data.userName)
        .catch((error: unknown) => {
          logger.error('Failed to sync member addition to squad group', error);
        });
    } catch (error) {
      logger.error('Squad group service unavailable for SQUAD_MEMBER_ADDED', error);
    }

    logger.info('Squad member added event processed', {
      squadId: data.squadId,
      userId: data.userId,
    });
  });

  subscribe(ServiceEvents.SQUAD_MEMBER_REMOVED, (data) => {
    logger.debug('Handling SQUAD_MEMBER_REMOVED', data);

    // Remove member from squad group
    try {
      const squadGroupSvc = getSquadGroupService();
      squadGroupSvc
        .syncMemberRemovalFromGroup(data.squadId, data.userId)
        .catch((error: unknown) => {
          logger.error('Failed to sync member removal from squad group', error);
        });
    } catch (error) {
      logger.error('Squad group service unavailable for SQUAD_MEMBER_REMOVED', error);
    }

    logger.info('Squad member removed event processed', {
      squadId: data.squadId,
      userId: data.userId,
    });
  });

  // ---------- Connection & offline queue events --------------------------------

  subscribe(ServiceEvents.CONNECTION_CHANGED, (data) => {
    logger.debug('Handling CONNECTION_CHANGED', data);

    if (data.isConnected && data.wasOffline) {
      // Purge expired queue items when coming back online
      try {
        const offlineQueue = getOfflineQueue();
        offlineQueue
          .purgeExpired()
          .then((result: { success: boolean; data?: number }) => {
            if (result.success && result.data && result.data > 0) {
              logger.info(`Purged ${result.data} expired queue actions on reconnect`);
            }
          })
          .catch((error: unknown) => {
            logger.error('Failed to purge expired queue items on reconnect', error);
          });
      } catch (error) {
        logger.error('Offline queue service unavailable for CONNECTION_CHANGED', error);
      }
    }

    logger.info('Connection changed event processed', {
      isConnected: data.isConnected,
      wasOffline: data.wasOffline,
    });
  });

  subscribe(ServiceEvents.QUEUE_FLUSHED, (data) => {
    logger.debug('Handling QUEUE_FLUSHED', data);

    if (data.failed > 0) {
      // Create a notification about failed queue items
      try {
        const notifService = getNotificationService();
        notifService.create({
          id: `notif_queue_flush_fail_${Date.now()}`,
          type: 'system',
          title: 'Sync Incomplete',
          body: `${data.failed} change${data.failed === 1 ? '' : 's'} could not be synced. They will be retried.`,
          timeLabel: 'Just now',
          read: false,
        });
      } catch (error) {
        logger.error('Notification creation failed for QUEUE_FLUSHED', error);
      }
    }

    logger.info('Queue flushed event processed', {
      processed: data.processed,
      failed: data.failed,
      remaining: data.remaining,
    });
  });

  subscribe(ServiceEvents.QUEUE_ACTION_FAILED, (data) => {
    logger.debug('Handling QUEUE_ACTION_FAILED', data);

    logger.info('Queue action failed event processed', {
      actionId: data.actionId,
      path: data.path,
      method: data.method,
      error: data.error,
      willRetry: data.willRetry,
    });
  });

  logger.info(`Service subscribers initialized (${unsubscribers.length} subscriptions)`);
}

/**
 * Remove all subscriptions. Safe to call multiple times.
 */
export function teardownSubscribers(): void {
  if (unsubscribers.length === 0) return;

  logger.info(`Tearing down ${unsubscribers.length} service subscriptions`);
  for (const unsub of unsubscribers) {
    try {
      unsub();
    } catch (err) {
      logger.error('Error during subscriber teardown', err);
    }
  }
  unsubscribers.length = 0;
}
