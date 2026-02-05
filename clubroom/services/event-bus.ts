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
 */
export interface EventPayloads {
  [ServiceEvents.BOOKING_CREATED]: { bookingId: string; userId: string; coachId: string };
  [ServiceEvents.BOOKING_CANCELLED]: { bookingId: string; reason?: string };
  [ServiceEvents.SESSION_COMPLETED]: { sessionId: string; athleteIds: string[] };
  [ServiceEvents.FAMILY_MEMBER_ADDED]: { familyId: string; memberId: string };
  [ServiceEvents.NOTIFICATION_CREATED]: { notificationId: string; userId: string; type: string };
  [ServiceEvents.BADGE_EARNED]: { userId: string; badgeId: string };
  // Add more as needed
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
