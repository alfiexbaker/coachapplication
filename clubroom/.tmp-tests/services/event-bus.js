"use strict";
/**
 * Event Bus for decoupled service communication.
 * Services emit events, other services subscribe - no direct coupling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTyped = exports.emitTyped = exports.ServiceEvents = exports.eventBus = void 0;
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('EventBus');
class EventBus {
    constructor() {
        this.handlers = new Map();
        this.onceHandlers = new Map();
    }
    /**
     * Subscribe to an event. Returns unsubscribe function.
     */
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event).add(handler);
        // Return unsubscribe function
        return () => this.off(event, handler);
    }
    /**
     * Subscribe to an event once. Handler is removed after first invocation.
     */
    once(event, handler) {
        if (!this.onceHandlers.has(event)) {
            this.onceHandlers.set(event, new Set());
        }
        this.onceHandlers.get(event).add(handler);
        return () => this.onceHandlers.get(event)?.delete(handler);
    }
    /**
     * Emit an event with data.
     */
    emit(event, data) {
        logger.info(`Event: ${event}`, { data });
        // Regular handlers
        const handlers = this.handlers.get(event);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(data);
                }
                catch (error) {
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
                }
                catch (error) {
                    logger.error(`Once handler error for ${event}`, error);
                }
            });
            this.onceHandlers.delete(event);
        }
    }
    /**
     * Unsubscribe from an event.
     */
    off(event, handler) {
        this.handlers.get(event)?.delete(handler);
    }
    /**
     * Remove all handlers for an event.
     */
    clear(event) {
        this.handlers.delete(event);
        this.onceHandlers.delete(event);
    }
    /**
     * Remove all handlers for all events.
     */
    clearAll() {
        this.handlers.clear();
        this.onceHandlers.clear();
    }
    /**
     * Get count of handlers for an event.
     */
    listenerCount(event) {
        return (this.handlers.get(event)?.size || 0) + (this.onceHandlers.get(event)?.size || 0);
    }
}
// Singleton instance
exports.eventBus = new EventBus();
/**
 * Standard service events for cross-service communication.
 */
exports.ServiceEvents = {
    // Booking events
    BOOKING_CREATED: 'booking:created',
    BOOKING_UPDATED: 'booking:updated',
    BOOKING_CANCELLED: 'booking:cancelled',
    BOOKING_CONFIRMED: 'booking:confirmed',
    // Reschedule events
    RESCHEDULE_PROPOSED: 'reschedule:proposed',
    RESCHEDULE_ACCEPTED: 'reschedule:accepted',
    RESCHEDULE_DECLINED: 'reschedule:declined',
    RESCHEDULE_COUNTERED: 'reschedule:countered',
    // Series events (multi-week bookings)
    SERIES_CREATED: 'series:created',
    SERIES_UPDATED: 'series:updated',
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
    // Invite RSVP events
    INVITE_RSVP_RESPONDED: 'invite:rsvp:responded',
    INVITE_SHARED: 'invite:shared',
    // Squad events
    SQUAD_CREATED: 'squad:created',
    SQUAD_DELETED: 'squad:deleted',
    SQUAD_MEMBER_ADDED: 'squad:member:added',
    SQUAD_MEMBER_REMOVED: 'squad:member:removed',
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
    // Connection & offline queue events
    CONNECTION_CHANGED: 'connection:changed',
    QUEUE_FLUSHED: 'queue:flushed',
    QUEUE_ACTION_FAILED: 'queue:action_failed',
};
/**
 * Type-safe event emitter helper.
 */
const emitTyped = (event, data) => {
    exports.eventBus.emit(event, data);
};
exports.emitTyped = emitTyped;
/**
 * Type-safe event subscriber helper.
 */
const onTyped = (event, handler) => {
    return exports.eventBus.on(event, handler);
};
exports.onTyped = onTyped;
