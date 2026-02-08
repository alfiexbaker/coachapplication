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
