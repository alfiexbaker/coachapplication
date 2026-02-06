import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
}

// ─── Component ──────────────────────────────────────────────────

function ProfilePostCardInner({
  post,
  coachName,
  coachAvatar,
}: ProfilePostCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image source={{ uri: coachAvatar }} style={styles.postAvatar} />
        <View style={styles.postHeaderText}>
          <ThemedText type="subtitle">{coachName}</ThemedText>
          <ThemedText style={styles.postDate}>
            {new Date(post.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.postContent}>{post.content}</ThemedText>

      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <View style={styles.postMedia}>
          {post.mediaType === 'photo' &&
            post.mediaUrls.map((url, index) => (
              <Image key={index} source={{ uri: url }} style={styles.postImage} />
            ))}
        </View>
      )}

      <View style={styles.postActions}>
        <Clickable style={styles.actionButton}>
          <Ionicons name="heart-outline" size={20} color={palette.foreground} />
          <ThemedText style={styles.actionText}>{post.likes}</ThemedText>
        </Clickable>
        <Clickable style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color={palette.foreground} />
          <ThemedText style={styles.actionText}>{post.comments}</ThemedText>
        </Clickable>
        <Clickable style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color={palette.foreground} />
        </Clickable>
      </View>
    </SurfaceCard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  postCard: {
    gap: Spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
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
