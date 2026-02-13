import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
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
  onLikePress?: (postId: string) => void;
  onCommentPress?: (postId: string) => void;
  onSharePress?: (postId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────

function ProfilePostCardInner({
  post,
  coachName,
  coachAvatar,
  onLikePress,
  onCommentPress,
  onSharePress,
}: ProfilePostCardProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.postCard}>
      <Row style={styles.postHeader}>
        <Image source={{ uri: coachAvatar }} style={styles.postAvatar} />
        <View style={styles.postHeaderText}>
          <ThemedText type="subtitle">{coachName}</ThemedText>
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
            post.mediaUrls.map((url, index) => (
              <Image key={index} source={{ uri: url }} style={styles.postImage} />
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
  postHeaderText: {
    flex: 1,
    gap: Spacing.micro,
  },
  postDate: {
    ...Typography.caption,
    opacity: 0.6,
  },
  postContent: {
    ...Typography.body,
    lineHeight: 20,
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

export const ProfilePostCard = React.memo(ProfilePostCardInner);
export default ProfilePostCard;
