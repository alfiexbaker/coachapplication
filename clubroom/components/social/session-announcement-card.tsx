import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography  , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AggregatedFeedPost } from '@/services/social-feed-service';

// ─── Types ──────────────────────────────────────────────────────

export interface SessionAnnouncementCardProps {
  post: AggregatedFeedPost;
}

// ─── Component ──────────────────────────────────────────────────

function SessionAnnouncementCardInner({ post }: SessionAnnouncementCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const priceLabel = (() => {
    if (post.sessionPrice == null || post.sessionPrice === 0) return 'Free';
    const symbol = post.sessionCurrency === 'GBP' ? '\u00A3' : post.sessionCurrency ?? '';
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
      <View style={styles.sessionCardHeader}>
        <View style={[styles.sessionTypeBadge, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
          <Ionicons name="fitness" size={14} color={palette.tint} />
          <ThemedText style={[styles.sessionTypeBadgeText, { color: palette.tint }]}>
            {post.sessionType?.replace('_', ' ') || 'Open Session'}
          </ThemedText>
        </View>
        <ThemedText style={[styles.priceLabel, { color: palette.success }]}>
          {priceLabel}
        </ThemedText>
      </View>

      {/* Session title */}
      <ThemedText type="defaultSemiBold" style={styles.sessionTitle}>
        {post.title}
      </ThemedText>

      {/* Compact details row */}
      <View style={styles.sessionDetailsGrid}>
        {dateLabel ? (
          <View style={styles.sessionDetailItem}>
            <Ionicons name="calendar-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.detailText, { color: palette.text }]}>
              {dateLabel}
            </ThemedText>
          </View>
        ) : null}
        {post.sessionTime ? (
          <View style={styles.sessionDetailItem}>
            <Ionicons name="time-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.detailText, { color: palette.text }]}>
              {post.sessionTime}
            </ThemedText>
          </View>
        ) : null}
        {post.eventLocation ? (
          <View style={styles.sessionDetailItem}>
            <Ionicons name="location-outline" size={14} color={palette.muted} />
            <ThemedText
              style={[styles.detailText, { color: palette.text }]}
              numberOfLines={1}
            >
              {post.eventLocation}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {/* Book Now CTA */}
      <TouchableOpacity
        style={[styles.bookNowButton, { backgroundColor: palette.tint }]}
        onPress={handleBookNow}
        activeOpacity={0.8}
      >
        <Ionicons name="flash" size={16} color={palette.onPrimary} />
        <ThemedText style={[styles.bookNowText, { color: palette.onPrimary }]}>
          Book Now
        </ThemedText>
      </TouchableOpacity>
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
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
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
  sessionDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  sessionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
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
