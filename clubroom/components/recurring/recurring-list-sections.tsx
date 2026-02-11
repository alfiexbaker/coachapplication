/**
 * Extracted sub-components for RecurringList.
 *
 * RecurringFilterChip — filter pill for status filtering.
 * RecurringSummaryCard — subscription summary with active count + monthly value.
 * FILTER_DATA — static filter options.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography, Radii, withAlpha } from '@/constants/theme';
import type { RecurringBooking, RecurringBookingStatus } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FilterOption = 'ALL' | RecurringBookingStatus;

export interface FilterItem {
  key: FilterOption;
  label: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const FILTER_DATA: FilterItem[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PAUSED', label: 'Paused' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'EXPIRED', label: 'Expired' },
];

// ─── RecurringFilterChip ─────────────────────────────────────────────────────

interface RecurringFilterChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  count?: number;
  palette: ThemeColors;
}

export const RecurringFilterChip = memo(function RecurringFilterChip({
  label,
  isActive,
  onPress,
  count,
  palette,
}: RecurringFilterChipProps) {
  return (
    <Clickable
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: isActive ? palette.tint : palette.surface,
          borderColor: isActive ? palette.tint : palette.border,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.filterChipText,
          { color: isActive ? palette.onPrimary : palette.foreground },
        ]}
      >
        {label}
      </ThemedText>
      {count !== undefined && count > 0 && (
        <View
          style={[
            styles.filterChipBadge,
            { backgroundColor: isActive ? withAlpha(palette.onPrimary, 0.2) : palette.border },
          ]}
        >
          <ThemedText
            style={[
              styles.filterChipBadgeText,
              { color: isActive ? palette.onPrimary : palette.muted },
            ]}
          >
            {count}
          </ThemedText>
        </View>
      )}
    </Clickable>
  );
});

// ─── RecurringSummaryCard ────────────────────────────────────────────────────

interface RecurringSummaryCardProps {
  bookings: RecurringBooking[];
  activeCount: number;
  palette: ThemeColors;
}

export const RecurringSummaryCard = memo(function RecurringSummaryCard({
  bookings,
  activeCount,
  palette,
}: RecurringSummaryCardProps) {
  const totalMonthlyValue = bookings
    .filter((b) => b.status === 'ACTIVE' && b.pricePerSession)
    .reduce((sum, b) => {
      const sessionsPerMonth = b.frequency === 'WEEKLY' ? 4 : b.frequency === 'BIWEEKLY' ? 2 : 1;
      return sum + (b.pricePerSession || 0) * sessionsPerMonth;
    }, 0);

  const totalSessions = bookings.reduce((sum, b) => sum + b.sessionsCompleted, 0);

  return (
    <Row
      align="center"
      justify="around"
      style={[
        styles.summaryContainer,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <View style={styles.summaryItem}>
        <ThemedText style={[styles.summaryValue, { color: palette.success }]}>
          {activeCount}
        </ThemedText>
        <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>Active</ThemedText>
      </View>
      <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
      <View style={styles.summaryItem}>
        <ThemedText style={[styles.summaryValue, { color: palette.foreground }]}>
          ${totalMonthlyValue.toFixed(0)}
        </ThemedText>
        <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
          Est. Monthly
        </ThemedText>
      </View>
      <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
      <View style={styles.summaryItem}>
        <ThemedText style={[styles.summaryValue, { color: palette.foreground }]}>
          {totalSessions}
        </ThemedText>
        <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
          Total Sessions
        </ThemedText>
      </View>
    </Row>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  summaryContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    ...Typography.title,
    fontWeight: '700',
  },
  summaryLabel: {
    ...Typography.caption,
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  filterChipText: {
    ...Typography.smallSemiBold,
  },
  filterChipBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    minWidth: 20,
    alignItems: 'center',
  },
  filterChipBadgeText: {
    ...Typography.micro,
    fontWeight: '700',
  },
});
