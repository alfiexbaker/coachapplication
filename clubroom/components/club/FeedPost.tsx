import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ClubFeedPost } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { Row } from '@/components/primitives';
import { Column } from '@/components/primitives/column';
import { socialFeedService } from '@/services/social-feed-service';

import { runAsyncFinally, runAsyncTryCatchFinally } from '@/utils/async-control';

export interface FeedPostProps {
  post: ClubFeedPost;
  canPin?: boolean;
  onPinToggle?: (postId: string) => void;
  onLike?: (postId: string) => void | Promise<void>;
  onComment?: (postId: string) => void | Promise<void>;
  onShare?: (postId: string) => void | Promise<void>;
}

export function FeedPost({ post, canPin, onPinToggle, onLike, onComment, onShare }: FeedPostProps) {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [optimisticReactionCount, setOptimisticReactionCount] = useState<number | null>(null);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const authorLabel = post.postAs === 'club' ? post.clubId || 'Club' : post.authorId || 'Coach';
  const initials = post.postAs === 'club' ? 'CL' : authorLabel.slice(0, 2).toUpperCase() || 'ME';
  const showActions = !!(onLike || onComment || onShare);
  const baseReactionCount = post.reactionCount ?? 0;
  const hasUserReacted = currentUser?.id
    ? socialFeedService.hasUserReacted(post.id, currentUser.id)
    : false;
  const liked = optimisticLiked ?? hasUserReacted;
  const reactionCount = optimisticReactionCount ?? baseReactionCount;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const handleLikePress = async () => {
    if (!onLike || isLiking) return;
    const previousLiked = liked;
    const previousCount = reactionCount;
    const nextLiked = !previousLiked;
    const nextCount = Math.max(0, previousCount + (nextLiked ? 1 : -1));

    setOptimisticLiked(nextLiked);
    setOptimisticReactionCount(nextCount);
    setIsLiking(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    await runAsyncTryCatchFinally(
      async () => {
        await Promise.resolve(onLike(post.id));
      },
      async (error) => {
        setOptimisticLiked(previousLiked);
        setOptimisticReactionCount(previousCount);
      },
      () => {
        setIsLiking(false);
        setOptimisticLiked(null);
        setOptimisticReactionCount(null);
      },
    );
  };

  const handleCommentPress = async () => {
    if (!onComment || isCommenting) return;
    setIsCommenting(true);

    await runAsyncFinally(
      async () => {
        await Promise.resolve(onComment(post.id));
      },
      () => {
        setIsCommenting(false);
      },
    );
  };

  return (
    <SurfaceCard
      style={[
        styles.feedCard,
        post.isPinned ? { borderColor: palette.tint, borderWidth: 1 } : undefined,
      ]}
    >
      {/* Pinned indicator */}
      {post.isPinned && (
        <Row style={[styles.pinnedBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="pin" size={12} color={palette.tint} />
          <ThemedText style={[styles.pinnedText, { color: palette.tint }]}>Pinned</ThemedText>
        </Row>
      )}

      {/* Post header */}
      <Row style={styles.feedHeader}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: withAlpha(palette.tint, 0.06),
              borderColor: palette.border,
              borderWidth: 1,
            },
          ]}
        >
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>
        <Column flex>
          <Row style={styles.authorRow}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {authorLabel}
            </ThemedText>
            {post.postAs === 'club' && (
              <View style={[styles.clubBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]}>
                  Club
                </ThemedText>
              </View>
            )}
          </Row>
          <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
            {formatDate(post.createdAt)} · {post.audienceLabel || post.audience}
          </ThemedText>
        </Column>
        {canPin && (
          <Clickable onPress={() => onPinToggle?.(post.id)} hitSlop={10}>
            <Ionicons
              name={post.isPinned ? 'pin' : 'pin-outline'}
              size={18}
              color={post.isPinned ? palette.tint : palette.muted}
            />
          </Clickable>
        )}
      </Row>

      {/* Post content */}
      <View style={styles.postContent}>
        <ThemedText type="defaultSemiBold" style={styles.postTitle}>
          {post.title}
        </ThemedText>
        <ThemedText style={[styles.postBody, { color: palette.text }]}>{post.body}</ThemedText>
      </View>

      {/* Image if present */}
      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} contentFit="cover" />
      )}

      {/* Event details */}
      {post.postType === 'event' && post.eventDate && (
        <View
          style={[
            styles.eventDetails,
            { backgroundColor: withAlpha(palette.tint, 0.03), borderColor: palette.border },
          ]}
        >
          <Row style={styles.eventRow}>
            <Ionicons name="calendar" size={16} color={palette.tint} />
            <ThemedText style={{ color: palette.text }}>
              {new Date(post.eventDate).toLocaleDateString('en-GB', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </ThemedText>
          </Row>
          {post.eventLocation && (
            <Row style={styles.eventRow}>
              <Ionicons name="location" size={16} color={palette.tint} />
              <ThemedText style={{ color: palette.text }}>{post.eventLocation}</ThemedText>
            </Row>
          )}
        </View>
      )}

      {/* Badge awarded */}
      {post.badgeAwarded && <Chip active label={post.badgeAwarded} />}

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <Row style={styles.attachments}>
          {post.attachments.map((attachment) => (
            <Row
              key={attachment}
              style={[
                styles.attachmentChip,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <Ionicons name="attach" size={14} color={palette.muted} />
              <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                {attachment}
              </ThemedText>
            </Row>
          ))}
        </Row>
      )}

      {/* Post actions */}
      {showActions && (
        <Row style={styles.feedFooter}>
          {onLike && (
            <Clickable
              style={styles.actionButton}
              accessibilityLabel="Like post"
              disabled={isLiking}
              onPress={handleLikePress}
            >
              {isLiking ? (
                <ActivityIndicator size="small" color={palette.tint} />
              ) : (
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={18}
                  color={liked ? palette.error : palette.muted}
                />
              )}
              <ThemedText
                style={{ ...Typography.small, color: liked ? palette.error : palette.muted }}
              >
                {reactionCount}
              </ThemedText>
            </Clickable>
          )}
          {onComment && (
            <Clickable
              style={styles.actionButton}
              accessibilityLabel="Comment on post"
              disabled={isCommenting}
              onPress={handleCommentPress}
            >
              {isCommenting ? (
                <ActivityIndicator size="small" color={palette.tint} />
              ) : (
                <Ionicons name="chatbubble-outline" size={18} color={palette.muted} />
              )}
              <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                {post.commentCount ?? 0}
              </ThemedText>
            </Clickable>
          )}
          {onShare && (
            <Clickable
              accessibilityLabel="Share post"
              style={styles.actionButton}
              onPress={() => onShare(post.id)}
            >
              <Ionicons name="share-outline" size={18} color={palette.muted} />
            </Clickable>
          )}
        </Row>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  feedCard: {
    gap: Spacing.sm,
  },
  pinnedBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    marginBottom: Spacing.xs,
  },
  pinnedText: { ...Typography.caption },
  feedHeader: {
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.bodySmallSemiBold },
  authorRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  clubBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
  clubBadgeText: { ...Typography.micro },
  postContent: {
    gap: Spacing.xxs,
  },
  postTitle: {
    ...Typography.bodySemiBold,
  },
  postBody: {
    ...Typography.body,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: Radii.md,
  },
  eventDetails: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  eventRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  attachments: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  attachmentChip: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  feedFooter: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  actionButton: {
    alignItems: 'center',
    gap: Spacing.xxs,
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
    justifyContent: 'center',
  },
});
