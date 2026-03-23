/**
 * Event Bus for decoupled service communication.
 * Services emit events, other services subscribe - no direct coupling.
 */

import { createLogger } from '@/utils/logger';
import type { BadgeCategory } from '@/constants/user-types';
import type { ProgressChallengeType } from '@/types/progress-types';

const logger = createLogger('EventBus');

type EventHandler<T = unknown> = (data: T) => void;

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private onceHandlers = new Map<string, Set<EventHandler>>();

  /**
   * Subscribe to an event. Returns unsubscribe function.
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => this.off(event, handler as EventHandler);
  }

  /**
   * Subscribe to an event once. Handler is removed after first invocation.
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.onceHandlers.has(event)) {
      this.onceHandlers.set(event, new Set());
    }
    this.onceHandlers.get(event)!.add(handler as EventHandler);

    return () => this.onceHandlers.get(event)?.delete(handler as EventHandler);
  }

  /**
   * Emit an event with data.
   */
  emit<T = unknown>(event: string, data: T): void {
    logger.info(`Event: ${event}`, { data });

    // Regular handlers
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          logger.error(`Handler error for ${event}`, error);
        }
      });
    }

    // Once handlers
    const onceHandlers = this.onceHandlers.get(event);
    if (onceHandlers) {
      onceHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          logger.error(`Once handler error for ${event}`, error);
        }
      });
      this.onceHandlers.delete(event);
    }
  }

  /**
   * Unsubscribe from an event.
   */
  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  /**
   * Remove all handlers for an event.
   */
  clear(event: string): void {
    this.handlers.delete(event);
    this.onceHandlers.delete(event);
  }

  /**
   * Remove all handlers for all events.
   */
  clearAll(): void {
    this.handlers.clear();
    this.onceHandlers.clear();
  }

  /**
   * Get count of handlers for an event.
   */
  listenerCount(event: string): number {
    return (this.handlers.get(event)?.size || 0) + (this.onceHandlers.get(event)?.size || 0);
  }
}

// Singleton instance
export const eventBus = new EventBus();

/**
 * Standard service events for cross-service communication.
 */
