import { ChatMessage, ChatThreadSummary, ChatSender } from '@/constants/types';
import { storageService } from './storage-service';
import { notificationService } from './notification-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MessagingService');

// Storage keys
const THREADS_KEY = (userId: string) => `@threads_${userId}`;
const MESSAGES_KEY = (threadId: string) => `@messages_${threadId}`;
const ALL_THREADS_KEY = '@all_threads';

export interface Participant {
  id: string;
  name: string;
  role: 'coach' | 'parent' | 'admin';
  avatarUrl?: string;
}

export interface ThreadCreateParams {
  participants: Participant[];
  clubId?: string;
  clubName?: string;
  kind?: 'direct' | 'group';
  groupType?: 'club' | 'squad' | 'class' | 'announcement';
  title?: string;
  subtitle?: string;
}

export class MessagingService {
  // ============================================================================
  // THREAD MANAGEMENT
  // ============================================================================

  /**
   * Create or find an existing thread between participants
   */
  async createThread(params: ThreadCreateParams): Promise<ChatThreadSummary> {
    const { participants, clubId, kind = 'direct', groupType, title, subtitle } = params;

    // For direct messages, check if thread already exists between these two users
    if (kind === 'direct' && participants.length === 2) {
      const existingThread = await this.findDirectThread(participants[0].id, participants[1].id);
      if (existingThread) {
        logger.info('thread_found_existing', { threadId: existingThread.id });
        return existingThread;
      }
    }

    // For group threads, check by clubId
    if (kind === 'group' && clubId) {
      const existingGroupThread = await this.findGroupThread(clubId, groupType);
      if (existingGroupThread) {
        logger.info('group_thread_found_existing', { threadId: existingGroupThread.id });
        return existingGroupThread;
      }
    }

    // Create new thread
    const threadId = kind === 'group' && clubId
      ? `group_${clubId}_${groupType || 'club'}_${Date.now()}`
      : `dm_${participants.map(p => p.id).sort().join('_')}_${Date.now()}`;

    const coach = participants.find(p => p.role === 'coach');
    const parent = participants.find(p => p.role === 'parent');

    const newThread: ChatThreadSummary = {
      id: threadId,
      kind,
      groupType: kind === 'group' ? groupType : undefined,
      bookingId: threadId,
      coachName: coach?.name || participants[0]?.name || 'Unknown',
      childName: parent?.name || participants[1]?.name || 'Unknown',
      serviceName: kind === 'group' ? (params.clubName || 'Group Chat') : 'Direct Message',
      location: '',
      scheduledFor: new Date().toISOString(),
      unreadCount: 0,
      unreadMentions: 0,
      memberCount: participants.length,
      title: title || (kind === 'direct'
        ? `${coach?.name || 'Coach'} & ${parent?.name || 'Parent'}`
        : params.clubName || 'Group Chat'),
      subtitle: subtitle || (kind === 'direct' ? 'Direct conversation' : 'Group conversation'),
      safetyCopy: 'All conversations are monitored for safety',
      postingAsOptions: kind === 'group' ? ['Myself', params.clubName || 'Club'] : undefined,
      lastMessageSnippet: undefined,
      lastMessageSender: undefined,
    };

    // Store the thread
    await this.saveThread(newThread);

    // Add thread to each participant's thread list
    for (const participant of participants) {
      await this.addThreadToUser(participant.id, threadId);
    }

    logger.info('thread_created', { threadId, kind, participantCount: participants.length });
    return newThread;
  }

  /**
   * Find an existing direct thread between two users
   */
  async findDirectThread(userId1: string, userId2: string): Promise<ChatThreadSummary | undefined> {
    const allThreads = await this.getAllThreads();
    return allThreads.find(thread => {
      if (thread.kind !== 'direct') return false;
      // Check if thread ID contains both user IDs
      const sortedIds = [userId1, userId2].sort().join('_');
      return thread.id.includes(sortedIds) ||
             (thread.id.includes(userId1) && thread.id.includes(userId2));
    });
  }

