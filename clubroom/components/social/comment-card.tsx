import React, { memo, useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThreadedComment } from '@/constants/comment-types';
import { useTheme } from '@/hooks/useTheme';

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
// Helpers
// ---------------------------------------------------------------------------

function formatTimeAgo(dateStr: string): string {
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

  const handleLike = useCallback(() => {
    if (isDeleted) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onLike(comment.id);
  }, [isDeleted, onLike, comment.id]);

  const handleReply = useCallback(() => {
    if (isDeleted || isReply) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onReply(comment.id, comment.authorName ?? 'User');
  }, [isDeleted, isReply, onReply, comment.id, comment.authorName]);

  const handleLongPress = useCallback(() => {
    if (!isOwnComment || isDeleted) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onDelete(comment.id);
  }, [isOwnComment, isDeleted, onDelete, comment.id]);

  return (
    <Pressable
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={[
        styles.container,
        isReply && styles.replyContainer,
      ]}
      accessibilityLabel={`Comment by ${comment.authorName}`}
    >
      {/* Avatar */}
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

      {/* Body */}
      <View style={styles.body}>
        {/* Author + timestamp */}
        <View style={styles.headerRow}>
          <ThemedText
            style={[
              styles.authorName,
              isDeleted && { color: palette.muted },
            ]}
          >
            {isDeleted ? 'Deleted' : comment.authorName}
          </ThemedText>
          <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
            {formatTimeAgo(comment.createdAt)}
          </ThemedText>
        </View>

        {/* Content */}
        <ThemedText
          style={[
            styles.content,
            isDeleted && { color: palette.muted, fontStyle: 'italic' },
          ]}
        >
          {isDeleted ? 'This comment was deleted.' : comment.content}
        </ThemedText>

        {/* Actions row */}
        {!isDeleted && (
          <View style={styles.actionsRow}>
            {/* Like */}
            <Pressable
              onPress={handleLike}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.actionButton}
              accessibilityLabel={isLiked ? 'Unlike comment' : 'Like comment'}
              accessibilityRole="button"
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={14}
                color={isLiked ? palette.error : palette.muted}
              />
              {likeCount > 0 && (
                <ThemedText
                  style={[
                    styles.actionText,
                    { color: isLiked ? palette.error : palette.muted },
                  ]}
                >
                  {likeCount}
                </ThemedText>
              )}
            </Pressable>

            {/* Reply -- only on top-level comments */}
            {!isReply && (
              <Pressable
                onPress={handleReply}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.actionButton}
                accessibilityLabel="Reply to comment"
                accessibilityRole="button"
              >
                <Ionicons name="chatbubble-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.actionText, { color: palette.muted }]}>
                  Reply
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  replyContainer: {
    paddingLeft: Spacing.xl,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    ...Typography.smallSemiBold,
  },
  body: {
    flex: 1,
    gap: Spacing.micro,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  authorName: {
    ...Typography.bodySmallSemiBold,
  },
  timestamp: {
    ...Typography.caption,
  },
  content: {
    ...Typography.bodySmall,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
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

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const CommentCard = memo(CommentCardInner);
export default CommentCard;
