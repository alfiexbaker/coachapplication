/**
 * Community Messaging Service
 *
 * Handles group messaging: sending messages, reading messages,
 * marking as read, and message status updates.
 *
 * API Integration Notes:
 * - Messages are persisted via apiClient (AsyncStorage in dev, API in prod)
 * - Group metadata (lastMessageAt, unreadCount) is updated on message events
 */

import {
  ParentGroup,
  GroupMessage,
  ChatAttachment,
} from '@/constants/types';
import { apiClient } from '../api-client';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { communityGroupService } from './community-group-service';
import { accountIdsMatch } from '@/utils/account-id';

const logger = createLogger('CommunityMessagingService');

// Mock data for initial state
const mockMessages: Record<string, GroupMessage[]> = {
  group_1: [
    {
      id: 'msg_1',
      groupId: 'group_1',
      senderId: 'parent1',
      body: 'Hi everyone! Looking forward to the new season.',
      createdAt: '2024-01-19T10:00:00Z',
      status: 'seen',
      readBy: ['parent1', 'parent2'],
    },
    {
      id: 'msg_2',
      groupId: 'group_1',
      senderId: 'parent2',
      body: 'Same here! Has anyone got the training schedule?',
      createdAt: '2024-01-19T10:05:00Z',
      status: 'seen',
      readBy: ['parent1', 'parent2'],
    },
    {
      id: 'msg_3',
      groupId: 'group_1',
      senderId: 'parent1',
      body: 'See you all at training!',
      createdAt: '2024-01-20T14:30:00Z',
      status: 'delivered',
      readBy: ['parent1'],
    },
  ],
};

class CommunityMessagingService {
  private inMemoryMessages: Record<string, GroupMessage[]> = { ...mockMessages };

  /**
   * Get messages for a group
   */
  async getGroupMessages(groupId: string): Promise<Result<GroupMessage[], ServiceError>> {
    try {
      const persisted = await apiClient.get<Record<string, GroupMessage[]>>(
        STORAGE_KEYS.GROUP_MESSAGES,
        {}
      );
      const messages = persisted[groupId] || this.inMemoryMessages[groupId] || [];

      return ok(
        messages.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      );
    } catch (error) {
      logger.error('Failed to get group messages', error);
      return err(storageError(`Failed to get group messages: ${String(error)}`));
    }
  }

  /**
   * Send a message to a group
   */
  async sendGroupMessage(
    groupId: string,
    senderId: string,
    _senderName: string,
    body: string,
    _senderAvatar?: string,
    attachments?: ChatAttachment[]
  ): Promise<Result<GroupMessage, ServiceError>> {
    try {
      const timestamp = new Date().toISOString();

      const newMessage: GroupMessage = {
        id: `gmsg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        groupId,
        senderId,
        body,
        createdAt: timestamp,
        status: 'sent',
        readBy: [senderId],
        attachments,
      };

      const persisted = await apiClient.get<Record<string, GroupMessage[]>>(
        STORAGE_KEYS.GROUP_MESSAGES,
        {}
      );
      const currentMessages = persisted[groupId] || this.inMemoryMessages[groupId] || [];
      persisted[groupId] = [...currentMessages, newMessage];

      this.inMemoryMessages[groupId] = persisted[groupId];
      await apiClient.set(STORAGE_KEYS.GROUP_MESSAGES, persisted);

      // Update group's last message info
      const allGroupsResult = await communityGroupService.getAllGroups();
      if (allGroupsResult.success) {
        const group = allGroupsResult.data.find((g) => g.id === groupId);
        if (group) {
          group.lastMessageAt = timestamp;
          group.lastMessagePreview = body.substring(0, 50) + (body.length > 50 ? '...' : '');
          group.updatedAt = timestamp;
          await communityGroupService.persistGroups();
        }
      }

      // Simulate delivery after a delay
      setTimeout(() => this.updateMessageStatus(groupId, newMessage.id, 'delivered'), 500);

      return ok(newMessage);
    } catch (error) {
      logger.error('Failed to send group message', error);
      return err(storageError(`Failed to send group message: ${String(error)}`));
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesRead(groupId: string, parentId: string): Promise<Result<void, ServiceError>> {
    try {
      const persisted = await apiClient.get<Record<string, GroupMessage[]>>(
        STORAGE_KEYS.GROUP_MESSAGES,
        {}
      );
      const messages = persisted[groupId] || this.inMemoryMessages[groupId] || [];

      const updated = messages.map((msg) => {
        if (!msg.readBy.some((readerId) => accountIdsMatch(readerId, parentId))) {
          return { ...msg, readBy: [...msg.readBy, parentId] };
        }
        return msg;
      });

      persisted[groupId] = updated;
      this.inMemoryMessages[groupId] = updated;
      await apiClient.set(STORAGE_KEYS.GROUP_MESSAGES, persisted);

      // Clear unread count for this group
      const allGroupsResult = await communityGroupService.getAllGroups();
      if (allGroupsResult.success) {
        const group = allGroupsResult.data.find((g) => g.id === groupId);
        if (group) {
          group.unreadCount = 0;
          await communityGroupService.persistGroups();
        }
      }

      return ok(undefined);
    } catch (error) {
      logger.error('Failed to mark messages read', error);
      return err(storageError(`Failed to mark messages read: ${String(error)}`));
    }
  }

  private async updateMessageStatus(
    groupId: string,
    messageId: string,
    status: GroupMessage['status']
  ): Promise<void> {
    const persisted = await apiClient.get<Record<string, GroupMessage[]>>(
      STORAGE_KEYS.GROUP_MESSAGES,
      {}
    );
    const messages = persisted[groupId] || this.inMemoryMessages[groupId] || [];

    const updated = messages.map((msg) =>
      msg.id === messageId ? { ...msg, status } : msg
    );

    persisted[groupId] = updated;
    this.inMemoryMessages[groupId] = updated;
    await apiClient.set(STORAGE_KEYS.GROUP_MESSAGES, persisted);
  }
}

export const communityMessagingService = new CommunityMessagingService();