export const ServiceEvents = {
  // Booking events
  BOOKING_CREATED: 'booking:created',
  BOOKING_UPDATED: 'booking:updated',
  BOOKING_CANCELLED: 'booking:cancelled',
  BOOKING_CONFIRMED: 'booking:confirmed',

  // Series events (multi-week bookings)
  SERIES_CREATED: 'series:created',
  SERIES_UPDATED: 'series:updated',

  // Session events
  SESSION_CREATED: 'session:created',
  SESSION_UPDATED: 'session:updated',
  SESSION_STARTED: 'session:started',
  SESSION_COMPLETED: 'session:completed',
  SESSION_CANCELLED: 'session:cancelled',

  // Session data events
  ATTENDANCE_RECORDED: 'session:attendance_recorded',
  SESSION_NOTES_SAVED: 'session:notes_saved',
  SESSION_FEEDBACK_SAVED: 'session:feedback_saved',
  SESSION_MEDIA_CAPTURED: 'session:media_captured',

  // Group session events
  OPEN_SESSION_PUBLISHED: 'group_session:open_published',

  // RSVP events
  RSVP_RESPONDED: 'rsvp:responded',
  RSVP_DEADLINE_PASSED: 'rsvp:deadline_passed',
  EVENT_RSVP_UPDATED: 'event:rsvp:updated',

  // User events
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_PROFILE_CHANGED: 'user:profile_changed',
  BOOKING_SELF_SETTING_CHANGED: 'user:booking_self_setting_changed',
  USER_DELETED: 'user:deleted',
  USER_LOGGED_IN: 'user:logged_in',
  USER_LOGGED_OUT: 'user:logged_out',

  // Family events
  FAMILY_MEMBER_ADDED: 'family:member:added',
  FAMILY_MEMBER_REMOVED: 'family:member:removed',
  FAMILY_LINK_CREATED: 'family:link:created',
  FAMILY_ACTIVE_CHILD_CHANGED: 'family:active_child:changed',
  CHILD_PROFILES_UPDATED: 'child:profiles_updated',

  // Payment events
  PAYMENT_SUCCEEDED: 'payment:succeeded',
  PAYMENT_FAILED: 'payment:failed',
  REFUND_ISSUED: 'payment:refund',

  // Bill events
  BILL_CREATED: 'bill:created',
  BILL_UPDATED: 'bill:updated',
  BILL_PAID: 'bill:paid',

  // Invoice events
  INVOICE_PAID: 'invoice:paid',
  INVOICE_WRITTEN_OFF: 'invoice:written_off',
  INVOICE_RESTORED: 'invoice:restored',

  // Notification events
  NOTIFICATION_CREATED: 'notification:created',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_DISMISSED: 'notification:dismissed',

  // Messaging events
  MESSAGE_SENT: 'message:sent',
  MESSAGE_EDITED: 'message:edited',
  MESSAGE_DELETED: 'message:deleted',
  THREAD_OPENED: 'message:thread_opened',
  MESSAGES_MARKED_READ: 'message:marked_read',
  USER_TYPING: 'message:user_typing',
  USER_STOPPED_TYPING: 'message:user_stopped_typing',

  // Waitlist events
  WAITLIST_JOINED: 'waitlist:joined',
  WAITLIST_LEFT: 'waitlist:left',
  WAITLIST_PROMOTED: 'waitlist:promoted',

  // Recurring booking events
  RECURRING_CREATED: 'recurring:created',
  RECURRING_CANCELLED: 'recurring:cancelled',

  // Verification events
  VERIFICATION_UPDATED: 'verification:updated',

  // Favourite events
  FAVOURITE_ADDED: 'favourite:added',
  FAVOURITE_REMOVED: 'favourite:removed',
  STORAGE_QUOTA_WARNING: 'storage:quota_warning',

  // Cancellation events
  CANCELLATION_RECORDED: 'cancellation:recorded',

  // Club events
  CLUB_MEMBER_JOINED: 'club:member:joined',
  CLUB_MEMBER_LEFT: 'club:member:left',
  CLUB_POST_CREATED: 'club:post:created',
  ORG_HEAD_COACH_TASK_UPDATED: 'org:head_coach:task_updated',
  ORG_HEAD_COACH_STANDARD_UPDATED: 'org:head_coach:standard_updated',
  PROBLEM_REPORT_CREATED: 'problem_report:created',

  // Community group events
  GROUP_MEMBER_JOINED: 'community:group:member_joined',
  GROUP_MEMBER_ROLE_CHANGED: 'community:group:member_role_changed',

  // Achievement events
  BADGE_EARNED: 'achievement:badge_earned',
  STREAK_MILESTONE: 'achievement:streak_milestone',
  SKILL_LEVEL_UP: 'progress:skill_level_up',
  LEVEL_UP: 'progress:level_up',
  PROGRESS_CHALLENGE_COMPLETED: 'progress:challenge_completed',
  PROGRESS_CHALLENGE_ASSIGNED: 'progress:challenge_assigned',
  GOAL_COMPLETED: 'progress:goal_completed',
  POSITION_RECORDED: 'progress:position_recorded',
  JOURNAL_SAVED: 'journal:saved',
  RESULTS_PROGRAM_OPENED: 'results_program:opened',
  RESULTS_PROGRAM_FILTER_CHANGED: 'results_program:filter_changed',
  RESULTS_PROGRAM_TASK_COMPLETED: 'results_program:task_completed',
  RESULTS_PROGRAM_TASK_RESCHEDULED: 'results_program:task_rescheduled',
  RESULTS_PROGRAM_MESSAGE_FROM_TASK: 'results_program:message_from_task',
  RESULTS_PROGRAM_BULK_NUDGE_SENT: 'results_program:bulk_nudge_sent',
  RESULTS_PLAYBOOK_ACTION_TAPPED: 'results_program:playbook_action_tapped',

  // Invite RSVP events
  INVITE_RSVP_RESPONDED: 'invite:rsvp:responded',
  INVITE_SHARED: 'invite:shared',

  // Squad events
  SQUAD_CREATED: 'squad:created',
  SQUAD_DELETED: 'squad:deleted',
  SQUAD_MEMBER_ADDED: 'squad:member:added',
  SQUAD_MEMBER_REMOVED: 'squad:member:removed',

  // Availability/template/video/roster delete events
  AVAILABILITY_TEMPLATE_DELETED: 'availability:template:deleted',
  AVAILABILITY_OVERRIDE_DELETED: 'availability:override:deleted',
  SESSION_TEMPLATE_DELETED: 'session_template:deleted',
  VIDEO_DELETED: 'video:deleted',
  VIDEO_ANNOTATION_REMOVED: 'video:annotation:removed',
  VIDEO_ANNOTATION_UPDATED: 'video:annotation:updated',
  VIDEO_ANNOTATION_DELETED: 'video:annotation:deleted',
  ROSTER_NOTE_DELETED: 'roster:note_deleted',

  // Comment events
  COMMENT_CREATED: 'comment:created',
  COMMENT_DELETED: 'comment:deleted',
  COMMENT_LIKED: 'comment:liked',
  COMMENT_REPLIED: 'comment:replied',

  // Invite booking events
  INVITE_ACCEPTED: 'invite:accepted',
  INVITE_BOOKING_FAILED: 'invite:booking_failed',

  // Coach feed events
  COACH_POST_CREATED: 'coach:post:created',

  // Sync events
  SYNC_STARTED: 'sync:started',
  SYNC_COMPLETED: 'sync:completed',
  SYNC_FAILED: 'sync:failed',

  // Concern events
  CONCERN_RAISED: 'concern:raised',
  CONCERN_UPDATED: 'concern:updated',
  CONCERN_RESOLVED: 'concern:resolved',

  // SEN events
  CHILD_SEN_UPDATED: 'child:sen:updated',
  COACH_OBSERVATION_CREATED: 'coach:observation:created',
  COACH_OBSERVATION_UPDATED: 'coach:observation:updated',
  COACH_OBSERVATION_DELETED: 'coach:observation:deleted',

  // Safeguarding events
  USER_ACTION_BLOCKED: 'user:action_blocked',
  SAFEGUARDING_REPORT_SUBMITTED: 'safeguarding:report_submitted',

  // Verification expiry events
  VERIFICATION_EXPIRED: 'verification:expired',
  VERIFICATION_EXPIRING_SOON: 'verification:expiring_soon',

  // Consent expiry events
  CONSENT_EXPIRED: 'consent:expired',
  CONSENT_RENEWED: 'consent:renewed',

  // Child profile sync events
  CHILD_PROFILE_UPDATED: 'child:profile_updated',
  CHILD_MEDICAL_INFO_UPDATED: 'child:medical_info_updated',

  // Account lifecycle events
  ACCOUNT_DELETION_REQUESTED: 'account:deletion_requested',
  ACCOUNT_DELETION_CANCELLED: 'account:deletion_cancelled',

  // Media sharing events
  MEDIA_SHARED: 'media:shared',

  // Group approval events
  GROUP_JOIN_REQUEST: 'community:group:join_request',
  GROUP_MEMBER_APPROVED: 'community:group:member_approved',
  GROUP_MEMBER_REJECTED: 'community:group:member_rejected',
  GROUP_APPROVAL_REQUESTED: 'community:group:approval_requested',

  // Data retention events
  ATHLETE_DATA_ARCHIVED: 'data:athlete_archived',
  DATA_RETENTION_WARNING: 'data:retention_warning',

  // Connection & offline queue events
  APP_FOREGROUNDED: 'app:foregrounded',
  APP_BACKGROUNDED: 'app:backgrounded',
  APP_ACTIVE: 'app:active',
  TOKEN_EXPIRED_BACKGROUND: 'auth:token_expired_background',
  CONNECTION_CHANGED: 'connection:changed',
  QUEUE_ACTION_ADDED: 'queue:action_added',
  QUEUE_FLUSHED: 'queue:flushed',
  QUEUE_FLUSH_FAILED: 'queue:flush_failed',
  QUEUE_ACTION_FAILED: 'queue:action_failed',
} as const;

