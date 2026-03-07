import { ChatAttachment, ChatMessage, ChatThreadSummary } from '@/constants/types';
import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationService } from './notification-service';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from './event-bus';
import { type Result, type ServiceError, ok, err, storageError, notFound } from '@/types/result';
import { blockService } from './block-service';

const logger = createLogger('MessagingService');

const DEFAULT_THREADS: ChatThreadSummary[] = [
  {
    id: 'thread_tom_coach1',
    kind: 'direct',
    counterpartyUserId: 'coach1',
    bookingId: 'book1',
    title: 'Jess Okafor',
    subtitle: 'Alfie Barton',
    serviceName: '1-to-1 Training',
    location: 'Hyde Park',
    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 1,
    safetyCopy: 'Report inappropriate messages via the menu',
    pinnedObjectives: ['Finishing', 'Passing'],
    lastMessageSnippet: 'See you tomorrow at 5pm.',
    lastMessageSender: 'Jess Okafor',
  },
  {
    id: 'thread_emma_coach2',
    kind: 'direct',
    counterpartyUserId: 'coach2',
    bookingId: 'book2',
    title: 'Reuben Carr',
    subtitle: 'Maisie Barton',
    serviceName: 'Small Group Session',
    location: 'Hackney Marshes',
    scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    safetyCopy: 'Report inappropriate messages via the menu',
    pinnedObjectives: ['Dribbling'],
    lastMessageSnippet: 'Brilliant energy today.',
    lastMessageSender: 'Reuben Carr',
  },
];

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_thread_tom_1',
    threadId: 'thread_tom_coach1',
    sender: 'coach',
    body: 'Great effort today. Keep practicing your first touch.',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: 'seen',
  },
  {
    id: 'msg_thread_tom_2',
    threadId: 'thread_tom_coach1',
    sender: 'parent',
    body: 'Thanks coach, we will work on that this evening.',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: 'seen',
  },
  {
    id: 'msg_thread_emma_1',
    threadId: 'thread_emma_coach2',
    sender: 'coach',
    body: 'Brilliant energy today. Maisie is improving each week.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'delivered',
  },
];

/** Allowed attachment types matching ChatAttachment['type'] */
const ALLOWED_ATTACHMENT_TYPES: ReadonlyArray<ChatAttachment['type']> = [
  'photo',
  'video',
  'pdf',
];

const MAX_ATTACHMENTS_PER_MESSAGE = 5;

export class MessagingService {
  private inMemoryThreads: ChatThreadSummary[] = DEFAULT_THREADS.map((thread) => ({ ...thread }));
  private inMemoryMessages: Record<string, ChatMessage[]> = {};

  constructor() {
    this.inMemoryThreads.forEach((thread) => {
      this.inMemoryMessages[thread.id] = DEFAULT_MESSAGES.filter(
        (message) => message.threadId === thread.id,
      );
    });
  }

  async listThreads(): Promise<Result<ChatThreadSummary[], ServiceError>> {
    try {
      return ok(this.inMemoryThreads);
    } catch (error) {
      logger.error('Failed to list threads', error);
      return err(storageError('Failed to list threads'));
    }
  }

  async getUnreadCount(): Promise<Result<number, ServiceError>> {
    const threadResult = await this.listThreads();
    if (!threadResult.success) return err(threadResult.error);
    const count = threadResult.data.reduce((total, thread) => total + (thread.unreadCount ?? 0), 0);
    return ok(count);
  }

  async getThread(threadId: string): Promise<Result<ChatThreadSummary, ServiceError>> {
    try {
      const thread = this.inMemoryThreads.find((t) => t.id === threadId);
      if (!thread) {
        return err(notFound('Thread', threadId));
      }
      return ok(thread);
    } catch (error) {
      logger.error('Failed to get thread', { threadId, error });
      return err(storageError('Failed to load thread'));
    }
  }

