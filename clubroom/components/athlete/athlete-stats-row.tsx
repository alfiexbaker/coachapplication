import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { rosterService } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';

export const AthleteStatsRow = React.memo(function AthleteStatsRow({
  athlete,
}: {
  athlete: RosterEntry;
}) {
  const { colors } = useTheme();

  const stats = useMemo(
    () => [
      {
        icon: 'calendar' as const,
        value: String(athlete.totalSessions),
        label: 'Sessions',
        color: colors.tint,
      },
      ...(athlete.averageRating
        ? [
            {
              icon: 'star' as const,
              value: athlete.averageRating.toFixed(1),
              label: 'Avg Rating',
              color: colors.rating,
            },
          ]
        : []),
      {
        icon: 'cash' as const,
        value: rosterService.formatRevenue(athlete.totalRevenue),
        label: 'Revenue',
        color: colors.success,
      },
    ],
    [athlete, colors]
  );

  return (
    <Row gap="sm">
      {stats.map((stat) => (
        <View
          key={stat.label}
          style={[styles.statCard, { backgroundColor: colors.surface }]}
        >
          <Ionicons name={stat.icon} size={18} color={stat.color} />
          <ThemedText type="heading">{stat.value}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.muted }]}>
            {stat.label}
          </ThemedText>
        </View>
      ))}
    </Row>
  );
});

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.xxs,
  },
  statLabel: {
    ...Typography.caption,
  },
});
