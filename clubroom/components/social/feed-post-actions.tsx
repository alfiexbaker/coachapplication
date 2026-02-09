import { memo, useCallback } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FeedPostActionsProps {
  postId: string;
  reactionCount: number;
  commentCount: number;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const FeedPostActions = memo(function FeedPostActions({
  postId,
  reactionCount,
  commentCount,
  onLike,
  onComment,
  onShare,
}: FeedPostActionsProps) {
  const { colors: palette } = useTheme();

  const handleLike = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onLike?.(postId);
  }, [onLike, postId]);

  const handleComment = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onComment?.(postId);
  }, [onComment, postId]);

  const handleShare = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onShare?.(postId);
  }, [onShare, postId]);

  return (
    <View style={styles.feedFooter}>
      <Clickable
        style={styles.actionButton}
        onPress={handleLike}
        hitSlop={8}
        accessibilityLabel="Like post"
      >
        <Ionicons name="heart-outline" size={18} color={palette.muted} />
        <ThemedText style={[styles.actionCount, { color: palette.muted }]}>
          {reactionCount}
        </ThemedText>
      </Clickable>
      <Clickable
        style={styles.actionButton}
        onPress={handleComment}
        hitSlop={8}
        accessibilityLabel="Comment on post"
      >
        <Ionicons name="chatbubble-outline" size={18} color={palette.muted} />
        <ThemedText style={[styles.actionCount, { color: palette.muted }]}>
          {commentCount}
        </ThemedText>
      </Clickable>
      <Clickable
        style={styles.actionButton}
        onPress={handleShare}
        hitSlop={8}
        accessibilityLabel="Share post"
      >
        <Ionicons name="share-outline" size={18} color={palette.muted} />
      </Clickable>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  feedFooter: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    minHeight: 44,
    paddingVertical: Spacing.xs,
  },
  actionCount: {
    ...Typography.small,
  },
});
