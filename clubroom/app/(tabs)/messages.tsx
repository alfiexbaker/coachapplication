import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageBubble } from '@/components/messaging/message-bubble';
import { ThreadSummary } from '@/components/messaging/thread-summary';
import { TypingIndicator } from '@/components/messaging/typing-indicator';
import { ThemedText } from '@/components/themed-text';
import { ChatInput } from '@/components/messaging/chat-input';
import { Colors, Spacing } from '@/constants/theme';
import { chatMessages, primaryChatThread } from '@/constants/mock-data';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function MessagesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.flexArea}>
        <View style={styles.header}>
          <ThemedText type="title">{primaryChatThread.coachName}</ThemedText>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.timeline}>
            {chatMessages.map((message) => (
              <MessageBubble key={message.id} message={message} isOwnMessage={message.sender === 'parent'} />
            ))}
            <TypingIndicator />
          </View>
        </ScrollView>
        <View style={styles.composer}>
          <ChatInput />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flexArea: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  timeline: {
    paddingVertical: Spacing.md,
  },
  composer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
});