  /**
   * Find an existing group thread for a club
   */
  async findGroupThread(clubId: string, groupType?: string): Promise<ChatThreadSummary | undefined> {
    const allThreads = await this.getAllThreads();
    return allThreads.find(thread =>
      thread.kind === 'group' &&
      thread.id.includes(clubId) &&
      (!groupType || thread.groupType === groupType)
    );
  }

  /**
   * Get all threads (master list)
   */
  async getAllThreads(): Promise<ChatThreadSummary[]> {
    return storageService.getItem<ChatThreadSummary[]>(ALL_THREADS_KEY, []);
  }

  /**
   * Save a thread to the master list
   */
  private async saveThread(thread: ChatThreadSummary): Promise<void> {
    const allThreads = await this.getAllThreads();
    const existingIndex = allThreads.findIndex(t => t.id === thread.id);

    if (existingIndex >= 0) {
      allThreads[existingIndex] = thread;
    } else {
      allThreads.unshift(thread);
    }

    await storageService.setItem(ALL_THREADS_KEY, allThreads);
  }

  /**
   * Add a thread ID to a user's thread list
   */
  private async addThreadToUser(userId: string, threadId: string): Promise<void> {
    const userThreadIds = await storageService.getItem<string[]>(THREADS_KEY(userId), []);
    if (!userThreadIds.includes(threadId)) {
      userThreadIds.unshift(threadId);
      await storageService.setItem(THREADS_KEY(userId), userThreadIds);
    }
  }

  /**
   * Get threads for a specific user
   */
  async getThreads(userId: string): Promise<ChatThreadSummary[]> {
    const userThreadIds = await storageService.getItem<string[]>(THREADS_KEY(userId), []);
    const allThreads = await this.getAllThreads();

    const userThreads = userThreadIds
      .map(id => allThreads.find(t => t.id === id))
      .filter((t): t is ChatThreadSummary => t !== undefined);

    // Sort by most recent message
    return userThreads.sort((a, b) => {
      const dateA = new Date(a.scheduledFor).getTime();
      const dateB = new Date(b.scheduledFor).getTime();
      return dateB - dateA;
    });
  }

  /**
   * Get a specific thread by ID
   */
  async getThread(threadId: string): Promise<ChatThreadSummary | undefined> {
    const allThreads = await this.getAllThreads();
    return allThreads.find(t => t.id === threadId);
  }

  /**
   * List threads (legacy method for compatibility)
   */
  async listThreads(): Promise<ChatThreadSummary[]> {
    return this.getAllThreads();
  }

  // ============================================================================
  // MESSAGE MANAGEMENT
  // ============================================================================

  /**
   * Send a message in a thread
   */
  async sendMessage(
    threadId: string,
    senderId: string,
    text: string,
    senderRole: ChatSender = 'parent',
    senderName?: string,
    attachments: any[] = [],
  ): Promise<ChatMessage> {
    const timestamp = new Date().toISOString();

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      threadId,
      sender: senderRole,
      senderName: senderName || (senderRole === 'coach' ? 'Coach' : 'You'),
      body: text,
      createdAt: timestamp,
      status: 'pending',
      attachments,
    };

    // Persist the message
    await this.persistMessage(threadId, newMessage);

    // Update thread with last message info
    await this.updateThreadLastMessage(threadId, newMessage);

    // Update message status asynchronously
    this.updateStatusWithDelay(threadId, newMessage.id);

    // Send notifications
    const thread = await this.getThread(threadId);
    if (thread) {
      if (senderRole === 'parent') {
        // Parent sent message, notify coach
        await notificationService.notifyCoachNewMessage({
          coachId: thread.coachName, // In production, this should be the coach's ID
          parentName: senderName || 'Parent',
          threadId,
        });
      } else {
        // Coach sent message, notify parent
        await notificationService.notifyParentNewMessage({
          parentId: thread.childName, // In production, this should be the parent's ID
          coachName: senderName || thread.coachName,
          threadId,
        });
      }
    }

