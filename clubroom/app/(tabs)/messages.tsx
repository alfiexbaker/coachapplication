import { useState, useEffect, useMemo } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { MessageBubble } from '@/components/messaging/message-bubble';
import { ChatInput } from '@/components/messaging/chat-input';
import { TypingIndicator } from '@/components/messaging/typing-indicator';
import { AttachmentPicker } from '@/components/chat/attachment-picker';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { chatThreads, chatMessages } from '@/constants/mock-data';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatThreadSummary } from '@/constants/types';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';

function ConversationRow({ thread, index, onPress }: { thread: ChatThreadSummary; index: number; onPress: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const hasUnread = thread.unreadCount > 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <Clickable
        onPress={onPress}
        style={({ pressed }) => [
          styles.conversationRow,
          {
            backgroundColor: pressed ? palette.surface : palette.background,
            borderBottomColor: palette.border,
          }
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: palette.surface }]}>
          <ThemedText style={[styles.avatarText, { color: palette.text }]}>
            {thread.coachName.split(' ').map(n => n[0]).join('')}
          </ThemedText>
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <ThemedText type="defaultSemiBold" style={styles.coachName}>
              {thread.coachName}
            </ThemedText>
            <ThemedText style={[styles.time, { color: palette.muted }]}>
              {new Date(thread.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </ThemedText>
          </View>
          <View style={styles.conversationMeta}>
            <ThemedText style={[styles.serviceName, { color: palette.muted }]} numberOfLines={1}>
              {thread.serviceName}
            </ThemedText>
            {hasUnread && (
              <View style={[styles.badge, { backgroundColor: palette.premium }]}>
                <ThemedText style={styles.badgeText} lightColor="#fff" darkColor="#fff">
                  {thread.unreadCount}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Clickable>
    </Animated.View>
  );
}

export default function MessagesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const params = useLocalSearchParams<{ coachId?: string }>();
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [showSafetyBanner, setShowSafetyBanner] = useState(true);

  // Auto-open thread if coachId param is provided
  useEffect(() => {
    if (params.coachId) {
      // Find thread with matching coach ID - in production, match by actual coachId
      // For now, just open the first thread as a demo
      const thread = chatThreads[0];
      if (thread) {
        setOpenThreadId(thread.id);
      }
    }
  }, [params.coachId]);

  const openThread = openThreadId ? chatThreads.find(t => t.id === openThreadId) : null;
  const filteredThreads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return chatThreads;
    return chatThreads.filter((thread) => thread.coachName.toLowerCase().includes(term));
  }, [search]);

  const onLongPressMessage = () => {
    Alert.alert('Message options', 'Choose an action', [
      { text: 'Copy', onPress: () => {} },
      { text: 'Delete', style: 'destructive', onPress: () => {} },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  if (openThread) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={[styles.chatHeader, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
          <Clickable onPress={() => setOpenThreadId(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <View style={styles.chatHeaderInfo}>
            <ThemedText type="subtitle" style={styles.chatHeaderName}>{openThread.coachName}</ThemedText>
            <ThemedText style={[styles.chatSubtitle, { color: palette.muted }]}>{openThread.serviceName}</ThemedText>
          </View>
        </View>
        {showSafetyBanner && (
          <View style={[styles.safetyBanner, { backgroundColor: `${palette.warning}10`, borderColor: palette.border }]}> 
            <Ionicons name="shield-checkmark" size={18} color={palette.warning} />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="defaultSemiBold">Stay safe</ThemedText>
              <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                Messaging unlocks after a confirmed booking. Report concerns any time.
              </ThemedText>
            </View>
            <Clickable onPress={() => setShowSafetyBanner(false)}>
              <Ionicons name="close" size={16} color={palette.icon} />
            </Clickable>
          </View>
        )}
        <ScrollView contentContainerStyle={styles.chatContent}>
          {chatMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwnMessage={message.sender === 'parent'}
              onLongPress={onLongPressMessage}
            />
          ))}
          <TypingIndicator />
        </ScrollView>
        <View style={[styles.chatInput, { borderTopColor: palette.border }]}> 
          <ChatInput onAttach={() => setShowAttachmentPicker(true)} disabled={!openThread} />
        </View>
        <AttachmentPicker
          visible={showAttachmentPicker}
          onClose={() => setShowAttachmentPicker(false)}
          onPick={() => setShowAttachmentPicker(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>Messages</ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: palette.muted }]}> 
          Your coaching conversations
        </ThemedText>
      </View>
      <View style={styles.searchRow}> 
        <Ionicons name="search" size={18} color={palette.icon} />
        <TextInput
          placeholder="Search by coach or team"
          placeholderTextColor={palette.muted}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: palette.text }]}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.tint} />}
      >
        {filteredThreads.length === 0 ? (
          <EmptyState
            icon="chatbubbles"
            title="No messages yet"
            message="Start a conversation with a coach or respond to pending requests."
            actionLabel="Find coaches"
            onPressAction={() => {}}
          />
        ) : (
          filteredThreads.map((thread, index) => (
            <ConversationRow key={thread.id} thread={thread} index={index} onPress={() => setOpenThreadId(thread.id)} />
          ))
        )}
      </ScrollView>
      <SkeletonRow />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg + 4,
    gap: Spacing.lg,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '800',
  },
  conversationContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coachName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
  },
  conversationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
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
});
