/**
 * Notification Type Constants
 *
 * All notification types used across the app.
 * Each type maps to a specific user action or system event.
 */

export const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  INVITE_RECEIVED: 'invite_received',
  RSVP_REQUEST: 'rsvp_request',
  SESSION_REMINDER_24H: 'session_reminder_24h',
  SESSION_REMINDER_1H: 'session_reminder_1h',
  REVIEW_PROMPT: 'review_prompt',
  NEW_REVIEW: 'new_review',
  NEW_MESSAGE: 'new_message',
  BADGE_EARNED: 'badge_earned',
  MILESTONE: 'milestone',
  VIDEO_SHARED: 'video_shared',
  DRILL_COMPLETED: 'drill_completed',
  DRILL_ASSIGNED: 'drill_assigned',
  ROSTER_ADDED: 'roster_added',
  NO_SHOW_MARKED: 'no_show_marked',
  BOOKING_REQUEST: 'booking_request',
  SLOT_FREED: 'slot_freed',
  REVIEW_REPLY: 'review_reply',
  GOAL_COMPLETED: 'goal_completed',
  GOAL_CREATED: 'goal_created',
  GOAL_PROGRESS: 'goal_progress',
  GROUP_SESSION_CREATED: 'group_session_created',
  GROUP_SESSION_CANCELLED: 'group_session_cancelled',
  REGISTRATION_RECEIVED: 'registration_received',
  REGISTRATION_CANCELLED: 'registration_cancelled',
  EVENT_CREATED: 'event_created',
  EVENT_CANCELLED: 'event_cancelled',
  EVENT_RSVP: 'event_rsvp',
  EVENT_CHECKIN: 'event_checkin',
  GUARDIAN_INVITED: 'guardian_invited',
  GUARDIAN_REMOVED: 'guardian_removed',
  PERMISSIONS_UPDATED: 'permissions_updated',
  PRICE_CHANGE: 'price_change',
  COACH_ON_WAY: 'coach_on_way',
  ANNOUNCEMENT_CRITICAL: 'announcement_critical',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_PROMOTED: 'member_promoted',
  CLUB_REMOVED: 'club_removed',
  CLUB_RESTORED: 'club_restored',
  MILESTONE_COMPLETED: 'milestone_completed',
} as const;

export type NotificationTypeKey = keyof typeof NOTIFICATION_TYPES;
export type NotificationTypeValue = (typeof NOTIFICATION_TYPES)[NotificationTypeKey];

/**
 * Map notification types to their display categories for filtering
 */
export const NOTIFICATION_CATEGORY_MAP: Record<NotificationTypeValue, string> = {
  [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: 'booking',
  [NOTIFICATION_TYPES.BOOKING_CANCELLED]: 'booking',
  [NOTIFICATION_TYPES.BOOKING_REQUEST]: 'booking',
  [NOTIFICATION_TYPES.INVITE_RECEIVED]: 'booking',
  [NOTIFICATION_TYPES.RSVP_REQUEST]: 'booking',
  [NOTIFICATION_TYPES.SESSION_REMINDER_24H]: 'reminder',
  [NOTIFICATION_TYPES.SESSION_REMINDER_1H]: 'reminder',
  [NOTIFICATION_TYPES.REVIEW_PROMPT]: 'review',
  [NOTIFICATION_TYPES.NEW_REVIEW]: 'review',
  [NOTIFICATION_TYPES.REVIEW_REPLY]: 'review',
  [NOTIFICATION_TYPES.NEW_MESSAGE]: 'message',
  [NOTIFICATION_TYPES.BADGE_EARNED]: 'badge',
  [NOTIFICATION_TYPES.MILESTONE]: 'badge',
  [NOTIFICATION_TYPES.MILESTONE_COMPLETED]: 'badge',
  [NOTIFICATION_TYPES.VIDEO_SHARED]: 'message',
  [NOTIFICATION_TYPES.DRILL_COMPLETED]: 'badge',
  [NOTIFICATION_TYPES.DRILL_ASSIGNED]: 'reminder',
  [NOTIFICATION_TYPES.ROSTER_ADDED]: 'booking',
  [NOTIFICATION_TYPES.NO_SHOW_MARKED]: 'booking',
  [NOTIFICATION_TYPES.SLOT_FREED]: 'booking',
  [NOTIFICATION_TYPES.GOAL_COMPLETED]: 'badge',
  [NOTIFICATION_TYPES.GOAL_CREATED]: 'reminder',
  [NOTIFICATION_TYPES.GOAL_PROGRESS]: 'badge',
  [NOTIFICATION_TYPES.GROUP_SESSION_CREATED]: 'booking',
  [NOTIFICATION_TYPES.GROUP_SESSION_CANCELLED]: 'booking',
  [NOTIFICATION_TYPES.REGISTRATION_RECEIVED]: 'booking',
  [NOTIFICATION_TYPES.REGISTRATION_CANCELLED]: 'booking',
  [NOTIFICATION_TYPES.EVENT_CREATED]: 'reminder',
  [NOTIFICATION_TYPES.EVENT_CANCELLED]: 'reminder',
  [NOTIFICATION_TYPES.EVENT_RSVP]: 'booking',
  [NOTIFICATION_TYPES.EVENT_CHECKIN]: 'reminder',
  [NOTIFICATION_TYPES.GUARDIAN_INVITED]: 'message',
  [NOTIFICATION_TYPES.GUARDIAN_REMOVED]: 'message',
  [NOTIFICATION_TYPES.PERMISSIONS_UPDATED]: 'message',
  [NOTIFICATION_TYPES.PRICE_CHANGE]: 'reminder',
  [NOTIFICATION_TYPES.COACH_ON_WAY]: 'reminder',
  [NOTIFICATION_TYPES.ANNOUNCEMENT_CRITICAL]: 'message',
  [NOTIFICATION_TYPES.MEMBER_REMOVED]: 'message',
  [NOTIFICATION_TYPES.MEMBER_PROMOTED]: 'message',
  [NOTIFICATION_TYPES.CLUB_REMOVED]: 'message',
  [NOTIFICATION_TYPES.CLUB_RESTORED]: 'message',
};

/**
 * Map notification types to deep link route templates
 */
export const NOTIFICATION_DEEP_LINKS: Partial<Record<NotificationTypeValue, string>> = {
  [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: '/booking/:id',
  [NOTIFICATION_TYPES.BOOKING_CANCELLED]: '/booking/:id',
  [NOTIFICATION_TYPES.BOOKING_REQUEST]: '/booking/:id',
  [NOTIFICATION_TYPES.INVITE_RECEIVED]: '/session/:id/rsvp',
  [NOTIFICATION_TYPES.RSVP_REQUEST]: '/session/:id/rsvp',
  [NOTIFICATION_TYPES.NEW_REVIEW]: '/coach/:id',
  [NOTIFICATION_TYPES.REVIEW_REPLY]: '/coach/:id',
  [NOTIFICATION_TYPES.NEW_MESSAGE]: '/messages',
  [NOTIFICATION_TYPES.BADGE_EARNED]: '/badges',
  [NOTIFICATION_TYPES.SESSION_REMINDER_24H]: '/booking/:id',
  [NOTIFICATION_TYPES.SESSION_REMINDER_1H]: '/booking/:id',
  [NOTIFICATION_TYPES.ANNOUNCEMENT_CRITICAL]: '/notifications',
};
