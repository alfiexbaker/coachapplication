/**
 * Notification Trigger — Event bus for service-to-notification communication.
 *
 * When any service performs a write action that affects ANOTHER user,
 * it calls triggerNotification() to create a local notification.
 *
 * For MVP: writes to local notifications store.
 * For API: this becomes a server-side push trigger.
 */

import { notificationService } from './notification-service';
import { generateId } from '@/utils/generate-id';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err } from '@/types/result';

const logger = createLogger('NotificationTrigger');

export type NotifiableAction = {
  type: string;
  recipientId?: string;
  recipientRole: 'coach' | 'parent' | 'athlete';
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, string>;
};

// Map action types to notification types
function mapToNotificationType(
  actionType: string,
): 'booking' | 'message' | 'review' | 'payment' | 'reminder' | 'badge' {
  if (
    actionType.includes('booking') ||
    actionType.includes('session') ||
    actionType.includes('invite') ||
    actionType.includes('rsvp') ||
    actionType.includes('cancel')
  )
    return 'booking';
  if (actionType.includes('message')) return 'message';
  if (actionType.includes('review')) return 'review';
  if (actionType.includes('payment') || actionType.includes('earning')) return 'payment';
  if (actionType.includes('badge') || actionType.includes('drill') || actionType.includes('goal'))
    return 'badge';
  return 'reminder';
}

/**
 * Fire a notification from any service.
 * Call this after every write action that affects another user.
 */
export async function triggerNotification(action: NotifiableAction): Promise<Result<void, ServiceError>> {
  try {
    const notificationType = mapToNotificationType(action.type);

    await notificationService.create({
      id: generateId('notif'),
      type: notificationType,
      title: action.title,
      body: action.body,
      recipientId: action.recipientId,
      recipientRole: action.recipientRole === 'athlete' ? undefined : action.recipientRole,
      deepLink: action.deepLink,
      data: action.data,
      read: false,
    });

    logger.info('Notification triggered', { type: action.type, recipient: action.recipientRole });
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to trigger notification', { type: action.type, error });
    return err({
      code: 'UNKNOWN',
      message: 'Failed to trigger notification',
      details: error,
    });
  }
}

// ============================================================================
// PRE-DEFINED NOTIFICATION TRIGGERS
// ============================================================================
// Call these from the relevant service after a write action.

