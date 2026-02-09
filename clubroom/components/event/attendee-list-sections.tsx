/**
 * Extracted sub-components for AttendeeList.
 *
 * AttendeeStatsCard — stats overview with capacity bar.
 * AttendeeFilterChip — single filter chip for FlatList renderItem.
 * AttendeeEmptyState — empty state with icon + message.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { EventAttendanceStats, RSVPStatus } from '@/constants/types';
import { scaleFont } from '@/utils/scale';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FilterType = 'ALL' | RSVPStatus | 'CHECKED_IN' | 'NOT_CHECKED_IN';

export interface FilterOption {
  key: FilterType;
  label: string;
  count: number;
}

// ─── AttendeeStatsCard ───────────────────────────────────────────────────────

interface AttendeeStatsCardProps {
  stats: EventAttendanceStats;
  palette: ThemeColors;
}

export const AttendeeStatsCard = memo(function AttendeeStatsCard({
  stats,
  palette,
}: AttendeeStatsCardProps) {
  const { rsvpCounts, checkedInCount, attendanceRate, capacity } = stats;
  const totalGoing = rsvpCounts.going + stats.expectedGuests;

  return (
    <View style={[styles.statsCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.success, 0.15) }]}>
            <Ionicons name="checkmark-circle" size={20} color={palette.success} />
          </View>
          <ThemedText style={styles.statValue}>{rsvpCounts.going}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Going</ThemedText>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.warning, 0.15) }]}>
            <Ionicons name="help-circle" size={20} color={palette.warning} />
          </View>
          <ThemedText style={styles.statValue}>{rsvpCounts.maybe}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Maybe</ThemedText>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.tint, 0.15) }]}>
            <Ionicons name="log-in" size={20} color={palette.tint} />
          </View>
          <ThemedText style={styles.statValue}>{checkedInCount}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Checked In</ThemedText>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.accent, 0.15) }]}>
            <Ionicons name="analytics" size={20} color={palette.accent} />
          </View>
          <ThemedText style={styles.statValue}>{attendanceRate}%</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Rate</ThemedText>
        </View>
      </View>

      {capacity && (
        <View style={[styles.capacitySection, { borderTopColor: palette.border }]}>
          <View style={styles.capacityHeader}>
            <ThemedText style={[styles.capacityLabel, { color: palette.muted }]}>
              Capacity
            </ThemedText>
            <ThemedText style={[styles.capacityValue, { color: palette.text }]}>
              {totalGoing} / {capacity}
            </ThemedText>
          </View>
          <View style={[styles.capacityBar, { backgroundColor: palette.border }]}>
            <View
              style={[
                styles.capacityFill,
                {
                  backgroundColor: totalGoing >= capacity ? palette.error : palette.success,
                  width: `${Math.min(100, (totalGoing / capacity) * 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
});

// ─── AttendeeFilterChip ──────────────────────────────────────────────────────

interface AttendeeFilterChipProps {
  item: FilterOption;
  isActive: boolean;
  onPress: () => void;
  palette: ThemeColors;
}

export const AttendeeFilterChip = memo(function AttendeeFilterChip({
  item,
  isActive,
  onPress,
  palette,
}: AttendeeFilterChipProps) {
  return (
    <Clickable
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: isActive ? palette.tint : 'transparent',
          borderColor: isActive ? palette.tint : palette.border,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.filterChipText,
          { color: isActive ? palette.onPrimary : palette.text },
        ]}
      >
        {item.label}
      </ThemedText>
      <View
        style={[
          styles.filterChipCount,
          { backgroundColor: isActive ? withAlpha(palette.onPrimary, 0.2) : palette.surface },
        ]}
      >
        <ThemedText
          style={[
            styles.filterChipCountText,
            { color: isActive ? palette.onPrimary : palette.muted },
          ]}
        >
          {item.count}
        </ThemedText>
      </View>
    </Clickable>
  );
});

// ─── AttendeeEmptyState ──────────────────────────────────────────────────────

interface AttendeeEmptyStateProps {
  message: string;
  palette: ThemeColors;
}

export const AttendeeEmptyState = memo(function AttendeeEmptyState({
  message,
  palette,
}: AttendeeEmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={48} color={palette.muted} />
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        {message}
      </ThemedText>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statsCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxs,
  },
  statValue: {
    fontSize: scaleFont(18),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: scaleFont(11),
    fontWeight: '500',
  },
  capacitySection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxs,
  },
  capacityLabel: {
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  capacityValue: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  capacityBar: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: 8,
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: scaleFont(13),
    fontWeight: '500',
  },
  filterChipCount: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    minWidth: 22,
    alignItems: 'center',
  },
  filterChipCountText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: scaleFont(15),
    textAlign: 'center',
  },
});
