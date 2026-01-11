import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { ChatThreadSummary } from '@/constants/types';
import { EmptyState } from '@/components/ui/empty-state';
import { messagingService } from '@/services/messaging-service';

function ConversationRow({ thread, index, onPress }: { thread: ChatThreadSummary; index: number; onPress: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const hasUnread = thread.unreadCount > 0;
  const displayName = thread.title || thread.coachName;
  const subtitle = thread.serviceName || thread.subtitle || '1:1 coaching';

  // Format the time display
  const timeDisplay = useMemo(() => {
    const date = new Date(thread.scheduledFor);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [thread.scheduledFor]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <Clickable
        onPress={onPress}
        style={({ pressed }) => [
          styles.conversationRow,
          {
            backgroundColor: pressed ? palette.surfaceSecondary : 'transparent',
          },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: palette.surface }]}>
          <ThemedText style={[styles.avatarText, { color: palette.text }]}>
            {displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)}
          </ThemedText>
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <ThemedText type="defaultSemiBold" style={[styles.coachName, hasUnread && { fontWeight: '700' }]}>
              {displayName}
            </ThemedText>
            <ThemedText style={[styles.time, { color: hasUnread ? palette.tint : palette.muted }]}>
              {timeDisplay}
            </ThemedText>
          </View>
          <View style={styles.conversationMeta}>
            <ThemedText style={[styles.serviceName, { color: palette.muted }]} numberOfLines={1}>
              {subtitle}
            </ThemedText>
            {hasUnread && (
              <View style={[styles.badge, { backgroundColor: palette.premium }]}>
                <ThemedText style={styles.badgeText} lightColor="#fff" darkColor="#fff">
                  {thread.unreadCount}
                </ThemedText>
              </View>
            )}
          </View>
          {thread.lastMessageSnippet ? (
            <ThemedText
              style={[styles.preview, { color: hasUnread ? palette.text : palette.muted, fontWeight: hasUnread ? '500' : '400' }]}
              numberOfLines={1}
            >
              {thread.lastMessageSender ? `${thread.lastMessageSender}: ` : ''}
              {thread.lastMessageSnippet}
            </ThemedText>
          ) : null}
        </View>
      </Clickable>
    </Animated.View>
  );
}

