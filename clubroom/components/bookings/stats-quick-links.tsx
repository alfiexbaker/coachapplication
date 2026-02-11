/**
 * StatsQuickLinks — 2x2 grid of quick navigation links.
 *
 * Each link shows an icon and label with a tinted background.
 */

import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface StatsQuickLinksProps {
  onProgress: () => void;
  onBadges: () => void;
  onBookings: () => void;
  onMessages: () => void;
}

export const StatsQuickLinks = memo(function StatsQuickLinks({
  onProgress,
  onBadges,
  onBookings,
  onMessages,
}: StatsQuickLinksProps) {
  const { colors: palette } = useTheme();

  const links = [
    {
      id: 'progress',
      icon: 'analytics-outline' as const,
      label: 'Full Progress',
      color: palette.tint,
      onPress: onProgress,
    },
    {
      id: 'badges',
      icon: 'ribbon-outline' as const,
      label: 'View Badges',
      color: palette.accent,
      onPress: onBadges,
    },
    {
      id: 'bookings',
      icon: 'calendar-outline' as const,
      label: 'Book Session',
      color: palette.warning,
      onPress: onBookings,
    },
    {
      id: 'messages',
      icon: 'chatbubble-outline' as const,
      label: 'Messages',
      color: palette.success,
      onPress: onMessages,
    },
  ];

  return (
    <Column gap="sm">
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Explore More
      </ThemedText>
      <Row wrap gap="sm">
        {links.map((link) => (
          <Clickable
            key={link.id}
            style={[
              styles.link,
              {
                backgroundColor: withAlpha(link.color, 0.06),
                borderColor: withAlpha(link.color, 0.19),
              },
            ]}
            onPress={link.onPress}
            accessibilityLabel={link.label}
          >
            <Ionicons name={link.icon} size={24} color={link.color} />
            <ThemedText style={[styles.linkText, { color: link.color }]}>{link.label}</ThemedText>
          </Clickable>
        ))}
      </Row>
    </Column>
  );
});

const styles = StyleSheet.create({
  sectionTitle: {
    paddingLeft: Spacing.xs,
  },
  link: {
    flex: 1,
    minWidth: '47%',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  linkText: {
    ...Typography.smallSemiBold,
  },
});
