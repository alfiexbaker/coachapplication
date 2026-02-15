import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { AggregatedFeedPost } from '@/services/social-feed-service';
import { SessionAnnouncementCard } from './session-announcement-card';
import { CommentPreview } from './comment-preview';
import { OriginBadge } from './feed-post-origin-badge';
import { FeedPostActions } from './feed-post-actions';
import { useTheme } from '@/hooks/useTheme';

import { PostHeader, EventDetailsCard, AttachmentChips } from './feed-post-card-sections';

// Re-export extracted components for backward compat
export {
  formatDate,
  PostHeader,
  EventDetailsCard,
  AttachmentChips,
} from './feed-post-card-sections';
export type {
  PostHeaderProps,
  EventDetailsCardProps,
  AttachmentChipsProps,
} from './feed-post-card-sections';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FeedPostCardProps {
  post: AggregatedFeedPost;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

function FeedPostCardInner({ post, onLike, onComment, onShare }: FeedPostCardProps) {
  const { colors: palette } = useTheme();
  const authorName = post.authorId || 'Coach';

  const initials =
    post.postAs === 'club'
      ? post.clubBadge?.slice(0, 2) || 'CL'
      : authorName.slice(0, 2).toUpperCase() || 'ME';

  const handlePostPress = () => {
    router.push(Routes.modalPostDetail(post.id));
  };

  return (
    <SurfaceCard style={styles.feedCard}>
      <View style={styles.contentArea}>
        <OriginBadge
          clubName={post.clubName}
          clubBadge={post.clubBadge}
          clubId={post.clubId}
          feedType={post.feedType}
        />

        <PostHeader
          initials={initials}
          authorName={authorName}
          postAs={post.postAs}
          createdAt={post.createdAt}
          audienceLabel={post.audienceLabel}
          audience={post.audience}
          palette={palette}
        />

        {/* Content */}
        <View style={styles.postContent}>
          <ThemedText type="defaultSemiBold" style={styles.postTitle}>
            {post.title}
          </ThemedText>
          <ThemedText style={[styles.postBody, { color: palette.text }]}>{post.body}</ThemedText>
        </View>

        {/* Image */}
        {post.imageUrl && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
        )}

        {/* Event details */}
        {post.postType === 'event' && post.eventDate && (
          <EventDetailsCard
            eventDate={post.eventDate}
            eventLocation={post.eventLocation}
            palette={palette}
          />
        )}

        {/* Session announcement */}
        {post.postType === 'session_announcement' && <SessionAnnouncementCard post={post} />}

        {/* Badge awarded */}
        {post.badgeAwarded && <Chip active>{post.badgeAwarded}</Chip>}

        {/* Attachments */}
        {post.attachments && post.attachments.length > 0 && (
          <AttachmentChips attachments={post.attachments} palette={palette} />
        )}
      </View>

      <Clickable
        onPress={handlePostPress}
        style={styles.detailsLink}
        accessibilityLabel="Open post details"
      >
        <ThemedText style={[styles.detailsLinkText, { color: palette.tint }]}>View details</ThemedText>
      </Clickable>

      {/* Actions */}
      <FeedPostActions
        postId={post.id}
        reactionCount={post.reactionCount ?? 0}
        commentCount={post.commentCount ?? 0}
        onLike={onLike}
        onComment={onComment}
        onShare={onShare}
      />

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

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  feedCard: {
    gap: Spacing.sm,
  },
  contentArea: {
    gap: Spacing.sm,
  },
  detailsLink: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  detailsLinkText: {
    ...Typography.smallSemiBold,
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
});

// ─── Exports ────────────────────────────────────────────────────────────────

export const FeedPostCard = React.memo(FeedPostCardInner);
export default FeedPostCard;
