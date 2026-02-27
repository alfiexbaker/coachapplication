/**
 * FeedScreen — Aggregated social feed from all clubs.
 *
 * Uses useScreen() for data loading with proper 4-state pattern.
 * Sub-components: FeedPostCard, FeedFilters, ClubHubCard, EmptyFeedState.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { socialFeedService, type AggregatedFeedPost } from '@/services/social-feed-service';
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
        const feed = isCoach
          ? socialFeedService.getAggregatedFeed(currentUser.id, feedFilter)
          : socialFeedService.getCombinedFeedForParent(currentUser.id, feedFilter);
        const clubs = socialFeedService.getUserClubs(currentUser.id);
        return ok({ feed, clubs });
      } catch {
        return err({ code: 'UNKNOWN' as const, message: 'Failed to load feed' });
      }
    },
    deps: [currentUser?.id, feedFilter, isCoach],
    events: [ServiceEvents.CLUB_POST_CREATED, ServiceEvents.COACH_POST_CREATED],
    isEmpty: (d) => d.feed.length === 0 && d.clubs.length === 0,
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

  const handleSharePost = useCallback(
    async (postId: string) => {
      const post = feedByIdRef.current.get(postId);
      if (!post) return;

      try {
        await Share.share({
          message: `${post.title}\n\n${post.body}`,
          title: post.title,
        });
      } catch {
        Alert.alert('Unable to share', 'Try again in a moment.');
      }
    },
    [],
  );

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

  const renderFeedHeader = useCallback(() => (
    <>
      {clubs.length > 0 && (
        <View style={styles.clubsSection}>
          <ClubHubCard clubs={clubs} />
        </View>
      )}
      {(feed.length > 0 || clubs.length > 0) && (
        <FeedFilters activeFilter={feedFilter} onFilterChange={setFeedFilter} />
      )}
    </>
  ), [clubs, feed.length, feedFilter]);

  const renderFeedEmpty = useCallback(
    () => <EmptyFeedState hasClubs={clubs.length > 0} filter={feedFilter} isCoach={isCoach} />,
    [clubs.length, feedFilter, isCoach],
  );

  const renderSeparator = useCallback(() => <View style={styles.feedItemSeparator} />, []);

  // ─── Loading ───────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <PageContainer
        header={<ScreenHeader title="Feed" subtitle="Latest updates" />}
        scrollable={false}
        gap={0}
        horizontalSpacing={0}
      >
        <LoadingState variant="list" />
      </PageContainer>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <PageContainer
        header={<ScreenHeader title="Feed" subtitle="Latest updates" />}
        scrollable={false}
        gap={0}
        horizontalSpacing={0}
      >
        <ErrorState message={error?.message ?? 'Failed to load feed'} onRetry={retry} />
      </PageContainer>
    );
  }

  // ─── Empty ─────────────────────────────────────────────────────
  if (status === 'empty') {
    return (
      <PageContainer
        header={<ScreenHeader title="Feed" subtitle="Latest updates" />}
        scrollable={false}
        gap={0}
        horizontalSpacing={0}
      >
        <EmptyState
          icon="newspaper-outline"
          title="No posts yet"
          message="Join a club or follow coaches to see posts in your feed."
        />
      </PageContainer>
    );
  }

  // ─── Success ───────────────────────────────────────────────────
  return (
    <PageContainer
      header={<ScreenHeader title="Feed" subtitle="Latest updates" />}
      scrollable={false}
      gap={0}
      horizontalSpacing={0}
    >
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
  clubsSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  feedSection: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  feedCardRow: {
    paddingHorizontal: Spacing.md,
  },
  feedItemSeparator: {
    height: Spacing.md,
  },
});
