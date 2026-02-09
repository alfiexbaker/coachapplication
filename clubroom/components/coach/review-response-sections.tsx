/**
 * Review Response — Extracted sections
 *
 * Sub-components for the ReviewResponse card.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ---------------------------------------------------------------------------
// ReviewHeader
// ---------------------------------------------------------------------------

export interface ReviewHeaderProps {
  reviewerName: string;
  rating: number;
  formattedDate: string;
  palette: ThemeColors;
}

export const ReviewHeader = memo(function ReviewHeader({
  reviewerName,
  rating,
  formattedDate,
  palette,
}: ReviewHeaderProps) {
  return (
    <View style={styles.reviewHeader}>
      <View style={styles.reviewerInfo}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <ThemedText style={[Typography.bodySemiBold, { color: palette.tint }]}>
            {reviewerName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.reviewerMeta}>
          <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
            {reviewerName}
          </ThemedText>
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            {formattedDate}
          </ThemedText>
        </View>
      </View>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={rating >= star ? 'star' : 'star-outline'}
            size={Components.icon.sm}
            color={rating >= star ? palette.warning : palette.border}
          />
        ))}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// ExistingReplyCard
// ---------------------------------------------------------------------------

export interface ExistingReplyCardProps {
  reply: string;
  palette: ThemeColors;
}

export const ExistingReplyCard = memo(function ExistingReplyCard({ reply, palette }: ExistingReplyCardProps) {
  return (
    <View style={[styles.existingReply, { backgroundColor: palette.surfaceSecondary }]}>
      <View style={styles.replyHeader}>
        <Ionicons name="return-down-forward" size={Components.icon.sm} color={palette.muted} />
        <ThemedText style={[Typography.caption, { color: palette.muted }]}>
          Your Reply
        </ThemedText>
      </View>
      <ThemedText style={[Typography.body, { color: palette.text }]}>
        {reply}
      </ThemedText>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  avatarPlaceholder: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerMeta: {
    gap: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.micro,
  },
  existingReply: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    gap: Spacing.xs,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
});
