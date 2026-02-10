import { ChatAttachment, ChatMessage, ChatThreadSummary } from '@/constants/types';
import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationService } from './notification-service';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from './event-bus';
import { type Result, type ServiceError, ok, err, storageError, notFound } from '@/types/result';

const logger = createLogger('MessagingService');

const DEFAULT_THREADS: ChatThreadSummary[] = [
  {
    id: 'thread_tom_coach1',
    kind: 'direct',
    bookingId: 'book1',
    coachName: 'Sarah Mitchell',
    childName: 'Tom Henderson',
    serviceName: '1-to-1 Training',
    location: 'Hyde Park',
    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 1,
    safetyCopy: 'All conversations are monitored for safety',
    pinnedObjectives: ['Finishing', 'Passing'],
    lastMessageSnippet: 'See you tomorrow at 5pm.',
    lastMessageSender: 'Sarah Mitchell',
  },
  {
    id: 'thread_emma_coach2',
    kind: 'direct',
    bookingId: 'book2',
    coachName: 'Mike Thompson',
    childName: 'Emma Henderson',
    serviceName: 'Small Group Session',
    location: 'Hackney Marshes',
    scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    safetyCopy: 'All conversations are monitored for safety',
    pinnedObjectives: ['Dribbling'],
    lastMessageSnippet: 'Brilliant energy today.',
    lastMessageSender: 'Mike Thompson',
  },
];

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_thread_tom_1',
    threadId: 'thread_tom_coach1',
    sender: 'coach',
    senderName: 'Sarah Mitchell',
    body: 'Great effort today. Keep practicing your first touch.',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: 'seen',
  },
  {
    id: 'msg_thread_tom_2',
    threadId: 'thread_tom_coach1',
    sender: 'parent',
    senderName: 'John Henderson',
    body: 'Thanks coach, we will work on that this evening.',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: 'seen',
  },
  {
    id: 'msg_thread_emma_1',
    threadId: 'thread_emma_coach2',
    sender: 'coach',
    senderName: 'Mike Thompson',
    body: 'Brilliant energy today. Emma is improving each week.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'delivered',
  },
];

export class MessagingService {
  private inMemoryThreads: ChatThreadSummary[] = DEFAULT_THREADS.map((thread) => ({ ...thread }));
  private inMemoryMessages: Record<string, ChatMessage[]> = {};

  constructor() {
    this.inMemoryThreads.forEach((thread) => {
      this.inMemoryMessages[thread.id] = DEFAULT_MESSAGES.filter((message) => message.threadId === thread.id);
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

  async listMessages(threadId: string): Promise<Result<ChatMessage[], ServiceError>> {
    try {
      const persisted = await apiClient.get<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, {});
      const messages = persisted[threadId] || this.inMemoryMessages[threadId] || [];
      return ok(
        messages.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
    } catch (error) {
      logger.error('Failed to list messages', { threadId, error });
      return err(storageError('Failed to load messages'));
    }
  }

  async sendMessage(
    threadId: string,
    body: string,
    sender: 'parent' | 'coach',
    senderName?: string,
    attachments: ChatAttachment[] = [],
  ): Promise<Result<ChatMessage, ServiceError>> {
    try {
      const timestamp = new Date().toISOString();
      const newMessage: ChatMessage = {
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
      emitTyped(ServiceEvents.MESSAGE_SENT, {
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
          await notificationService.notifyCoachNewMessage({
            coachId: 'coach1',
            parentName: senderName || threadResult.data.coachName || 'Parent',
            threadId,
          });
        } else {
          await notificationService.notifyParentNewMessage({
            parentId: 'parent_1',
            coachName: senderName || threadResult.data.coachName || 'Coach',
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
        senderName,
        body,
        createdAt: timestamp,
        status: 'delivered',
      };
      await this.persistMessage(threadId, incoming);
      emitTyped(ServiceEvents.MESSAGE_SENT, {
        threadId,
        messageId: incoming.id,
        sender: incoming.sender,
        senderName: incoming.senderName,
        attachmentsCount: 0,
        createdAt: incoming.createdAt,
      });

      const threadResult = await this.getThread(threadId);
      await notificationService.notifyParentNewMessage({
        parentId: 'parent_1',
        coachName: senderName || (threadResult.success ? threadResult.data.coachName : undefined) || 'Coach',
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
      thread.unreadCount = 0;
      return ok(thread);
    } catch (error) {
      logger.error('Failed to mark thread read', { threadId, error });
      return err(storageError('Failed to update thread'));
    }
  }

  async deleteMessage(threadId: string, messageId: string): Promise<Result<void, ServiceError>> {
    try {
      const persisted = await apiClient.get<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, {});
      const current = persisted[threadId] || this.inMemoryMessages[threadId] || [];
      const updated = current.filter((msg) => msg.id !== messageId);
      const messageDeleted = updated.length !== current.length;
      persisted[threadId] = updated;
      await apiClient.set(STORAGE_KEYS.MESSAGES, persisted);
      if (this.inMemoryMessages[threadId]) {
        this.inMemoryMessages[threadId] = this.inMemoryMessages[threadId].filter((msg) => msg.id !== messageId);
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
}

export const messagingService = new MessagingService();
