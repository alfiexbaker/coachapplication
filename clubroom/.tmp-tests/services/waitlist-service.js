"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitlistService = void 0;
const api_client_1 = require("./api-client");
const notification_service_1 = require("./notification-service");
const user_service_1 = require("./user-service");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("./event-bus");
const result_1 = require("@/types/result");
const NOTIFICATION_EXPIRY_HOURS = 24; // Hours before notification expires
const logger = (0, logger_1.createLogger)('WaitlistService');
async function resolveUserName(userId, fallback) {
    const userResult = await user_service_1.userService.getUserById(userId);
    if (!userResult.success) {
        return fallback;
    }
    return userResult.data.name?.trim() || fallback;
}
function sessionLabel(sessionId) {
    return `session ${sessionId}`;
}
/**
 * Service for managing session waitlists.
 * Handles joining, leaving, notifications, and auto-booking for full sessions.
 */
class WaitlistService {
    // ============================================================================
    // CORE CRUD OPERATIONS
    // ============================================================================
    /**
     * Get all waitlist entries from storage
     */
    async getAllEntries() {
        return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.WAITLIST, []);
    }
    /**
     * Save all waitlist entries to storage
     */
    async saveEntries(entries) {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.WAITLIST, entries);
    }
    /**
     * Get a specific waitlist entry by ID
     */
    async getEntryById(entryId) {
        const entries = await this.getAllEntries();
        return entries.find((e) => e.id === entryId);
    }
    // ============================================================================
    // USER OPERATIONS
    // ============================================================================
    /**
     * Join a waitlist for a session
     * Returns the created waitlist entry
     */
    async joinWaitlist(params) {
        try {
            const entries = await this.getAllEntries();
            // Check if user is already on this session's waitlist
            const existing = entries.find((e) => e.userId === params.userId && e.sessionId === params.sessionId && e.status === 'WAITING');
            if (existing) {
                logger.warn('user_already_on_waitlist', {
                    userId: params.userId,
                    sessionId: params.sessionId,
                });
                return (0, result_1.ok)(existing);
            }
            // Calculate position (number of people currently waiting + 1)
            const sessionWaitlist = entries.filter((e) => e.sessionId === params.sessionId && e.status === 'WAITING');
            const position = sessionWaitlist.length + 1;
            const newEntry = {
                id: `waitlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: params.userId,
                sessionId: params.sessionId,
                coachId: params.coachId,
                position,
                joinedAt: new Date().toISOString(),
                autoBook: params.autoBook ?? false,
                status: 'WAITING',
                notes: params.notes,
            };
            entries.push(newEntry);
            await this.saveEntries(entries);
            logger.info('user_joined_waitlist', {
                entryId: newEntry.id,
                userId: params.userId,
                sessionId: params.sessionId,
                position,
                autoBook: newEntry.autoBook,
            });
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.WAITLIST_JOINED, {
                entryId: newEntry.id,
                sessionId: newEntry.sessionId,
                userId: newEntry.userId,
                position: newEntry.position,
                autoBook: newEntry.autoBook,
            });
            return (0, result_1.ok)(newEntry);
        }
        catch (error) {
            logger.error('join_waitlist_failed', { params, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to join waitlist'));
        }
    }
    /**
     * Leave a waitlist (remove entry)
     * Updates positions of remaining users
     */
    async leaveWaitlist(entryId) {
        try {
            const entries = await this.getAllEntries();
            const entryIndex = entries.findIndex((e) => e.id === entryId);
            if (entryIndex === -1) {
                logger.warn('waitlist_entry_not_found', { entryId });
                return (0, result_1.err)((0, result_1.notFound)('Waitlist entry', entryId));
            }
            const entry = entries[entryIndex];
            const sessionId = entry.sessionId;
            const removedPosition = entry.position;
            // Mark as removed instead of deleting (for history)
            entries[entryIndex] = {
                ...entry,
                status: 'REMOVED',
            };
            // Update positions for remaining users in the same session
            entries.forEach((e) => {
                if (e.sessionId === sessionId && e.status === 'WAITING' && e.position > removedPosition) {
                    e.position -= 1;
                }
            });
            await this.saveEntries(entries);
            logger.info('user_left_waitlist', {
                entryId,
                userId: entry.userId,
                sessionId,
            });
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.WAITLIST_LEFT, {
                entryId,
                sessionId,
                userId: entry.userId,
            });
            return (0, result_1.ok)(true);
        }
        catch (error) {
            logger.error('leave_waitlist_failed', { entryId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to leave waitlist'));
        }
    }
    /**
     * Get all waitlist entries for a specific user
     */
    async getUserWaitlists(userId) {
        try {
            const entries = await this.getAllEntries();
            return (0, result_1.ok)(entries
                .filter((e) => e.userId === userId && e.status === 'WAITING')
                .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()));
        }
        catch (error) {
            logger.error('get_user_waitlists_failed', { userId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load waitlists'));
        }
    }
    /**
     * Get a user's position in a specific session's waitlist
     * Returns null if user is not on the waitlist
     */
    async getWaitlistPosition(userId, sessionId) {
        try {
            const entries = await this.getAllEntries();
            const sessionWaitlist = entries.filter((e) => e.sessionId === sessionId && e.status === 'WAITING');
            const userEntry = sessionWaitlist.find((e) => e.userId === userId);
            if (!userEntry) {
                return (0, result_1.ok)(null);
            }
            return (0, result_1.ok)({
                position: userEntry.position,
                totalWaiting: sessionWaitlist.length,
                entry: userEntry,
            });
        }
        catch (error) {
            logger.error('get_waitlist_position_failed', { userId, sessionId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to get waitlist position'));
        }
    }
    /**
     * Update auto-book preference for a waitlist entry
     */
    async updateAutoBook(entryId, autoBook) {
        try {
            const entries = await this.getAllEntries();
            const entryIndex = entries.findIndex((e) => e.id === entryId);
            if (entryIndex === -1) {
                return (0, result_1.ok)(null);
            }
            entries[entryIndex] = {
                ...entries[entryIndex],
                autoBook,
            };
            await this.saveEntries(entries);
            logger.info('autobook_preference_updated', {
                entryId,
                autoBook,
            });
            return (0, result_1.ok)(entries[entryIndex]);
        }
        catch (error) {
            logger.error('update_autobook_failed', { entryId, autoBook, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update auto-book'));
        }
    }
    // ============================================================================
    // SESSION / COACH OPERATIONS
    // ============================================================================
    /**
     * Get all waitlist entries for a specific session
     */
    async getSessionWaitlistRaw(sessionId) {
        const entries = await this.getAllEntries();
        return entries
            .filter((e) => e.sessionId === sessionId && e.status === 'WAITING')
            .sort((a, b) => a.position - b.position);
    }
    async getSessionWaitlist(sessionId) {
        try {
            return (0, result_1.ok)(await this.getSessionWaitlistRaw(sessionId));
        }
        catch (error) {
            logger.error('get_session_waitlist_failed', { sessionId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to get session waitlist'));
        }
    }
    /**
     * Get waitlist summary for a session
     */
    async getWaitlistSummary(sessionId, sessionTitle) {
        const waitlist = await this.getSessionWaitlistRaw(sessionId);
        const autoBookCount = waitlist.filter((e) => e.autoBook).length;
        const nextInLine = waitlist[0];
        const nextUserName = nextInLine ? await resolveUserName(nextInLine.userId, 'User') : undefined;
        return {
            sessionId,
            sessionTitle,
            totalWaiting: waitlist.length,
            autoBookCount,
            nextInLine: nextInLine
                ? {
                    userId: nextInLine.userId,
                    userName: nextUserName || 'User',
                    position: nextInLine.position,
                    autoBook: nextInLine.autoBook,
                }
                : undefined,
        };
    }
    /**
     * Notify the next person in line that a spot is available
     * Sets expiry time for the notification
     */
    async notifyNextInLine(sessionId) {
        try {
            const waitlist = await this.getSessionWaitlistRaw(sessionId);
            if (waitlist.length === 0) {
                logger.info('no_one_on_waitlist', { sessionId });
                return (0, result_1.ok)(null);
            }
            const nextInLine = waitlist[0];
            const entries = await this.getAllEntries();
            const entryIndex = entries.findIndex((e) => e.id === nextInLine.id);
            if (entryIndex === -1) {
                return (0, result_1.ok)(null);
            }
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + NOTIFICATION_EXPIRY_HOURS);
            entries[entryIndex] = {
                ...entries[entryIndex],
                status: 'NOTIFIED',
                notifiedAt: new Date().toISOString(),
                expiresAt: expiresAt.toISOString(),
            };
            await this.saveEntries(entries);
            // Send notification to user
            await notification_service_1.notificationService.create({
                id: `notif_waitlist_${Date.now()}`,
                type: 'booking',
                notificationType: 'WAITLIST_AVAILABLE',
                title: 'Spot Available!',
                body: `A spot has opened up for ${sessionLabel(nextInLine.sessionId)}. Book now before it's gone!`,
                recipientId: nextInLine.userId,
                deepLink: `/waitlist`,
                data: {
                    sessionId,
                    entryId: nextInLine.id,
                },
                timeLabel: 'Just now',
            });
            logger.info('user_notified_of_availability', {
                entryId: nextInLine.id,
                userId: nextInLine.userId,
                sessionId,
                expiresAt: expiresAt.toISOString(),
            });
            return (0, result_1.ok)(entries[entryIndex]);
        }
        catch (error) {
            logger.error('notify_next_in_line_failed', { sessionId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to notify next in line'));
        }
    }
    /**
     * Promote the next person from waitlist to a booking
     * This is used when auto-book is enabled or when a coach manually promotes
     */
    async promoteFromWaitlist(sessionId) {
        try {
            const waitlist = await this.getSessionWaitlistRaw(sessionId);
            if (waitlist.length === 0) {
                return (0, result_1.ok)({ success: false, error: 'No one on waitlist' });
            }
            const nextInLine = waitlist[0];
            const entries = await this.getAllEntries();
            const entryIndex = entries.findIndex((e) => e.id === nextInLine.id);
            if (entryIndex === -1) {
                return (0, result_1.ok)({ success: false, error: 'Entry not found' });
            }
            // Mark as booked
            entries[entryIndex] = {
                ...entries[entryIndex],
                status: 'BOOKED',
            };
            // Update positions for remaining users
            entries.forEach((e) => {
                if (e.sessionId === sessionId &&
                    e.status === 'WAITING' &&
                    e.position > nextInLine.position) {
                    e.position -= 1;
                }
            });
            await this.saveEntries(entries);
            // Send confirmation notification
            await notification_service_1.notificationService.create({
                id: `notif_waitlist_booked_${Date.now()}`,
                type: 'booking',
                notificationType: 'BOOKING_CONFIRMED',
                title: "You're In!",
                body: `You've been booked for ${sessionLabel(nextInLine.sessionId)} from the waitlist.`,
                recipientId: nextInLine.userId,
                deepLink: `/bookings`,
                data: {
                    sessionId,
                    entryId: nextInLine.id,
                },
                timeLabel: 'Just now',
            });
            logger.info('user_promoted_from_waitlist', {
                entryId: nextInLine.id,
                userId: nextInLine.userId,
                sessionId,
            });
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.WAITLIST_PROMOTED, {
                entryId: nextInLine.id,
                sessionId,
                userId: nextInLine.userId,
                position: nextInLine.position,
                autoBook: nextInLine.autoBook,
            });
            return (0, result_1.ok)({ success: true, entry: entries[entryIndex] });
        }
        catch (error) {
            logger.error('promote_from_waitlist_failed', { sessionId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to promote from waitlist'));
        }
    }
    /**
     * Remove a user from the waitlist (coach action)
     */
    async removeFromWaitlist(entryId, reason) {
        try {
            const entries = await this.getAllEntries();
            const entryIndex = entries.findIndex((e) => e.id === entryId);
            if (entryIndex === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Waitlist entry', entryId));
            }
            const entry = entries[entryIndex];
            const sessionId = entry.sessionId;
            const removedPosition = entry.position;
            entries[entryIndex] = {
                ...entry,
                status: 'REMOVED',
                notes: reason || entry.notes,
            };
            // Update positions for remaining users
            entries.forEach((e) => {
                if (e.sessionId === sessionId && e.status === 'WAITING' && e.position > removedPosition) {
                    e.position -= 1;
                }
            });
            await this.saveEntries(entries);
            // Notify user they were removed
            await notification_service_1.notificationService.create({
                id: `notif_waitlist_removed_${Date.now()}`,
                type: 'booking',
                title: 'Waitlist Update',
                body: `You've been removed from the waitlist for ${sessionLabel(entry.sessionId)}.`,
                recipientId: entry.userId,
                deepLink: `/waitlist`,
                timeLabel: 'Just now',
            });
            logger.info('user_removed_from_waitlist', {
                entryId,
                userId: entry.userId,
                sessionId,
                reason,
            });
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.WAITLIST_LEFT, {
                entryId,
                sessionId,
                userId: entry.userId,
                reason,
            });
            return (0, result_1.ok)(true);
        }
        catch (error) {
            logger.error('remove_from_waitlist_failed', { entryId, reason, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to remove from waitlist'));
        }
    }
    /**
     * Get all waitlists for sessions managed by a coach
     */
    async getCoachWaitlists(coachId) {
        const entries = await this.getAllEntries();
        return entries
            .filter((e) => e.coachId === coachId && e.status === 'WAITING')
            .sort((a, b) => {
            // Sort by session, then by position
            if (a.sessionId !== b.sessionId) {
                return a.sessionId.localeCompare(b.sessionId);
            }
            return a.position - b.position;
        });
    }
    /**
     * Get waitlist summaries for all sessions managed by a coach
     */
    async getCoachWaitlistSummaries(coachId) {
        try {
            const entries = await this.getCoachWaitlists(coachId);
            // Group by sessionId
            const sessionMap = new Map();
            entries.forEach((entry) => {
                const existing = sessionMap.get(entry.sessionId) || [];
                existing.push(entry);
                sessionMap.set(entry.sessionId, existing);
            });
            const summaries = [];
            for (const [sessionId, sessionEntries] of sessionMap.entries()) {
                const firstEntry = sessionEntries[0];
                const autoBookCount = sessionEntries.filter((e) => e.autoBook).length;
                const nextUserName = await resolveUserName(firstEntry.userId, 'User');
                summaries.push({
                    sessionId,
                    sessionTitle: `Session ${sessionId}`,
                    totalWaiting: sessionEntries.length,
                    autoBookCount,
                    nextInLine: {
                        userId: firstEntry.userId,
                        userName: nextUserName,
                        position: firstEntry.position,
                        autoBook: firstEntry.autoBook,
                    },
                });
            }
            return (0, result_1.ok)(summaries);
        }
        catch (error) {
            logger.error('get_coach_waitlist_summaries_failed', { coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to get coach waitlist summaries'));
        }
    }
    // ============================================================================
    // EXPIRATION & CLEANUP
    // ============================================================================
    /**
     * Expire notifications that have passed their deadline
     * Moves expired notified entries back to waiting (next in line)
     */
    async expireNotifications() {
        try {
            const entries = await this.getAllEntries();
            const now = new Date();
            let expiredCount = 0;
            entries.forEach((entry, index) => {
                if (entry.status === 'NOTIFIED' && entry.expiresAt && new Date(entry.expiresAt) < now) {
                    entries[index] = {
                        ...entry,
                        status: 'EXPIRED',
                    };
                    expiredCount++;
                    logger.info('notification_expired', {
                        entryId: entry.id,
                        userId: entry.userId,
                        sessionId: entry.sessionId,
                    });
                }
            });
            if (expiredCount > 0) {
                await this.saveEntries(entries);
            }
            return (0, result_1.ok)(expiredCount);
        }
        catch (error) {
            logger.error('expire_notifications_failed', { error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to expire notifications'));
        }
    }
    /**
     * Clean up old entries (completed, expired, removed)
     * Keeps entries for a specified number of days for history
     */
    async cleanupOldEntries(daysToKeep = 30) {
        try {
            const entries = await this.getAllEntries();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const activeStatuses = ['WAITING', 'NOTIFIED'];
            const toKeep = entries.filter((entry) => {
                if (activeStatuses.includes(entry.status)) {
                    return true;
                }
                // Keep recent completed/expired/removed entries
                return new Date(entry.joinedAt) > cutoffDate;
            });
            const removedCount = entries.length - toKeep.length;
            if (removedCount > 0) {
                await this.saveEntries(toKeep);
                logger.info('old_entries_cleaned', { removedCount });
            }
            return (0, result_1.ok)(removedCount);
        }
        catch (error) {
            logger.error('cleanup_old_entries_failed', { daysToKeep, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to cleanup old waitlist entries'));
        }
    }
    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    /**
     * Check if a user is on the waitlist for a session
     */
    async isUserOnWaitlist(userId, sessionId) {
        try {
            const entries = await this.getAllEntries();
            return (0, result_1.ok)(entries.some((e) => e.userId === userId &&
                e.sessionId === sessionId &&
                (e.status === 'WAITING' || e.status === 'NOTIFIED')));
        }
        catch (error) {
            logger.error('is_user_on_waitlist_failed', { userId, sessionId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to check waitlist membership'));
        }
    }
    /**
     * Get the count of people waiting for a session
     */
    async getWaitlistCount(sessionId) {
        const waitlistResult = await this.getSessionWaitlist(sessionId);
        if (!waitlistResult.success) {
            return waitlistResult;
        }
        return (0, result_1.ok)(waitlistResult.data.length);
    }
    /**
     * Format position for display (e.g., "1st", "2nd", "3rd")
     */
    formatPosition(position) {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = position % 100;
        return position + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    }
    /**
     * Format relative time for display
     */
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays === 1)
            return 'Yesterday';
        if (diffDays < 7)
            return `${diffDays}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
    // ============================================================================
    // MOCK DATA FOR DEMO
    // ============================================================================
    /**
     * Seed demo waitlist entries for testing
     */
    async seedDemoData() {
        try {
            const demoEntries = [
                {
                    id: 'waitlist_demo_1',
                    userId: 'parent1',
                    sessionId: 'session_full_1',
                    coachId: 'coach1',
                    position: 1,
                    joinedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    autoBook: true,
                    status: 'WAITING',
                },
                {
                    id: 'waitlist_demo_2',
                    userId: 'parent2',
                    sessionId: 'session_full_1',
                    coachId: 'coach1',
                    position: 2,
                    joinedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                    autoBook: false,
                    status: 'WAITING',
                },
                {
                    id: 'waitlist_demo_3',
                    userId: 'parent1',
                    sessionId: 'session_full_2',
                    coachId: 'coach2',
                    position: 1,
                    joinedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    autoBook: false,
                    status: 'WAITING',
                },
            ];
            await this.saveEntries(demoEntries);
            logger.info('demo_waitlist_data_seeded', { count: demoEntries.length });
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('seed_demo_waitlist_data_failed', { error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to seed demo waitlist data'));
        }
    }
}
exports.waitlistService = new WaitlistService();
