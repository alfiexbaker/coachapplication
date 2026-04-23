/**
 * ProfileTabPosts — updates tab content for coach profile.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { SubmitProgressState } from '@/components/ui/screen-states';
import {
  Skeleton,
  SkeletonCircle,
  SkeletonCluster,
  SkeletonPill,
  SkeletonText,
} from '@/components/ui/skeleton';

interface PostData {
  id: string;
  content: string;
  createdAt: string;
  likes: number;
  comments: number;
  mediaUrls?: string[];
  mediaType?: string;
  clubName?: string;
  clubBadge?: string;
}

interface ProfileTabPostsProps {
  coachName: string;
  userRole?: string;
  feedPosts?: PostData[];
  feedLoading?: boolean;
  onComposePress?: () => void;
  renderPostCard: (post: PostData) => React.ReactNode;
}

function ProfilePostSkeleton({
  showMedia,
  showContext,
}: {
  showMedia: boolean;
  showContext: boolean;
}) {
  return (
    <SurfaceCard style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <SkeletonCircle size={40} accessibilityLabel="Loading profile post avatar" />
        <View style={styles.skeletonHeaderCopy}>
          <View style={styles.skeletonTitleRow}>
            <Skeleton width="34%" height={16} accessibilityLabel="Loading coach name" />
            {showContext ? (
              <SkeletonPill width={72} height={18} accessibilityLabel="Loading post context" />
            ) : null}
          </View>
          <Skeleton width="28%" height={11} accessibilityLabel="Loading post date" />
        </View>
      </View>

      <SkeletonText
        lines={3}
        widths={['100%', '92%', '68%']}
        lineHeight={14}
        accessibilityLabel="Loading profile post copy"
      />

      {showMedia ? (
        <Skeleton height={200} radius={Radii.md} accessibilityLabel="Loading profile post media" />
      ) : null}

      <View style={styles.skeletonActions}>
        <SkeletonPill width={56} accessibilityLabel="Loading likes" />
        <SkeletonPill width={64} accessibilityLabel="Loading comments" />
        <SkeletonPill width={52} accessibilityLabel="Loading share action" />
      </View>
    </SurfaceCard>
  );
}

function ProfileTabPostsInner({
  coachName,
  userRole,
  feedPosts,
  feedLoading,
  onComposePress,
  renderPostCard,
}: ProfileTabPostsProps) {
  const { colors: palette } = useTheme();
  const hasFeedPosts = Boolean(feedPosts && feedPosts.length > 0);

  return (
    <>
      {userRole === 'COACH' && onComposePress && (
        <Clickable
          style={[styles.createPostButton, { backgroundColor: palette.card }]}
          onPress={onComposePress}
        >
          <Ionicons name="add-circle" size={24} color={palette.tint} />
          <ThemedText style={[styles.createPostText, { color: palette.muted }]}>
            Post update
          </ThemedText>
        </Clickable>
      )}
      {feedLoading && hasFeedPosts ? (
        <SubmitProgressState label="Refreshing posts" style={styles.pendingState} />
      ) : null}
      {feedLoading && !hasFeedPosts ? (
        <View style={styles.feedLoadingContainer}>
          <ProfilePostSkeleton showMedia={true} showContext={true} />
          <ProfilePostSkeleton showMedia={false} showContext={false} />
        </View>
      ) : hasFeedPosts ? (
        (feedPosts ?? []).map((post) => <View key={post.id}>{renderPostCard(post)}</View>)
      ) : (
        <SurfaceCard style={styles.emptyState}>
          <Ionicons
            name="newspaper-outline"
            size={40}
            color={palette.muted}
            style={{ marginBottom: Spacing.sm }}
          />
          <ThemedText style={styles.emptyStateText}>
            {userRole === 'COACH'
              ? 'No updates yet'
              : `${coachName} hasn\u2019t shared any updates yet`}
          </ThemedText>
          {userRole === 'COACH' && onComposePress && (
            <Clickable
              style={[styles.emptyStateCta, { backgroundColor: palette.tint }]}
              onPress={onComposePress}
            >
              <ThemedText style={[styles.emptyStateCtaText, { color: palette.onPrimary }]}>
                Create your first update
              </ThemedText>
            </Clickable>
          )}
        </SurfaceCard>
      )}
    </>
  );
}

export const ProfileTabPosts = React.memo(ProfileTabPostsInner);

const styles = StyleSheet.create({
  createPostButton: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    gap: Spacing.sm,
  },
  createPostText: { ...Typography.body, opacity: 0.6 },
  feedLoadingContainer: { gap: Spacing.md, paddingVertical: Spacing.sm },
  pendingState: { marginBottom: Spacing.sm },
  skeletonCard: {
    gap: Spacing.md,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  skeletonHeaderCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  skeletonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emptyState: { paddingVertical: Spacing.xl, alignItems: 'center', gap: Spacing.xs },
  emptyStateText: { ...Typography.body, opacity: 0.6 },
  emptyStateCta: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    minHeight: 44,
    justifyContent: 'center',
  },
  emptyStateCtaText: { ...Typography.bodySmallSemiBold, textAlign: 'center' },
});