export type ServiceEventType = (typeof ServiceEvents)[keyof typeof ServiceEvents];

/**
 * Event payload types for type-safe event handling.
 * Every ServiceEvent has a corresponding typed payload.
 */
export interface EventPayloads {
  // Booking events
  [ServiceEvents.BOOKING_CREATED]: {
    bookingId: string;
    userId: string;
    coachId: string;
    coachName?: string;
    athleteIds?: string[];
    athleteName?: string;
    scheduledAt?: string;
    service?: string;
    price?: number;
  };
  [ServiceEvents.BOOKING_UPDATED]: {
    bookingId: string;
    userId: string;
    changes: Record<string, unknown>;
  };
  [ServiceEvents.BOOKING_CANCELLED]: {
    bookingId: string;
    userId: string;
    coachId: string;
    reason?: string;
    cancelledBy?: 'coach' | 'parent';
  };
  [ServiceEvents.BOOKING_CONFIRMED]: {
    bookingId: string;
    userId: string;
    coachId: string;
    coachName?: string;
    athleteName?: string;
    scheduledAt?: string;
  };

  // Series events (multi-week bookings)
  [ServiceEvents.SERIES_CREATED]: {
    seriesId: string;
    coachId: string;
    coachName: string;
    createdById: string;
    bookingIds: string[];
    weekCount: number;
    totalCost: number;
    location: string;
  };
  [ServiceEvents.SERIES_UPDATED]: {
    seriesId: string;
    status: 'ACTIVE' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
    changes: Record<string, unknown>;
  };

  // Session events
  [ServiceEvents.SESSION_CREATED]: {
    sessionId: string;
    bookingId: string;
    coachId: string;
    athleteIds: string[];
  };
  [ServiceEvents.SESSION_UPDATED]: {
    sessionId: string;
    changes: Record<string, unknown>;
  };
  [ServiceEvents.SESSION_STARTED]: {
    sessionId: string;
    coachId: string;
    athleteIds: string[];
  };
  [ServiceEvents.SESSION_COMPLETED]: {
    sessionId: string;
    bookingId?: string;
    coachId: string;
    athleteIds: string[];
    price?: number;
    athleteName?: string;
  };
  [ServiceEvents.SESSION_CANCELLED]: {
    sessionId: string;
    coachId: string;
    reason?: string;
  };

