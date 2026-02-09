/**
 * AthletesStatsBar — Quick summary stats for the athletes tab.
 *
 * Shows: Total athletes, Active, Sessions this week, Revenue this month.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { rosterService } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';
import type { Booking } from '@/constants/app-types';

// ============================================================================
// TYPES
// ============================================================================

interface AthletesStatsBarProps {
  roster: RosterEntry[];
  upcomingSessions: Record<string, Booking>;
}

// ============================================================================
// COMPONENT
// ============================================================================

function AthletesStatsBarInner({ roster, upcomingSessions }: AthletesStatsBarProps) {
  const { colors } = useTheme();

  const stats = useMemo(() => {
    const total = roster.length;
    const active = roster.filter((a) => a.status === 'ACTIVE').length;

    // Sessions this week: count unique upcoming sessions within 7 days
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const sessionsThisWeek = Object.values(upcomingSessions).filter(
      (b) => new Date(b.scheduledAt).getTime() - now < weekMs && new Date(b.scheduledAt).getTime() > now
    ).length;

    // Total revenue across roster
    const totalRevenue = roster.reduce((sum, a) => sum + a.totalRevenue, 0);

    return [
      { label: 'Total', value: String(total), icon: 'people' as const, color: colors.tint },
      { label: 'Active', value: String(active), icon: 'checkmark-circle' as const, color: colors.success },
      { label: 'This Week', value: String(sessionsThisWeek), icon: 'calendar' as const, color: colors.tint },
      { label: 'Revenue', value: rosterService.formatRevenue(totalRevenue), icon: 'cash' as const, color: colors.success },
    ];
  }, [roster, upcomingSessions, colors]);

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Row gap="xs" style={styles.container}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={[styles.statCard, { backgroundColor: colors.surface }]}
          >
            <Ionicons name={stat.icon} size={16} color={stat.color} />
            <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.muted }]}>
              {stat.label}
            </ThemedText>
          </View>
        ))}
      </Row>
    </Animated.View>
  );
}

export const AthletesStatsBar = React.memo(AthletesStatsBarInner);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.micro,
  },
  statValue: {
    ...Typography.bodySemiBold,
  },
  statLabel: {
    ...Typography.micro,
  },
});
