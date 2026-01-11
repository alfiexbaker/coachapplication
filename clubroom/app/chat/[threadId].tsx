import { useEffect, useState, useRef, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { MessageBubble } from '@/components/messaging/message-bubble';
import { ChatInput } from '@/components/messaging/chat-input';
import { TypingIndicator } from '@/components/messaging/typing-indicator';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { messagingService } from '@/services/messaging-service';
import { ChatMessage, ChatThreadSummary } from '@/constants/types';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';

export default function ChatScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [thread, setThread] = useState<ChatThreadSummary | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSafetyBanner, setShowSafetyBanner] = useState(true);
  const [postingAs, setPostingAs] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Determine user role
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
  const senderRole = isCoach ? 'coach' : 'parent';

  // Load thread and messages
  const loadData = useCallback(async () => {
    if (!threadId) return;

    try {
      // Load thread
      const threadData = await messagingService.getThread(threadId);
      if (threadData) {
        setThread(threadData);
        setPostingAs(threadData.postingAsOptions?.[0]);

        // Mark as read
        if (currentUser) {
          await messagingService.markAsRead(threadId, currentUser.id);
        }
      }

      // Load messages
      const messagesList = await messagingService.getMessages(threadId);
      setMessages(messagesList);

      // Scroll to bottom after loading
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Failed to load chat data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [threadId, currentUser]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (threadId) {
        const newMessages = await messagingService.getMessages(threadId);
        if (newMessages.length > messages.length) {
          setMessages(newMessages);
          // Scroll to bottom for new messages
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [threadId, messages.length]);

  // Handle sending a message
  const handleSend = async (body: string) => {
    if (!threadId || !currentUser || isSending) return;

    setIsSending(true);

    try {
      const senderName = postingAs
        ? `${currentUser.fullName || currentUser.username || 'You'} (${postingAs})`
        : currentUser.fullName || currentUser.username || 'You';

      // Send the message
      const newMessage = await messagingService.sendMessage(
        threadId,
        currentUser.id,
        body,
        senderRole,
        senderName
      );

      // Add to local state immediately for instant feedback
      setMessages((prev) => [...prev, newMessage]);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Reload to get updated status
      setTimeout(async () => {
        const updatedMessages = await messagingService.getMessages(threadId);
        setMessages(updatedMessages);
      }, 1000);
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const onLongPressMessage = (message: ChatMessage) => {
    Alert.alert('Message options', 'Choose an action', [
      { text: 'Copy', onPress: () => {} },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          // In production, would delete from storage
          setMessages((prev) => prev.filter((m) => m.id !== message.id));
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background, justifyContent: 'center', alignItems: 'center' }} edges={['top']}>
        <ThemedText style={{ color: palette.muted }}>Loading conversation...</ThemedText>
      </SafeAreaView>
    );
  }

  if (!thread) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <View style={[styles.chatHeader, { borderBottomColor: palette.border }]}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <View style={styles.chatHeaderInfo}>
            <ThemedText type="subtitle">Conversation not found</ThemedText>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg }}>
          <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
            This conversation may have been deleted or you don't have access to it.
          </ThemedText>
          <Clickable
            style={[styles.backToMessagesButton, { backgroundColor: palette.tint }]}
            onPress={() => router.push('/(tabs)/messages')}
          >
            <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Back to Messages</ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  const isGroup = thread.kind === 'group';
  const headerTitle = thread.title || thread.coachName;
  const headerSubtitle =
    thread.subtitle ||
    (isGroup
      ? `${thread.memberCount ?? '—'} members${thread.scopeLabel ? ` · ${thread.scopeLabel}` : ''}`
      : thread.serviceName);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.chatHeader, { borderBottomColor: palette.border }]}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <View style={styles.chatHeaderInfo}>
            <ThemedText type="subtitle" style={styles.chatHeaderName}>{headerTitle}</ThemedText>
            <ThemedText style={[styles.chatSubtitle, { color: palette.muted }]}>{headerSubtitle}</ThemedText>
          </View>
          {isGroup && thread.groupType ? (
            <Chip dense>{thread.groupType === 'club' ? 'Club' : thread.groupType === 'squad' ? 'Squad' : 'Class'}</Chip>
          ) : null}
        </View>

        {showSafetyBanner && (
          <View style={[styles.safetyBanner, { backgroundColor: `${palette.warning}10`, borderColor: palette.border }]}>
            <Ionicons name="shield-checkmark" size={18} color={palette.warning} />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="defaultSemiBold">Stay safe</ThemedText>
              <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                {thread.safetyCopy || 'All messages are monitored for safety. Report concerns any time.'}
              </ThemedText>
            </View>
            <Clickable onPress={() => setShowSafetyBanner(false)}>
              <Ionicons name="close" size={16} color={palette.icon} />
            </Clickable>
          </View>
        )}

        {isGroup && thread.postingAsOptions?.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.postingAsRow, { borderColor: palette.border }]}
          >
            {thread.postingAsOptions.map((option) => (
              <Clickable
                key={option}
                onPress={() => setPostingAs(option)}
                style={[
                  styles.postingAsChip,
                  {
                    backgroundColor: postingAs === option ? `${palette.tint}15` : palette.surface,
                    borderColor: postingAs === option ? palette.tint : palette.border,
                  },
                ]}
              >
                <Ionicons
                  name={postingAs === option ? 'checkmark-circle' : 'person-circle-outline'}
                  size={16}
                  color={postingAs === option ? palette.tint : palette.icon}
                />
                <ThemedText style={{ color: postingAs === option ? palette.text : palette.muted }}>
                  Post as {option}
                </ThemedText>
              </Clickable>
            ))}
          </ScrollView>
        ) : null}

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => {
            // Scroll to bottom when content changes
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubble-outline" size={48} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
                No messages yet.{'\n'}Send a message to start the conversation!
              </ThemedText>
            </View>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.sender === senderRole}
                onLongPress={() => onLongPressMessage(message)}
                showSenderLabel={isGroup}
              />
            ))
          )}

          {isSending && <TypingIndicator />}
        </ScrollView>

        <View style={[styles.chatInput, { borderTopColor: palette.border }]}>
          <ChatInput
            onAttach={() => {
              Alert.alert('Attachments', 'Attachment feature coming soon!');
            }}
            disabled={isSending}
            onSend={handleSend}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  chatHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '700',
  },
  chatSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  chatContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl * 2,
  },
  postingAsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    borderBottomWidth: 1,
  },
  postingAsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  chatInput: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  backToMessagesButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
});
