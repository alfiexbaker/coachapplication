"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_CATEGORIES = exports.NOTIFICATION_TYPE_CATEGORIES = void 0;
/**
 * Mapping of notification types to their categories
 */
exports.NOTIFICATION_TYPE_CATEGORIES = {
    BOOKING_RECEIVED: 'BOOKINGS',
    BOOKING_CONFIRMED: 'BOOKINGS',
    BOOKING_CANCELLED: 'BOOKINGS',
    SESSION_REMINDER: 'REMINDERS',
    MESSAGE_RECEIVED: 'MESSAGES',
    SESSION_INVITE: 'BOOKINGS',
    SESSION_INVITE_RESPONSE: 'BOOKINGS',
    REVIEW_REQUEST: 'MESSAGES',
    REVIEW_RECEIVED: 'MESSAGES',
    BADGE_AWARDED: 'BADGES',
    WAITLIST_AVAILABLE: 'BOOKINGS',
    PAYMENT_RECEIVED: 'PAYMENTS',
    PAYMENT_FAILED: 'PAYMENTS',
    GOAL_COMPLETED: 'BADGES',
    VIDEO_SHARED: 'MESSAGES',
    MATCH_INVITE: 'MATCHES',
    MATCH_RESPONSE: 'MATCHES',
    MATCH_LINEUP: 'MATCHES',
    MATCH_REMINDER: 'MATCHES',
    MATCH_CANCELLED: 'MATCHES',
    NEW_FOLLOWER: 'SOCIAL',
    FOLLOW_REQUEST: 'SOCIAL',
    FOLLOW_REQUEST_ACCEPTED: 'SOCIAL',
};
/**
 * All notification category configurations
 */
exports.NOTIFICATION_CATEGORIES = [
    { id: 'BOOKINGS', label: 'Bookings & Sessions', description: 'Session invites, confirmations, and changes', icon: 'calendar' },
    { id: 'MESSAGES', label: 'Messages', description: 'Direct messages and reviews', icon: 'chatbubble' },
    { id: 'BADGES', label: 'Achievements', description: 'Badges and goal completions', icon: 'trophy' },
    { id: 'PAYMENTS', label: 'Payments', description: 'Payment confirmations and issues', icon: 'card' },
    { id: 'REMINDERS', label: 'Reminders', description: 'Upcoming session reminders', icon: 'alarm' },
    { id: 'SOCIAL', label: 'Social', description: 'Followers and connection requests', icon: 'people' },
    { id: 'MATCHES', label: 'Matches', description: 'Match invites and updates', icon: 'football' },
];
