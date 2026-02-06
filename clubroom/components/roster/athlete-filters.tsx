import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RosterFilters } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';

interface AthleteFiltersProps {
  filters: RosterFilters;
  availableTags: string[];
  onFilterChange: (filters: RosterFilters) => void;
  onClear: () => void;
}

const STATUS_OPTIONS: { key: RosterEntry['status']; label: string; color: string }[] = [
  { key: 'ACTIVE', label: 'Active', color: '#16A34A' },
  { key: 'PAUSED', label: 'Paused', color: '#CA8A04' },
  { key: 'GRADUATED', label: 'Graduated', color: '#2563EB' },
  { key: 'INACTIVE', label: 'Inactive', color: '#6B7280' },
];

const SKILL_LEVELS: { key: RosterEntry['athleteSkillLevel']; label: string }[] = [
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const toggleStatus = (status: RosterEntry['status']) => {
    onFilterChange({
      ...filters,
      status: filters.status === status ? undefined : status,
    });
  };

  const toggleSkillLevel = (level: RosterEntry['athleteSkillLevel']) => {
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

  return (
    <SurfaceCard style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold">Filters</ThemedText>
        {hasActiveFilters && (
          <Clickable onPress={onClear}>
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Clear All</ThemedText>
          </Clickable>
        )}
      </View>

      {/* Status Filter */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Status</ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {STATUS_OPTIONS.map((status) => (
            <Clickable
              key={status.key}
              onPress={() => toggleStatus(status.key)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    filters.status === status.key ? withAlpha(status.color, 0.09) : palette.surfaceSecondary,
                  borderColor: filters.status === status.key ? status.color : 'transparent',
                },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <ThemedText
                style={[
                  styles.chipText,
                  { color: filters.status === status.key ? status.color : palette.text },
                ]}
              >
                {status.label}
              </ThemedText>
            </Clickable>
          ))}
        </ScrollView>
      </View>

      {/* Skill Level Filter */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Skill Level</ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {SKILL_LEVELS.map((level) => (
            <Clickable
              key={level.key}
              onPress={() => toggleSkillLevel(level.key)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    filters.skillLevel === level.key ? palette.tint : palette.surfaceSecondary,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  { color: filters.skillLevel === level.key ? '#fff' : palette.text },
                ]}
              >
                {level.label}
              </ThemedText>
            </Clickable>
          ))}
        </ScrollView>
      </View>

      {/* Tags Filter */}
      {availableTags.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Tags</ThemedText>
          <View style={styles.tagsGrid}>
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
                  <ThemedText
                    style={[styles.tagText, { color: isSelected ? '#fff' : palette.text }]}
                  >
                    {tag}
                  </ThemedText>
                  {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                </Clickable>
              );
            })}
          </View>
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: { ...Typography.caption },
  chipRow: {
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
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
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
  },
  tagText: { ...Typography.caption },
});
