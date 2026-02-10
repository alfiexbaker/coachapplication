"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagingService = exports.MessagingService = void 0;
const mock_data_1 = require("@/constants/mock-data");
const api_client_1 = require("./api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const notification_service_1 = require("./notification-service");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("./event-bus");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('MessagingService');
class MessagingService {
    constructor() {
        this.inMemoryThreads = mock_data_1.chatThreads;
        this.inMemoryMessages = {};
        mock_data_1.chatThreads.forEach((thread) => {
            this.inMemoryMessages[thread.id] = mock_data_1.chatMessages.filter((m) => m.threadId === thread.id);
        });
    }
    async listThreads() {
        try {
            return (0, result_1.ok)(this.inMemoryThreads);
        }
        catch (error) {
            logger.error('Failed to list threads', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to list threads'));
        }
    }
    async getThread(threadId) {
        try {
            const thread = this.inMemoryThreads.find((t) => t.id === threadId);
            if (!thread) {
                return (0, result_1.err)((0, result_1.notFound)('Thread', threadId));
            }
            return (0, result_1.ok)(thread);
        }
        catch (error) {
            logger.error('Failed to get thread', { threadId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load thread'));
        }
    }
    async listMessages(threadId) {
        try {
            const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.MESSAGES, {});
            const messages = persisted[threadId] || this.inMemoryMessages[threadId] || [];
            return (0, result_1.ok)(messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
        }
        catch (error) {
            logger.error('Failed to list messages', { threadId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load messages'));
        }
    }
    async sendMessage(threadId, body, sender, senderName, attachments = []) {
        try {
            const timestamp = new Date().toISOString();
            const newMessage = {
                id: `msg_${Date.now()}`,
                threadId,
                sender,
                senderName,
                body,
                createdAt: timestamp,
                status: 'pending',
                attachments,
            };
            await this.persistMessage(threadId, newMessage);
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.MESSAGE_SENT, {
                threadId,
                messageId: newMessage.id,
                sender: newMessage.sender,
                senderName: newMessage.senderName,
                attachmentsCount: attachments.length,
                createdAt: newMessage.createdAt,
            });
            // Notify the recipient
            const threadResult = await this.getThread(threadId);
            if (threadResult.success) {
                if (sender === 'parent') {
                    await notification_service_1.notificationService.notifyCoachNewMessage({
                        coachId: 'coach1',
                        parentName: senderName || threadResult.data.coachName || 'Parent',
                        threadId,
                    });
                }
                else {
                    await notification_service_1.notificationService.notifyParentNewMessage({
                        parentId: 'parent_1',
                        coachName: senderName || threadResult.data.coachName || 'Coach',
                        threadId,
                    });
                }
            }
            setTimeout(() => this.updateStatus(threadId, newMessage.id, 'sent'), 500);
            setTimeout(() => this.updateStatus(threadId, newMessage.id, 'delivered'), 1000);
            setTimeout(() => this.updateStatus(threadId, newMessage.id, 'seen'), 1500);
            return (0, result_1.ok)(newMessage);
        }
        catch (error) {
            logger.error('Failed to send message', { threadId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to send message'));
        }
    }
    async simulateIncoming(threadId, body, senderName) {
        try {
            const timestamp = new Date().toISOString();
            const incoming = {
                id: `msg_${Date.now()}_coach`,
                threadId,
                sender: 'coach',
                senderName,
                body,
                createdAt: timestamp,
                status: 'delivered',
            };
            await this.persistMessage(threadId, incoming);
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.MESSAGE_SENT, {
                threadId,
                messageId: incoming.id,
                sender: incoming.sender,
                senderName: incoming.senderName,
                attachmentsCount: 0,
                createdAt: incoming.createdAt,
            });
            const threadResult = await this.getThread(threadId);
            await notification_service_1.notificationService.notifyParentNewMessage({
                parentId: 'parent_1',
                coachName: senderName || (threadResult.success ? threadResult.data.coachName : undefined) || 'Coach',
                threadId,
            });
            return (0, result_1.ok)(incoming);
        }
        catch (error) {
            logger.error('Failed to simulate incoming message', { threadId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to receive message'));
        }
    }
    async markThreadRead(threadId) {
        try {
            const thread = this.inMemoryThreads.find((t) => t.id === threadId);
            if (!thread) {
                return (0, result_1.err)((0, result_1.notFound)('Thread', threadId));
            }
            thread.unreadCount = 0;
            return (0, result_1.ok)(thread);
        }
        catch (error) {
            logger.error('Failed to mark thread read', { threadId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update thread'));
        }
    }
    async deleteMessage(threadId, messageId) {
        try {
            const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.MESSAGES, {});
            const current = persisted[threadId] || this.inMemoryMessages[threadId] || [];
            const updated = current.filter((msg) => msg.id !== messageId);
            const messageDeleted = updated.length !== current.length;
            persisted[threadId] = updated;
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.MESSAGES, persisted);
            if (this.inMemoryMessages[threadId]) {
                this.inMemoryMessages[threadId] = this.inMemoryMessages[threadId].filter((msg) => msg.id !== messageId);
            }
            if (messageDeleted) {
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.MESSAGE_DELETED, {
                    threadId,
                    messageId,
                });
            }
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to delete message', { threadId, messageId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to delete message'));
        }
    }
    async updateStatus(threadId, messageId, status) {
        const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.MESSAGES, {});
        const current = persisted[threadId] || this.inMemoryMessages[threadId] || [];
        let wasUpdated = false;
        const updated = current.map((msg) => {
            if (msg.id !== messageId) {
                return msg;
            }
            wasUpdated = true;
            return { ...msg, status };
        });
        persisted[threadId] = updated;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.MESSAGES, persisted);
        if (wasUpdated) {
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.MESSAGE_EDITED, {
                threadId,
                messageId,
                status,
            });
        }
    }
    async persistMessage(threadId, message) {
        const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.MESSAGES, {});
        const current = persisted[threadId] || this.inMemoryMessages[threadId] || [];
        const updated = [...current, message];
        persisted[threadId] = updated;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.MESSAGES, persisted);
    }
}
exports.MessagingService = MessagingService;
exports.messagingService = new MessagingService();