  /**
   * Check if a co-guardian has visibility into a thread.
   * API Integration: GET /api/messages/threads/:threadId/access?userId=:userId
   *
   * S-34: Co-guardians linked to the same child can view message history
   * for sessions involving that child.
   */
  async checkCoGuardianAccess(
    threadId: string,
    userId: string,
    linkedChildIds: string[],
  ): Promise<Result<boolean, ServiceError>> {
    try {
      const thread = this.inMemoryThreads.find((t) => t.id === threadId);
      if (!thread) return ok(false);

      // Check if the thread's subtitle (child name) matches any linked child
      // In production, this would check the thread's associated childId
      const hasAccess = linkedChildIds.length > 0;
      return ok(hasAccess);
    } catch (error) {
      logger.error('Failed to check co-guardian access', { threadId, userId, error });
      return err(storageError('Failed to check co-guardian access'));
    }
  }

  async listMessages(threadId: string): Promise<Result<ChatMessage[], ServiceError>> {
    try {
      const persisted = await apiClient.get<Record<string, ChatMessage[]>>(
        STORAGE_KEYS.MESSAGES,
        {},
      );
      const messages = persisted[threadId] || this.inMemoryMessages[threadId] || [];
      return ok(
        messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      );
    } catch (error) {
      logger.error('Failed to list messages', { threadId, error });
      return err(storageError('Failed to load messages'));
    }
  }

  /**
   * Validate a message attachment (type whitelist).
   * API Integration: POST /api/messages/validate-attachment
   */
  validateAttachment(attachment: ChatAttachment): Result<boolean, ServiceError> {
    if (attachment.type && !ALLOWED_ATTACHMENT_TYPES.includes(attachment.type)) {
      logger.warn('Invalid attachment type rejected', {
        type: attachment.type,
        title: attachment.title,
      });
      return err({
        code: 'VALIDATION' as const,
        message: 'File type not allowed. Supported: photos, videos, PDFs',
      });
    }

    return ok(true);
  }

