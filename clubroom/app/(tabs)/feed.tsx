/**
 * UpdatesScreen — club and coach updates tied to active relationships.
 *
 * Uses useScreen() for data loading with proper 4-state pattern.
 * Sub-components: FeedPostCard, FeedFilters, ClubHubCard, EmptyFeedState.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { socialFeedService, type AggregatedFeedPost } from '@/services/social-feed-service';
import { followService } from '@/services/follow-service';
import { ServiceEvents } from '@/services/event-bus';
import { ok, err, type Result, type ServiceError } from '@/types/result';
import type { Club } from '@/constants/types';

import { FeedPostCard } from '@/components/social/feed-post-card';
import {
  FeedFilters,
  ClubHubCard,
  EmptyFeedState,
  type FeedFilter,
} from '@/components/social/feed-filters';
import { useScrollToTopOnTabReselect } from '@/hooks/use-scroll-to-top-on-tab-reselect';
import { AccessibleListCell } from '@/components/ui/list-accessibility';
import { uiFeedback } from '@/services/ui-feedback';
import { mergeUpdatesFeed } from '@/utils/updates-feed';

interface FeedData {
  feed: AggregatedFeedPost[];
  clubs: Club[];
}

export default function FeedScreen() {
  const { currentUser } = useAuth();
  const listRef = useRef<FlatList<AggregatedFeedPost>>(null);
  useScrollToTopOnTabReselect(listRef);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [visibleCount, setVisibleCount] = useState(20);
  const feedByIdRef = useRef<Map<string, AggregatedFeedPost>>(new Map());

  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const { data, status, error, refreshing, onRefresh, retry, colors } = useScreen<FeedData>({
    load: async (): Promise<Result<FeedData, ServiceError>> => {
      try {
        if (!currentUser?.id) {
          return ok({ feed: [], clubs: [] });
        }
        const baseFeed = isCoach
          ? socialFeedService.getAggregatedFeed(currentUser.id, feedFilter)
          : socialFeedService.getCombinedFeedForParent(currentUser.id, feedFilter);
        const followingIds = await followService.getFollowingIds(currentUser.id);
        const followingFeed = socialFeedService.getFollowingFeed(followingIds, feedFilter);
        const feed = mergeUpdatesFeed(baseFeed, followingFeed);
        const clubs = socialFeedService.getUserClubs(currentUser.id);
        return ok({ feed, clubs });
      } catch {
        return err({ code: 'UNKNOWN' as const, message: 'Failed to load updates' });
      }
    },
    deps: [currentUser?.id, feedFilter, isCoach],
    events: [ServiceEvents.CLUB_POST_CREATED, ServiceEvents.COACH_POST_CREATED],
    isEmpty: (d) => d.feed.length === 0 && d.clubs.length === 0,
    refetchOnFocus: true,
  });

  const feed = useMemo(() => data?.feed ?? [], [data?.feed]);
  const clubs = useMemo(() => data?.clubs ?? [], [data?.clubs]);
  const visibleFeed = useMemo(() => feed.slice(0, visibleCount), [feed, visibleCount]);
  const hasMoreFeed = visibleCount < feed.length;

  useEffect(() => {
    setVisibleCount(20);
  }, [feedFilter, feed.length]);

  useEffect(() => {
    feedByIdRef.current = new Map(feed.map((post) => [post.id, post]));
  }, [feed]);

  const handleLikePost = useCallback(
    (postId: string) => {
      if (!currentUser?.id) return;
      socialFeedService.toggleReaction(postId, currentUser.id);
      void onRefresh();
    },
    [currentUser?.id, onRefresh],
  );

  const handleCommentPost = useCallback((postId: string) => {
    router.push(Routes.modalPostDetail(postId));
  }, []);

  const handleCreatePost = useCallback(() => {
    router.push(Routes.MODAL_CREATE_POST);
  }, []);

  const handleSharePost = useCallback(async (postId: string) => {
    const post = feedByIdRef.current.get(postId);
    if (!post) return;

    try {
      await Share.share({
        message: `${post.title}\n\n${post.body}`,
        title: post.title,
      });
    } catch {
      uiFeedback.showToast('Try again in a moment.', 'error');
    }
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!hasMoreFeed) return;
    setVisibleCount((count) => Math.min(count + 20, feed.length));
  }, [feed.length, hasMoreFeed]);

  const renderPost = useCallback(
    ({ item }: { item: AggregatedFeedPost }) => (
      <View style={styles.feedCardRow}>
        <FeedPostCard
          post={item}
          onLike={handleLikePost}
          onComment={handleCommentPost}
          onShare={handleSharePost}
        />
      </View>
    ),
    [handleCommentPost, handleLikePost, handleSharePost],
  );

  const keyExtractor = useCallback((item: AggregatedFeedPost) => item.id, []);

  const renderFeedHeader = useCallback(
    () => (
      <View style={styles.feedHeader}>
        {clubs.length > 0 && (
          <View style={styles.clubsSection}>
            <ThemedText type="defaultSemiBold" style={styles.clubsHeading}>
              Club feeds
            </ThemedText>
            <ThemedText style={[styles.clubsDescription, { color: colors.muted }]}>
              Open a club to view its full club feed, members, and activity schedule.
            </ThemedText>
            <ClubHubCard clubs={clubs} />
          </View>
        )}
        {(feed.length > 0 || clubs.length > 0) && (
          <FeedFilters activeFilter={feedFilter} onFilterChange={setFeedFilter} />
        )}
      </View>
    ),
    [clubs, colors.muted, feed.length, feedFilter],
  );

  const renderFeedEmpty = useCallback(
    () => <EmptyFeedState hasClubs={clubs.length > 0} filter={feedFilter} isCoach={isCoach} />,
    [clubs.length, feedFilter, isCoach],
  );

  const renderSeparator = useCallback(() => <View style={styles.feedItemSeparator} />, []);
  const header = (
    <ScreenHeader
      title="Updates"
      subtitle="Club feeds and updates from people you follow"
      action={isCoach ? { icon: 'add', label: 'Update', onPress: handleCreatePost } : undefined}
    />
  );

  // ─── Loading ───────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <PageContainer header={header} scrollable={false} gap={0} horizontalSpacing={0}>
        <LoadingState variant="list" />
      </PageContainer>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <PageContainer header={header} scrollable={false} gap={0} horizontalSpacing={0}>
        <ErrorState message={error?.message ?? 'Failed to load updates'} onRetry={retry} />
      </PageContainer>
    );
  }

  // ─── Empty ─────────────────────────────────────────────────────
  if (status === 'empty') {
    return (
      <PageContainer header={header} scrollable={false} gap={0} horizontalSpacing={0}>
        <EmptyState
          icon="newspaper-outline"
          title="No updates yet"
          message="Club feeds, followed coaches' posts, and session updates will appear here once your clubs, follows, or bookings are active."
        />
      </PageContainer>
    );
  }

  // ─── Success ───────────────────────────────────────────────────
  return (
    <PageContainer header={header} scrollable={false} gap={0} horizontalSpacing={0}>
      <FlatList
        ref={listRef}
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
        data={visibleFeed}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderFeedHeader}
        ListEmptyComponent={renderFeedEmpty}
        ItemSeparatorComponent={renderSeparator}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={5}
        maxToRenderPerBatch={3}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
      />
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
  feedHeader: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  clubsSection: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  clubsHeading: {
    marginBottom: Spacing.micro,
  },
  clubsDescription: {
    marginBottom: Spacing.xs,
  },
  feedCardRow: {
    paddingHorizontal: Spacing.md,
  },
  feedItemSeparator: {
    height: Spacing.sm,
  },
});