function GroupConversationRow({ thread, index, onPress }: { thread: ChatThreadSummary; index: number; onPress: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const unreadMentions = thread.unreadMentions || 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <SurfaceCard style={styles.groupCard}>
        <View style={styles.groupHeader}>
          <View style={[styles.avatar, { backgroundColor: `${palette.tint}15` }]}>
            <ThemedText style={[styles.avatarText, { color: palette.text }]}>
              {(thread.title || thread.coachName)
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)}
            </ThemedText>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.conversationHeader}>
              <ThemedText type="defaultSemiBold" style={styles.coachName}>
                {thread.title || thread.coachName}
              </ThemedText>
              <Chip dense>{thread.groupType || 'group'}</Chip>
            </View>
            <ThemedText style={[styles.serviceName, { color: palette.muted }]} numberOfLines={1}>
              {thread.subtitle || thread.serviceName}
            </ThemedText>
            <View style={styles.conversationMeta}>
              <ThemedText style={[styles.metaPill, { color: palette.icon }]}>
                <Ionicons name="person" size={13} color={palette.icon} /> {thread.memberCount ?? '—'} members
              </ThemedText>
              {thread.scopeLabel ? (
                <ThemedText style={[styles.metaPill, { color: palette.icon }]}>
                  <Ionicons name="flag" size={13} color={palette.icon} /> {thread.scopeLabel}
                </ThemedText>
              ) : null}
            </View>
          </View>
          <Clickable style={[styles.secondaryButton, { borderColor: palette.tint }]} onPress={onPress}>
            <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Open</ThemedText>
          </Clickable>
        </View>
        {thread.lastMessageSnippet ? (
          <View style={styles.groupPreviewRow}>
            <Ionicons name="chatbubbles-outline" size={16} color={palette.icon} />
            <ThemedText numberOfLines={1} style={{ flex: 1 }}>
              {thread.lastMessageSender ? `${thread.lastMessageSender}: ` : ''}
              {thread.lastMessageSnippet}
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.groupFooter}>
          <View style={styles.groupBadges}>
            <Chip dense>{thread.postingAsOptions?.length ? 'Post as: ' + thread.postingAsOptions.join(' / ') : 'Post as yourself'}</Chip>
            {unreadMentions > 0 ? <Chip dense active>@{unreadMentions} mentions</Chip> : null}
          </View>
          <Clickable onPress={onPress}>
            <ThemedText style={{ color: palette.premium, fontWeight: '700' }}>Jump in</ThemedText>
          </Clickable>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

export default function MessagesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const params = useLocalSearchParams<{ coachId?: string; coachName?: string }>();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [viewMode, setViewMode] = useState<'direct' | 'groups'>('direct');
  const [groupFilter, setGroupFilter] = useState<'all' | 'club' | 'squad' | 'class'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Check if current user is a coach (can create clubs) or parent (can only join)
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
  const userRole = isCoach ? 'coach' : 'parent';

  // Load threads from service
  const loadThreads = useCallback(async () => {
    if (!currentUser) return;

    try {
      // First, seed demo data if needed
      await messagingService.seedDemoData(currentUser.id, userRole as 'coach' | 'parent');

      // Then load user's threads
      const userThreads = await messagingService.getThreads(currentUser.id);

      // If no threads for user, get all threads as fallback
      if (userThreads.length === 0) {
        const allThreads = await messagingService.listThreads();
        setThreads(allThreads);
      } else {
        setThreads(userThreads);
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, userRole]);

  // Initial load
  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadThreads();
    }, [loadThreads])
  );

  // Handle coachId param - create/open thread with that coach
  useEffect(() => {
    if (params.coachId && currentUser) {
      const openOrCreateThread = async () => {
        const thread = await messagingService.createThread({
          participants: [
            { id: params.coachId!, name: params.coachName || 'Coach', role: 'coach' },
            { id: currentUser.id, name: currentUser.fullName || currentUser.username || 'Parent', role: 'parent' },
          ],
          title: `Chat with ${params.coachName || 'Coach'}`,
          subtitle: 'Direct message',
        });
        router.push(`/chat/${thread.id}`);
      };
      openOrCreateThread();
    }
  }, [params.coachId, params.coachName, currentUser]);

  const filteredThreads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return threads;
    return threads.filter((thread) => {
      const haystack = [thread.coachName, thread.title, thread.subtitle, thread.serviceName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [search, threads]);

  const directThreads = useMemo(
    () => filteredThreads.filter((thread) => thread.kind !== 'group'),
    [filteredThreads],
  );

  const groupThreads = useMemo(
    () =>
      filteredThreads.filter(
        (thread) =>
          thread.kind === 'group' && (groupFilter === 'all' || thread.groupType === groupFilter),
      ),
    [filteredThreads, groupFilter],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadThreads();
    setRefreshing(false);
  };

  const totalUnread = useMemo(() => {
    return threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
  }, [threads]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <ThemedText type="title" style={styles.headerTitle}>Messages</ThemedText>
          {totalUnread > 0 && (
            <View style={[styles.headerBadge, { backgroundColor: palette.premium }]}>
              <ThemedText style={styles.headerBadgeText}>{totalUnread}</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={[styles.headerSubtitle, { color: palette.muted }]}>
          {isCoach ? 'Your parent conversations' : 'Your coaching conversations'}
        </ThemedText>
      </View>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={palette.icon} />
        <TextInput
          placeholder="Search conversations"
          placeholderTextColor={palette.muted}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: palette.text }]}
        />
      </View>
      <View style={[styles.segmentedControl, { borderColor: palette.border }]}>
        {[{ key: 'direct', label: 'Direct' }, { key: 'groups', label: 'Groups' }].map((option) => {
          const active = viewMode === option.key;
          const count = option.key === 'direct' ? directThreads.length : groupThreads.length;
          return (
            <Clickable
              key={option.key}
              onPress={() => setViewMode(option.key as 'direct' | 'groups')}
              style={[
                styles.segmentedButton,
                {
                  backgroundColor: active ? palette.tint : palette.surface,
                  borderColor: active ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText style={{ color: active ? '#fff' : palette.text, fontWeight: '700' }}>
                {option.label} {count > 0 ? `(${count})` : ''}
              </ThemedText>
            </Clickable>
          );
        })}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.tint} />}
      >
        {viewMode === 'groups' ? (
          <>
            <SurfaceCard style={styles.infoCard}>
              <ThemedText type="defaultSemiBold">Clubs, squads, badge hub</ThemedText>
              <ThemedText style={{ color: palette.muted }}>
                Keep club-wide announcements and class chatter tidy. Post as yourself or on behalf of the school without leaving
                this inbox.
              </ThemedText>
            </SurfaceCard>
            <View style={styles.filterRow}>
              {[{ key: 'all', label: 'All' }, { key: 'club', label: 'Club' }, { key: 'squad', label: 'Squad' }, { key: 'class', label: 'Class' }].map((option) => {
                const active = groupFilter === option.key;
                return (
                  <Chip
                    key={option.key}
                    active={active}
                    onPress={() => setGroupFilter(option.key as typeof groupFilter)}
                  >
                    {option.label}
                  </Chip>
                );
              })}
            </View>
            {groupThreads.length === 0 ? (
              <EmptyState
                icon="chatbubbles"
                title="No group chats yet"
                message={isCoach
                  ? "Create a squad or club space to coordinate with coaches, teams, and classes."
                  : "Join a club with an invite code to access group chats with coaches and teams."}
                actionLabel={isCoach ? "Go to Club Hub" : "Join a Club"}
                onPressAction={() => router.push('/club-hub')}
              />
            ) : (
              groupThreads.map((thread, index) => (
                <GroupConversationRow
                  key={thread.id}
                  thread={thread}
                  index={index}
                  onPress={() => router.push(`/chat/${thread.id}`)}
                />
              ))
            )}
          </>
        ) : directThreads.length === 0 ? (
          <EmptyState
            icon="chatbubbles"
            title={isLoading ? "Loading conversations..." : "No messages yet"}
            message={isCoach
              ? "Start a conversation with parents from your roster."
              : "Message a coach to get started with training."}
            actionLabel={isCoach ? "View Roster" : "Find Coaches"}
            onPressAction={() => router.push(isCoach ? '/(tabs)/more' : '/(tabs)/more')}
          />
        ) : (
          directThreads.map((thread, index) => (
            <ConversationRow
              key={thread.id}
              thread={thread}
              index={index}
              onPress={() => {
                // Mark as read when opening
                messagingService.markAsRead(thread.id, currentUser?.id || '');
                router.push(`/chat/${thread.id}`);
              }}
            />
          ))
        )}
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
    borderRadius: Radii.lg,
    backgroundColor: '#F7F8FB',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    gap: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  segmentedButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    gap: Spacing.md,
  },
  infoCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
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
  metaPill: {
    fontSize: 13,
    fontWeight: '600',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coachName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    fontSize: 13,
    fontWeight: '500',
  },
  conversationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
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
  preview: {
    fontSize: 14,
  },
  groupCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  secondaryButton: {
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  groupPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  groupFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
});