  // Session data events
  [ServiceEvents.ATTENDANCE_RECORDED]: {
    sessionId: string;
    bookingId?: string;
    coachId: string;
    athleteIds: string[];
    presentCount: number;
    absentCount: number;
  };
  [ServiceEvents.SESSION_NOTES_SAVED]: {
    sessionId: string;
    bookingId?: string;
    coachId: string;
  };
  [ServiceEvents.SESSION_FEEDBACK_SAVED]: {
    sessionId: string;
    bookingId?: string;
    coachId: string;
    athleteId: string;
    skillCount: number;
  };
  [ServiceEvents.SESSION_MEDIA_CAPTURED]: {
    sessionId: string;
    athleteId: string;
    photoCount: number;
    hasVideo: boolean;
  };

  // Group session events
  [ServiceEvents.OPEN_SESSION_PUBLISHED]: {
    sessionId: string;
    coachId: string;
    coachName: string;
    title: string;
    description: string;
    sessionType: string;
    location: string;
    price: number;
    currency: string;
    date: string;
    startTime: string;
    endTime: string;
    maxParticipants: number;
    clubId?: string;
    clubName?: string;
    imageUrl?: string;
  };

  // RSVP events
  [ServiceEvents.RSVP_RESPONDED]: {
    rsvpId: string;
    sessionId: string;
    userId: string;
    childId?: string;
    previousStatus: 'going' | 'not_going' | 'maybe' | 'pending';
    newStatus: 'going' | 'not_going' | 'maybe';
  };
  [ServiceEvents.RSVP_DEADLINE_PASSED]: {
    sessionId: string;
    pendingCount: number;
  };
  [ServiceEvents.EVENT_RSVP_UPDATED]: {
    eventId: string;
    rsvpId: string;
    userId: string;
    previousStatus: 'GOING' | 'MAYBE' | 'NOT_GOING' | null;
    newStatus: 'GOING' | 'MAYBE' | 'NOT_GOING';
  };

  // User events
  [ServiceEvents.USER_CREATED]: {
    userId: string;
    role: 'coach' | 'parent' | 'athlete';
    name?: string;
  };
  [ServiceEvents.USER_UPDATED]: {
    userId: string;
    changes: Record<string, unknown>;
  };
  [ServiceEvents.USER_PROFILE_CHANGED]: {
    userId: string;
    changes: Record<string, unknown>;
  };
  [ServiceEvents.BOOKING_SELF_SETTING_CHANGED]: {
    userId: string;
    enabled: boolean;
  };
  [ServiceEvents.USER_DELETED]: {
    userId: string;
  };
  [ServiceEvents.USER_LOGGED_IN]: {
    userId: string;
    role: 'coach' | 'parent' | 'athlete';
  };
  [ServiceEvents.USER_LOGGED_OUT]: {
    userId: string;
  };

  // Family events
  [ServiceEvents.FAMILY_MEMBER_ADDED]: {
    familyId: string;
    memberId: string;
    memberName?: string;
    addedBy?: string;
  };
  [ServiceEvents.FAMILY_MEMBER_REMOVED]: {
    familyId: string;
    memberId: string;
  };
  [ServiceEvents.FAMILY_LINK_CREATED]: {
    familyId: string;
    guardianId: string;
    guardianName?: string;
    role?: string;
  };
  [ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED]: {
    childId: string | null;
    childName?: string;
  };
  [ServiceEvents.CHILD_PROFILES_UPDATED]: {
    parentId: string;
    action: 'created' | 'updated' | 'deleted';
    childId: string;
  };

  // Payment events
  [ServiceEvents.PAYMENT_SUCCEEDED]: {
    transactionId: string;
    userId: string;
    bookingId: string;
    amount: number;
    currency?: string;
  };
  [ServiceEvents.PAYMENT_FAILED]: {
    userId: string;
    bookingId: string;
    amount: number;
    error: string;
  };
  [ServiceEvents.REFUND_ISSUED]: {
    transactionId: string;
    userId: string;
    bookingId: string;
    amount: number;
    reason?: string;
  };

  // Bill events
  [ServiceEvents.BILL_CREATED]: {
    billId: string;
    coachId: string;
    amount: number;
  };
  [ServiceEvents.BILL_UPDATED]: {
    billId: string;
    coachId: string;
  };
  [ServiceEvents.BILL_PAID]: {
    billId: string;
    coachId: string;
    amount: number;
  };

