import { StyleSheet, View } from 'react-native';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThreadedComment } from '@/constants/comment-types';
import { useTheme } from '@/hooks/useTheme';

import { CommentActions } from './comment-card-sections';
import { formatTimeAgo } from './comment-card-helpers';

// Re-export extracted components for backward compat
export { CommentActions } from './comment-card-sections';

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
  pending?: boolean;
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
  pending = false,
}: CommentCardProps) {
  const { colors: palette } = useTheme();

  const isLiked = comment.likedByCurrentUser ?? comment.likes.includes(currentUserId);
  const likeCount = comment.likeCount ?? comment.likes.length;
  const isOwnComment = comment.authorId === currentUserId;
  const isDeleted = comment.isDeleted;
  const initials = comment.authorName?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <View
      style={[
        styles.container,
        isReply && styles.replyContainer,
        { borderBottomColor: palette.border },
      ]}
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
            isOwnComment={isOwnComment}
            pending={pending}
            onLike={onLike}
            onReply={onReply}
            onDelete={onDelete}
            palette={palette}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  replyContainer: { paddingLeft: Spacing['2xl'] },
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

export const CommentCard = CommentCardInner;
export default CommentCard;
