import { useEffect, useState, useCallback } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
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
import { ServiceEvents } from '@/services/event-bus';
import { messagingService } from '@/services/messaging-service';
import { ChatMessage, ChatThreadSummary } from '@/constants/types';
import { combineResults, err, ok, validationError } from '@/types/result';

type ChatScreenData = {
  thread: ChatThreadSummary | null;
  messages: ChatMessage[];
};

export default function ChatScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const [showSafetyBanner, setShowSafetyBanner] = useState(true);
  const [postingAs, setPostingAs] = useState<string | undefined>();

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
      Alert.alert('Unable to send message', sendResult.error.message);
      return;
    }
    await messagingService.simulateIncoming(threadId, 'Coach is typing...');
    onRefresh();
  };

  const onLongPressMessage = (message: ChatMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Message options', 'Choose an action', [
      {
        text: 'Copy',
        onPress: async () => {
          await Clipboard.setStringAsync(message.body);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!threadId) return;
          await messagingService.deleteMessage(threadId, message.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onRefresh();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <ErrorState message={error?.message ?? 'Unable to load conversation'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty' || !thread) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Conversation not found"
          message="This conversation is unavailable or was removed."
          actionLabel="Back to messages"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const isGroup = thread.kind === 'group';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ChatScreenHeader colors={palette} thread={thread} onBack={() => router.back()} />
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
        <TypingIndicator />
      </ScrollView>
      <View style={[styles.chatInput, { borderTopColor: palette.border }]}>
        <ChatInput onAttach={() => {}} disabled={!thread} onSend={handleSend} />
      </View>
    </SafeAreaView>
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