  // Invoice events
  [ServiceEvents.INVOICE_PAID]: {
    invoiceId: string;
    coachId: string;
    amount: number;
  };
  [ServiceEvents.INVOICE_WRITTEN_OFF]: {
    invoiceId: string;
    coachId: string;
    amount: number;
  };
  [ServiceEvents.INVOICE_RESTORED]: {
    invoiceId: string;
    coachId: string;
    amount: number;
  };

  // Notification events
  [ServiceEvents.NOTIFICATION_CREATED]: {
    notificationId: string;
    userId: string;
    type: string;
  };
  [ServiceEvents.NOTIFICATION_READ]: {
    notificationId: string;
  };
  [ServiceEvents.NOTIFICATION_DISMISSED]: {
    notificationId: string;
  };

  // Messaging events
  [ServiceEvents.MESSAGE_SENT]: {
    threadId: string;
    messageId: string;
    sender: 'parent' | 'coach';
    senderName?: string;
    attachmentsCount: number;
    createdAt: string;
  };
  [ServiceEvents.MESSAGE_EDITED]: {
    threadId: string;
    messageId: string;
    status: 'pending' | 'sent' | 'delivered' | 'seen';
  };
  [ServiceEvents.MESSAGE_DELETED]: {
    threadId: string;
    messageId: string;
  };
  [ServiceEvents.THREAD_OPENED]: {
    threadId: string;
    userId: string;
  };
  [ServiceEvents.MESSAGES_MARKED_READ]: {
    threadId: string;
    userId?: string;
    unreadCleared: number;
  };
  [ServiceEvents.USER_TYPING]: {
    threadId: string;
    userId: string;
    userName: string;
  };
  [ServiceEvents.USER_STOPPED_TYPING]: {
    threadId: string;
    userId: string;
  };

  // Waitlist events
  [ServiceEvents.WAITLIST_JOINED]: {
    entryId: string;
    sessionId: string;
    userId: string;
    position: number;
    autoBook: boolean;
  };
  [ServiceEvents.WAITLIST_LEFT]: {
    entryId: string;
    sessionId: string;
    userId: string;
    reason?: string;
  };
  [ServiceEvents.WAITLIST_PROMOTED]: {
    entryId: string;
    sessionId: string;
    userId: string;
    position: number;
    autoBook: boolean;
  };

  // Recurring booking events
  [ServiceEvents.RECURRING_CREATED]: {
    recurringId: string;
    userId: string;
    coachId: string;
    frequency: string;
    status: string;
  };
  [ServiceEvents.RECURRING_CANCELLED]: {
    recurringId: string;
    userId: string;
    coachId: string;
    reason?: string;
  };

  // Verification events
  [ServiceEvents.VERIFICATION_UPDATED]: {
    coachId: string;
    field: 'email' | 'phone' | 'identity' | 'backgroundCheck' | 'insurance' | 'credentials';
    status: string;
    overallLevel: string;
    lastUpdated: string;
  };

  // Favourite events
  [ServiceEvents.FAVOURITE_ADDED]: {
    userId: string;
    coachId: string;
    favouriteId: string;
  };
  [ServiceEvents.FAVOURITE_REMOVED]: {
    userId: string;
    coachId: string;
    favouriteId: string;
  };
  [ServiceEvents.STORAGE_QUOTA_WARNING]: {
    key: string;
    timestamp: number;
  };

  // Cancellation events
  [ServiceEvents.CANCELLATION_RECORDED]: {
    cancellationId: string;
    bookingId: string;
    cancelledBy: 'parent' | 'coach';
    coachId: string;
    familyId?: string;
  };

  // Club events
  [ServiceEvents.CLUB_MEMBER_JOINED]: {
    clubId: string;
    userId: string;
    userName?: string;
  };
  [ServiceEvents.CLUB_MEMBER_LEFT]: {
    clubId: string;
    userId: string;
  };
  [ServiceEvents.CLUB_POST_CREATED]: {
    clubId: string;
    postId: string;
    authorId: string;
  };
  [ServiceEvents.ORG_HEAD_COACH_TASK_UPDATED]: {
    clubId: string;
    taskId: string;
    coachId: string;
    actorUserId: string;
    action: 'created' | 'completed' | 'reopened';
    type: 'required_follow_up' | 'session_note_expectation';
  };
  [ServiceEvents.ORG_HEAD_COACH_STANDARD_UPDATED]: {
    clubId: string;
    standardId: string;
    actorUserId: string;
    action: 'created' | 'toggled';
    active: boolean;
  };
  [ServiceEvents.PROBLEM_REPORT_CREATED]: {
    reportId: string;
    bookingId: string;
    clubId?: string;
  };

