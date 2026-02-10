import { View, StyleSheet, ScrollView } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { RosterFilters } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface AthleteFiltersProps {
  filters: RosterFilters;
  availableTags: string[];
  onFilterChange: (filters: RosterFilters) => void;
  onClear: () => void;
}

// Decorative: status indicator colors for distinct visual identification
const STATUS_OPTIONS: { key: RosterEntry['status']; label: string; color: string }[] = [
  { key: 'ACTIVE', label: 'Active', color: '#16A34A' },     // Decorative: active status
  { key: 'PAUSED', label: 'Paused', color: '#CA8A04' },     // Decorative: paused status
  { key: 'GRADUATED', label: 'Graduated', color: '#2563EB' }, // Decorative: graduated status
  { key: 'INACTIVE', label: 'Inactive', color: '#6B7280' },  // Decorative: inactive status
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
  const { colors: palette } = useTheme();

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
              <Row align="center" gap="xxs">
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: filters.status === status.key ? status.color : palette.text },
                  ]}
                >
                  {status.label}
                </ThemedText>
              </Row>
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
                  { color: filters.skillLevel === level.key ? palette.onPrimary : palette.text },
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
                      style={[styles.tagText, { color: isSelected ? palette.onPrimary : palette.text }]}
                    >
                      {tag}
                    </ThemedText>
                    {isSelected && <Ionicons name="checkmark" size={12} color={palette.onPrimary} />}
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
