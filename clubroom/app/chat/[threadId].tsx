import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { MessageBubble } from '@/components/messaging/message-bubble';
import { ChatInput } from '@/components/messaging/chat-input';
import { TypingIndicator } from '@/components/messaging/typing-indicator';
import {
  ChatPostingAsSelector,
  ChatSafetyBanner,
  ChatScreenHeader,
} from '@/components/messaging/chat-screen-sections';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { useBlockUserAction } from '@/hooks/use-block-user-action';
import { Routes } from '@/navigation/routes';
import { onTyped, emitTyped, ServiceEvents } from '@/services/event-bus';
import { messagingService } from '@/services/messaging-service';
import { ChatMessage, ChatThreadSummary } from '@/constants/types';
import { combineResults, err, ok, validationError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

type ChatScreenData = {
  thread: ChatThreadSummary | null;
  messages: ChatMessage[];
};

export default function ChatScreen() {
  const { currentUser } = useAuth();
  const { blockUser } = useBlockUserAction();
  const { threadId, prefill } = useLocalSearchParams<{ threadId: string; prefill?: string }>();
  const [showSafetyBanner, setShowSafetyBanner] = useState(true);
  const [postingAs, setPostingAs] = useState<string | undefined>();
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const clearedThreadsRef = useRef<Set<string>>(new Set());

  const loadChat = useCallback(async () => {
    if (!threadId) {
      return err(validationError('Thread not specified'));
    }

    const [threadsResult, messagesResult] = await Promise.all([
      messagingService.listThreads(),
      messagingService.listMessages(threadId),
    ]);
    const combined = combineResults([threadsResult, messagesResult] as const);
    if (!combined.success) return combined;

    const [threads, messages] = combined.data;
    const thread = threads.find((entry) => entry.id === threadId) ?? threads[0] ?? null;
    return ok({ thread, messages });
  }, [threadId]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors: palette,
  } = useScreen<ChatScreenData>({
    load: loadChat,
    deps: [threadId],
    events: [
      ServiceEvents.MESSAGE_SENT,
      ServiceEvents.MESSAGE_DELETED,
      ServiceEvents.MESSAGE_EDITED,
    ],
    isEmpty: (chatData) => chatData.thread === null,
    refetchOnFocus: true,
  });

  const thread = data?.thread ?? null;
  const messages = data?.messages ?? [];

  useEffect(() => {
    const postingAsOptions = thread?.postingAsOptions ?? [];
    if (postingAsOptions.length === 0) {
      setPostingAs(undefined);
      return;
    }

    setPostingAs((currentPostingAs) =>
      currentPostingAs && postingAsOptions.includes(currentPostingAs)
        ? currentPostingAs
        : postingAsOptions[0],
    );
  }, [thread?.id, thread?.postingAsOptions]);

  const handleSend = async (body: string) => {
    if (!threadId) return;
    const senderLabel = postingAs ? `You (${postingAs})` : 'You';
    const sendResult = await messagingService.sendMessage(threadId, body, 'parent', senderLabel);
    if (!sendResult.success) {
      uiFeedback.showToast(sendResult.error.message, 'error');
      return;
    }
    if (thread?.id) {
      emitTyped(ServiceEvents.USER_TYPING, {
        threadId: thread.id,
        userId: 'coach_demo',
        userName: thread.title || 'Coach',
      });
      setTimeout(() => {
        emitTyped(ServiceEvents.USER_STOPPED_TYPING, {
          threadId: thread.id,
          userId: 'coach_demo',
        });
        void messagingService.simulateIncoming(
          thread.id,
          'Thanks, see you then.',
          thread.title || 'Coach',
        ).then(() => onRefresh());
      }, 900);
      return;
    }
    onRefresh();
  };

  useEffect(() => {
    if (!threadId) return;

    emitTyped(ServiceEvents.THREAD_OPENED, {
      threadId,
      userId: currentUser?.id || 'current_user',
    });

    if (clearedThreadsRef.current.has(threadId)) return;
    clearedThreadsRef.current.add(threadId);
    void messagingService.markThreadRead(threadId);
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return;

    const unsubTyping = onTyped(ServiceEvents.USER_TYPING, (event) => {
      if (event.threadId !== threadId) return;
      setTypingUsers((prev) => {
        if (event.userId === (currentUser?.id || 'current_user')) return prev;
        if (prev[event.userId] === event.userName) return prev;
        return { ...prev, [event.userId]: event.userName };
      });
    });
    const unsubStopped = onTyped(ServiceEvents.USER_STOPPED_TYPING, (event) => {
      if (event.threadId !== threadId) return;
      setTypingUsers((prev) => {
        if (!(event.userId in prev)) return prev;
        const next = { ...prev };
        delete next[event.userId];
        return next;
      });
    });
    return () => {
      unsubTyping();
      unsubStopped();
    };
  }, [threadId, currentUser?.id]);

  const typingNames = Object.values(typingUsers);
  const typingLabel =
    typingNames.length === 0
      ? null
      : typingNames.length === 1
        ? `${typingNames[0]} is typing`
        : `${typingNames.slice(0, 2).join(', ')}${typingNames.length > 2 ? ` +${typingNames.length - 2}` : ''} are typing`;

  const onLongPressMessage = (message: ChatMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void (async () => {
      const selected = await uiFeedback.choose({
        title: 'Message options',
        message: 'Choose an action',
        options: [
          { id: 'copy', label: 'Copy' },
          { id: 'delete', label: 'Delete', destructive: true },
        ],
        cancelText: 'Cancel',
      });

      if (selected === 'copy') {
        await Clipboard.setStringAsync(message.body);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (selected === 'delete') {
        if (!threadId) return;
        await messagingService.deleteMessage(threadId, message.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onRefresh();
      }
    })();
  };

  const handleThreadMenu = useCallback(() => {
    if (!thread) return;

    void (async () => {
      const options: Array<{ id: string; label: string; destructive?: boolean }> = [
        { id: 'blocked-users', label: 'View blocked users' },
      ];
      if (thread.kind === 'direct' && thread.counterpartyUserId) {
        options.unshift({
          id: 'block-contact',
          label: `Block ${thread.title || 'contact'}`,
          destructive: true,
        });
      }

      const selected = await uiFeedback.choose({
        title: thread.title || 'Conversation options',
        message: 'Choose an action',
        options,
        cancelText: 'Cancel',
      });

      if (selected === 'block-contact' && thread.counterpartyUserId) {
        const blocked = await blockUser(thread.counterpartyUserId, thread.title || 'contact', () => {
          router.back();
        });
        if (blocked) {
          return;
        }
      }

      if (selected === 'blocked-users') {
        router.push(Routes.SETTINGS_BLOCKED_USERS);
      }
    })();
  }, [blockUser, thread]);
  const renderShell = (content: ReactNode) => (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );

  if (status === 'loading') {
    return renderShell(<LoadingState variant="detail" />);
  }

  if (status === 'error') {
    return renderShell(
      <ErrorState message={error?.message ?? 'Unable to load conversation'} onRetry={retry} />,
    );
  }

  if (status === 'empty' || !thread) {
    return renderShell(
      <EmptyState
        icon="chatbubble-ellipses-outline"
        title="Conversation not found"
        message="This conversation is unavailable or was removed."
        actionLabel="Back to messages"
        onPressAction={() => router.back()}
      />,
    );
  }

  const isGroup = thread.kind === 'group';

  return renderShell(
    <>
      <ChatScreenHeader
        colors={palette}
        thread={thread}
        onBack={() => router.back()}
        onOpenMenu={handleThreadMenu}
      />
      <ChatSafetyBanner
        colors={palette}
        showSafetyBanner={showSafetyBanner}
        onDismiss={() => setShowSafetyBanner(false)}
      />
      <ChatPostingAsSelector
        colors={palette}
        thread={thread}
        postingAs={postingAs}
        onSelect={setPostingAs}
      />
      <ScrollView
        contentContainerStyle={styles.chatContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwnMessage={message.sender === 'parent'}
            onLongPress={() => onLongPressMessage(message)}
            showSenderLabel={isGroup}
          />
        ))}
        {typingLabel ? <TypingIndicator label={typingLabel} /> : null}
      </ScrollView>
      <View style={[styles.chatInput, { borderTopColor: palette.border }]}>
        <ChatInput
          onAttach={() => {}}
          disabled={!thread}
          onSend={handleSend}
          initialValue={prefill}
          threadId={thread?.id}
          currentUserId={currentUser?.id}
          currentUserName={
            postingAs
              ? `${currentUser?.fullName || currentUser?.username || 'You'} (${postingAs})`
              : currentUser?.fullName || currentUser?.username || 'You'
          }
        />
      </View>
    </>,
  );
}

const styles = StyleSheet.create({
  chatContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  chatInput: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
});
