import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { AggregatedFeedPost } from '@/services/social-feed-service';
import { useTheme } from '@/hooks/useTheme';

// ─── Types ──────────────────────────────────────────────────────

export interface SessionAnnouncementCardProps {
  post: AggregatedFeedPost;
}

// ─── Component ──────────────────────────────────────────────────

function SessionAnnouncementCardInner({ post }: SessionAnnouncementCardProps) {
  const { colors: palette } = useTheme();

  const priceLabel = (() => {
    if (post.sessionPrice == null || post.sessionPrice === 0) return 'Free';
    const symbol = post.sessionCurrency === 'GBP' ? '\u00A3' : (post.sessionCurrency ?? '');
    return `${symbol}${post.sessionPrice}`;
  })();

  const dateLabel = post.eventDate
    ? new Date(post.eventDate).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';

  const handleBookNow = () => {
    if (post.sessionId) {
      router.push(Routes.groupSession(post.sessionId));
    }
  };

  return (
    <View
      style={[
        styles.sessionCard,
        { backgroundColor: withAlpha(palette.tint, 0.02), borderColor: palette.border },
      ]}
    >
      {/* Session type chip */}
      <Row align="center" justify="between">
        <Row
          align="center"
          gap="xxs"
          style={[styles.sessionTypeBadge, { backgroundColor: withAlpha(palette.tint, 0.07) }]}
        >
          <Ionicons name="fitness" size={14} color={palette.tint} />
          <ThemedText style={[styles.sessionTypeBadgeText, { color: palette.tint }]}>
            {post.sessionType?.replace('_', ' ') || 'Open Session'}
          </ThemedText>
        </Row>
        <ThemedText style={[styles.priceLabel, { color: palette.success }]}>
          {priceLabel}
        </ThemedText>
      </Row>

      {/* Session title */}
      <ThemedText type="defaultSemiBold" style={styles.sessionTitle}>
        {post.title}
      </ThemedText>

      {/* Compact details row */}
      <Row wrap gap="sm">
        {dateLabel ? (
          <Row align="center" gap="xxs">
            <Ionicons name="calendar-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.detailText, { color: palette.text }]}>
              {dateLabel}
            </ThemedText>
          </Row>
        ) : null}
        {post.sessionTime ? (
          <Row align="center" gap="xxs">
            <Ionicons name="time-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.detailText, { color: palette.text }]}>
              {post.sessionTime}
            </ThemedText>
          </Row>
        ) : null}
        {post.eventLocation ? (
          <Row align="center" gap="xxs">
            <Ionicons name="location-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.detailText, { color: palette.text }]} numberOfLines={1}>
              {post.eventLocation}
            </ThemedText>
          </Row>
        ) : null}
      </Row>

      {/* Book Now CTA */}
      <Clickable
        style={[styles.bookNowButton, { backgroundColor: palette.tint }]}
        onPress={handleBookNow}
      >
        <Ionicons name="flash" size={16} color={palette.onPrimary} />
        <ThemedText style={[styles.bookNowText, { color: palette.onPrimary }]}>Book Now</ThemedText>
      </Clickable>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sessionCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  sessionTypeBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  sessionTypeBadgeText: {
    ...Typography.micro,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  priceLabel: {
    ...Typography.bodySemiBold,
  },
  sessionTitle: {
    ...Typography.subheading,
  },
  detailText: {
    ...Typography.small,
  },
  bookNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  bookNowText: {
    ...Typography.bodySmallSemiBold,
  },
});

// ─── Exports ────────────────────────────────────────────────────

export const SessionAnnouncementCard = React.memo(SessionAnnouncementCardInner);
export default SessionAnnouncementCard;
