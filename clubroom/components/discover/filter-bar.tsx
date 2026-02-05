/**
 * FilterBar Component (Sprint 8B)
 *
 * Horizontal scrollable row of filter chips for the discover screen.
 * Each chip shows active state when a filter is applied, with an active count badge.
 */

import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, Radii, Typography, Components } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterState {
  distance?: number;
  priceMin?: number;
  priceMax?: number;
  ageGroups?: string[];
  specialties?: string[];
  minRating?: number;
  availableThisWeek?: boolean;
  trialAvailable?: boolean;
  verifiedOnly?: boolean;
  sortBy?: string;
}

interface FilterChipDefinition {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isActive: (filters: FilterState) => boolean;
  getLabel: (filters: FilterState) => string;
}

interface FilterBarComponentProps {
  filters: FilterState;
  onChipPress: (chipId: string) => void;
  onOpenFullFilters: () => void;
  activeFilterCount: number;
}

// ---------------------------------------------------------------------------
// Filter chip definitions
// ---------------------------------------------------------------------------

const FILTER_CHIPS: FilterChipDefinition[] = [
  {
    id: 'distance',
    label: 'Distance',
    icon: 'location-outline',
    isActive: (f) => f.distance !== undefined,
    getLabel: (f) => (f.distance ? `${f.distance} mi` : 'Distance'),
  },
  {
    id: 'price',
    label: 'Price',
    icon: 'pricetag-outline',
    isActive: (f) => f.priceMin !== undefined || f.priceMax !== undefined,
    getLabel: (f) => {
      if (f.priceMin && f.priceMax) return `\u00A3${f.priceMin}-\u00A3${f.priceMax}`;
      if (f.priceMin) return `\u00A3${f.priceMin}+`;
      if (f.priceMax) return `Up to \u00A3${f.priceMax}`;
      return 'Price';
    },
  },
  {
    id: 'age',
    label: 'Age',
    icon: 'people-outline',
    isActive: (f) => (f.ageGroups?.length ?? 0) > 0,
    getLabel: (f) => {
      const count = f.ageGroups?.length ?? 0;
      return count > 0 ? `Age (${count})` : 'Age';
    },
  },
  {
    id: 'specialty',
    label: 'Specialty',
    icon: 'football-outline',
    isActive: (f) => (f.specialties?.length ?? 0) > 0,
    getLabel: (f) => {
      const count = f.specialties?.length ?? 0;
      return count > 0 ? `Specialty (${count})` : 'Specialty';
    },
  },
  {
    id: 'rating',
    label: 'Rating',
    icon: 'star-outline',
    isActive: (f) => f.minRating !== undefined,
    getLabel: (f) => (f.minRating ? `${f.minRating}+ Stars` : 'Rating'),
  },
  {
    id: 'more',
    label: 'More',
    icon: 'options-outline',
    isActive: (f) =>
      f.availableThisWeek === true ||
      f.trialAvailable === true ||
      f.verifiedOnly === true,
    getLabel: (f) => {
      const extras = [
        f.availableThisWeek && 'This week',
        f.trialAvailable && 'Trial',
        f.verifiedOnly && 'Verified',
      ].filter(Boolean);
      return extras.length > 0 ? `More (${extras.length})` : 'More';
    },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DiscoverFilterBar({
  filters,
  onChipPress,
  onOpenFullFilters,
  activeFilterCount,
}: FilterBarComponentProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main filter button with count badge */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open all filters"
          onPress={onOpenFullFilters}
          style={({ pressed }) => [
            styles.mainFilterButton,
            {
              backgroundColor: activeFilterCount > 0
                ? `${palette.tint}15`
                : palette.surface,
              borderColor: activeFilterCount > 0 ? palette.tint : palette.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons
            name="funnel-outline"
            size={Components.icon.sm}
            color={activeFilterCount > 0 ? palette.tint : palette.muted}
          />
          {activeFilterCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: palette.tint }]}>
              <ThemedText style={styles.countBadgeText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                {activeFilterCount}
              </ThemedText>
            </View>
          )}
        </Pressable>

        {/* Individual filter chips */}
        {FILTER_CHIPS.map((chip) => {
          const active = chip.isActive(filters);
          return (
            <Pressable
              key={chip.id}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${chip.label}`}
              onPress={() => onChipPress(chip.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? `${palette.tint}15` : palette.surface,
                  borderColor: active ? palette.tint : palette.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons
                name={active ? (chip.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : chip.icon}
                size={Components.icon.sm}
                color={active ? palette.tint : palette.muted}
              />
              <ThemedText
                style={[
                  styles.chipLabel,
                  { color: active ? palette.tint : palette.muted },
                  active && styles.chipLabelActive,
                ]}
              >
                {chip.getLabel(filters)}
              </ThemedText>
              {active && (
                <Ionicons name="chevron-down" size={12} color={palette.tint} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  mainFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: Components.button.height,
    height: Components.button.height,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.xs / 2,
  },
  countBadge: {
    position: 'absolute',
    top: -Spacing.xs / 2,
    right: -Spacing.xs / 2,
    minWidth: 18,
    height: 18,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs / 2,
  },
  countBadgeText: {
    ...Typography.micro,
    fontSize: 10,
    textTransform: 'none',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    height: Components.button.height,
  },
  chipLabel: {
    ...Typography.small,
    fontWeight: '500',
  },
  chipLabelActive: {
    fontWeight: '600',
  },
});
