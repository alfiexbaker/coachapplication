import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── Helpers ────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
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

// ─── PostHeader ─────────────────────────────────────────────────

export interface PostHeaderProps {
  initials: string;
  authorName: string;
  postAs?: string;
  createdAt: string;
  audienceLabel?: string;
  audience?: string;
  palette: ThemeColors;
}

export const PostHeader = memo(function PostHeader({
  initials,
  authorName,
  postAs,
  createdAt,
  audienceLabel,
  audience,
  palette,
}: PostHeaderProps) {
  return (
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
          <ThemedText type="defaultSemiBold">{authorName}</ThemedText>
          {postAs === 'club' && (
            <View style={[styles.officialBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <ThemedText style={[styles.officialBadgeText, { color: palette.tint }]}>
                Official
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={[styles.metaText, { color: palette.muted }]}>
          {formatDate(createdAt)} · {audienceLabel || audience}
        </ThemedText>
      </View>
    </View>
  );
});

// ─── EventDetailsCard ───────────────────────────────────────────

export interface EventDetailsCardProps {
  eventDate: string;
  eventLocation?: string;
  palette: ThemeColors;
}

export const EventDetailsCard = memo(function EventDetailsCard({
  eventDate,
  eventLocation,
  palette,
}: EventDetailsCardProps) {
  return (
    <View
      style={[
        styles.eventDetails,
        { backgroundColor: withAlpha(palette.tint, 0.03), borderColor: palette.border },
      ]}
    >
      <View style={styles.eventRow}>
        <Ionicons name="calendar" size={16} color={palette.tint} />
        <ThemedText style={{ color: palette.text }}>
          {new Date(eventDate).toLocaleDateString('en-GB', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </ThemedText>
      </View>
      {eventLocation && (
        <View style={styles.eventRow}>
          <Ionicons name="location" size={16} color={palette.tint} />
          <ThemedText style={{ color: palette.text }}>{eventLocation}</ThemedText>
        </View>
      )}
    </View>
  );
});

// ─── AttachmentChips ────────────────────────────────────────────

export interface AttachmentChipsProps {
  attachments: string[];
  palette: ThemeColors;
}

export const AttachmentChips = memo(function AttachmentChips({
  attachments,
  palette,
}: AttachmentChipsProps) {
  if (attachments.length === 0) return null;

  return (
    <View style={styles.attachments}>
      {attachments.map((attachment) => (
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
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
});
