import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface PostDetailCardProps {
  authorName: string;
  initials: string;
  title: string | undefined;
  content: string;
  createdAt: string;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  onLike: () => void;
}

export const PostDetailCard = memo(function PostDetailCard({
  authorName, initials, title, content, createdAt, liked, likeCount, commentCount, onLike,
}: PostDetailCardProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Row gap="xs" align="center">
        <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: palette.border }]}>
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>
        <View style={styles.authorDetails}>
          <ThemedText style={styles.authorName}>{authorName}</ThemedText>
          <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
            {createdAt ? new Date(createdAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
          </ThemedText>
        </View>
      </Row>
      {title && <ThemedText style={styles.postTitle}>{title}</ThemedText>}
      <ThemedText style={styles.postContent}>{content}</ThemedText>
      <Row gap="md" style={[styles.actions, { borderTopColor: palette.border }]}>
        <Clickable style={styles.actionButton} onPress={onLike} hitSlop={8}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? palette.error : palette.muted} />
          <ThemedText style={[styles.actionText, { color: palette.muted }]}>{likeCount}</ThemedText>
        </Clickable>
        <Row align="center" gap="xxs" style={styles.actionButtonView}>
          <Ionicons name="chatbubble-outline" size={20} color={palette.muted} />
          <ThemedText style={[styles.actionText, { color: palette.muted }]}>{commentCount}</ThemedText>
        </Row>
      </Row>
      <ThemedText style={styles.commentsHeading}>Comments ({commentCount})</ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { margin: Spacing.sm, padding: Spacing.sm, borderRadius: Radii.card, borderWidth: 1, gap: Spacing.xs },
  // postHeader replaced by Row primitive
  avatar: { width: 44, height: 44, borderRadius: Radii.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarText: { ...Typography.bodySmallSemiBold },
  authorDetails: { flex: 1 },
  authorName: { ...Typography.bodySemiBold },
  timestamp: { ...Typography.caption, marginTop: Spacing.micro },
  postTitle: { ...Typography.heading },
  postContent: { ...Typography.body },
  actions: { paddingTop: Spacing.xs, borderTopWidth: 1 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, minHeight: 44 },
  actionButtonView: { minHeight: 44 },
  actionText: { ...Typography.bodySmall },
  commentsHeading: { ...Typography.bodySemiBold, paddingTop: Spacing.xs },
});
