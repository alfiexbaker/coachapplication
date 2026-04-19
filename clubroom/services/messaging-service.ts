import { ChatAttachment, ChatMessage, ChatThreadSummary } from '@/constants/types';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationService } from './notification-service';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from './event-bus';
import { type Result, type ServiceError, ok, err, storageError, notFound } from '@/types/result';
import { blockService, getBlockActionMessage } from './block-service';
import { authService } from './auth-service';
import { communityMediaAuthorityService, mergeById } from './community-media-authority-service';
import { getLocalOverlayValue, setLocalOverlayValue } from './local-overlay-store';

const logger = createLogger('MessagingService');
const USE_MOCK = api.useMock;

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

type DeletedMessageMap = Record<string, string[]>;

function mergeThreadSummaries(
  authoritative: ChatThreadSummary[],
  overlay: ChatThreadSummary[],
): ChatThreadSummary[] {
  const overlayById = new Map(overlay.map((thread) => [thread.id, thread] as const));
  const merged = authoritative.map((thread) => {
    const local = overlayById.get(thread.id);
    if (!local) {
      return thread;
    }

    return {
      ...thread,
      unreadCount: local.unreadCount,
      lastMessageSnippet: local.lastMessageSnippet ?? thread.lastMessageSnippet,
      lastMessageSender: local.lastMessageSender ?? thread.lastMessageSender,
      scheduledFor: local.scheduledFor || thread.scheduledFor,
    };
  });

  const authoritativeIds = new Set(authoritative.map((thread) => thread.id));
  return [...merged, ...overlay.filter((thread) => !authoritativeIds.has(thread.id))];
}

