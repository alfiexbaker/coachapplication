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

import { GroupMessage, ChatAttachment } from '@/constants/types';
import { generateId } from '@/utils/generate-id';
import { type Result, type ServiceError, ok, err, storageError, unauthorized } from '@/types/result';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { communityGroupService } from './community-group-service';
import { accountIdsMatch } from '@/utils/account-id';
import { normalizeLegacyMockDates } from '@/utils/mock-date-normalizer';
import { api } from '@/constants/config';
import { communityMediaAuthorityService, mergeById } from '../community-media-authority-service';
import { getLocalOverlayValue, setLocalOverlayValue } from '../local-overlay-store';

const logger = createLogger('CommunityMessagingService');
const USE_MOCK = api.useMock;

// Mock data for initial state
const mockMessages: Record<string, GroupMessage[]> = normalizeLegacyMockDates({
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
});

class CommunityMessagingService {
  private inMemoryMessages: Record<string, GroupMessage[]> = { ...mockMessages };

  private async loadPersistedMessages(): Promise<Record<string, GroupMessage[]>> {
    return getLocalOverlayValue<Record<string, GroupMessage[]>>(STORAGE_KEYS.GROUP_MESSAGES, {});
  }

  /**
   * Get messages for a group
   */
  async getGroupMessages(groupId: string): Promise<Result<GroupMessage[], ServiceError>> {
    try {
      if (!USE_MOCK) {
        const [authoritativeResult, persisted] = await Promise.all([
          communityMediaAuthorityService.listGroupMessages(groupId),
          this.loadPersistedMessages(),
        ]);
        if (!authoritativeResult.success) {
          return authoritativeResult;
        }

        const overlayMessages = persisted[groupId] || [];
        const messages = mergeById(authoritativeResult.data, overlayMessages);
        return ok(
          messages.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          ),
        );
      }

      const persisted = await this.loadPersistedMessages();
      const messages = persisted[groupId] || this.inMemoryMessages[groupId] || [];

      return ok(
        messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
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
    attachments?: ChatAttachment[],
  ): Promise<Result<GroupMessage, ServiceError>> {
    try {
      // S-37: Verify sender is a member of this group
      const groupResult = await communityGroupService.getGroup(groupId);
      if (groupResult.success) {
        const isMember = groupResult.data.members.some((m) =>
          accountIdsMatch(m.parentId, senderId),
        );
        if (!isMember) {
          logger.warn('Non-member attempted to send group message', { groupId, senderId });
          return err(unauthorized('You must be a member of this group to send messages'));
        }
      }

      const timestamp = new Date().toISOString();

      const newMessage: GroupMessage = {
        id: generateId('gmsg'),
        groupId,
        senderId,
        body,
        createdAt: timestamp,
        status: 'sent',
        readBy: [senderId],
        attachments,
      };

      const persisted = await this.loadPersistedMessages();
      const currentMessagesResult = await this.getGroupMessages(groupId);
      if (!currentMessagesResult.success) {
        return currentMessagesResult;
      }

      const currentMessages = currentMessagesResult.data;
      persisted[groupId] = [...currentMessages, newMessage];

      this.inMemoryMessages[groupId] = persisted[groupId];
      await setLocalOverlayValue(STORAGE_KEYS.GROUP_MESSAGES, persisted);

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
      const persisted = await this.loadPersistedMessages();
      const messagesResult = await this.getGroupMessages(groupId);
      if (!messagesResult.success) {
        return messagesResult;
      }

      const messages = messagesResult.data;

      const updated = messages.map((msg) => {
        if (!msg.readBy.some((readerId) => accountIdsMatch(readerId, parentId))) {
          return { ...msg, readBy: [...msg.readBy, parentId] };
        }
        return msg;
      });

      persisted[groupId] = updated;
      this.inMemoryMessages[groupId] = updated;
      await setLocalOverlayValue(STORAGE_KEYS.GROUP_MESSAGES, persisted);

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
    status: GroupMessage['status'],
  ): Promise<void> {
    const persisted = await this.loadPersistedMessages();
    const currentMessagesResult = await this.getGroupMessages(groupId);
    if (!currentMessagesResult.success) {
      return;
    }

    const messages = currentMessagesResult.data;

    const updated = messages.map((msg) => (msg.id === messageId ? { ...msg, status } : msg));

    persisted[groupId] = updated;
    this.inMemoryMessages[groupId] = updated;
    await setLocalOverlayValue(STORAGE_KEYS.GROUP_MESSAGES, persisted);
  }
}

export const communityMessagingService = new CommunityMessagingService();
