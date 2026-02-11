import { memo, useCallback } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThreadedComment } from '@/constants/comment-types';
import { useTheme } from '@/hooks/useTheme';

import { formatTimeAgo, CommentActions } from './comment-card-sections';

// Re-export extracted components for backward compat
export { formatTimeAgo, CommentActions } from './comment-card-sections';
export type { CommentActionsProps } from './comment-card-sections';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CommentCardProps {
  comment: ThreadedComment;
  isReply?: boolean;
  currentUserId: string;
  onLike: (commentId: string) => void;
  onReply: (commentId: string, authorName: string) => void;
  onDelete: (commentId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CommentCardInner({
  comment,
  isReply = false,
  currentUserId,
  onLike,
  onReply,
  onDelete,
}: CommentCardProps) {
  const { colors: palette } = useTheme();

  const isLiked = comment.likes.includes(currentUserId);
  const likeCount = comment.likes.length;
  const isOwnComment = comment.authorId === currentUserId;
  const isDeleted = comment.isDeleted;
  const initials = comment.authorAvatar ?? comment.authorName?.slice(0, 2).toUpperCase() ?? '??';

  const handleLongPress = useCallback(() => {
    if (!isOwnComment || isDeleted) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onDelete(comment.id);
  }, [isOwnComment, isDeleted, onDelete, comment.id]);

  return (
    <Clickable
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={[styles.container, isReply && styles.replyContainer]}
      accessibilityLabel={`Comment by ${comment.authorName}`}
      accessibilityRole="button"
    >
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: isDeleted
              ? withAlpha(palette.muted, 0.1)
              : withAlpha(palette.tint, 0.06),
            borderColor: palette.border,
          },
        ]}
      >
        <ThemedText style={[styles.avatarText, isDeleted && { color: palette.muted }]}>
          {isDeleted ? '--' : initials}
        </ThemedText>
      </View>

      <View style={styles.body}>
        <Row align="center" gap="xs">
          <ThemedText style={[styles.authorName, isDeleted && { color: palette.muted }]}>
            {isDeleted ? 'Deleted' : comment.authorName}
          </ThemedText>
          <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
            {formatTimeAgo(comment.createdAt)}
          </ThemedText>
        </Row>

        <ThemedText
          style={[styles.content, isDeleted && { color: palette.muted, fontStyle: 'italic' }]}
        >
          {isDeleted ? 'This comment was deleted.' : comment.content}
        </ThemedText>

        {!isDeleted && (
          <CommentActions
            commentId={comment.id}
            authorName={comment.authorName ?? 'User'}
            isLiked={isLiked}
            likeCount={likeCount}
            isReply={isReply}
            onLike={onLike}
            onReply={onReply}
            palette={palette}
          />
        )}
      </View>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: Spacing.xs, paddingVertical: Spacing.xs },
  replyContainer: { paddingLeft: Spacing.xl },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: { ...Typography.smallSemiBold },
  body: { flex: 1, gap: Spacing.micro },
  // headerRow replaced by Row primitive
  authorName: { ...Typography.bodySmallSemiBold },
  timestamp: { ...Typography.caption },
  content: { ...Typography.bodySmall },
});

export const CommentCard = memo(CommentCardInner);
export default CommentCard;
