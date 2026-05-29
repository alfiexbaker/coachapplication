import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { useTheme } from '@/hooks/useTheme';
import { formatDate } from './feed-post-card-helpers';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

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

export const PostHeader = function PostHeader({
  initials,
  authorName,
  postAs,
  createdAt,
  audienceLabel,
  audience,
  palette,
}: PostHeaderProps) {
  return (
    <Row gap="sm" align="start">
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
        <Row align="center" gap="xs">
          <ThemedText type="defaultSemiBold">{authorName}</ThemedText>
          {postAs === 'club' && (
            <View
              style={[styles.officialBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
            >
              <ThemedText style={[styles.officialBadgeText, { color: palette.tint }]}>
                Official
              </ThemedText>
            </View>
          )}
        </Row>
        <ThemedText style={[styles.metaText, { color: palette.muted }]}>
          {formatDate(createdAt)} · {audienceLabel || audience}
        </ThemedText>
      </View>
    </Row>
  );
};

// ─── EventDetailsCard ───────────────────────────────────────────

export interface EventDetailsCardProps {
  eventDate: string;
  eventLocation?: string;
  palette: ThemeColors;
}

const renderEventDetailsCard = function renderEventDetailsCard({
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
      <Row align="center" gap="sm">
        <Ionicons name="calendar" size={16} color={palette.tint} />
        <ThemedText style={{ color: palette.text }}>
          {new Date(eventDate).toLocaleDateString('en-GB', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </ThemedText>
      </Row>
      {eventLocation && (
        <Row align="center" gap="sm">
          <Ionicons name="location" size={16} color={palette.tint} />
          <ThemedText style={{ color: palette.text }}>{eventLocation}</ThemedText>
        </Row>
      )}
    </View>
  );
};
export const EventDetailsCard = renderEventDetailsCard;

// ─── AttachmentChips ────────────────────────────────────────────

export interface AttachmentChipsProps {
  attachments: string[];
  palette: ThemeColors;
}

const renderAttachmentChips = function renderAttachmentChips({
  attachments,
  palette,
}: AttachmentChipsProps) {
  if (attachments.length === 0) return null;

  return (
    <Row wrap gap="xs">
      {attachments.map((attachment) => (
        <Row
          key={attachment}
          align="center"
          gap="xxs"
          style={[
            styles.attachmentChip,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Ionicons name="attach" size={14} color={palette.muted} />
          <ThemedText style={[styles.attachmentText, { color: palette.muted }]}>
            {attachment}
          </ThemedText>
        </Row>
      ))}
    </Row>
  );
};
export const AttachmentChips = renderAttachmentChips;

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  attachmentChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  attachmentText: {
    ...Typography.caption,
  },
});
