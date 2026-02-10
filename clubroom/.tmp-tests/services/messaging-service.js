"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagingService = exports.MessagingService = void 0;
const mock_data_1 = require("@/constants/mock-data");
const api_client_1 = require("./api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const notification_service_1 = require("./notification-service");
class MessagingService {
    constructor() {
        this.inMemoryThreads = mock_data_1.chatThreads;
        this.inMemoryMessages = {};
        mock_data_1.chatThreads.forEach((thread) => {
            this.inMemoryMessages[thread.id] = mock_data_1.chatMessages.filter((m) => m.threadId === thread.id);
        });
    }
    async listThreads() {
        return this.inMemoryThreads;
    }
    async getThread(threadId) {
        return this.inMemoryThreads.find((t) => t.id === threadId);
    }
    async listMessages(threadId) {
        const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.MESSAGES, {});
        const messages = persisted[threadId] || this.inMemoryMessages[threadId] || [];
        return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    async sendMessage(threadId, body, sender, senderName, attachments = []) {
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
        // Notify the recipient
        const thread = await this.getThread(threadId);
        if (thread) {
            if (sender === 'parent') {
                // Parent sent message, notify coach
                await notification_service_1.notificationService.notifyCoachNewMessage({
                    coachId: 'coach1', // In production, get from thread
                    parentName: senderName || thread.coachName || 'Parent',
                    threadId,
                });
            }
            else {
                // Coach sent message, notify parent
                await notification_service_1.notificationService.notifyParentNewMessage({
                    parentId: 'parent_1', // In production, get from thread
                    coachName: senderName || thread.coachName || 'Coach',
                    threadId,
                });
            }
        }
        setTimeout(() => this.updateStatus(threadId, newMessage.id, 'sent'), 500);
        setTimeout(() => this.updateStatus(threadId, newMessage.id, 'delivered'), 1000);
        setTimeout(() => this.updateStatus(threadId, newMessage.id, 'seen'), 1500);
        return newMessage;
    }
    async simulateIncoming(threadId, body, senderName) {
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
        // Notify parent of incoming message
        const thread = await this.getThread(threadId);
        await notification_service_1.notificationService.notifyParentNewMessage({
            parentId: 'parent_1',
            coachName: senderName || thread?.coachName || 'Coach',
            threadId,
        });
        return incoming;
    }
    async markThreadRead(threadId) {
        const thread = this.inMemoryThreads.find((t) => t.id === threadId);
        if (thread) {
            thread.unreadCount = 0;
        }
        return thread;
    }
    async deleteMessage(threadId, messageId) {
        const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.MESSAGES, {});
        const current = persisted[threadId] || this.inMemoryMessages[threadId] || [];
        const updated = current.filter((msg) => msg.id !== messageId);
        persisted[threadId] = updated;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.MESSAGES, persisted);
        // Also update in-memory cache
        if (this.inMemoryMessages[threadId]) {
            this.inMemoryMessages[threadId] = this.inMemoryMessages[threadId].filter((msg) => msg.id !== messageId);
        }
    }
    async updateStatus(threadId, messageId, status) {
        const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.MESSAGES, {});
        const current = persisted[threadId] || this.inMemoryMessages[threadId] || [];
        const updated = current.map((msg) => (msg.id === messageId ? { ...msg, status } : msg));
        persisted[threadId] = updated;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.MESSAGES, persisted);
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
