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
import { LoadingState, SubmitProgressState } from '@/components/ui/screen-states';

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
        <LoadingState variant="feed" scope="section" style={styles.feedLoadingContainer} />
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
  feedLoadingContainer: { paddingVertical: Spacing.sm },
  pendingState: { marginBottom: Spacing.sm },
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
