/**
 * ClubHubScreen — Club feed, admin actions, members, matches, sessions.
 *
 * Data loading + state management lives in useClubHub hook.
 * Sub-components: ClubAdminActions, ClubFeedFilters, ClubNoMembership,
 * ClubFeedListHeader (composed list header above feed posts).
 */

import { useCallback, memo, useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ThemedText } from '@/components/themed-text';
import { RemovalConfirmationModal } from '@/components/roster/removal-confirmation-modal';
import { FeedPost } from '@/components/club/FeedPost';
import { ClubFeedListHeader } from '@/components/club/club-feed-list-header';
import { ClubNoMembership } from '@/components/club/club-no-membership';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useClubHub } from '@/hooks/use-club-hub';
import type { ClubFeedPost } from '@/constants/types';
import type { MemberRemovalReason } from '@/services/club-service';
import { AccessibleListCell } from '@/components/ui/list-accessibility';

const HEADER_PROPS = { title: 'Club Hub', subtitle: 'Your clubs and communities' } as const;

export default function ClubHubScreen() {
  const hub = useClubHub();
  const { showMembersSection, setShowMembersSection, handleConfirmMemberRemoval } = hub;

  useEffect(() => {
    if (!hub.membership?.clubId || hub.isTeamStaff) return;
    router.replace(Routes.club(hub.membership.clubId));
  }, [hub.isTeamStaff, hub.membership?.clubId]);

  const feedKeyExtractor = useCallback((item: ClubFeedPost) => item.id, []);

  const renderFeedPost = useCallback(
    ({ item }: { item: ClubFeedPost }) => (
      <View style={styles.feedPostItem}>
        <FeedPost
          post={item}
          canPin={hub.canManagePosts}
          onPinToggle={hub.handlePinToggle}
          onLike={hub.handleLikePost}
          onComment={hub.handleCommentPost}
          onShare={hub.handleSharePost}
        />
      </View>
    ),
    [
      hub.canManagePosts,
      hub.handlePinToggle,
      hub.handleLikePost,
      hub.handleCommentPost,
      hub.handleSharePost,
    ],
  );

  const handleCreatePost = useCallback(() => {
    if (!hub.membership?.clubId) return;
    router.push(Routes.modalCreateClubPost({ clubId: hub.membership.clubId, audience: 'club' }));
  }, [hub.membership?.clubId]);

  const toggleMembers = useCallback(() => {
    setShowMembersSection(!showMembersSection);
  }, [showMembersSection, setShowMembersSection]);

  const handleConfirmRemoval = useCallback(
    (reason: string, customReason?: string) => {
      handleConfirmMemberRemoval(reason as MemberRemovalReason, customReason);
    },
    [handleConfirmMemberRemoval],
  );

  // ─── No membership ────────────────────────────────────────────
  if (!hub.membership) {
    return (
      <PageContainer header={<ScreenHeader {...HEADER_PROPS} />} gap={0} horizontalSpacing={0}>
        <ClubNoMembership isCoach={hub.isCoach} onJoin={hub.handleJoinWithCode} />
      </PageContainer>
    );
  }

  // ─── Member redirect ─────────────────────────────────────────
  if (!hub.isTeamStaff) {
    return (
      <PageContainer header={<ScreenHeader {...HEADER_PROPS} />} gap={0} horizontalSpacing={0}>
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  // ─── Loading ───────────────────────────────────────────────────
  if (hub.initialLoading) {
    return (
      <PageContainer header={<ScreenHeader {...HEADER_PROPS} />} gap={0} horizontalSpacing={0}>
        <LoadingState variant="list" />
      </PageContainer>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────
  if (hub.loadError) {
    return (
      <PageContainer header={<ScreenHeader {...HEADER_PROPS} />} gap={0} horizontalSpacing={0}>
        <ErrorState message={hub.loadError} onRetry={hub.loadAllData} />
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
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
        data={hub.feed}
        keyExtractor={feedKeyExtractor}
        renderItem={renderFeedPost}
        refreshing={hub.refreshing}
        onRefresh={hub.onRefresh}
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
        {feedFilter === 'all'
          ? 'No updates yet.'
          : `No ${feedFilter} updates.`}
      </ThemedText>
      {canCreatePosts && feedFilter === 'all' && (
        <Clickable
          style={[styles.emptyFeedCta, { backgroundColor: colors.tint }]}
          onPress={onCreatePost}
          accessibilityLabel="Create first post"
        >
          <Row align="center" gap="xs">
            <Ionicons name="add" size={18} color={colors.onPrimary} />
            <ThemedText style={{ color: colors.onPrimary, ...Typography.bodySemiBold }}>
              Create Post
            </ThemedText>
          </Row>
        </Clickable>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    marginTop: Spacing.sm,
    minHeight: 44,
  },
});
