import React, { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { commentService } from '@/services/comment-service';
import type { ThreadedComment } from '@/constants/comment-types';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CommentPreviewProps {
  postId: string;
  commentCount: number;
  onPress: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CommentPreviewInner({ postId, commentCount, onPress }: CommentPreviewProps) {
  const { colors: palette } = useTheme();
  const [latestComment, setLatestComment] = useState<ThreadedComment | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadLatest() {
      const result = await commentService.getLatestComment(postId);
      if (!cancelled && result.success && result.data) {
        setLatestComment(result.data);
      }
    }
    if (commentCount > 0) {
      loadLatest();
    }
    return () => {
      cancelled = true;
    };
  }, [postId, commentCount]);

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  if (commentCount === 0) {
    return null;
  }

  return (
    <Clickable
      onPress={handlePress}
      style={styles.container}
      hitSlop={4}
      accessibilityLabel={`View all ${commentCount} comments`}
    >
      {/* "View all X comments" link */}
      {commentCount > 1 && (
        <ThemedText style={[styles.viewAll, { color: palette.muted }]}>
          View all {commentCount} comments
        </ThemedText>
      )}

      {/* Latest comment preview */}
      {latestComment && (
        <Row gap="xxs" align="baseline">
          <ThemedText style={styles.previewAuthor} numberOfLines={1}>
            {latestComment.authorName}
          </ThemedText>
          <ThemedText style={[styles.previewContent, { color: palette.text }]} numberOfLines={1}>
            {latestComment.isDeleted ? 'This comment was deleted.' : latestComment.content}
          </ThemedText>
        </Row>
      )}
    </Clickable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xxs,
    minHeight: 28,
  },
  viewAll: {
    ...Typography.caption,
  },
  // previewRow replaced by Row primitive
  previewAuthor: {
    ...Typography.bodySmallSemiBold,
    flexShrink: 0,
  },
  previewContent: {
    ...Typography.bodySmall,
    flex: 1,
  },
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const CommentPreview = memo(CommentPreviewInner);
export default CommentPreview;
