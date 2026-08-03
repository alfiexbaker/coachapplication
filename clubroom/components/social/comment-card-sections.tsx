import { Platform, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ---------------------------------------------------------------------------
// CommentActions
// ---------------------------------------------------------------------------

export interface CommentActionsProps {
  commentId: string;
  authorName: string;
  isLiked: boolean;
  likeCount: number;
  isReply: boolean;
  isOwnComment: boolean;
  pending?: boolean;
  onLike: (commentId: string) => void;
  onReply: (commentId: string, authorName: string) => void;
  onDelete: (commentId: string) => void;
  palette: ThemeColors;
}

export const CommentActions = function CommentActions({
  commentId,
  authorName,
  isLiked,
  likeCount,
  isReply,
  isOwnComment,
  pending = false,
  onLike,
  onReply,
  onDelete,
  palette,
}: CommentActionsProps) {
  const handleLike = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onLike(commentId);
  };

  const handleReply = () => {
    if (isReply) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onReply(commentId, authorName);
  };

  const handleDelete = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onDelete(commentId);
  };

  return (
    <Row gap="sm" style={styles.actionsRow}>
      <Clickable
        onPress={handleLike}
        disabled={pending}
        style={styles.actionButton}
        accessibilityLabel={isLiked ? 'Unlike comment' : 'Like comment'}
        accessibilityRole="button"
        accessibilityState={{ disabled: pending, busy: pending, selected: isLiked }}
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
          disabled={pending}
          style={styles.actionButton}
          accessibilityLabel="Reply to comment"
          accessibilityRole="button"
          accessibilityState={{ disabled: pending, busy: pending }}
        >
          <Ionicons name="chatbubble-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.actionText, { color: palette.muted }]}>Reply</ThemedText>
        </Clickable>
      )}

      {isOwnComment ? (
        <Clickable
          onPress={handleDelete}
          disabled={pending}
          style={styles.actionButton}
          accessibilityLabel={`Delete comment by ${authorName}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: pending, busy: pending }}
        >
          <Ionicons name="trash-outline" size={14} color={palette.error} />
          <ThemedText style={[styles.actionText, { color: palette.error }]}>Delete</ThemedText>
        </Clickable>
      ) : null}
    </Row>
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    marginTop: Spacing.xxs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: Spacing.xxs,
  },
  actionText: {
    ...Typography.caption,
  },
});
