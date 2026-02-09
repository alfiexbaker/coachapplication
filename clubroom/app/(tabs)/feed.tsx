import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { socialFeedService, type AggregatedFeedPost } from '@/services/social-feed-service';
import type { Club } from '@/constants/types';

import { FeedPostCard } from '@/components/social/feed-post-card';
import {
  FeedFilters,
  ClubHubCard,
  EmptyFeedState,
  type FeedFilter,
} from '@/components/social/feed-filters';

export default function FeedScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [feed, setFeed] = useState<AggregatedFeedPost[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const loadFeed = useCallback(() => {
    if (currentUser?.id) {
      const posts = isCoach
        ? socialFeedService.getAggregatedFeed(currentUser.id, feedFilter)
        : socialFeedService.getCombinedFeedForParent(currentUser.id, feedFilter);
      setFeed(posts);
      const userClubs = socialFeedService.getUserClubs(currentUser.id);
      setClubs(userClubs);
    }
  }, [currentUser?.id, feedFilter, isCoach]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    loadFeed();
    setRefreshing(false);
  }, [loadFeed]);

  // Available for future badge display on filter tabs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _filterCounts = useMemo(() => {
    if (!currentUser?.id) return {};
    const allPosts = socialFeedService.getAggregatedFeed(currentUser.id);
    return {
      all: allPosts.length,
      announcement: allPosts.filter((p) => p.postType === 'announcement').length,
      achievement: allPosts.filter((p) => p.postType === 'achievement').length,
      photo: allPosts.filter((p) => p.postType === 'photo').length,
      event: allPosts.filter((p) => p.postType === 'event').length,
    };
  }, [currentUser?.id]);

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
            tintColor={palette.tint}
            colors={[palette.tint]}
          />
        }
      >
        {/* Club pills */}
        {clubs.length > 0 && (
          <View style={styles.clubsSection}>
            <ClubHubCard clubs={clubs} />
          </View>
        )}

        {/* Filter tabs */}
        {(feed.length > 0 || clubs.length > 0) && (
          <FeedFilters activeFilter={feedFilter} onFilterChange={setFeedFilter} />
        )}

        {/* Feed posts */}
        <View style={styles.feedSection}>
          {feed.length > 0 ? (
            feed.map((post) => <FeedPostCard key={post.id} post={post} />)
          ) : (
            <EmptyFeedState
              hasClubs={clubs.length > 0}
              filter={feedFilter}
              isCoach={isCoach}
            />
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