  // Community group events
  [ServiceEvents.GROUP_MEMBER_JOINED]: {
    groupId: string;
    groupName: string;
    memberId: string;
    memberName: string;
    role: string;
    isCoach: boolean;
  };
  [ServiceEvents.GROUP_MEMBER_ROLE_CHANGED]: {
    groupId: string;
    groupName: string;
    memberId: string;
    memberName: string;
    previousRole: string;
    newRole: string;
    changedById: string;
  };

  // Achievement events
  [ServiceEvents.BADGE_EARNED]: {
    userId: string;
    badgeId: string;
    badgeLabel?: string;
    coachId?: string;
    sessionId?: string;
  };
  [ServiceEvents.STREAK_MILESTONE]: {
    userId: string;
    streakWeeks: number;
    milestoneLabel?: string;
  };
  [ServiceEvents.SKILL_LEVEL_UP]: {
    athleteId: string;
    skill: string;
    previousLevel: number;
    newLevel: number;
    corner: BadgeCategory;
  };
  [ServiceEvents.LEVEL_UP]: {
    userId: string;
    previousLevel: number;
    newLevel: number;
    newLevelName: string;
  };
  [ServiceEvents.PROGRESS_CHALLENGE_COMPLETED]: {
    challengeId: string;
    athleteId: string;
    type: ProgressChallengeType;
    rewardBadgeId: string;
  };
  [ServiceEvents.PROGRESS_CHALLENGE_ASSIGNED]: {
    challengeId: string;
    athleteId: string;
    type: ProgressChallengeType;
  };
  [ServiceEvents.GOAL_COMPLETED]: {
    goalId: string;
    athleteId: string;
    title: string;
  };
  [ServiceEvents.POSITION_RECORDED]: {
    sessionId: string;
    athleteId: string;
    position: 'GK' | 'DEF' | 'MID' | 'ATT';
  };
  [ServiceEvents.JOURNAL_SAVED]: {
    athleteId: string;
    sessionId?: string;
    entryId: string;
  };

  // Invite RSVP events
  [ServiceEvents.INVITE_RSVP_RESPONDED]: {
    inviteId: string;
    responseId: string;
    userId: string;
    userName: string;
    status: 'going' | 'maybe' | 'cant_go';
    childName?: string;
  };
  [ServiceEvents.INVITE_SHARED]: {
    inviteId: string;
    sharedBy: string;
    shareLink: string;
  };

  // Concern events
  [ServiceEvents.CONCERN_RAISED]: {
    concernId: string;
    coachId: string;
    athleteId: string;
    athleteName: string;
    type: string;
    severity: string;
  };
  [ServiceEvents.CONCERN_UPDATED]: {
    concernId: string;
    status: string;
    changes: Record<string, unknown>;
  };
  [ServiceEvents.CONCERN_RESOLVED]: {
    concernId: string;
    resolution: string;
  };

  // Sync events
  [ServiceEvents.SYNC_STARTED]: {
    scope: string;
    userId?: string;
  };
  [ServiceEvents.SYNC_COMPLETED]: {
    scope: string;
    userId?: string;
    itemCount?: number;
  };
  [ServiceEvents.SYNC_FAILED]: {
    scope: string;
    userId?: string;
    error: string;
  };

  // SEN events
  [ServiceEvents.CHILD_SEN_UPDATED]: {
    childId: string;
    parentId: string;
    section: 'disabilities' | 'specialNeeds' | 'communicationNotes' | 'behavioralNotes';
  };
  [ServiceEvents.COACH_OBSERVATION_CREATED]: {
    observationId: string;
    athleteId: string;
    coachId: string;
    category: string;
  };
  [ServiceEvents.COACH_OBSERVATION_UPDATED]: {
    observationId: string;
    athleteId: string;
    coachId: string;
  };
  [ServiceEvents.COACH_OBSERVATION_DELETED]: {
    observationId: string;
    athleteId: string;
    coachId: string;
  };

  // Safeguarding events
  [ServiceEvents.USER_ACTION_BLOCKED]: {
    blockerId: string;
    blockedId: string;
    action: 'send_message' | 'create_booking' | 'search';
    timestamp: string;
  };
  [ServiceEvents.SAFEGUARDING_REPORT_SUBMITTED]: {
    reportId: string;
    reporterId: string;
    reportedUserId: string;
    category: string;
    severity: 'low' | 'medium' | 'high';
    autoBlocked: boolean;
    timestamp: string;
  };

  // Verification expiry events
  [ServiceEvents.VERIFICATION_EXPIRED]: {
    coachId: string;
    verificationType: 'dbs' | 'insurance' | 'id' | 'credentials';
    expiredAt: string;
  };
  [ServiceEvents.VERIFICATION_EXPIRING_SOON]: {
    coachId: string;
    verificationType: 'dbs' | 'insurance' | 'id' | 'credentials';
    expiresAt: string;
    daysRemaining: number;
  };