  async sendMessage(
    threadId: string,
    body: string,
    sender: 'parent' | 'coach',
    senderName?: string,
    attachments: ChatAttachment[] = [],
    senderUserId?: string,
    recipientUserId?: string,
  ): Promise<Result<ChatMessage, ServiceError>> {
    try {
      // Validate attachments
      if (attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
        return err({
          code: 'VALIDATION' as const,
          message: `Maximum ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message`,
        });
      }

      for (const attachment of attachments) {
        const validationResult = this.validateAttachment(attachment);
        if (!validationResult.success) {
          return err(validationResult.error);
        }
      }

      // Check if users have blocked each other
      if (senderUserId && recipientUserId) {
        const blockedResult = await blockService.isBlocked(senderUserId, recipientUserId);
        if (blockedResult.success && blockedResult.data) {
          logger.warn('Message blocked due to block relationship', {
            senderUserId,
            recipientUserId,
          });
          emitTyped(ServiceEvents.USER_ACTION_BLOCKED, {
            blockerId: senderUserId,
            blockedId: recipientUserId,
            action: 'send_message',
            timestamp: new Date().toISOString(),
          });
          return err({
            code: 'CONFLICT' as const,
            message: 'Cannot send message to this user',
          });
        }
      }

      const timestamp = new Date().toISOString();
      const newMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        threadId,
        sender,
        body,
        createdAt: timestamp,
        status: 'pending',
        attachments,
      };

      await this.persistMessage(threadId, newMessage);
      this.updateThreadAfterMessage(threadId, newMessage, false, senderName);
      emitTyped(ServiceEvents.MESSAGE_SENT, {
        threadId,
        messageId: newMessage.id,
        sender: newMessage.sender,
        senderName,
        attachmentsCount: attachments.length,
        createdAt: newMessage.createdAt,
      });

      // Notify the recipient
      const threadResult = await this.getThread(threadId);
      if (threadResult.success) {
        if (sender === 'parent') {
          await notificationService.notifyCoachNewMessage({
            coachId: 'coach1',
            parentName: senderName || 'Parent',
            threadId,
          });
        } else {
          await notificationService.notifyParentNewMessage({
            parentId: 'parent_1',
            coachName: senderName || threadResult.data.title || 'Coach',
            threadId,
          });
        }
      }

      setTimeout(() => this.updateStatus(threadId, newMessage.id, 'sent'), 500);
      setTimeout(() => this.updateStatus(threadId, newMessage.id, 'delivered'), 1000);
      setTimeout(() => this.updateStatus(threadId, newMessage.id, 'seen'), 1500);
      return ok(newMessage);
    } catch (error) {
      logger.error('Failed to send message', { threadId, error });
      return err(storageError('Failed to send message'));
    }
  }

  async simulateIncoming(
    threadId: string,
    body: string,
    senderName?: string,
  ): Promise<Result<ChatMessage, ServiceError>> {
    try {
      const timestamp = new Date().toISOString();
      const incoming: ChatMessage = {
        id: `msg_${Date.now()}_coach`,
        threadId,
        sender: 'coach',
        body,
        createdAt: timestamp,
        status: 'delivered',
      };
      await this.persistMessage(threadId, incoming);
      this.updateThreadAfterMessage(threadId, incoming, true, senderName);
      emitTyped(ServiceEvents.MESSAGE_SENT, {
        threadId,
        messageId: incoming.id,
        sender: incoming.sender,
        senderName,
        attachmentsCount: 0,
        createdAt: incoming.createdAt,
      });

      const threadResult = await this.getThread(threadId);
      await notificationService.notifyParentNewMessage({
        parentId: 'parent_1',
        coachName:
          senderName || (threadResult.success ? threadResult.data.title : undefined) || 'Coach',
        threadId,
      });

      return ok(incoming);
    } catch (error) {
      logger.error('Failed to simulate incoming message', { threadId, error });
      return err(storageError('Failed to receive message'));
    }
  }

  async markThreadRead(threadId: string): Promise<Result<ChatThreadSummary, ServiceError>> {
    try {
      const thread = this.inMemoryThreads.find((t) => t.id === threadId);
      if (!thread) {
        return err(notFound('Thread', threadId));
      }
      const unreadCleared = thread.unreadCount ?? 0;
      thread.unreadCount = 0;
      if (unreadCleared > 0) {
        emitTyped(ServiceEvents.MESSAGES_MARKED_READ, {
          threadId,
          unreadCleared,
        });
      }
      return ok(thread);
    } catch (error) {
      logger.error('Failed to mark thread read', { threadId, error });
      return err(storageError('Failed to update thread'));
    }
  }

  async deleteMessage(threadId: string, messageId: string): Promise<Result<void, ServiceError>> {
    try {
      const persisted = await apiClient.get<Record<string, ChatMessage[]>>(
        STORAGE_KEYS.MESSAGES,
        {},
      );
      const current = persisted[threadId] || this.inMemoryMessages[threadId] || [];
      const updated = current.filter((msg) => msg.id !== messageId);
      const messageDeleted = updated.length !== current.length;
      persisted[threadId] = updated;
      await apiClient.set(STORAGE_KEYS.MESSAGES, persisted);
      if (this.inMemoryMessages[threadId]) {
        this.inMemoryMessages[threadId] = this.inMemoryMessages[threadId].filter(
          (msg) => msg.id !== messageId,
        );
      }
      if (messageDeleted) {
        emitTyped(ServiceEvents.MESSAGE_DELETED, {
          threadId,
          messageId,
        });
      }
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to delete message', { threadId, messageId, error });
      return err(storageError('Failed to delete message'));
    }
  }

  private async updateStatus(threadId: string, messageId: string, status: ChatMessage['status']) {
    const persisted = await apiClient.get<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, {});
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
    await apiClient.set(STORAGE_KEYS.MESSAGES, persisted);
    if (wasUpdated) {
      emitTyped(ServiceEvents.MESSAGE_EDITED, {
        threadId,
        messageId,
        status,
      });
    }
  }

  private async persistMessage(threadId: string, message: ChatMessage) {
    const persisted = await apiClient.get<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, {});
    const current = persisted[threadId] || this.inMemoryMessages[threadId] || [];
    const updated = [...current, message];
    persisted[threadId] = updated;
    await apiClient.set(STORAGE_KEYS.MESSAGES, persisted);
  }

  private updateThreadAfterMessage(
    threadId: string,
    message: ChatMessage,
    incrementUnread: boolean,
    senderName?: string,
  ) {
    const thread = this.inMemoryThreads.find((candidate) => candidate.id === threadId);
    if (!thread) return;

    thread.lastMessageSnippet = message.body;
    thread.lastMessageSender =
      senderName || (message.sender === 'coach' ? 'Coach' : 'You');
    thread.scheduledFor = thread.scheduledFor || message.createdAt;
    if (incrementUnread) {
      thread.unreadCount = (thread.unreadCount ?? 0) + 1;
    }
  }
}

export const messagingService = new MessagingService();
