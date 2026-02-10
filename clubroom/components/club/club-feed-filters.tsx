/**
 * ClubFeedFilters — Horizontal scrollable feed filter tabs.
 *
 * Shows filter chips for All, Announcements, Photos, Events
 * with active state highlighting and count badges.
 */

import React, { memo, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { FEED_FILTERS, type FeedFilter } from '@/hooks/use-club-hub';

export interface ClubFeedFiltersProps {
  activeFilter: FeedFilter;
  onFilterChange: (filter: FeedFilter) => void;
  filterCounts: Partial<Record<FeedFilter, number>>;
}

export const ClubFeedFilters = memo(function ClubFeedFilters({
  activeFilter,
  onFilterChange,
  filterCounts,
}: ClubFeedFiltersProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {FEED_FILTERS.map((filter) => (
        <FilterTab
          key={filter.key}
          filterKey={filter.key}
          label={filter.label}
          icon={filter.icon}
          isActive={activeFilter === filter.key}
          count={filterCounts[filter.key] ?? 0}
          onPress={onFilterChange}
        />
      ))}
    </ScrollView>
  );
});

// ─── Individual filter tab ─────────────────────────────────────────

interface FilterTabProps {
  filterKey: FeedFilter;
  label: string;
  icon: string;
  isActive: boolean;
  count: number;
  onPress: (key: FeedFilter) => void;
}

const FilterTab = memo(function FilterTab({
  filterKey,
  label,
  icon,
  isActive,
  count,
  onPress,
}: FilterTabProps) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    onPress(filterKey);
  }, [onPress, filterKey]);

  return (
    <Clickable
      style={[
        styles.tab,
        isActive
          ? { backgroundColor: withAlpha(colors.tint, 0.09), borderColor: colors.tint }
          : { borderColor: colors.border },
      ]}
      onPress={handlePress}
      accessibilityLabel={`Filter by ${label}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={16}
        color={isActive ? colors.tint : colors.muted}
      />
      <ThemedText
        style={[styles.label, { color: isActive ? colors.tint : colors.muted }]}
      >
        {label}
      </ThemedText>
      {count > 0 && (
        <View
          style={[
            styles.countBadge,
            { backgroundColor: isActive ? colors.tint : colors.muted },
          ]}
        >
          <ThemedText style={[styles.countText, { color: colors.onPrimary }]}>
            {count}
          </ThemedText>
        </View>
      )}
    </Clickable>
  );
});

const styles = StyleSheet.create({
  scroll: {
    marginTop: Spacing.sm,
  },
  container: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  tab: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 44,
  },
  label: {
    ...Typography.smallSemiBold,
  },
  countBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.md,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    ...Typography.caption,
  },
});
