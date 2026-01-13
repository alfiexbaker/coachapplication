import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { socialFeedService, type AggregatedFeedPost } from '@/services/social-feed-service';
import type { Club } from '@/constants/types';

type FeedFilter = 'all' | 'announcement' | 'photo' | 'event' | 'achievement';

const FEED_FILTERS: { key: FeedFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'announcement', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'achievement', label: 'Achievements', icon: 'trophy-outline' },
  { key: 'photo', label: 'Photos', icon: 'images-outline' },
  { key: 'event', label: 'Events', icon: 'calendar-outline' },
];

function ClubBadge({
  clubName,
  clubBadge,
  clubId,
}: {
  clubName: string;
  clubBadge?: string;
  clubId: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const handlePress = () => {
    router.push({
      pathname: '/club/[id]',
      params: { id: clubId },
    });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.clubBadge, { backgroundColor: `${palette.tint}10`, borderColor: `${palette.tint}30` }]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={[styles.clubBadgeIcon, { backgroundColor: palette.tint }]}>
        <ThemedText style={styles.clubBadgeIconText}>
          {clubBadge?.slice(0, 2) || clubName.slice(0, 2).toUpperCase()}
        </ThemedText>
      </View>
      <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]} numberOfLines={1}>
        {clubName}
      </ThemedText>
      <Ionicons name="chevron-forward" size={12} color={palette.tint} />
    </TouchableOpacity>
  );
}

