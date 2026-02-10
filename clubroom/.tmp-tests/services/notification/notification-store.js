"use strict";
/**
 * Notification Store Service
 *
 * Handles core notification CRUD operations and in-app listeners.
 * Single responsibility: notification data management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationStore = void 0;
const storage_service_1 = require("../storage-service");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("../event-bus");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('NotificationStore');
class NotificationStore {
    constructor() {
        this.listeners = [];
    }
    /**
     * Get all notifications.
     */
    async list() {
        return storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
    }
    /**
     * Create a new notification.
     */
    async create(notification) {
        const fullNotification = {
            ...notification,
            createdAt: notification.createdAt || new Date().toISOString(),
            read: notification.read ?? false,
        };
        const current = await this.list();
        const updated = [fullNotification, ...current];
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
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
        return updated;
    }
    /**
     * Mark a notification as read.
     */
    async markAsRead(id) {
        const current = await this.list();
        const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.NOTIFICATION_READ, { notificationId: id });
        return updated;
    }
    /**
     * Mark all notifications as read.
     */
    async markAllAsRead() {
        const current = await this.list();
        const updated = current.map((n) => ({ ...n, read: true }));
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
        return updated;
    }
    /**
     * Mark a notification as handled (read + processed).
     */
    async markHandled(id) {
        const current = await this.list();
        const updated = current.map((n) => n.id === id ? { ...n, read: true, handled: true } : n);
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
        return updated.find((n) => n.id === id);
    }
    /**
     * Dismiss a notification.
     */
    async dismiss(id) {
        const current = await this.list();
        const updated = current.filter((n) => n.id !== id);
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, updated);
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.NOTIFICATION_DISMISSED, { notificationId: id });
        return updated;
    }
    /**
     * Clear all notifications.
     */
    async clearAll() {
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
    }
    /**
     * Get unread count for a user.
     */
    async getUnreadCount(recipientId) {
        const notifications = await this.list();
        const filtered = recipientId
            ? notifications.filter((n) => n.recipientId === recipientId)
            : notifications;
        return filtered.filter((n) => !n.read).length;
    }
    /**
     * Get notifications for a specific recipient.
     */
    async getByRecipient(recipientId) {
        const notifications = await this.list();
        return notifications.filter((n) => n.recipientId === recipientId);
    }
    /**
     * Get notifications by type.
     */
    async getByType(type) {
        const notifications = await this.list();
        return notifications.filter((n) => n.type === type);
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