  // Consent expiry events
  [ServiceEvents.CONSENT_EXPIRED]: {
    athleteId: string;
    consentType: string;
  };
  [ServiceEvents.CONSENT_RENEWED]: {
    athleteId: string;
    consentType: string;
    newExpiryAt: string;
  };

  // Child profile sync events
  [ServiceEvents.CHILD_PROFILE_UPDATED]: {
    childId: string;
    parentId: string;
    updatedFields: string[];
    timestamp: string;
  };
  [ServiceEvents.CHILD_MEDICAL_INFO_UPDATED]: {
    childId: string;
    updatedFields: string[];
    timestamp: string;
  };

  // Account lifecycle events
  [ServiceEvents.ACCOUNT_DELETION_REQUESTED]: {
    userId: string;
    requestedAt: string;
    scheduledDeletionAt: string;
  };
  [ServiceEvents.ACCOUNT_DELETION_CANCELLED]: {
    userId: string;
    cancelledAt: string;
  };

  // Media sharing events
  [ServiceEvents.MEDIA_SHARED]: {
    mediaType: string;
    sharedById: string;
    athleteId: string;
    consentVerified: boolean;
    timestamp: string;
  };

  // Group approval events
  [ServiceEvents.GROUP_JOIN_REQUEST]: {
    groupId: string;
    requesterId: string;
    requesterRole: string;
    adminId: string;
  };
  [ServiceEvents.GROUP_MEMBER_APPROVED]: {
    groupId: string;
    memberId: string;
    memberName: string;
    approvedById: string;
  };
  [ServiceEvents.GROUP_MEMBER_REJECTED]: {
    groupId: string;
    memberId: string;
    memberName: string;
    rejectedById: string;
  };
  [ServiceEvents.GROUP_APPROVAL_REQUESTED]: {
    groupId: string;
    groupName: string;
    requesterId: string;
    requesterName: string;
    isCoach: boolean;
  };

  // Data retention events
  [ServiceEvents.ATHLETE_DATA_ARCHIVED]: {
    athleteId: string;
    athleteName: string;
    dataType: string;
    recordCount: number;
    archivedAt: string;
  };
  [ServiceEvents.DATA_RETENTION_WARNING]: {
    athleteId: string;
    warnings: string[];
    checkedAt: string;
  };

  // Connection & offline queue events
  [ServiceEvents.APP_FOREGROUNDED]: {
    timestamp: number;
  };
  [ServiceEvents.APP_BACKGROUNDED]: {
    timestamp: number;
  };
  [ServiceEvents.APP_ACTIVE]: {
    timestamp: number;
  };
  [ServiceEvents.TOKEN_EXPIRED_BACKGROUND]: {
    timestamp: number;
  };
  [ServiceEvents.CONNECTION_CHANGED]: {
    isConnected: boolean;
    wasOffline: boolean;
  };
  [ServiceEvents.QUEUE_ACTION_ADDED]: {
    actionId: string;
    path: string;
    method: string;
    queueSize: number;
  };
  [ServiceEvents.QUEUE_FLUSHED]: {
    processed: number;
    failed: number;
    remaining: number;
  };
  [ServiceEvents.QUEUE_FLUSH_FAILED]: {
    error: string;
    queueSize: number;
  };
  [ServiceEvents.QUEUE_ACTION_FAILED]: {
    actionId: string;
    path: string;
    method: string;
    error: string;
    willRetry: boolean;
  };

  // Squad events
  [ServiceEvents.SQUAD_CREATED]: {
    squadId: string;
    clubId: string;
    squadName: string;
    createdBy: string;
  };
  [ServiceEvents.SQUAD_DELETED]: {
    squadId: string;
    clubId: string;
  };
  [ServiceEvents.SQUAD_MEMBER_ADDED]: {
    squadId: string;
    clubId: string;
    userId: string;
    userName: string;
  };
  [ServiceEvents.SQUAD_MEMBER_REMOVED]: {
    squadId: string;
    clubId: string;
    userId: string;
    userName: string;
  };
  [ServiceEvents.AVAILABILITY_TEMPLATE_DELETED]: {
    templateId: string;
    coachId?: string;
  };
  [ServiceEvents.AVAILABILITY_OVERRIDE_DELETED]: {
    overrideId: string;
    coachId?: string;
    date?: string;
  };
  [ServiceEvents.SESSION_TEMPLATE_DELETED]: {
    templateId: string;
    coachId?: string;
  };
  [ServiceEvents.VIDEO_DELETED]: {
    videoId: string;
    coachId: string;
    athleteIds: string[];
  };
  [ServiceEvents.VIDEO_ANNOTATION_REMOVED]: {
    videoId: string;
    annotationId: string;
  };
  [ServiceEvents.VIDEO_ANNOTATION_UPDATED]: {
    videoId: string;
    annotationId: string;
    annotation: unknown;
  };
  [ServiceEvents.VIDEO_ANNOTATION_DELETED]: {
    videoId: string;
    annotationId: string;
  };
  [ServiceEvents.ROSTER_NOTE_DELETED]: {
    athleteId: string;
    noteId: string;
    coachId: string;
  };

