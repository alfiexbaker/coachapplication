import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ─── Types ──────────────────────────────────────────────────────

export interface ProfilePostCardProps {
  post: {
    id: string;
    content: string;
    createdAt: string;
    likes: number;
    comments: number;
    mediaUrls?: string[];
    mediaType?: string;
  };
  /** Coach name displayed in the post header */
  coachName: string;
  /** Coach avatar URL */
  coachAvatar?: string;
  /** Club or profile context label for the post */
  contextLabel?: string;
  onLikePress?: (postId: string) => void;
  onCommentPress?: (postId: string) => void;
  onSharePress?: (postId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────

function ProfilePostCardInner({
  post,
  coachName,
  coachAvatar,
  contextLabel,
  onLikePress,
  onCommentPress,
  onSharePress,
}: ProfilePostCardProps) {
  const { colors: palette } = useTheme();
  const initials =
    coachName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'UP';

  return (
    <SurfaceCard style={styles.postCard}>
      <Row style={styles.postHeader}>
        {coachAvatar ? (
          <Image source={{ uri: coachAvatar }} style={styles.postAvatar} />
        ) : (
          <View
            style={[styles.postAvatarFallback, { backgroundColor: withAlpha(palette.tint, 0.12) }]}
          >
            <ThemedText style={[styles.postAvatarFallbackText, { color: palette.tint }]}>
              {initials}
            </ThemedText>
          </View>
        )}
        <View style={styles.postHeaderText}>
          <Row align="center" gap="xs" wrap>
            <ThemedText type="subtitle">{coachName}</ThemedText>
            {contextLabel ? (
              <View
                style={[styles.contextPill, { backgroundColor: withAlpha(palette.tint, 0.08) }]}
              >
                <ThemedText style={[styles.contextPillText, { color: palette.tint }]}>
                  {contextLabel}
                </ThemedText>
              </View>
            ) : null}
          </Row>
          <ThemedText style={styles.postDate}>
            {new Date(post.createdAt).toLocaleDateString('en-GB', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </ThemedText>
        </View>
      </Row>

      <ThemedText style={styles.postContent}>{post.content}</ThemedText>

      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <View style={styles.postMedia}>
          {post.mediaType === 'photo' &&
            post.mediaUrls.map((url) => (
              <Image key={url} source={{ uri: url }} style={styles.postImage} />
            ))}
        </View>
      )}

      <Row style={styles.postActions}>
        {onLikePress ? (
          <Clickable
            onPress={() => onLikePress(post.id)}
            accessibilityRole="button"
            accessibilityLabel="Like post"
            style={styles.actionButton}
          >
            <Ionicons name="heart-outline" size={20} color={palette.foreground} />
            <ThemedText style={styles.actionText}>{post.likes}</ThemedText>
          </Clickable>
        ) : (
          <View style={styles.actionStat}>
            <Ionicons name="heart-outline" size={20} color={palette.foreground} />
            <ThemedText style={styles.actionText}>{post.likes}</ThemedText>
          </View>
        )}
        {onCommentPress ? (
          <Clickable
            onPress={() => onCommentPress(post.id)}
            accessibilityRole="button"
            accessibilityLabel="Open comments"
            style={styles.actionButton}
          >
            <Ionicons name="chatbubble-outline" size={20} color={palette.foreground} />
            <ThemedText style={styles.actionText}>{post.comments}</ThemedText>
          </Clickable>
        ) : (
          <View style={styles.actionStat}>
            <Ionicons name="chatbubble-outline" size={20} color={palette.foreground} />
            <ThemedText style={styles.actionText}>{post.comments}</ThemedText>
          </View>
        )}
        {onSharePress ? (
          <Clickable
            onPress={() => onSharePress(post.id)}
            accessibilityLabel="Share post"
            accessibilityRole="button"
            style={styles.actionButton}
          >
            <Ionicons name="share-outline" size={20} color={palette.foreground} />
          </Clickable>
        ) : (
          <View style={styles.actionStat}>
            <Ionicons name="share-outline" size={20} color={palette.foreground} />
          </View>
        )}
      </Row>
    </SurfaceCard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  postCard: {
    gap: Spacing.md,
  },
  postHeader: {
    gap: Spacing.sm,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
  },
  postAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarFallbackText: {
    ...Typography.bodySmallSemiBold,
  },
  postHeaderText: {
    flex: 1,
    gap: Spacing.micro,
  },
  contextPill: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  contextPillText: {
    ...Typography.micro,
    fontWeight: '600',
  },
  postDate: {
    ...Typography.caption,
    opacity: 0.6,
  },
  postContent: {
    ...Typography.body,
    lineHeight: Typography.bodySmall.lineHeight,
  },
  postMedia: {
    gap: Spacing.xs,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: Radii.md,
  },
  postActions: {
    gap: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  actionButton: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionStat: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    ...Typography.bodySmall,
  },
});

// ─── Exports ────────────────────────────────────────────────────

export const ProfilePostCard = ProfilePostCardInner;
export default ProfilePostCard;
