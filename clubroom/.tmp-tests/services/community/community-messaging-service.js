"use strict";
/**
 * Community Messaging Service
 *
 * Handles group messaging: sending messages, reading messages,
 * marking as read, and message status updates.
 *
 * API Integration Notes:
 * - Messages are persisted via storageService (AsyncStorage in dev, API in prod)
 * - Group metadata (lastMessageAt, unreadCount) is updated on message events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityMessagingService = void 0;
const storage_service_1 = require("../storage-service");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const community_group_service_1 = require("./community-group-service");
const logger = (0, logger_1.createLogger)('CommunityMessagingService');
// Mock data for initial state
const mockMessages = {
    group_1: [
        {
            id: 'msg_1',
            groupId: 'group_1',
            senderId: 'parent1',
            senderName: 'John Henderson',
            body: 'Hi everyone! Looking forward to the new season.',
            createdAt: '2024-01-19T10:00:00Z',
            status: 'seen',
            readBy: ['parent1', 'parent2'],
        },
        {
            id: 'msg_2',
            groupId: 'group_1',
            senderId: 'parent2',
            senderName: 'Lisa Wilson',
            body: 'Same here! Has anyone got the training schedule?',
            createdAt: '2024-01-19T10:05:00Z',
            status: 'seen',
            readBy: ['parent1', 'parent2'],
        },
        {
            id: 'msg_3',
            groupId: 'group_1',
            senderId: 'parent1',
            senderName: 'John Henderson',
            body: 'See you all at training!',
            createdAt: '2024-01-20T14:30:00Z',
            status: 'delivered',
            readBy: ['parent1'],
        },
    ],
};
class CommunityMessagingService {
    constructor() {
        this.inMemoryMessages = { ...mockMessages };
    }
    /**
     * Get messages for a group
     */
    async getGroupMessages(groupId) {
        const persisted = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.GROUP_MESSAGES, {});
        const messages = persisted[groupId] || this.inMemoryMessages[groupId] || [];
        return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    /**
     * Send a message to a group
     */
    async sendGroupMessage(groupId, senderId, senderName, body, senderAvatar, attachments) {
        const timestamp = new Date().toISOString();
        const newMessage = {
            id: `gmsg_${Date.now()}`,
            groupId,
            senderId,
            senderName,
            senderAvatar,
            body,
            createdAt: timestamp,
            status: 'sent',
            readBy: [senderId],
            attachments,
        };
        const persisted = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.GROUP_MESSAGES, {});
        const currentMessages = persisted[groupId] || this.inMemoryMessages[groupId] || [];
        persisted[groupId] = [...currentMessages, newMessage];
        this.inMemoryMessages[groupId] = persisted[groupId];
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.GROUP_MESSAGES, persisted);
        // Update group's last message info
        const allGroups = await community_group_service_1.communityGroupService.getAllGroups();
        const group = allGroups.find((g) => g.id === groupId);
        if (group) {
            group.lastMessageAt = timestamp;
            group.lastMessagePreview = body.substring(0, 50) + (body.length > 50 ? '...' : '');
            group.updatedAt = timestamp;
            await community_group_service_1.communityGroupService.persistGroups();
        }
        // Simulate delivery after a delay
        setTimeout(() => this.updateMessageStatus(groupId, newMessage.id, 'delivered'), 500);
        return newMessage;
    }
    /**
     * Mark messages as read
     */
    async markMessagesRead(groupId, parentId) {
        const persisted = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.GROUP_MESSAGES, {});
        const messages = persisted[groupId] || this.inMemoryMessages[groupId] || [];
        const updated = messages.map((msg) => {
            if (!msg.readBy.includes(parentId)) {
                return { ...msg, readBy: [...msg.readBy, parentId] };
            }
            return msg;
        });
        persisted[groupId] = updated;
        this.inMemoryMessages[groupId] = updated;
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.GROUP_MESSAGES, persisted);
        // Clear unread count for this group
        const allGroups = await community_group_service_1.communityGroupService.getAllGroups();
        const group = allGroups.find((g) => g.id === groupId);
        if (group) {
            group.unreadCount = 0;
            await community_group_service_1.communityGroupService.persistGroups();
        }
    }
    async updateMessageStatus(groupId, messageId, status) {
        const persisted = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.GROUP_MESSAGES, {});
        const messages = persisted[groupId] || this.inMemoryMessages[groupId] || [];
        const updated = messages.map((msg) => msg.id === messageId ? { ...msg, status } : msg);
        persisted[groupId] = updated;
        this.inMemoryMessages[groupId] = updated;
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.GROUP_MESSAGES, persisted);
    }
}
exports.communityMessagingService = new CommunityMessagingService();
