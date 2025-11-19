import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageBubble } from '@/components/messaging/message-bubble';
import { ThreadSummary } from '@/components/messaging/thread-summary';
import { TypingIndicator } from '@/components/messaging/typing-indicator';
import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ChatInput } from '@/components/messaging/chat-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { chatMessages, primaryChatThread } from '@/constants/mock-data';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ICON_CALLOUTS = [
  { icon: 'bubble.left.and.bubble.right.fill', label: 'Thread unlocks post-booking' },
  { icon: 'photo.on.rectangle', label: 'Media drops with read receipts' },
  { icon: 'shield.checkerboard', label: 'Moderated + encrypted transport' },
] as const;

export default function MessagesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.flexArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <SectionHeader
            eyebrow="Sprint 2 · Messaging"
            title="Coach chat"
            subtitle="Threads unlock when a booking is confirmed, pairing elite service notes with safety rails."
          />
          <ThreadSummary thread={primaryChatThread} />
          <SurfaceCard style={styles.iconLedger} tactile={false} animateElevation={false}>
            {ICON_CALLOUTS.map((item) => (
              <View key={item.label} style={styles.iconRow}>
                <IconSymbol name={item.icon} size={22} color={palette.tint} />
                <ThemedText>{item.label}</ThemedText>
              </View>
            ))}
          </SurfaceCard>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  content: {
    gap: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  iconLedger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  timeline: {
    paddingVertical: Spacing.md,
  },
  composer: {
    paddingBottom: Spacing.lg,
  },
});