  // Comment events
  [ServiceEvents.COMMENT_CREATED]: {
    commentId: string;
    postId: string;
    authorId: string;
    authorName: string;
  };
  [ServiceEvents.COMMENT_DELETED]: {
    commentId: string;
    postId: string;
    authorId: string;
  };
  [ServiceEvents.COMMENT_LIKED]: {
    commentId: string;
    postId: string;
    userId: string;
    liked: boolean;
  };
  [ServiceEvents.COMMENT_REPLIED]: {
    commentId: string;
    parentId: string;
    postId: string;
    authorId: string;
    authorName: string;
  };

  // Coach feed events
  [ServiceEvents.COACH_POST_CREATED]: {
    postId: string;
    coachId: string;
    coachName: string;
    feedType: 'PERSONAL' | 'CLUB' | 'BOTH';
    postType: string;
    clubId?: string;
  };

  // Invite booking events
  [ServiceEvents.INVITE_ACCEPTED]: {
    inviteId: string;
    bookingId: string;
    coachId: string;
    parentId: string;
    athleteIds: string[];
    selectedSlot: {
      date: string;
      startTime: string;
      endTime: string;
      location?: string;
    };
  };
  [ServiceEvents.INVITE_BOOKING_FAILED]: {
    inviteId: string;
    coachId: string;
    parentId: string;
    reason: string;
  };
  [ServiceEvents.RESULTS_PROGRAM_OPENED]: {
    userId: string;
    role: 'coach' | 'parent' | 'athlete';
    athleteId: string | null;
    openedAt: string;
    pendingCount: number;
    overdueCount: number;
    queueAthleteCount?: number;
  };
  [ServiceEvents.RESULTS_PROGRAM_FILTER_CHANGED]: {
    userId: string;
    role: 'coach' | 'parent' | 'athlete';
    athleteId: string | null;
    filter: 'all' | 'pending' | 'overdue' | 'done';
    count: number;
    pendingCount: number;
    overdueCount: number;
    completedCount: number;
  };
  [ServiceEvents.RESULTS_PROGRAM_TASK_COMPLETED]: {
    userId: string;
    role: 'coach' | 'parent' | 'athlete';
    athleteId: string | null;
    taskId: string;
    coachId: string | null;
    status: 'completed' | 'reopened';
    dueAt: string;
    completedAt: string;
    wasOverdue: boolean;
    resolvedWithin48h?: boolean;
    timeToFirstActionMs?: number;
  };
  [ServiceEvents.RESULTS_PROGRAM_TASK_RESCHEDULED]: {
    userId: string;
    role: 'coach' | 'parent' | 'athlete';
    athleteId: string | null;
    taskId: string;
    coachId: string | null;
    previousDueAt: string;
    nextDueAt: string;
    action: 'reschedule' | 'snooze';
    snoozeHours?: number;
    wasOverdue: boolean;
    timeToFirstActionMs?: number;
  };
  [ServiceEvents.RESULTS_PROGRAM_MESSAGE_FROM_TASK]: {
    userId: string;
    role: 'coach' | 'parent' | 'athlete';
    athleteId: string | null;
    taskId: string;
    coachId: string;
    source: 'task_sheet' | 'coach_playbook';
    timeToFirstActionMs?: number;
  };
  [ServiceEvents.RESULTS_PROGRAM_BULK_NUDGE_SENT]: {
    userId: string;
    role: 'coach';
    lane: 'intervene_now' | 'watch_today' | 'stable';
    variant: 'overdue' | 'due_soon';
    athleteCount: number;
    taskCount: number;
    updatedCount: number;
    skippedCount: number;
    timeToFirstActionMs?: number;
  };
  [ServiceEvents.RESULTS_PLAYBOOK_ACTION_TAPPED]: {
    coachId: string;
    athleteId: string;
    risk: 'high' | 'watch' | 'stable';
    overdueCount: number;
    dueSoonCount: number;
    taskCount: number;
    action: 'message' | 'recovery_checkpoint' | 'history';
  };
}

/**
 * Type-safe event emitter helper.
 */
export const emitTyped = <E extends keyof EventPayloads>(
  event: E,
  data: EventPayloads[E],
): void => {
  eventBus.emit(event, data);
};

/**
 * Type-safe event subscriber helper.
 */
export const onTyped = <E extends keyof EventPayloads>(
  event: E,
  handler: EventHandler<EventPayloads[E]>,
): (() => void) => {
  return eventBus.on(event, handler);
};
