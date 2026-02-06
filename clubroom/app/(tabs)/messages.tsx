import { useState, useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { chatThreads } from '@/constants/mock-data';
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
              .join('')}
          </ThemedText>
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <ThemedText type="defaultSemiBold" style={styles.coachName} numberOfLines={1}>
              {displayName}
            </ThemedText>
            <ThemedText style={[styles.time, { color: palette.muted }]} numberOfLines={1}>
              {new Date(thread.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </ThemedText>
          </View>
          <View style={styles.conversationMeta}>
            <ThemedText style={[styles.serviceName, { color: palette.muted }]} numberOfLines={1}>
              {subtitle}
            </ThemedText>
            {hasUnread && (
              <View style={[styles.badge, { backgroundColor: palette.premium }]}>
                <ThemedText style={styles.badgeText} lightColor={Colors.light.onPrimary} darkColor={Colors.dark.onPrimary}>
                  {thread.unreadCount}
                </ThemedText>
              </View>
            )}
          </View>
          {thread.lastMessageSnippet ? (
            <ThemedText style={[styles.preview, { color: palette.muted }]} numberOfLines={1}>
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
          <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}> 
            <ThemedText style={[styles.avatarText, { color: palette.text }]}>
              {(thread.title || thread.coachName)
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </ThemedText>
          </View>
          <View style={{ flex: 1, gap: Spacing.xs / 2 }}>
            <View style={styles.conversationHeader}>
              <ThemedText type="defaultSemiBold" style={styles.coachName} numberOfLines={1}>
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
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Open</ThemedText>
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
            <ThemedText style={{ color: palette.premium, fontWeight: '600' }}>Jump in</ThemedText>
          </Clickable>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

export default function MessagesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const params = useLocalSearchParams<{ coachId?: string }>();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [threads, setThreads] = useState<ChatThreadSummary[]>(chatThreads);
  const [viewMode, setViewMode] = useState<'direct' | 'groups'>('direct');
  const [groupFilter, setGroupFilter] = useState<'all' | 'club' | 'squad' | 'class'>('all');

  // Check if current user is a coach (can create clubs) or parent (can only join)
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  // Auto-open thread if coachId param is provided
  useEffect(() => {
    if (params.coachId) {
      const thread = chatThreads[0];
      if (thread) router.push(Routes.chat(thread.id));
    }
  }, [params.coachId]);

  useEffect(() => {
    messagingService.listThreads().then(setThreads);
  }, []);

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

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScreenHeader
        title="Messages"
        subtitle="Your conversations"
      />
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
      <View style={[styles.segmentedControl, { borderColor: palette.border }]}> 
        {[{ key: 'direct', label: 'Direct' }, { key: 'groups', label: 'Groups' }].map((option) => {
          const active = viewMode === option.key;
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
              <ThemedText style={{ color: active ? palette.surface : palette.text, fontWeight: '700' }}>
                {option.label}
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
                onPressAction={() => router.push(Routes.CLUB_HUB)}
              />
            ) : (
              groupThreads.map((thread, index) => (
                <GroupConversationRow
                  key={thread.id}
                  thread={thread}
                  index={index}
                  onPress={() => router.push(Routes.chat(thread.id))}
                />
              ))
            )}
          </>
        ) : filteredThreads.length === 0 ? (
          <EmptyState
            icon="chatbubbles"
            title="No messages yet"
            message="Start a conversation with a coach or respond to pending requests."
            actionLabel="Find coaches"
            onPressAction={() => router.push(Routes.MORE)}
          />
        ) : (
          directThreads.map((thread, index) => (
            <ConversationRow
              key={thread.id}
              thread={thread}
              index={index}
              onPress={() => router.push(Routes.chat(thread.id))}
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
    backgroundColor: Colors.light.background,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
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
    paddingVertical: Spacing.sm,
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
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.subheading,
  },
  conversationContent: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  metaPill: {
    ...Typography.smallSemiBold,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coachName: {
    flex: 1,
    ...Typography.subheading,
  },
  time: {
    ...Typography.smallSemiBold,
  },
  conversationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    ...Typography.smallSemiBold,
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: Radii.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  badgeText: {
    ...Typography.caption,
  },
  preview: {
    fontSize: Typography.small.fontSize,
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
