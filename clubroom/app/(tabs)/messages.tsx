import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { chatThreads } from '@/constants/mock-data';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatThreadSummary } from '@/constants/types';

function ConversationRow({ thread, index }: { thread: ChatThreadSummary; index: number }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const hasUnread = thread.unreadCount > 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Pressable
        style={({ pressed }) => [
          styles.conversationRow,
          {
            backgroundColor: pressed ? palette.surface : 'transparent',
            borderBottomColor: palette.border,
          }
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: palette.tint }]}>
          <ThemedText style={styles.avatarText} lightColor="#fff" darkColor="#fff">
            {thread.coachName.split(' ').map(n => n[0]).join('')}
          </ThemedText>
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <ThemedText type="defaultSemiBold" style={styles.coachName}>
              {thread.coachName}
            </ThemedText>
            <ThemedText style={styles.time}>
              {new Date(thread.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </ThemedText>
          </View>
          <View style={styles.conversationMeta}>
            <ThemedText style={styles.serviceName} numberOfLines={1}>
              {thread.serviceName}
            </ThemedText>
            {hasUnread && (
              <View style={[styles.badge, { backgroundColor: palette.tint }]}>
                <ThemedText style={styles.badgeText} lightColor="#fff" darkColor="#fff">
                  {thread.unreadCount}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function MessagesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ThemedText type="title">Messages</ThemedText>
      </View>
      <ScrollView style={styles.scrollView}>
        {chatThreads.map((thread, index) => (
          <ConversationRow key={thread.id} thread={thread} index={index} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  conversationContent: {
    flex: 1,
    gap: 4,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coachName: {
    flex: 1,
  },
  time: {
    fontSize: 13,
    opacity: 0.5,
  },
  conversationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 13,
    opacity: 0.7,
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
