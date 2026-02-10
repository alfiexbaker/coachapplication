"use strict";
/**
 * Notification Store Service
 *
 * Handles core notification CRUD operations and in-app listeners.
 * Single responsibility: notification data management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationStore = void 0;
const api_client_1 = require("../api-client");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("../event-bus");
const storage_keys_1 = require("@/constants/storage-keys");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('NotificationStore');
class NotificationStore {
    constructor() {
        this.listeners = [];
    }
    /**
     * Get all notifications.
     */
    async list() {
        try {
            return (0, result_1.ok)(await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []));
        }
        catch (error) {
            logger.error('Failed to list notifications', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to load notifications'));
        }
    }
    /**
     * Create a new notification.
     */
    async create(notification) {
        try {
            const fullNotification = {
                ...notification,
                createdAt: notification.createdAt || new Date().toISOString(),
                read: notification.read ?? false,
            };
            const currentResult = await this.list();
            if (!currentResult.success) {
                return currentResult;
            }
            const updated = [fullNotification, ...currentResult.data];
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
            // Notify in-app listeners for toasts
            this.notifyListeners(fullNotification);
            // Emit event for other services
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.NOTIFICATION_CREATED, {
                notificationId: notification.id,
                userId: notification.recipientId ?? '',
                type: notification.type,
            });
            logger.info('Notification created', {
                id: notification.id,
                type: notification.type,
                recipientId: notification.recipientId,
            });
            return (0, result_1.ok)(updated);
        }
        catch (error) {
            logger.error('Failed to create notification', { notification, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to create notification'));
        }
    }
    /**
     * Mark a notification as read.
     */
    async markAsRead(id) {
        try {
            const currentResult = await this.list();
            if (!currentResult.success) {
                return currentResult;
            }
            const updated = currentResult.data.map((n) => (n.id === id ? { ...n, read: true } : n));
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.NOTIFICATION_READ, { notificationId: id });
            return (0, result_1.ok)(updated);
        }
        catch (error) {
            logger.error('Failed to mark notification as read', { id, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update notification'));
        }
    }
    /**
     * Mark all notifications as read.
     */
    async markAllAsRead() {
        try {
            const currentResult = await this.list();
            if (!currentResult.success) {
                return currentResult;
            }
            const updated = currentResult.data.map((n) => ({ ...n, read: true }));
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
            return (0, result_1.ok)(updated);
        }
        catch (error) {
            logger.error('Failed to mark all notifications as read', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to update notifications'));
        }
    }
    /**
     * Mark a notification as handled (read + processed).
     */
    async markHandled(id) {
        try {
            const currentResult = await this.list();
            if (!currentResult.success) {
                return currentResult;
            }
            const updated = currentResult.data.map((n) => n.id === id ? { ...n, read: true, handled: true } : n);
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
            return (0, result_1.ok)(updated.find((n) => n.id === id));
        }
        catch (error) {
            logger.error('Failed to mark notification as handled', { id, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update notification'));
        }
    }
    /**
     * Dismiss a notification.
     */
    async dismiss(id) {
        try {
            const currentResult = await this.list();
            if (!currentResult.success) {
                return currentResult;
            }
            const updated = currentResult.data.filter((n) => n.id !== id);
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.NOTIFICATION_DISMISSED, { notificationId: id });
            return (0, result_1.ok)(updated);
        }
        catch (error) {
            logger.error('Failed to dismiss notification', { id, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to dismiss notification'));
        }
    }
    /**
     * Clear all notifications.
     */
    async clearAll() {
        try {
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to clear notifications', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to clear notifications'));
        }
    }
    /**
     * Get unread count for a user.
     */
    async getUnreadCount(recipientId) {
        const listResult = await this.list();
        if (!listResult.success) {
            return listResult;
        }
        const filtered = recipientId
            ? listResult.data.filter((n) => n.recipientId === recipientId)
            : listResult.data;
        return (0, result_1.ok)(filtered.filter((n) => !n.read).length);
    }
    /**
     * Get notifications for a specific recipient.
     */
    async getByRecipient(recipientId) {
        const listResult = await this.list();
        if (!listResult.success) {
            return listResult;
        }
        return (0, result_1.ok)(listResult.data.filter((n) => n.recipientId === recipientId));
    }
    /**
     * Get notifications by type.
     */
    async getByType(type) {
        const listResult = await this.list();
        if (!listResult.success) {
            return listResult;
        }
        return (0, result_1.ok)(listResult.data.filter((n) => n.type === type));
    }
    /**
     * Subscribe to new notifications (for in-app toasts).
     * Returns unsubscribe function.
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    /**
     * Notify all listeners of a new notification.
     */
    notifyListeners(notification) {
        this.listeners.forEach((listener) => {
            try {
                listener(notification);
            }
            catch (error) {
                logger.error('Listener error', { error });
            }
        });
    }
}
exports.notificationStore = new NotificationStore();
