/**
 * FeedScreen — Aggregated social feed from all clubs.
 *
 * Uses useScreen() for data loading with proper 4-state pattern.
 * Sub-components: FeedPostCard, FeedFilters, ClubHubCard, EmptyFeedState.
 */

import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

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

interface FeedData {
  feed: AggregatedFeedPost[];
  clubs: Club[];
}

export default function FeedScreen() {
  const { currentUser } = useAuth();
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');

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

  const feed = data?.feed ?? [];
  const clubs = data?.clubs ?? [];

  // ─── Loading ───────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <PageContainer
        header={<ScreenHeader title="Feed" subtitle="Latest updates" />}
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
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
      >
        {clubs.length > 0 && (
          <View style={styles.clubsSection}>
            <ClubHubCard clubs={clubs} />
          </View>
        )}

        {(feed.length > 0 || clubs.length > 0) && (
          <FeedFilters activeFilter={feedFilter} onFilterChange={setFeedFilter} />
        )}

        <View style={styles.feedSection}>
          {feed.length > 0 ? (
            feed.map((post) => <FeedPostCard key={post.id} post={post} />)
          ) : (
            <EmptyFeedState hasClubs={clubs.length > 0} filter={feedFilter} isCoach={isCoach} />
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
  clubsSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  feedSection: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
});
