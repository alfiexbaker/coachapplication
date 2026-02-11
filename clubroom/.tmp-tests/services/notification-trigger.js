"use strict";
/**
 * Notification Trigger — Event bus for service-to-notification communication.
 *
 * When any service performs a write action that affects ANOTHER user,
 * it calls triggerNotification() to create a local notification.
 *
 * For MVP: writes to local notifications store.
 * For API: this becomes a server-side push trigger.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationTriggers = void 0;
exports.triggerNotification = triggerNotification;
const notification_service_1 = require("./notification-service");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('NotificationTrigger');
// Map action types to notification types
function mapToNotificationType(actionType) {
    if (actionType.includes('booking') ||
        actionType.includes('session') ||
        actionType.includes('invite') ||
        actionType.includes('rsvp') ||
        actionType.includes('cancel'))
        return 'booking';
    if (actionType.includes('message'))
        return 'message';
    if (actionType.includes('review'))
        return 'review';
    if (actionType.includes('payment') || actionType.includes('earning'))
        return 'payment';
    if (actionType.includes('badge') || actionType.includes('drill') || actionType.includes('goal'))
        return 'badge';
    return 'reminder';
}
/**
 * Fire a notification from any service.
 * Call this after every write action that affects another user.
 */
async function triggerNotification(action) {
    try {
        const notificationType = mapToNotificationType(action.type);
        await notification_service_1.notificationService.create({
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    }
    catch (error) {
        logger.error('Failed to trigger notification', error);
    }
}
// ============================================================================
// PRE-DEFINED NOTIFICATION TRIGGERS
// ============================================================================
// Call these from the relevant service after a write action.
exports.notificationTriggers = {
    // --- Drill Service ---
    drillAssigned(coachName, drillName, athleteName, recipientId) {
        return triggerNotification({
            type: 'drill_assigned',
            recipientRole: 'parent',
            recipientId,
            title: 'New Drill Assigned',
            body: `Coach ${coachName} assigned a new drill: ${drillName}`,
            deepLink: '/drills',
        });
    },
    drillCompleted(athleteName, drillName, recipientId) {
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
    eventCreated(eventName, eventDate, recipientId) {
        return triggerNotification({
            type: 'event_created',
            recipientRole: 'parent',
            recipientId,
            title: 'New Event',
            body: `New event: ${eventName} on ${eventDate}`,
            deepLink: '/events',
        });
    },
    eventCancelled(eventName, recipientId) {
        return triggerNotification({
            type: 'event_cancelled',
            recipientRole: 'parent',
            recipientId,
            title: 'Event Cancelled',
            body: `${eventName} has been cancelled`,
            deepLink: '/events',
        });
    },
    eventRsvp(parentName, eventName, response, recipientId) {
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
    groupSessionCreated(sessionTitle, dateTime, recipientId) {
        return triggerNotification({
            type: 'group_session_created',
            recipientRole: 'parent',
            recipientId,
            title: 'New Group Session',
            body: `New group session: ${sessionTitle} on ${dateTime}`,
            deepLink: '/group-sessions',
        });
    },
    groupSessionCancelled(sessionTitle, recipientId) {
        return triggerNotification({
            type: 'group_session_cancelled',
            recipientRole: 'parent',
            recipientId,
            title: 'Session Cancelled',
            body: `${sessionTitle} has been cancelled`,
            deepLink: '/group-sessions',
        });
    },
    groupRegistered(athleteName, sessionTitle, recipientId) {
        return triggerNotification({
            type: 'group_registered',
            recipientRole: 'coach',
            recipientId,
            title: 'New Registration',
            body: `${athleteName} registered for ${sessionTitle}`,
            deepLink: '/group-sessions',
        });
    },
    groupCancelledRegistration(athleteName, sessionTitle, recipientId) {
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
    guardianRemoved(familyName, recipientId) {
        return triggerNotification({
            type: 'guardian_removed',
            recipientRole: 'parent',
            recipientId,
            title: 'Family Update',
            body: `You've been removed from ${familyName}'s family account`,
        });
    },
    guardianPermissionsUpdated(recipientId) {
        return triggerNotification({
            type: 'permissions_updated',
            recipientRole: 'parent',
            recipientId,
            title: 'Permissions Updated',
            body: 'Your family permissions were updated',
        });
    },
    guardianInvited(familyName, recipientId) {
        return triggerNotification({
            type: 'guardian_invited',
            recipientRole: 'parent',
            recipientId,
            title: 'Family Invite',
            body: `You've been invited to join ${familyName}'s family account`,
        });
    },
    guardianJoined(userName, recipientId) {
        return triggerNotification({
            type: 'guardian_invited',
            recipientRole: 'parent',
            recipientId,
            title: 'Guardian Joined',
            body: `${userName} has joined your family account`,
        });
    },
    // --- Booking Service ---
    bookingConfirmed(coachName, dateTime, recipientId) {
        return triggerNotification({
            type: 'booking_confirmed',
            recipientRole: 'parent',
            recipientId,
            title: 'Booking Confirmed',
            body: `Booking confirmed: ${dateTime} with Coach ${coachName}`,
            deepLink: '/bookings',
        });
    },
    bookingCancelled(cancelledByName, dateTime, recipientRole, recipientId) {
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
    inviteAccepted(parentName, athleteName, recipientId) {
        return triggerNotification({
            type: 'invite_accepted',
            recipientRole: 'coach',
            recipientId,
            title: 'Invite Accepted',
            body: `${parentName} accepted the invite for ${athleteName}`,
            deepLink: '/session-invites',
        });
    },
    inviteDeclined(parentName, athleteName, reason, recipientId) {
        return triggerNotification({
            type: 'invite_declined',
            recipientRole: 'coach',
            recipientId,
            title: 'Invite Declined',
            body: `${parentName} declined the invite for ${athleteName}. Reason: ${reason}`,
            deepLink: '/session-invites',
        });
    },
    inviteReceived(coachName, athleteName, recipientId) {
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
    sessionCompleted(coachName, athleteName, recipientId) {
        return triggerNotification({
            type: 'session_completed',
            recipientRole: 'parent',
            recipientId,
            title: 'Session Completed',
            body: `Coach ${coachName} completed ${athleteName}'s session`,
            deepLink: '/bookings',
        });
    },
    reviewPrompt(coachName, athleteName, recipientId) {
        return triggerNotification({
            type: 'review_prompt',
            recipientRole: 'parent',
            recipientId,
            title: 'How was the session?',
            body: `Rate ${athleteName}'s session with Coach ${coachName}`,
            deepLink: '/bookings',
        });
    },
    // --- Badge Service ---
    badgeEarned(athleteName, badgeName, recipientId) {
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
    favouriteAdded(coachId) {
        // Aggregate only — coach sees count in analytics, not individual names
        // No notification triggered
        return Promise.resolve();
    },
    // --- No-Show ---
    noShowMarked(athleteName, sessionDate, recipientId) {
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
    rescheduleRequested(coachName, originalDate, newDate, recipientId) {
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
    slotFreed(coachName, dateTime, recipientId) {
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
