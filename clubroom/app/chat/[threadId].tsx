import { useEffect, useState, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { MessageBubble } from '@/components/messaging/message-bubble';
import { ChatInput } from '@/components/messaging/chat-input';
import { TypingIndicator } from '@/components/messaging/typing-indicator';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { messagingService } from '@/services/messaging-service';
import { ChatMessage, ChatThreadSummary } from '@/constants/types';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Chip } from '@/components/primitives/chip';

export default function ChatScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const [thread, setThread] = useState<ChatThreadSummary | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSafetyBanner, setShowSafetyBanner] = useState(true);
  const [postingAs, setPostingAs] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    if (!threadId) return;
    const listResult = await messagingService.listMessages(threadId);
    if (listResult.success) {
      setMessages(listResult.data);
    }
  }, [threadId]);

  useEffect(() => {
    messagingService.listThreads().then((threadsResult) => {
      if (!threadsResult.success) {
        return;
      }
      const found = threadsResult.data.find((t) => t.id === threadId) || threadsResult.data[0];
      setThread(found);
      setPostingAs(found?.postingAsOptions?.[0]);
    });
    refresh();
  }, [threadId, refresh]);

  const handleSend = async (body: string) => {
    if (!threadId) return;
    const senderLabel = postingAs ? `You (${postingAs})` : 'You';
    const sendResult = await messagingService.sendMessage(threadId, body, 'parent', senderLabel);
    if (!sendResult.success) {
      Alert.alert('Unable to send message', sendResult.error.message);
      return;
    }
    await messagingService.simulateIncoming(threadId, 'Coach is typing...');
    refresh();
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
          refresh();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (!thread) {
    return null;
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
      <Row align="center" gap="md" style={[styles.chatHeader, { borderBottomColor: palette.border }]}>
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
      </Row>
      {showSafetyBanner && (
        <Row align="center" gap="sm" style={[styles.safetyBanner, { backgroundColor: withAlpha(palette.warning, 0.06), borderColor: palette.border }]}>
          <Ionicons name="shield-checkmark" size={18} color={palette.warning} />
          <View style={{ flex: 1, gap: Spacing.micro }}>
            <ThemedText type="defaultSemiBold">Stay safe</ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.small }}>
              Messaging unlocks after a confirmed booking. Report concerns any time.
            </ThemedText>
          </View>
          <Clickable onPress={() => setShowSafetyBanner(false)}>
            <Ionicons name="close" size={16} color={palette.icon} />
          </Clickable>
        </Row>
      )}
      {isGroup && thread.postingAsOptions?.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.postingAsRow, { borderColor: palette.border }]}>
          {thread.postingAsOptions.map((option) => (
            <Clickable
              key={option}
              onPress={() => setPostingAs(option)}
              style={[
                styles.postingAsChip,
                {
                  backgroundColor: postingAs === option ? withAlpha(palette.tint, 0.09) : palette.surface,
                  borderColor: postingAs === option ? palette.tint : palette.border,
                },
              ]}>
              <Row align="center" gap="xs">
                <Ionicons
                  name={postingAs === option ? 'checkmark-circle' : 'person-circle-outline'}
                  size={16}
                  color={postingAs === option ? palette.tint : palette.icon}
                />
                <ThemedText style={{ color: postingAs === option ? palette.text : palette.muted }}>
                  Post as {option}
                </ThemedText>
              </Row>
            </Clickable>
          ))}
        </ScrollView>
      ) : null}
      <ScrollView contentContainerStyle={styles.chatContent}>
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
  chatHeader: {
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
    gap: Spacing.micro,
  },
  chatHeaderName: {
    ...Typography.heading,
  },
  chatSubtitle: {
    ...Typography.bodySmallSemiBold,
  },
  chatContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  postingAsRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    borderBottomWidth: 1,
  },
  postingAsChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  safetyBanner: {
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
});
