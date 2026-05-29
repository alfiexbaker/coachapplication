import { View, StyleSheet, FlatList, type ListRenderItemInfo } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { RosterFilters, ROSTER_STATUSES, rosterService } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface AthleteFiltersProps {
  filters: RosterFilters;
  availableTags: string[];
  onFilterChange: (filters: RosterFilters) => void;
  onClear: () => void;
}

const STATUS_OPTIONS = ROSTER_STATUSES.map((key) => ({
  key,
  label: rosterService.formatStatus(key),
}));

type SkillLevelFilter = NonNullable<RosterFilters['skillLevel']>;

const SKILL_LEVELS: { key: SkillLevelFilter; label: string }[] = [
  { key: 'BEGINNER', label: 'Beginner' },
  { key: 'INTERMEDIATE', label: 'Intermediate' },
  { key: 'ADVANCED', label: 'Advanced' },
];

export function AthleteFilters({
  filters,
  availableTags,
  onFilterChange,
  onClear,
}: AthleteFiltersProps) {
  const { colors: palette } = useTheme();

  const toggleStatus = (status: RosterEntry['status']) => {
    onFilterChange({
      ...filters,
      status: filters.status === status ? undefined : status,
    });
  };

  const toggleSkillLevel = (level: SkillLevelFilter) => {
    onFilterChange({
      ...filters,
      skillLevel: filters.skillLevel === level ? undefined : level,
    });
  };

  const toggleTag = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    onFilterChange({
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined,
    });
  };

  const hasActiveFilters =
    filters.status || filters.skillLevel || (filters.tags && filters.tags.length > 0);
  const statusItems = getRosterStatusItems(filters.status, toggleStatus, palette);
  const skillItems = getSkillLevelItems(filters.skillLevel, toggleSkillLevel, palette);

  return (
    <SurfaceCard style={styles.container}>
      {/* Header */}
      <Row align="center" justify="between">
        <ThemedText type="defaultSemiBold">Filters</ThemedText>
        {hasActiveFilters && (
          <Clickable onPress={onClear}>
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Clear All</ThemedText>
          </Clickable>
        )}
      </Row>

      {/* Status Filter */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Status</ThemedText>
        <FlatList
          horizontal
          data={statusItems}
          keyExtractor={keyRosterStatusItem}
          renderItem={renderRosterStatusItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        />
      </View>

      {/* Skill Level Filter */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Skill Level</ThemedText>
        <FlatList
          horizontal
          data={skillItems}
          keyExtractor={keySkillLevelItem}
          renderItem={renderSkillLevelItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        />
      </View>

      {/* Tags Filter */}
      {availableTags.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Tags</ThemedText>
          <Row wrap gap="xs">
            {availableTags.map((tag) => {
              const isSelected = filters.tags?.includes(tag);
              return (
                <Clickable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.surfaceSecondary,
                    },
                  ]}
                >
                  <Row align="center" gap="xxs">
                    <ThemedText
                      style={[
                        styles.tagText,
                        { color: isSelected ? palette.onPrimary : palette.text },
                      ]}
                    >
                      {tag}
                    </ThemedText>
                    {isSelected && (
                      <Ionicons name="checkmark" size={12} color={palette.onPrimary} />
                    )}
                  </Row>
                </Clickable>
              );
            })}
          </Row>
        </View>
      )}
    </SurfaceCard>
  );
}

interface RosterStatusItem {
  key: RosterEntry['status'];
  label: string;
  statusColor: string;
  selected: boolean;
  palette: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}

function getRosterStatusItems(
  selectedStatus: RosterFilters['status'],
  onSelect: (status: RosterEntry['status']) => void,
  palette: ReturnType<typeof useTheme>['colors'],
): RosterStatusItem[] {
  return STATUS_OPTIONS.map((status) => ({
    key: status.key,
    label: status.label,
    statusColor: rosterService.getStatusColor(status.key),
    selected: selectedStatus === status.key,
    palette,
    onPress: () => onSelect(status.key),
  }));
}

function keyRosterStatusItem(item: RosterStatusItem) {
  return item.key;
}

function renderRosterStatusItem({ item }: ListRenderItemInfo<RosterStatusItem>) {
  return (
    <Clickable
      onPress={item.onPress}
      style={[
        styles.chip,
        {
          backgroundColor: item.selected
            ? withAlpha(item.statusColor, 0.09)
            : item.palette.surfaceSecondary,
          borderColor: item.selected ? item.statusColor : 'transparent',
        },
      ]}
    >
      <Row align="center" gap="xxs">
        <View style={[styles.statusDot, { backgroundColor: item.statusColor }]} />
        <ThemedText
          style={[styles.chipText, { color: item.selected ? item.statusColor : item.palette.text }]}
        >
          {item.label}
        </ThemedText>
      </Row>
    </Clickable>
  );
}

interface SkillLevelItem {
  key: SkillLevelFilter;
  label: string;
  selected: boolean;
  palette: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}

function getSkillLevelItems(
  selectedLevel: SkillLevelFilter | undefined,
  onSelect: (level: SkillLevelFilter) => void,
  palette: ReturnType<typeof useTheme>['colors'],
): SkillLevelItem[] {
  return SKILL_LEVELS.map((level) => ({
    key: level.key,
    label: level.label,
    selected: selectedLevel === level.key,
    palette,
    onPress: () => onSelect(level.key),
  }));
}

function keySkillLevelItem(item: SkillLevelItem) {
  return item.key;
}

function renderSkillLevelItem({ item }: ListRenderItemInfo<SkillLevelItem>) {
  return (
    <Clickable
      onPress={item.onPress}
      style={[
        styles.chip,
        {
          backgroundColor: item.selected ? item.palette.tint : item.palette.surfaceSecondary,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.chipText,
          { color: item.selected ? item.palette.onPrimary : item.palette.text },
        ]}
      >
        {item.label}
      </ThemedText>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: { ...Typography.caption },
  chipRow: {
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipText: { ...Typography.smallSemiBold },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
  },
  tagText: { ...Typography.caption },
});
