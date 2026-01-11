import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ClubFeedPost } from '@/constants/types';

export interface FeedPostProps {
  post: ClubFeedPost;
  canPin?: boolean;
  onPinToggle?: (postId: string) => void;
}

export function FeedPost({ post, canPin, onPinToggle }: FeedPostProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const initials = post.postAs === 'club'
    ? 'CL'
    : (post.authorName?.slice(0, 2).toUpperCase() || 'ME');

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

  return (
    <SurfaceCard style={[styles.feedCard, post.isPinned && { borderColor: palette.tint, borderWidth: 1 }]}>
      {/* Pinned indicator */}
      {post.isPinned && (
        <View style={[styles.pinnedBadge, { backgroundColor: `${palette.tint}15` }]}>
          <Ionicons name="pin" size={12} color={palette.tint} />
          <ThemedText style={[styles.pinnedText, { color: palette.tint }]}>Pinned</ThemedText>
        </View>
      )}

      {/* Post header */}
      <View style={styles.feedHeader}>
        <View style={[styles.avatar, { backgroundColor: `${palette.tint}10`, borderColor: palette.border, borderWidth: 1 }]}>
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.authorRow}>
            <ThemedText type="defaultSemiBold">{post.authorName}</ThemedText>
            {post.postAs === 'club' && (
              <View style={[styles.clubBadge, { backgroundColor: `${palette.tint}15` }]}>
                <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]}>Club</ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
            {formatDate(post.createdAt)} · {post.audienceLabel || post.audience}
          </ThemedText>
        </View>
        {canPin && (
          <TouchableOpacity
            onPress={() => onPinToggle?.(post.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={post.isPinned ? 'pin' : 'pin-outline'}
              size={18}
              color={post.isPinned ? palette.tint : palette.muted}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Post content */}
      <View style={styles.postContent}>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>{post.title}</ThemedText>
        <ThemedText style={{ lineHeight: 20, color: palette.text }}>{post.body}</ThemedText>
      </View>

      {/* Image if present */}
      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Event details */}
      {post.postType === 'event' && post.eventDate && (
        <View style={[styles.eventDetails, { backgroundColor: `${palette.tint}08`, borderColor: palette.border }]}>
          <View style={styles.eventRow}>
            <Ionicons name="calendar" size={16} color={palette.tint} />
            <ThemedText style={{ color: palette.text }}>
              {new Date(post.eventDate).toLocaleDateString('en-GB', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
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

      {/* Badge awarded */}
      {post.badgeAwarded && (
        <Chip active>{post.badgeAwarded}</Chip>
      )}

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <View style={styles.attachments}>
          {post.attachments.map((attachment, idx) => (
            <View key={idx} style={[styles.attachmentChip, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Ionicons name="attach" size={14} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, fontSize: 12 }}>{attachment}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Post actions */}
      <View style={styles.feedFooter}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="heart-outline" size={18} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, fontSize: 13 }}>{post.reactionCount ?? 0}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={18} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, fontSize: 13 }}>{post.commentCount ?? 0}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={18} color={palette.muted} />
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  feedCard: {
    gap: Spacing.sm,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    marginBottom: Spacing.xs,
  },
  pinnedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  feedHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  clubBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clubBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  postContent: {
    gap: 4,
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
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  feedFooter: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
