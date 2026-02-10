/**
 * Comment Card — Extracted sections
 *
 * Helper and action row sub-component for CommentCard.
 */

import { memo, useCallback } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// CommentActions
// ---------------------------------------------------------------------------

export interface CommentActionsProps {
  commentId: string;
  authorName: string;
  isLiked: boolean;
  likeCount: number;
  isReply: boolean;
  onLike: (commentId: string) => void;
  onReply: (commentId: string, authorName: string) => void;
  palette: ThemeColors;
}

export const CommentActions = memo(function CommentActions({
  commentId,
  authorName,
  isLiked,
  likeCount,
  isReply,
  onLike,
  onReply,
  palette,
}: CommentActionsProps) {
  const handleLike = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onLike(commentId);
  }, [onLike, commentId]);

  const handleReply = useCallback(() => {
    if (isReply) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onReply(commentId, authorName);
  }, [isReply, onReply, commentId, authorName]);

  return (
    <Row gap="sm" style={styles.actionsRow}>
      <Clickable
        onPress={handleLike}
        hitSlop={10}
        style={styles.actionButton}
        accessibilityLabel={isLiked ? 'Unlike comment' : 'Like comment'}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={14}
          color={isLiked ? palette.error : palette.muted}
        />
        {likeCount > 0 && (
          <ThemedText
            style={[styles.actionText, { color: isLiked ? palette.error : palette.muted }]}
          >
            {likeCount}
          </ThemedText>
        )}
      </Clickable>

      {!isReply && (
        <Clickable
          onPress={handleReply}
          hitSlop={10}
          style={styles.actionButton}
          accessibilityLabel="Reply to comment"
        >
          <Ionicons name="chatbubble-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.actionText, { color: palette.muted }]}>
            Reply
          </ThemedText>
        </Clickable>
      )}
    </Row>
  );
});

const styles = StyleSheet.create({
  actionsRow: {
    marginTop: Spacing.xxs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    minHeight: 36,
  },
  actionText: {
    ...Typography.caption,
  },
});
