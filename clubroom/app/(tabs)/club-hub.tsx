/**
 * ClubHubScreen — Club feed, admin actions, members, matches, sessions.
 *
 * Data loading + state management lives in useClubHub hook.
 * Sub-components: ClubAdminActions, ClubFeedFilters, ClubNoMembership,
 * ClubFeedListHeader (composed list header above feed posts).
 */

import { useCallback, memo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ThemedText } from '@/components/themed-text';
import { RemovalConfirmationModal } from '@/components/roster/removal-confirmation-modal';
import { FeedPost } from '@/components/club/FeedPost';
import { ClubFeedListHeader } from '@/components/club/club-feed-list-header';
import { ClubNoMembership } from '@/components/club/club-no-membership';
import { LoadingScreen } from '@/components/ui/primitives/LoadingScreen';
import { StatusBanner } from '@/components/ui/primitives/StatusBanner';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useClubHub } from '@/hooks/use-club-hub';
import type { ClubFeedPost } from '@/constants/types';
import type { MemberRemovalReason } from '@/services/club-service';

const HEADER_PROPS = { title: 'Club Hub', subtitle: 'Your clubs and communities' } as const;

export default function ClubHubScreen() {
  const { colors } = useTheme();
  const hub = useClubHub();

  const feedKeyExtractor = useCallback((item: ClubFeedPost) => item.id, []);

  const renderFeedPost = useCallback(
    ({ item }: { item: ClubFeedPost }) => (
      <View style={styles.feedPostItem}>
        <FeedPost post={item} canPin={hub.canManagePosts} onPinToggle={hub.handlePinToggle} />
      </View>
    ),
    [hub.canManagePosts, hub.handlePinToggle],
  );

  const handleCreatePost = useCallback(() => router.push(Routes.MODAL_CREATE_CLUB_POST), []);

  const toggleMembers = useCallback(() => {
    hub.setShowMembersSection(!hub.showMembersSection);
  }, [hub.showMembersSection, hub.setShowMembersSection]);

  const handleConfirmRemoval = useCallback(
    (reason: string, customReason?: string) => {
      hub.handleConfirmMemberRemoval(reason as MemberRemovalReason, customReason);
    },
    [hub.handleConfirmMemberRemoval],
  );

  // ─── No membership ────────────────────────────────────────────
  if (!hub.membership) {
    return (
      <PageContainer header={<ScreenHeader {...HEADER_PROPS} />} gap={0} horizontalSpacing={0}>
        <ClubNoMembership isCoach={hub.isCoach} onJoin={hub.handleJoinWithCode} />
      </PageContainer>
    );
  }

  // ─── Loading ───────────────────────────────────────────────────
  if (hub.initialLoading) {
    return (
      <PageContainer header={<ScreenHeader {...HEADER_PROPS} />} gap={0} horizontalSpacing={0}>
        <LoadingScreen title="Loading club..." />
      </PageContainer>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────
  if (hub.loadError) {
    return (
      <PageContainer header={<ScreenHeader {...HEADER_PROPS} />} gap={0} horizontalSpacing={0}>
        <View style={styles.errorContainer}>
          <StatusBanner variant="error" message={hub.loadError} />
          <Pressable
            style={[styles.retryButton, { borderColor: colors.tint }]}
            onPress={hub.loadAllData}
            accessibilityLabel="Retry loading club data"
          >
            <Ionicons name="refresh" size={18} color={colors.tint} />
            <ThemedText style={{ color: colors.tint, ...Typography.bodySemiBold }}>Retry</ThemedText>
          </Pressable>
        </View>
      </PageContainer>
    );
  }

  // ─── Success ───────────────────────────────────────────────────
  if (!hub.club) return null;

  return (
    <PageContainer
      header={
        <ScreenHeader
          {...HEADER_PROPS}
          action={
            hub.canCreatePosts
              ? { icon: 'add', label: 'New Post', onPress: handleCreatePost }
              : undefined
          }
        />
      }
      gap={0}
      horizontalSpacing={0}
    >
      <FlatList<ClubFeedPost>
        data={hub.feed}
        keyExtractor={feedKeyExtractor}
        renderItem={renderFeedPost}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<ClubFeedListHeader hub={hub} onToggleMembers={toggleMembers} />}
        ListEmptyComponent={
          <FeedEmptyState
            feedFilter={hub.feedFilter}
            canCreatePosts={hub.canCreatePosts}
            onCreatePost={handleCreatePost}
          />
        }
      />
      <RemovalConfirmationModal
        visible={hub.showMemberRemovalModal}
        onClose={hub.dismissRemovalModal}
        onConfirm={handleConfirmRemoval}
        type="member"
        name={hub.selectedMemberForRemoval?.userName || ''}
        isLoading={hub.isRemovingMember}
      />
    </PageContainer>
  );
}

// ─── Feed empty state ──────────────────────────────────────────────

interface FeedEmptyStateProps {
  feedFilter: string;
  canCreatePosts: boolean;
  onCreatePost: () => void;
}

const FeedEmptyState = memo(function FeedEmptyState({
  feedFilter,
  canCreatePosts,
  onCreatePost,
}: FeedEmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyFeed}>
      <Ionicons name="newspaper-outline" size={48} color={colors.muted} />
      <ThemedText style={{ color: colors.muted, textAlign: 'center' }}>
        {feedFilter === 'all' ? 'No posts yet. Be the first to share!' : `No ${feedFilter} posts yet.`}
      </ThemedText>
      {canCreatePosts && feedFilter === 'all' && (
        <Pressable
          style={[styles.emptyFeedCta, { backgroundColor: colors.tint }]}
          onPress={onCreatePost}
          accessibilityLabel="Create first post"
        >
          <Ionicons name="add" size={18} color={colors.onPrimary} />
          <ThemedText style={{ color: colors.onPrimary, ...Typography.bodySemiBold }}>Create Post</ThemedText>
        </Pressable>
      )}
    </View>
  );
});

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl * 2 },
  feedPostItem: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  emptyFeed: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  emptyFeedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    marginTop: Spacing.sm,
    minHeight: 44,
  },
  errorContainer: { flex: 1, padding: Spacing.md, gap: Spacing.md, justifyContent: 'center' },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
  },
});
