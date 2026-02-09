import React, { memo, useCallback } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { AggregatedFeedPost } from '@/services/social-feed-service';
import { SessionAnnouncementCard } from './session-announcement-card';
import { CommentPreview } from './comment-preview';
import { useTheme } from '@/hooks/useTheme';

// ─── Sub-components ─────────────────────────────────────────────

const OriginBadge = memo(function OriginBadge({
  clubName,
  clubBadge,
  clubId,
  feedType,
}: {
  clubName: string;
  clubBadge?: string;
  clubId: string;
  feedType?: string;
}) {
  const { colors: palette } = useTheme();

  const handleClubPress = () => {
    router.push(Routes.club(clubId));
  };

  if (feedType === 'PERSONAL') {
    return (
      <View style={styles.originBadgeRow}>
        <View
          style={[
            styles.clubBadge,
            { backgroundColor: withAlpha(palette.success, 0.06), borderColor: withAlpha(palette.success, 0.19) },
          ]}
        >
          <Ionicons name="person-circle-outline" size={16} color={palette.success} />
          <ThemedText style={[styles.clubBadgeText, { color: palette.success }]} numberOfLines={1}>
            Personal
          </ThemedText>
        </View>
      </View>
    );
  }

  if (feedType === 'BOTH') {
    return (
      <View style={styles.originBadgeRow}>
        <View
          style={[
            styles.clubBadge,
            { backgroundColor: withAlpha(palette.success, 0.06), borderColor: withAlpha(palette.success, 0.19) },
          ]}
        >
          <Ionicons name="person-circle-outline" size={16} color={palette.success} />
          <ThemedText style={[styles.clubBadgeText, { color: palette.success }]} numberOfLines={1}>
            Personal
          </ThemedText>
        </View>
        <Pressable
          onPress={handleClubPress}
          style={[
            styles.clubBadge,
            { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: withAlpha(palette.tint, 0.19) },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[styles.clubBadgeIcon, { backgroundColor: palette.tint }]}>
            <ThemedText style={[styles.clubBadgeIconText, { color: palette.onPrimary }]}>
              {clubBadge?.slice(0, 2) || clubName.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]} numberOfLines={1}>
            {clubName}
          </ThemedText>
          <Ionicons name="chevron-forward" size={12} color={palette.tint} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={handleClubPress}
      style={[
        styles.clubBadge,
        { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: withAlpha(palette.tint, 0.19) },
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={[styles.clubBadgeIcon, { backgroundColor: palette.tint }]}>
        <ThemedText style={[styles.clubBadgeIconText, { color: palette.onPrimary }]}>
          {clubBadge?.slice(0, 2) || clubName.slice(0, 2).toUpperCase()}
        </ThemedText>
      </View>
      <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]} numberOfLines={1}>
        {clubName}
      </ThemedText>
      <Ionicons name="chevron-forward" size={12} color={palette.tint} />
    </Pressable>
  );
});

// ─── Types ──────────────────────────────────────────────────────

export interface FeedPostCardProps {
  post: AggregatedFeedPost;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

// ─── Helpers (pure — no component state) ────────────────────────

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

// ─── Component ──────────────────────────────────────────────────

function FeedPostCardInner({ post, onLike, onComment, onShare }: FeedPostCardProps) {
  const { colors: palette } = useTheme();

  const initials =
    post.postAs === 'club'
      ? post.clubBadge?.slice(0, 2) || 'CL'
      : post.authorName?.slice(0, 2).toUpperCase() || 'ME';

  const handlePostPress = () => {
    router.push(Routes.modalPostDetail(post.id));
  };

  const handleLike = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onLike?.(post.id);
  }, [onLike, post.id]);

  const handleComment = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onComment?.(post.id);
  }, [onComment, post.id]);

  const handleShare = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onShare?.(post.id);
  }, [onShare, post.id]);

  return (
    <SurfaceCard style={styles.feedCard} onPress={handlePostPress}>
      {/* Origin badge */}
      <OriginBadge
        clubName={post.clubName}
        clubBadge={post.clubBadge}
        clubId={post.clubId}
        feedType={post.feedType}
      />

      {/* Header */}
      <View style={styles.feedHeader}>
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
        <View style={styles.bodyContainer}>
          <View style={styles.authorRow}>
            <ThemedText type="defaultSemiBold">{post.authorName}</ThemedText>
            {post.postAs === 'club' && (
              <View style={[styles.officialBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <ThemedText style={[styles.officialBadgeText, { color: palette.tint }]}>
                  Official
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
            {formatDate(post.createdAt)} · {post.audienceLabel || post.audience}
          </ThemedText>
        </View>
      </View>

      {/* Content */}
      <View style={styles.postContent}>
        <ThemedText type="defaultSemiBold" style={styles.postTitle}>
          {post.title}
        </ThemedText>
        <ThemedText style={[styles.postBody, { color: palette.text }]}>
          {post.body}
        </ThemedText>
      </View>

      {/* Image */}
      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      {/* Event details */}
      {post.postType === 'event' && post.eventDate && (
        <View
          style={[
            styles.eventDetails,
            { backgroundColor: withAlpha(palette.tint, 0.03), borderColor: palette.border },
          ]}
        >
          <View style={styles.eventRow}>
            <Ionicons name="calendar" size={16} color={palette.tint} />
            <ThemedText style={{ color: palette.text }}>
              {new Date(post.eventDate).toLocaleDateString('en-GB', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </ThemedText>
          </View>
          {post.eventLocation && (
            <View style={styles.eventRow}>
              <Ionicons name="location" size={16} color={palette.tint} />
              <ThemedText style={{ color: palette.text }}>{post.eventLocation}</ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Session announcement */}
      {post.postType === 'session_announcement' && (
        <SessionAnnouncementCard post={post} />
      )}

      {/* Badge awarded */}
      {post.badgeAwarded && <Chip active>{post.badgeAwarded}</Chip>}

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <View style={styles.attachments}>
          {post.attachments.map((attachment) => (
            <View
              key={attachment}
              style={[
                styles.attachmentChip,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <Ionicons name="attach" size={14} color={palette.muted} />
              <ThemedText style={[styles.attachmentText, { color: palette.muted }]}>
                {attachment}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.feedFooter}>
        <Pressable
          style={styles.actionButton}
          onPress={handleLike}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Like post"
          accessibilityRole="button"
        >
          <Ionicons name="heart-outline" size={18} color={palette.muted} />
          <ThemedText style={[styles.actionCount, { color: palette.muted }]}>
            {post.reactionCount ?? 0}
          </ThemedText>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={handleComment}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Comment on post"
          accessibilityRole="button"
        >
          <Ionicons name="chatbubble-outline" size={18} color={palette.muted} />
          <ThemedText style={[styles.actionCount, { color: palette.muted }]}>
            {post.commentCount ?? 0}
          </ThemedText>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={handleShare}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Share post"
          accessibilityRole="button"
        >
          <Ionicons name="share-outline" size={18} color={palette.muted} />
        </Pressable>
      </View>

      {/* Comment preview */}
      {(post.commentCount ?? 0) > 0 && (
        <CommentPreview
          postId={post.id}
          commentCount={post.commentCount ?? 0}
          onPress={handlePostPress}
        />
      )}
    </SurfaceCard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  feedCard: {
    gap: Spacing.sm,
  },
  originBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    marginBottom: Spacing.xs,
  },
  clubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingRight: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  clubBadgeIcon: {
    width: 18,
    height: 18,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeIconText: {
    ...Typography.micro,
    fontSize: 8,
    letterSpacing: 0,
    textTransform: 'none',
  },
  clubBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
    maxWidth: 150,
  },
  feedHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  bodyContainer: {
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.bodySmallSemiBold,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  officialBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
  officialBadgeText: {
    ...Typography.micro,
    letterSpacing: 0,
    textTransform: 'none',
  },
  metaText: {
    ...Typography.caption,
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  attachmentText: {
    ...Typography.caption,
  },
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

// ─── Exports ────────────────────────────────────────────────────

export const FeedPostCard = React.memo(FeedPostCardInner);
export default FeedPostCard;