    logger.info('message_sent', { threadId, messageId: newMessage.id, sender: senderRole });
    return newMessage;
  }

  /**
   * Get messages for a thread
   */
  async getMessages(threadId: string): Promise<ChatMessage[]> {
    const messages = await storageService.getItem<ChatMessage[]>(MESSAGES_KEY(threadId), []);
    return messages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  /**
   * List messages (legacy method for compatibility)
   */
  async listMessages(threadId: string): Promise<ChatMessage[]> {
    return this.getMessages(threadId);
  }

  /**
   * Mark a thread as read for a user
   */
  async markAsRead(threadId: string, userId: string): Promise<void> {
    const allThreads = await this.getAllThreads();
    const threadIndex = allThreads.findIndex(t => t.id === threadId);

    if (threadIndex >= 0) {
      allThreads[threadIndex] = {
        ...allThreads[threadIndex],
        unreadCount: 0,
        unreadMentions: 0,
      };
      await storageService.setItem(ALL_THREADS_KEY, allThreads);
      logger.info('thread_marked_read', { threadId, userId });
    }
  }

  /**
   * Mark thread as read (legacy method for compatibility)
   */
  async markThreadRead(threadId: string): Promise<ChatThreadSummary | undefined> {
    await this.markAsRead(threadId, '');
    return this.getThread(threadId);
  }

  /**
   * Increment unread count for a thread
   */
  async incrementUnread(threadId: string, forUserId: string): Promise<void> {
    const allThreads = await this.getAllThreads();
    const threadIndex = allThreads.findIndex(t => t.id === threadId);

    if (threadIndex >= 0) {
      allThreads[threadIndex] = {
        ...allThreads[threadIndex],
        unreadCount: (allThreads[threadIndex].unreadCount || 0) + 1,
      };
      await storageService.setItem(ALL_THREADS_KEY, allThreads);
    }
  }

  // ============================================================================
  // CLUB/GROUP MESSAGING
  // ============================================================================

  /**
   * Create or get group thread for a club
   */
  async getOrCreateClubThread(
    clubId: string,
    clubName: string,
    userId: string,
    userName: string,
    userRole: 'coach' | 'parent',
  ): Promise<ChatThreadSummary> {
    // Check for existing club thread
    const existingThread = await this.findGroupThread(clubId, 'club');
    if (existingThread) {
      // Add user to thread if not already there
      await this.addThreadToUser(userId, existingThread.id);
      return existingThread;
    }

    // Create new club thread
    return this.createThread({
      participants: [{ id: userId, name: userName, role: userRole }],
      clubId,
      clubName,
      kind: 'group',
      groupType: 'club',
      title: `${clubName} Parents`,
      subtitle: 'Club announcements & discussions',
    });
  }

  /**
   * Add a user to an existing club's group thread
   */
  async addUserToClubThread(clubId: string, userId: string): Promise<void> {
    const thread = await this.findGroupThread(clubId, 'club');
    if (thread) {
      await this.addThreadToUser(userId, thread.id);

      // Update member count
      const allThreads = await this.getAllThreads();
      const threadIndex = allThreads.findIndex(t => t.id === thread.id);
      if (threadIndex >= 0) {
        allThreads[threadIndex] = {
          ...allThreads[threadIndex],
          memberCount: (allThreads[threadIndex].memberCount || 0) + 1,
        };
        await storageService.setItem(ALL_THREADS_KEY, allThreads);
      }

      logger.info('user_added_to_club_thread', { clubId, userId, threadId: thread.id });
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Persist a message to storage
   */
  private async persistMessage(threadId: string, message: ChatMessage): Promise<void> {
    const messages = await storageService.getItem<ChatMessage[]>(MESSAGES_KEY(threadId), []);
    messages.push(message);
    await storageService.setItem(MESSAGES_KEY(threadId), messages);
  }

  /**
   * Update thread with last message info
   */
  private async updateThreadLastMessage(threadId: string, message: ChatMessage): Promise<void> {
    const allThreads = await this.getAllThreads();
    const threadIndex = allThreads.findIndex(t => t.id === threadId);

    if (threadIndex >= 0) {
      allThreads[threadIndex] = {
        ...allThreads[threadIndex],
        lastMessageSnippet: message.body.substring(0, 50) + (message.body.length > 50 ? '...' : ''),
        lastMessageSender: message.senderName,
        scheduledFor: message.createdAt,
      };
      await storageService.setItem(ALL_THREADS_KEY, allThreads);
    }
  }

  /**
   * Update message status with delay to simulate network
   */
  private updateStatusWithDelay(threadId: string, messageId: string): void {
    setTimeout(() => this.updateStatus(threadId, messageId, 'sent'), 300);
    setTimeout(() => this.updateStatus(threadId, messageId, 'delivered'), 800);
  }

  /**
   * Update message status
   */
  private async updateStatus(
    threadId: string,
    messageId: string,
    status: ChatMessage['status']
  ): Promise<void> {
    const messages = await storageService.getItem<ChatMessage[]>(MESSAGES_KEY(threadId), []);
    const updated = messages.map(msg =>
      msg.id === messageId ? { ...msg, status } : msg
    );
    await storageService.setItem(MESSAGES_KEY(threadId), updated);
  }

  /**
   * Simulate an incoming message (for testing)
   */
  async simulateIncoming(
    threadId: string,
    body: string,
    senderName?: string
  ): Promise<ChatMessage> {
    const thread = await this.getThread(threadId);
    const coachName = senderName || thread?.coachName || 'Coach';

    const incoming: ChatMessage = {
      id: `msg_${Date.now()}_incoming`,
      threadId,
      sender: 'coach',
      senderName: coachName,
      body,
      createdAt: new Date().toISOString(),
      status: 'delivered',
    };

    await this.persistMessage(threadId, incoming);
    await this.updateThreadLastMessage(threadId, incoming);

    return incoming;
  }

  // ============================================================================
  // INITIALIZATION & SEED DATA
  // ============================================================================

  /**
   * Initialize messaging system with sample data for demo
   */
  async seedDemoData(userId: string, userRole: 'coach' | 'parent'): Promise<void> {
    const existingThreads = await this.getThreads(userId);
    if (existingThreads.length > 0) {
      logger.info('demo_data_exists', { userId, threadCount: existingThreads.length });
      return;
    }

    logger.info('seeding_demo_data', { userId, userRole });

    if (userRole === 'coach') {
      // Create sample threads for coach
      const thread1 = await this.createThread({
        participants: [
          { id: userId, name: 'Coach', role: 'coach' },
          { id: 'parent1', name: 'John Henderson', role: 'parent' },
        ],
        title: 'Tom Henderson Training',
        subtitle: '1:1 coaching',
      });

      await this.sendMessage(
        thread1.id,
        'parent1',
        "Hi Coach! Tom is excited for his next session. Can we focus on dribbling?",
        'parent',
        'John Henderson'
      );

      const thread2 = await this.createThread({
        participants: [
          { id: userId, name: 'Coach', role: 'coach' },
          { id: 'parent2', name: 'Lisa Wilson', role: 'parent' },
        ],
        title: 'Emma Wilson Training',
        subtitle: '1:1 coaching',
      });

      await this.sendMessage(
        thread2.id,
        'parent2',
        "Thanks for the great session yesterday! Emma loved it.",
        'parent',
        'Lisa Wilson'
      );
    } else {
      // Create sample threads for parent
      const thread1 = await this.createThread({
        participants: [
          { id: 'coach1', name: 'Sarah Mitchell', role: 'coach' },
          { id: userId, name: 'Parent', role: 'parent' },
        ],
        title: 'Training with Coach Sarah',
        subtitle: 'Goalkeeping sessions',
      });

      await this.sendMessage(
        thread1.id,
        'coach1',
        "Looking forward to our session! Remember to bring water and cleats.",
        'coach',
        'Coach Sarah'
      );

      const thread2 = await this.createThread({
        participants: [
          { id: 'coach2', name: 'Mike Thompson', role: 'coach' },
          { id: userId, name: 'Parent', role: 'parent' },
        ],
        title: 'Training with Coach Mike',
        subtitle: 'Striker development',
      });

      await this.sendMessage(
        thread2.id,
        'coach2',
        "Great progress on finishing drills! Let's work on first touch next time.",
        'coach',
        'Coach Mike'
      );
    }

    logger.info('demo_data_seeded', { userId });
  }

  /**
   * Clear all messaging data (for testing)
   */
  async clearAllData(): Promise<void> {
    await storageService.removeItem(ALL_THREADS_KEY);
    logger.info('all_messaging_data_cleared');
  }
}

export const messagingService = new MessagingService();