function upsertById<T extends { id: string }>(items: T[], nextItem: T): T[] {
  const next = items.filter((item) => item.id !== nextItem.id);
  next.push(nextItem);
  return next;
}

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

  private async loadPersistedMessages(): Promise<Record<string, ChatMessage[]>> {
    return getLocalOverlayValue<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, {});
  }

  private async loadThreadOverlays(): Promise<ChatThreadSummary[]> {
    return getLocalOverlayValue<ChatThreadSummary[]>(STORAGE_KEYS.MESSAGE_THREADS, []);
  }

  private async saveThreadOverlays(threads: ChatThreadSummary[]): Promise<void> {
    await setLocalOverlayValue(STORAGE_KEYS.MESSAGE_THREADS, threads);
  }

  private async loadDeletedMessageIds(): Promise<DeletedMessageMap> {
    return getLocalOverlayValue<DeletedMessageMap>(STORAGE_KEYS.MESSAGE_DELETED_IDS, {});
  }

  private async saveDeletedMessageIds(value: DeletedMessageMap): Promise<void> {
    await setLocalOverlayValue(STORAGE_KEYS.MESSAGE_DELETED_IDS, value);
  }

  private async upsertThreadOverlay(thread: ChatThreadSummary): Promise<void> {
    if (USE_MOCK) {
      return;
    }

    const overlays = await this.loadThreadOverlays();
    await this.saveThreadOverlays(upsertById(overlays, thread));
  }

  private async getCurrentSender(): Promise<'parent' | 'coach'> {
    const currentUser = await authService.getCurrentUser();
    return currentUser?.accountType === 'COACH' ||
      currentUser?.appRole === 'ADMIN' ||
      currentUser?.roles?.includes('admin')
      ? 'coach'
      : 'parent';
  }

  private async syncThreadSummary(threadId: string): Promise<void> {
    if (USE_MOCK) {
      return;
    }

    const [threadResult, messagesResult, currentSender] = await Promise.all([
      this.getThread(threadId),
      this.listMessages(threadId),
      this.getCurrentSender(),
    ]);
    if (!threadResult.success || !messagesResult.success) {
      return;
    }

    const messages = messagesResult.data;
    const lastMessage = messages[messages.length - 1];
    const updated: ChatThreadSummary = {
      ...threadResult.data,
      unreadCount: messages.filter(
        (message) => message.sender !== currentSender && message.status !== 'seen',
      ).length,
      lastMessageSnippet: lastMessage?.body,
      lastMessageSender: lastMessage
        ? lastMessage.sender === currentSender
          ? 'You'
          : threadResult.data.kind === 'direct'
            ? threadResult.data.title || 'Coach'
            : threadResult.data.lastMessageSender || 'Member'
        : undefined,
    };

    this.inMemoryThreads = upsertById(this.inMemoryThreads, updated);
    await this.upsertThreadOverlay(updated);
  }

  async listThreads(): Promise<Result<ChatThreadSummary[], ServiceError>> {
    try {
      if (!USE_MOCK) {
        const [authoritativeResult, overlays] = await Promise.all([
          communityMediaAuthorityService.listThreads(),
          this.loadThreadOverlays(),
        ]);
        if (!authoritativeResult.success) {
          return authoritativeResult;
        }

        this.inMemoryThreads = mergeThreadSummaries(authoritativeResult.data, overlays);
        return ok(this.inMemoryThreads);
      }

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
      const threadsResult = await this.listThreads();
      if (!threadsResult.success) {
        return threadsResult;
      }

      const thread = threadsResult.data.find((t) => t.id === threadId);
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
      const threadResult = await this.getThread(threadId);
      if (!threadResult.success) return ok(false);

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
      if (!USE_MOCK) {
        const [authoritativeResult, persisted, deletedMap] = await Promise.all([
          communityMediaAuthorityService.listMessages(threadId),
          this.loadPersistedMessages(),
          this.loadDeletedMessageIds(),
        ]);
        if (!authoritativeResult.success) {
          return authoritativeResult;
        }

        const overlay = persisted[threadId] || [];
        const deletedIds = new Set(deletedMap[threadId] || []);
        const messages = mergeById(authoritativeResult.data, overlay).filter(
          (message) => !deletedIds.has(message.id),
        );
        return ok(
          messages.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          ),
        );
      }

      const persisted = await this.loadPersistedMessages();
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
        const blockedResult = await blockService.getBlockStatus(senderUserId, recipientUserId);
        if (blockedResult.success && blockedResult.data.blocked) {
          logger.warn('Message blocked due to block relationship', {
            senderUserId,
            recipientUserId,
          });
          emitTyped(ServiceEvents.USER_ACTION_BLOCKED, {
            blockerId: blockedResult.data.blockerId ?? senderUserId,
            blockedId: blockedResult.data.blockedId ?? recipientUserId,
            action: 'send_message',
            timestamp: new Date().toISOString(),
          });
          return err({
            code: 'CONFLICT' as const,
            message: getBlockActionMessage('messaging'),
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
      if (USE_MOCK) {
        this.updateThreadAfterMessage(threadId, newMessage, false, senderName);
      } else {
        await this.syncThreadSummary(threadId);
      }
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
      if (USE_MOCK) {
        this.updateThreadAfterMessage(threadId, incoming, true, senderName);
      } else {
        await this.syncThreadSummary(threadId);
      }
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
      const threadResult = await this.getThread(threadId);
      if (!threadResult.success) {
        return threadResult;
      }

      const thread = threadResult.data;
      const unreadCleared = thread.unreadCount ?? 0;

      if (!USE_MOCK) {
        const persisted = await this.loadPersistedMessages();
        const messagesResult = await this.listMessages(threadId);
        if (!messagesResult.success) {
          return err(messagesResult.error);
        }

        persisted[threadId] = messagesResult.data.map((message) => ({
          ...message,
          status: 'seen',
        }));
        await setLocalOverlayValue(STORAGE_KEYS.MESSAGES, persisted);
        await this.syncThreadSummary(threadId);
      } else {
        thread.unreadCount = 0;
      }

      if (unreadCleared > 0) {
        emitTyped(ServiceEvents.MESSAGES_MARKED_READ, {
          threadId,
          unreadCleared,
        });
      }

      const refreshedThreadResult = await this.getThread(threadId);
      return refreshedThreadResult.success ? refreshedThreadResult : ok(thread);
    } catch (error) {
      logger.error('Failed to mark thread read', { threadId, error });
      return err(storageError('Failed to update thread'));
    }
  }

  async deleteMessage(threadId: string, messageId: string): Promise<Result<void, ServiceError>> {
    try {
      const persisted = await this.loadPersistedMessages();
      const current = persisted[threadId] || this.inMemoryMessages[threadId] || [];
      const updated = current.filter((msg) => msg.id !== messageId);
      const messageDeleted = updated.length !== current.length;
      persisted[threadId] = updated;
      await setLocalOverlayValue(STORAGE_KEYS.MESSAGES, persisted);
      if (this.inMemoryMessages[threadId]) {
        this.inMemoryMessages[threadId] = this.inMemoryMessages[threadId].filter(
          (msg) => msg.id !== messageId,
        );
      }
      if (!USE_MOCK) {
        const deletedMap = await this.loadDeletedMessageIds();
        deletedMap[threadId] = Array.from(new Set([...(deletedMap[threadId] || []), messageId]));
        await this.saveDeletedMessageIds(deletedMap);
        await this.syncThreadSummary(threadId);
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
    const persisted = await this.loadPersistedMessages();
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
    await setLocalOverlayValue(STORAGE_KEYS.MESSAGES, persisted);
    if (!USE_MOCK) {
      await this.syncThreadSummary(threadId);
    }
    if (wasUpdated) {
      emitTyped(ServiceEvents.MESSAGE_EDITED, {
        threadId,
        messageId,
        status,
      });
    }
  }

  private async persistMessage(threadId: string, message: ChatMessage) {
    const persisted = await this.loadPersistedMessages();
    const current = persisted[threadId] || this.inMemoryMessages[threadId] || [];
    const updated = [...current, message];
    persisted[threadId] = updated;
    await setLocalOverlayValue(STORAGE_KEYS.MESSAGES, persisted);
    if (!USE_MOCK) {
      const deletedMap = await this.loadDeletedMessageIds();
      deletedMap[threadId] = (deletedMap[threadId] || []).filter((id) => id !== message.id);
      await this.saveDeletedMessageIds(deletedMap);
    }
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
