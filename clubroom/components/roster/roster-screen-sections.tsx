import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { rosterService, type RosterStats, type RosterFilters } from '@/services/roster-service';

type HeaderProps = {
  colors: ThemeColors;
  total: number;
  onBack: () => void;
};

export const RosterHeader = React.memo(function RosterHeader({
  colors,
  total,
  onBack,
}: HeaderProps) {
  return (
    <Row align="center" gap="md" style={styles.header}>
      <Clickable onPress={onBack} hitSlop={8} accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Clickable>
      <View style={styles.headerTitle}>
        <ThemedText type="title">Athlete Roster</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.muted }]}>{total} athletes</ThemedText>
      </View>
    </Row>
  );
});

type StatsProps = {
  colors: ThemeColors;
  stats: RosterStats | null;
};

export const RosterStatsRow = React.memo(function RosterStatsRow({ colors, stats }: StatsProps) {
  if (!stats) return null;

  return (
    <Row gap="xs" style={styles.statsRow}>
      <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
        <ThemedText type="heading" style={{ color: colors.success }}>
          {stats.active}
        </ThemedText>
        <ThemedText style={[styles.statLabel, { color: colors.muted }]}>Active</ThemedText>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
        <ThemedText type="heading" style={{ color: colors.warning }}>
          {stats.paused}
        </ThemedText>
        <ThemedText style={[styles.statLabel, { color: colors.muted }]}>Paused</ThemedText>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
        <ThemedText type="heading" style={{ color: colors.tint }}>
          {stats.graduated}
        </ThemedText>
        <ThemedText style={[styles.statLabel, { color: colors.muted }]}>Graduated</ThemedText>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
        <ThemedText type="heading" style={{ color: colors.tint }}>
          {rosterService.formatRevenue(stats.totalRevenue)}
        </ThemedText>
        <ThemedText style={[styles.statLabel, { color: colors.muted }]}>Revenue</ThemedText>
      </View>
    </Row>
  );
});

type SearchProps = {
  colors: ThemeColors;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: RosterFilters;
  onToggleFilters: () => void;
};

export const RosterSearchBar = React.memo(function RosterSearchBar({
  colors,
  searchQuery,
  onSearchChange,
  filters,
  onToggleFilters,
}: SearchProps) {
  const activeFiltersCount = Object.values(filters).filter(
    (value) => value !== undefined && (Array.isArray(value) ? value.length > 0 : true),
  ).length;

  return (
    <Row gap="sm" style={styles.searchSection}>
      <Row align="center" gap="xs" style={[styles.searchBar, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search athletes..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={onSearchChange}
          accessibilityLabel="Search athletes"
        />
        {searchQuery.length > 0 ? (
          <Clickable accessibilityLabel="Clear search" onPress={() => onSearchChange('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Clickable>
        ) : null}
      </Row>
      <Clickable
        onPress={onToggleFilters}
        style={[
          styles.filterButton,
          { backgroundColor: activeFiltersCount > 0 ? colors.tint : colors.surface },
        ]}
        accessibilityLabel="Toggle filters"
      >
        <Ionicons
          name="options-outline"
          size={20}
          color={activeFiltersCount > 0 ? colors.onPrimary : colors.text}
        />
        {activeFiltersCount > 0 ? (
          <View style={[styles.filterBadge, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.filterBadgeText, { color: colors.text }]}>
              {activeFiltersCount}
            </ThemedText>
          </View>
        ) : null}
      </Clickable>
    </Row>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  statsRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  statLabel: {
    ...Typography.micro,
    marginTop: Spacing.micro,
  },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: Radii.md,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    ...Typography.micro,
  },
});