function FeedPost({ post }: { post: AggregatedFeedPost }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const initials =
    post.postAs === 'club'
      ? post.clubBadge?.slice(0, 2) || 'CL'
      : post.authorName?.slice(0, 2).toUpperCase() || 'ME';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const handlePostPress = () => {
    router.push({
      pathname: '/(modal)/post-detail',
      params: { postId: post.id },
    });
  };

  return (
    <SurfaceCard style={styles.feedCard} onPress={handlePostPress}>
      {/* Club origin badge */}
      <ClubBadge clubName={post.clubName} clubBadge={post.clubBadge} clubId={post.clubId} />

      {/* Post header */}
      <View style={styles.feedHeader}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: `${palette.tint}10`, borderColor: palette.border, borderWidth: 1 },
          ]}
        >
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.authorRow}>
            <ThemedText type="defaultSemiBold">{post.authorName}</ThemedText>
            {post.postAs === 'club' && (
              <View style={[styles.officialBadge, { backgroundColor: `${palette.tint}15` }]}>
                <ThemedText style={[styles.officialBadgeText, { color: palette.tint }]}>
                  Official
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
            {formatDate(post.createdAt)} · {post.audienceLabel || post.audience}
          </ThemedText>
        </View>
      </View>

      {/* Post content */}
      <View style={styles.postContent}>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
          {post.title}
        </ThemedText>
        <ThemedText style={{ lineHeight: 20, color: palette.text }}>{post.body}</ThemedText>
      </View>

      {/* Image if present */}
      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      {/* Event details */}
      {post.postType === 'event' && post.eventDate && (
        <View
          style={[styles.eventDetails, { backgroundColor: `${palette.tint}08`, borderColor: palette.border }]}
        >
          <View style={styles.eventRow}>
            <Ionicons name="calendar" size={16} color={palette.tint} />
            <ThemedText style={{ color: palette.text }}>
              {new Date(post.eventDate).toLocaleDateString('en-GB', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </ThemedText>
          </View>
          {post.eventLocation && (
            <View style={styles.eventRow}>
              <Ionicons name="location" size={16} color={palette.tint} />
              <ThemedText style={{ color: palette.text }}>{post.eventLocation}</ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Badge awarded */}
      {post.badgeAwarded && <Chip active>{post.badgeAwarded}</Chip>}

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <View style={styles.attachments}>
          {post.attachments.map((attachment, idx) => (
            <View
              key={idx}
              style={[styles.attachmentChip, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Ionicons name="attach" size={14} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, fontSize: 12 }}>{attachment}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Post actions */}
      <View style={styles.feedFooter}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="heart-outline" size={18} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
            {post.reactionCount ?? 0}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={18} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
            {post.commentCount ?? 0}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={18} color={palette.muted} />
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
}

function DiscoverCoachesCard() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.discoverCard}>
      <View style={styles.discoverHeader}>
        <View style={[styles.discoverIconCircle, { backgroundColor: `${palette.tint}15` }]}>
          <Ionicons name="search" size={24} color={palette.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
            Discover Coaches
          </ThemedText>
          <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
            Find expert coaches near you
          </ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.discoverButton, { backgroundColor: palette.tint }]}
          onPress={() => router.push('/(tabs)/more')}
        >
          <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Find</ThemedText>
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
}

function ClubHubCard({ clubs }: { clubs: Club[] }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // If user has clubs, show compact club list
  if (clubs.length > 0) {
    return (
      <View style={styles.clubsRow}>
        {clubs.slice(0, 3).map((club) => (
          <TouchableOpacity
            key={club.id}
            style={[styles.clubPill, { backgroundColor: `${palette.tint}10`, borderColor: `${palette.tint}25` }]}
            onPress={() => router.push({ pathname: '/club/[id]', params: { id: club.id } })}
          >
            <View style={[styles.clubPillIcon, { backgroundColor: palette.tint }]}>
              <ThemedText style={styles.clubPillIconText}>
                {club.badge?.slice(0, 2) || club.name.slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
            <ThemedText style={{ fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
              {club.name}
            </ThemedText>
          </TouchableOpacity>
        ))}
        {clubs.length > 3 && (
          <TouchableOpacity
            style={[styles.clubPill, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={() => router.push('/(tabs)/club-hub')}
          >
            <ThemedText style={{ fontSize: 13, color: palette.muted }}>
              +{clubs.length - 3} more
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // No clubs - show simple join prompt
  return null;
}

function JoinClubCard() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [inviteCode, setInviteCode] = useState('');

  const handleJoin = () => {
    if (inviteCode.trim()) {
      router.push({
        pathname: '/(tabs)/club-hub',
        params: { code: inviteCode.trim().toUpperCase() },
      });
    } else {
      router.push('/(tabs)/club-hub');
    }
  };

  return (
    <SurfaceCard style={styles.joinClubCard}>
      <View style={styles.joinClubHeader}>
        <View style={[styles.discoverIconCircle, { backgroundColor: `${palette.success}15` }]}>
          <Ionicons name="people" size={24} color={palette.success} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
            Join a Club
          </ThemedText>
          <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
            Get access to exclusive content
          </ThemedText>
        </View>
      </View>
      <View style={styles.joinClubForm}>
        <View style={[styles.inviteCodeInput, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Ionicons name="key-outline" size={18} color={palette.muted} />
          <TextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="Enter invite code"
            placeholderTextColor={palette.muted}
            autoCapitalize="characters"
            style={[styles.inviteCodeText, { color: palette.text }]}
          />
        </View>
        <TouchableOpacity
          style={[styles.joinButton, { backgroundColor: palette.success }]}
          onPress={handleJoin}
        >
          <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Join</ThemedText>
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
}

function OnboardingTipsCard() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const tips = [
    { icon: 'person-circle', title: 'Complete Your Profile', desc: 'Add your photo and bio', route: '/(tabs)/edit-profile' },
    { icon: 'calendar', title: 'Book a Session', desc: 'Train with expert coaches', route: '/(tabs)/more' },
    { icon: 'trophy', title: 'Track Progress', desc: 'View your skills and badges', route: '/development/my-progress' },
  ];

  return (
    <SurfaceCard style={styles.tipsCard}>
      <View style={styles.tipsHeader}>
        <Ionicons name="bulb" size={20} color={palette.warning} />
        <ThemedText type="defaultSemiBold">Getting Started</ThemedText>
      </View>
      <View style={styles.tipsList}>
        {tips.map((tip, index) => (
          <TouchableOpacity
            key={index}
            style={styles.tipItem}
            onPress={() => router.push(tip.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.tipIcon, { backgroundColor: `${palette.tint}10` }]}>
              <Ionicons name={tip.icon as any} size={18} color={palette.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>{tip.title}</ThemedText>
              <ThemedText style={{ color: palette.muted, fontSize: 12 }}>{tip.desc}</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={palette.muted} />
          </TouchableOpacity>
        ))}
      </View>
    </SurfaceCard>
  );
}

function QuickActionsCard() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const actions = [
    { icon: 'search', label: 'Find Coach', route: '/(tabs)/more', color: palette.tint },
    { icon: 'analytics', label: 'My Progress', route: '/(tabs)/bookings/statistics', color: palette.success },
    { icon: 'chatbubbles', label: 'Messages', route: '/(tabs)/messages', color: palette.accent },
    { icon: 'ribbon', label: 'Badges', route: '/(tabs)/badges', color: '#F59E0B' },
  ];

  return (
    <View style={styles.quickActionsGrid}>
      {actions.map((action, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.quickActionItem, { backgroundColor: `${action.color}10`, borderColor: `${action.color}30` }]}
          onPress={() => router.push(action.route as any)}
        >
          <Ionicons name={action.icon as any} size={22} color={action.color} />
          <ThemedText style={[styles.quickActionLabel, { color: action.color }]}>{action.label}</ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function EmptyFeedState({
  hasClubs,
  filter,
}: {
  hasClubs: boolean;
  filter: FeedFilter;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  if (!hasClubs) {
    return (
      <View style={styles.emptyStateContainer}>
        <View style={[styles.emptyStateIcon, { backgroundColor: `${palette.tint}10` }]}>
          <Ionicons name="newspaper-outline" size={32} color={palette.tint} />
        </View>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 16, textAlign: 'center' }}>
          Your feed is empty
        </ThemedText>
        <ThemedText style={{ color: palette.muted, textAlign: 'center', lineHeight: 20 }}>
          Join a club or follow coaches to see updates here
        </ThemedText>
        <View style={styles.emptyStateActions}>
          <TouchableOpacity
            style={[styles.emptyStateButton, { backgroundColor: palette.tint }]}
            onPress={() => router.push('/(tabs)/club-hub')}
          >
            <Ionicons name="shield-outline" size={18} color="#fff" />
            <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Join Club</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.emptyStateButtonOutline, { borderColor: palette.border }]}
            onPress={() => router.push('/(tabs)/more')}
          >
            <Ionicons name="search-outline" size={18} color={palette.text} />
            <ThemedText style={{ fontWeight: '600' }}>Find Coach</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.emptyStateContainer}>
      <View style={[styles.emptyStateIcon, { backgroundColor: `${palette.muted}15` }]}>
        <Ionicons name="document-text-outline" size={28} color={palette.muted} />
      </View>
      <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
        {filter === 'all' ? 'No posts yet' : `No ${filter}s yet`}
      </ThemedText>
    </View>
  );
}

function ClubChips({ clubs }: { clubs: Club[] }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  if (clubs.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.clubChipsScroll}
      contentContainerStyle={styles.clubChipsContainer}
    >
      <ThemedText style={[styles.clubChipsLabel, { color: palette.muted }]}>Your clubs:</ThemedText>
      {clubs.map((club) => (
        <TouchableOpacity
          key={club.id}
          style={[styles.clubChip, { backgroundColor: `${palette.tint}10`, borderColor: `${palette.tint}30` }]}
          onPress={() => router.push({ pathname: '/club/[id]', params: { id: club.id } })}
        >
          <View style={[styles.clubChipIcon, { backgroundColor: palette.tint }]}>
            <ThemedText style={styles.clubChipIconText}>
              {club.badge?.slice(0, 2) || club.name.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={[styles.clubChipText, { color: palette.text }]} numberOfLines={1}>
            {club.name}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export default function FeedScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [feed, setFeed] = useState<AggregatedFeedPost[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(() => {
    if (currentUser?.id) {
      const posts = socialFeedService.getAggregatedFeed(currentUser.id, feedFilter);
      setFeed(posts);
      const userClubs = socialFeedService.getUserClubs(currentUser.id);
      setClubs(userClubs);
    }
  }, [currentUser?.id, feedFilter]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    loadFeed();
    setRefreshing(false);
  }, [loadFeed]);

  // Get counts for filter badges
  const filterCounts = useMemo(() => {
    if (!currentUser?.id) return {};
    const allPosts = socialFeedService.getAggregatedFeed(currentUser.id);
    return {
      all: allPosts.length,
      announcement: allPosts.filter((p) => p.postType === 'announcement').length,
      achievement: allPosts.filter((p) => p.postType === 'achievement').length,
      photo: allPosts.filter((p) => p.postType === 'photo').length,
      event: allPosts.filter((p) => p.postType === 'event').length,
    };
  }, [currentUser?.id, feed]);

  return (
    <PageContainer
      header={
        <PageHeader
          title="Feed"
          subtitle={clubs.length > 0 ? `${clubs.length} club${clubs.length > 1 ? 's' : ''}` : 'Your club updates'}
        />
      }
      gap={0}
      horizontalSpacing={0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.tint}
            colors={[palette.tint]}
          />
        }
      >
        {/* Compact club pills - only show if user has clubs */}
        {clubs.length > 0 && (
          <View style={styles.clubsSection}>
            <ClubHubCard clubs={clubs} />
          </View>
        )}

        {/* Feed filter tabs - only show if there are posts or clubs */}
        {(feed.length > 0 || clubs.length > 0) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            {FEED_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterTab,
                  feedFilter === filter.key && {
                    backgroundColor: `${palette.tint}15`,
                    borderColor: palette.tint,
                  },
                  { borderColor: palette.border },
                ]}
                onPress={() => setFeedFilter(filter.key)}
              >
                <ThemedText
                  style={[
                    styles.filterLabel,
                    { color: feedFilter === filter.key ? palette.tint : palette.muted },
                  ]}
                >
                  {filter.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Feed posts */}
        <View style={styles.feedSection}>
          {feed.length > 0 ? (
            feed.map((post) => <FeedPost key={post.id} post={post} />)
          ) : (
            <EmptyFeedState hasClubs={clubs.length > 0} filter={feedFilter} />
          )}
        </View>
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl * 2,
  },
  // Compact club section
  clubsSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  clubsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  clubPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    paddingRight: 12,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  clubPillIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubPillIconText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  // Filter tabs
  filterScroll: {
    marginTop: Spacing.md,
  },
  filterContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  feedSection: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  feedCard: {
    gap: Spacing.sm,
  },
  clubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    paddingRight: 10,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  clubBadgeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeIconText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  clubBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 150,
  },
  feedHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  officialBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  postContent: {
    gap: 4,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: Radii.md,
  },
  eventDetails: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  feedFooter: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Clean empty state
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyStateActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  emptyStateButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  discoverCard: {
    gap: Spacing.sm,
  },
  discoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  discoverIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  joinClubCard: {
    gap: Spacing.md,
  },
  joinClubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  joinClubForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inviteCodeInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  inviteCodeText: {
    flex: 1,
    fontSize: 14,
  },
  joinButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  tipsCard: {
    gap: Spacing.md,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Club Hub Card Styles
  clubHubSection: {
    padding: Spacing.md,
    paddingBottom: 0,
  },
  clubHubCard: {
    gap: Spacing.md,
  },
  clubHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  clubHubIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubHubButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  clubHubList: {
    gap: Spacing.sm,
  },
  clubHubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  clubHubItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubHubItemIconText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  clubHubViewMore: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  clubHubJoinSection: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  clubHubJoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  joinCodeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
