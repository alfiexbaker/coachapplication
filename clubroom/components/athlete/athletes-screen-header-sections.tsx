import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { AthleteCard } from '@/components/roster/athlete-card';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { RosterEntry } from '@/constants/types';
import type { Booking } from '@/constants/app-types';

export type FilterType = 'all' | 'active';

type HeaderProps = {
  colors: ThemeColors;
  roster: RosterEntry[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  filter: FilterType;
  onFilterChange: (value: FilterType) => void;
};

export const AthletesListHeader = React.memo(function AthletesListHeader({
  colors,
  roster,
  searchQuery,
  onSearchChange,
  onClearSearch,
  filter,
  onFilterChange,
}: HeaderProps) {
  const filterChips = [
    { id: 'all' as FilterType, label: 'All', count: roster.length },
    {
      id: 'active' as FilterType,
      label: 'Active',
      count: roster.filter((a) => a.status === 'ACTIVE').length,
    },
  ];

  return (
    <View style={styles.headerContent}>
      <Row
        style={[
          styles.searchContainer,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search athletes..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={onSearchChange}
          accessibilityLabel="Search athletes"

            maxLength={100}
          />
        {searchQuery.length > 0 && (
          <Clickable accessibilityLabel="Clear search" onPress={onClearSearch}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Clickable>
        )}
      </Row>

      <Row gap="sm" style={styles.filterRow}>
        {filterChips.map((chip) => {
          const selected = filter === chip.id;
          return (
            <Clickable
              key={chip.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selected ? colors.tint : 'transparent',
                  borderColor: selected ? colors.tint : 'transparent',
                },
              ]}
              onPress={() => onFilterChange(chip.id)}
              accessibilityLabel={`Filter: ${chip.label}`}
            >
              <Row align="center" gap="xxs">
                <ThemedText
                  style={[styles.filterText, { color: selected ? colors.onPrimary : colors.text }]}
                >
                  {chip.label}
                </ThemedText>
                {chip.count > 0 && (
                  <View
                    style={[
                      styles.filterCount,
                      {
                        backgroundColor: 'transparent',
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.filterCountText,
                        { color: selected ? colors.onPrimary : colors.muted },
                      ]}
                    >
                      {chip.count}
                    </ThemedText>
                  </View>
                )}
              </Row>
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
});

type EmptyProps = {
  colors: ThemeColors;
};

export const AthletesSearchEmptyState = React.memo(function AthletesSearchEmptyState({
  colors,
}: EmptyProps) {
  return (
    <View style={styles.emptySearch}>
      <Ionicons name="search-outline" size={40} color={colors.muted} />
      <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>No athletes found</ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: colors.muted }]}>
        Try a different search or filter
      </ThemedText>
    </View>
  );
});

export const renderAthleteCard = ({
  item,
  upcomingSessions,
}: {
  item: RosterEntry;
  upcomingSessions: Record<string, Booking>;
}) => <AthleteCard athlete={item} upcomingSession={upcomingSessions[item.athleteId]} />;

const styles = StyleSheet.create({
  headerContent: {
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  searchContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...Typography.subheading,
    paddingVertical: Spacing.xxs,
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    minHeight: 36,
  },
  filterText: {
    ...Typography.smallSemiBold,
  },
  filterCount: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.md,
  },
  filterCountText: {
    ...Typography.caption,
  },
  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.heading,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
});