export const notificationTriggers = {
  // --- Drill Service ---
  drillAssigned(coachName: string, drillName: string, athleteName: string, recipientId?: string) {
    return triggerNotification({
      type: 'drill_assigned',
      recipientRole: 'parent',
      recipientId,
      title: 'New Drill Assigned',
      body: `Coach ${coachName} assigned a new drill: ${drillName}`,
      deepLink: '/drills',
    });
  },

  drillCompleted(athleteName: string, drillName: string, recipientId?: string) {
    return triggerNotification({
      type: 'drill_completed',
      recipientRole: 'coach',
      recipientId,
      title: 'Drill Completed',
      body: `${athleteName} completed ${drillName}`,
      deepLink: '/drills',
    });
  },

  // --- Event Service ---
  eventCreated(eventName: string, eventDate: string, recipientId?: string) {
    return triggerNotification({
      type: 'event_created',
      recipientRole: 'parent',
      recipientId,
      title: 'New Event',
      body: `New event: ${eventName} on ${eventDate}`,
      deepLink: '/events',
    });
  },

  eventCancelled(eventName: string, recipientId?: string) {
    return triggerNotification({
      type: 'event_cancelled',
      recipientRole: 'parent',
      recipientId,
      title: 'Event Cancelled',
      body: `${eventName} has been cancelled`,
      deepLink: '/events',
    });
  },

  eventRsvp(parentName: string, eventName: string, response: string, recipientId?: string) {
    return triggerNotification({
      type: 'event_rsvp',
      recipientRole: 'coach',
      recipientId,
      title: 'RSVP Response',
      body: `${parentName} is ${response} for ${eventName}`,
      deepLink: '/events',
    });
  },

  // --- Group Session Service ---
  groupSessionCreated(sessionTitle: string, dateTime: string, recipientId?: string) {
    return triggerNotification({
      type: 'group_session_created',
      recipientRole: 'parent',
      recipientId,
      title: 'New Group Session',
      body: `New group session: ${sessionTitle} on ${dateTime}`,
      deepLink: '/group-sessions',
    });
  },

  groupSessionCancelled(sessionTitle: string, recipientId?: string) {
    return triggerNotification({
      type: 'group_session_cancelled',
      recipientRole: 'parent',
      recipientId,
      title: 'Session Cancelled',
      body: `${sessionTitle} has been cancelled`,
      deepLink: '/group-sessions',
    });
  },

  groupRegistered(athleteName: string, sessionTitle: string, recipientId?: string) {
    return triggerNotification({
      type: 'group_registered',
      recipientRole: 'coach',
      recipientId,
      title: 'New Registration',
      body: `${athleteName} registered for ${sessionTitle}`,
      deepLink: '/group-sessions',
    });
  },

  groupCancelledRegistration(athleteName: string, sessionTitle: string, recipientId?: string) {
    return triggerNotification({
      type: 'group_cancelled_registration',
      recipientRole: 'coach',
      recipientId,
      title: 'Registration Cancelled',
      body: `${athleteName} dropped out of ${sessionTitle}`,
      deepLink: '/group-sessions',
    });
  },

  // --- Family Service ---
  guardianRemoved(familyName: string, recipientId?: string) {
    return triggerNotification({
      type: 'guardian_removed',
      recipientRole: 'parent',
      recipientId,
      title: 'Family Update',
      body: `You've been removed from ${familyName}'s family account`,
    });
  },

  guardianPermissionsUpdated(recipientId?: string) {
    return triggerNotification({
      type: 'permissions_updated',
      recipientRole: 'parent',
      recipientId,
      title: 'Permissions Updated',
      body: 'Your family permissions were updated',
    });
  },

  guardianInvited(familyName: string, recipientId?: string) {
    return triggerNotification({
      type: 'guardian_invited',
      recipientRole: 'parent',
      recipientId,
      title: 'Family Invite',
      body: `You've been invited to join ${familyName}'s family account`,
    });
  },

  guardianJoined(userName: string, recipientId?: string) {
    return triggerNotification({
      type: 'guardian_invited',
      recipientRole: 'parent',
      recipientId,
      title: 'Guardian Joined',
      body: `${userName} has joined your family account`,
    });
  },

  // --- Booking Service ---
  bookingConfirmed(coachName: string, dateTime: string, recipientId?: string) {
    return triggerNotification({
      type: 'booking_confirmed',
      recipientRole: 'parent',
      recipientId,
      title: 'Booking Confirmed',
      body: `Booking confirmed: ${dateTime} with Coach ${coachName}`,
      deepLink: '/bookings',
    });
  },

  bookingCancelled(
    cancelledByName: string,
    dateTime: string,
    recipientRole: 'coach' | 'parent',
    recipientId?: string,
  ) {
    return triggerNotification({
      type: 'booking_cancelled',
      recipientRole,
      recipientId,
      title: 'Booking Cancelled',
      body: `${cancelledByName} cancelled the session on ${dateTime}`,
      deepLink: '/bookings',
    });
  },

  // --- Invite Service ---
  inviteAccepted(parentName: string, athleteName: string, recipientId?: string) {
    return triggerNotification({
      type: 'invite_accepted',
      recipientRole: 'coach',
      recipientId,
      title: 'Invite Accepted',
      body: `${parentName} accepted the invite for ${athleteName}`,
      deepLink: '/session-invites',
    });
  },

  inviteDeclined(parentName: string, athleteName: string, reason: string, recipientId?: string) {
    return triggerNotification({
      type: 'invite_declined',
      recipientRole: 'coach',
      recipientId,
      title: 'Invite Declined',
      body: `${parentName} declined the invite for ${athleteName}. Reason: ${reason}`,
      deepLink: '/session-invites',
    });
  },

  inviteReceived(coachName: string, athleteName: string, recipientId?: string) {
    return triggerNotification({
      type: 'invite_received',
      recipientRole: 'parent',
      recipientId,
      title: 'Session Invite',
      body: `Coach ${coachName} invited ${athleteName} to a session`,
      deepLink: '/session-invites',
    });
  },

  // --- Session Completion ---
  sessionCompleted(coachName: string, athleteName: string, recipientId?: string) {
    return triggerNotification({
      type: 'session_completed',
      recipientRole: 'parent',
      recipientId,
      title: 'Session Completed',
      body: `Coach ${coachName} completed ${athleteName}'s session`,
      deepLink: '/bookings',
    });
  },

  reviewPrompt(coachName: string, athleteName: string, recipientId?: string) {
    return triggerNotification({
      type: 'review_prompt',
      recipientRole: 'parent',
      recipientId,
      title: 'How was the session?',
      body: `Rate ${athleteName}'s session with Coach ${coachName}`,
      deepLink: '/bookings',
    });
  },

  selfAssessmentPrompt(athleteName: string, recipientId?: string) {
    return triggerNotification({
      type: 'self_assessment_prompt',
      recipientRole: 'athlete',
      recipientId,
      title: 'Quick Session Check-In',
      body: `How did training feel today, ${athleteName}?`,
      deepLink: '/development/my-progress',
    });
  },

  weeklyProgressRecap(athleteName: string, body: string, recipientId?: string) {
    return triggerNotification({
      type: 'weekly_progress_recap',
      recipientRole: 'parent',
      recipientId,
      title: `${athleteName}'s Weekly Progress`,
      body,
      deepLink: '/development/my-progress',
    });
  },

  // --- Badge Service ---
  badgeEarned(athleteName: string, badgeName: string, recipientId?: string) {
    return triggerNotification({
      type: 'badge_earned',
      recipientRole: 'parent',
      recipientId,
      title: 'Badge Earned!',
      body: `${athleteName} earned "${badgeName}"`,
      deepLink: '/badges',
    });
  },

  // --- Favourite Service ---
  favouriteAdded(coachId: string) {
    // Aggregate only — coach sees count in analytics, not individual names
    // No notification triggered
    return Promise.resolve();
  },

  // --- No-Show ---
  noShowMarked(athleteName: string, sessionDate: string, recipientId?: string) {
    return triggerNotification({
      type: 'no_show_marked',
      recipientRole: 'parent',
      recipientId,
      title: 'No-Show Recorded',
      body: `${athleteName} was marked as no-show for the session on ${sessionDate}`,
      deepLink: '/bookings',
    });
  },

  // --- Reschedule ---
  rescheduleRequested(
    coachName: string,
    originalDate: string,
    newDate: string,
    recipientId?: string,
  ) {
    return triggerNotification({
      type: 'reschedule_request',
      recipientRole: 'parent',
      recipientId,
      title: 'Reschedule Request',
      body: `Coach ${coachName} wants to move your session from ${originalDate} to ${newDate}`,
      deepLink: '/bookings',
    });
  },

  // --- Waitlist ---
  slotFreed(coachName: string, dateTime: string, recipientId?: string) {
    return triggerNotification({
      type: 'slot_freed',
      recipientRole: 'parent',
      recipientId,
      title: 'Spot Available!',
      body: `A spot opened up for ${dateTime} with Coach ${coachName}`,
      deepLink: '/bookings',
    });
  },
};
