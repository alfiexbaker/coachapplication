import { chatThreads, chatMessages } from '@/constants/mock-data';
import { ChatMessage, ChatThreadSummary } from '@/constants/types';
import { storageService } from './storage-service';
import { notificationService } from './notification-service';

const STORAGE_KEY = 'clubroom.messages';

export class MessagingService {
  private inMemoryThreads: ChatThreadSummary[] = chatThreads;
  private inMemoryMessages: Record<string, ChatMessage[]> = {};

  constructor() {
    chatThreads.forEach((thread) => {
      this.inMemoryMessages[thread.id] = chatMessages.filter((m) => m.threadId === thread.id);
    });
  }

  async listThreads(): Promise<ChatThreadSummary[]> {
    return this.inMemoryThreads;
  }

  async getThread(threadId: string): Promise<ChatThreadSummary | undefined> {
    return this.inMemoryThreads.find((t) => t.id === threadId);
  }

  async listMessages(threadId: string): Promise<ChatMessage[]> {
    const persisted = await storageService.getItem<Record<string, ChatMessage[]>>(STORAGE_KEY, {});
    const messages = persisted[threadId] || this.inMemoryMessages[threadId] || [];
    return messages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  async sendMessage(
    threadId: string,
    body: string,
    sender: 'parent' | 'coach',
    senderName?: string,
    attachments: any[] = [],
  ) {
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

    // Notify the recipient
    const thread = await this.getThread(threadId);
    if (thread) {
      if (sender === 'parent') {
        // Parent sent message, notify coach
        await notificationService.notifyCoachNewMessage({
          coachId: 'coach_1', // In production, get from thread
          parentName: senderName || thread.coachName || 'Parent',
          threadId,
        });
      } else {
        // Coach sent message, notify parent
        await notificationService.notifyParentNewMessage({
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

  async simulateIncoming(threadId: string, body: string, senderName?: string) {
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

    // Notify parent of incoming message
    const thread = await this.getThread(threadId);
    await notificationService.notifyParentNewMessage({
      parentId: 'parent_1',
      coachName: senderName || thread?.coachName || 'Coach',
      threadId,
    });

    return incoming;
  }

  async markThreadRead(threadId: string) {
    const thread = this.inMemoryThreads.find((t) => t.id === threadId);
    if (thread) {
      thread.unreadCount = 0;
    }
    return thread;
  }

  private async updateStatus(threadId: string, messageId: string, status: ChatMessage['status']) {
    const persisted = await storageService.getItem<Record<string, ChatMessage[]>>(STORAGE_KEY, {});
    const current = persisted[threadId] || this.inMemoryMessages[threadId] || [];
    const updated = current.map((msg) => (msg.id === messageId ? { ...msg, status } : msg));
    persisted[threadId] = updated;
    await storageService.setItem(STORAGE_KEY, persisted);
  }

  private async persistMessage(threadId: string, message: ChatMessage) {
    const persisted = await storageService.getItem<Record<string, ChatMessage[]>>(STORAGE_KEY, {});
    const current = persisted[threadId] || this.inMemoryMessages[threadId] || [];
    const updated = [...current, message];
    persisted[threadId] = updated;
    await storageService.setItem(STORAGE_KEY, persisted);
  }
}

export const messagingService = new MessagingService();
