/**
 * Event Bus for decoupled service communication.
 * Services emit events, other services subscribe - no direct coupling.
 */

import { createLogger } from '@/utils/logger';

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

  // Session events
  SESSION_CREATED: 'session:created',
  SESSION_UPDATED: 'session:updated',
  SESSION_STARTED: 'session:started',
  SESSION_COMPLETED: 'session:completed',
  SESSION_CANCELLED: 'session:cancelled',

  // Group session events
  OPEN_SESSION_PUBLISHED: 'group_session:open_published',

  // User events
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  USER_LOGGED_IN: 'user:logged_in',
  USER_LOGGED_OUT: 'user:logged_out',

  // Family events
  FAMILY_MEMBER_ADDED: 'family:member:added',
  FAMILY_MEMBER_REMOVED: 'family:member:removed',
  FAMILY_LINK_CREATED: 'family:link:created',

  // Payment events
  PAYMENT_SUCCEEDED: 'payment:succeeded',
  PAYMENT_FAILED: 'payment:failed',
  REFUND_ISSUED: 'payment:refund',

  // Notification events
  NOTIFICATION_CREATED: 'notification:created',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_DISMISSED: 'notification:dismissed',

  // Club events
  CLUB_MEMBER_JOINED: 'club:member:joined',
  CLUB_MEMBER_LEFT: 'club:member:left',
  CLUB_POST_CREATED: 'club:post:created',

  // Community group events
  GROUP_MEMBER_JOINED: 'community:group:member_joined',
  GROUP_MEMBER_ROLE_CHANGED: 'community:group:member_role_changed',

  // Achievement events
  BADGE_EARNED: 'achievement:badge_earned',
  STREAK_MILESTONE: 'achievement:streak_milestone',

  // Sync events
  SYNC_STARTED: 'sync:started',
  SYNC_COMPLETED: 'sync:completed',
  SYNC_FAILED: 'sync:failed',
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
}

/**
 * Type-safe event emitter helper.
 */
export const emitTyped = <E extends keyof EventPayloads>(
  event: E,
  data: EventPayloads[E]
): void => {
  eventBus.emit(event, data);
};

/**
 * Type-safe event subscriber helper.
 */
export const onTyped = <E extends keyof EventPayloads>(
  event: E,
  handler: EventHandler<EventPayloads[E]>
): (() => void) => {
  return eventBus.on(event, handler);
};
