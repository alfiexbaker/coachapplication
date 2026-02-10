/**
 * ProfileTabPosts — Posts tab content for coach profile.
 */
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface PostData {
  id: string; content: string; createdAt: string; likes: number; comments: number;
  mediaUrls?: string[]; mediaType?: string;
}

interface ProfileTabPostsProps {
  coachName: string;
  userRole?: string;
  feedPosts?: PostData[];
  feedLoading?: boolean;
  onComposePress?: () => void;
  renderPostCard: (post: PostData) => React.ReactNode;
}

function ProfileTabPostsInner({ coachName, userRole, feedPosts, feedLoading, onComposePress, renderPostCard }: ProfileTabPostsProps) {
  const { colors: palette } = useTheme();

  return (
    <>
      {userRole === 'COACH' && onComposePress && (
        <Clickable style={[styles.createPostButton, { backgroundColor: palette.card }]} onPress={onComposePress}>
          <Ionicons name="add-circle" size={24} color={palette.tint} />
          <ThemedText style={[styles.createPostText, { color: palette.muted }]}>Share an update...</ThemedText>
        </Clickable>
      )}
      {feedLoading ? (
        <View style={styles.feedLoadingContainer}>
          <SurfaceCard style={styles.skeletonCard}>
            <View style={[styles.skeletonLine, { width: '60%', backgroundColor: palette.border }]} />
            <View style={[styles.skeletonLine, { width: '100%', backgroundColor: palette.border }]} />
            <View style={[styles.skeletonLine, { width: '80%', backgroundColor: palette.border }]} />
          </SurfaceCard>
          <SurfaceCard style={styles.skeletonCard}>
            <View style={[styles.skeletonLine, { width: '50%', backgroundColor: palette.border }]} />
            <View style={[styles.skeletonLine, { width: '90%', backgroundColor: palette.border }]} />
          </SurfaceCard>
          <ActivityIndicator size="small" color={palette.tint} style={{ marginTop: Spacing.md }} />
        </View>
      ) : feedPosts && feedPosts.length > 0 ? (
        feedPosts.map((post) => <View key={post.id}>{renderPostCard(post)}</View>)
      ) : (
        <SurfaceCard style={styles.emptyState}>
          <Ionicons name="newspaper-outline" size={40} color={palette.muted} style={{ marginBottom: Spacing.sm }} />
          <ThemedText style={styles.emptyStateText}>
            {userRole === 'COACH' ? 'No posts yet' : `${coachName} hasn\u2019t posted yet`}
          </ThemedText>
          {userRole === 'COACH' && onComposePress && (
            <Clickable style={[styles.emptyStateCta, { backgroundColor: palette.tint }]} onPress={onComposePress}>
              <ThemedText style={[styles.emptyStateCtaText, { color: palette.onPrimary }]}>Create your first post</ThemedText>
            </Clickable>
          )}
        </SurfaceCard>
      )}
    </>
  );
}

export const ProfileTabPosts = React.memo(ProfileTabPostsInner);

const styles = StyleSheet.create({
  createPostButton: { alignItems: 'center', padding: Spacing.md, borderRadius: Radii.lg, gap: Spacing.sm },
  createPostText: { ...Typography.body, opacity: 0.6 },
  feedLoadingContainer: { gap: Spacing.md, paddingVertical: Spacing.sm },
  skeletonCard: { gap: Spacing.sm, paddingVertical: Spacing.lg },
  skeletonLine: { height: 12, borderRadius: Radii.sm, opacity: 0.4 },
  emptyState: { paddingVertical: Spacing.xl, alignItems: 'center', gap: Spacing.xs },
  emptyStateText: { ...Typography.body, opacity: 0.6 },
  emptyStateCta: { marginTop: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radii.pill, minHeight: 44, justifyContent: 'center' },
  emptyStateCtaText: { ...Typography.bodySmallSemiBold, textAlign: 'center' },
});
