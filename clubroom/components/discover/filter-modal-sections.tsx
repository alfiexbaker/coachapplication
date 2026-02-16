/**
 * Extracted sub-components for FilterModal.
 *
 * FilterModalHeader — close + clear buttons with title.
 * ChipGridSection — titled chip grid (reused for distance, focus, format, languages, gender).
 * FilterModalFooter — sticky apply button.
 * Constants: DISTANCE_OPTIONS, GENDER_OPTIONS, FilterOption type.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { CoachGender } from '@/constants/types';
import { Row } from '@/components/primitives';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FilterOption {
  value: string;
  label: string;
  color: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const DISTANCE_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: undefined, label: 'Any distance' },
];

export const GENDER_OPTIONS: { value: CoachGender; label: string }[] = [
  { value: 'Any', label: 'Any' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

// ─── FilterModalHeader ──────────────────────────────────────────────────────

interface FilterModalHeaderProps {
  onClose: () => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  palette: ThemeColors;
}

export const FilterModalHeader = memo(function FilterModalHeader({
  onClose,
  onClear,
  hasActiveFilters,
  palette,
}: FilterModalHeaderProps) {
  return (
    <Row style={[styles.header, { borderBottomColor: palette.border }]}>
      <Clickable accessibilityLabel="Close filters" onPress={onClose} style={styles.headerButton}>
        <Ionicons name="close" size={24} color={palette.text} />
      </Clickable>

      <ThemedText type="title" style={styles.headerTitle}>
        Filters
      </ThemedText>

      <Clickable
        accessibilityLabel="Clear all filters"
        onPress={onClear}
        disabled={!hasActiveFilters}
        style={[styles.headerButton, !hasActiveFilters && { opacity: 0.4 }]}
      >
        <ThemedText
          style={[styles.clearAllText, { color: hasActiveFilters ? palette.tint : palette.muted }]}
        >
          Clear
        </ThemedText>
      </Clickable>
    </Row>
  );
});

// ─── ChipGridSection ────────────────────────────────────────────────────────

interface ChipGridSectionProps {
  title: string;
  palette: ThemeColors;
  children: React.ReactNode;
}

export const ChipGridSection = memo(function ChipGridSection({
  title,
  palette,
  children,
}: ChipGridSectionProps) {
  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>{title}</ThemedText>
      <Row style={styles.chipGrid}>{children}</Row>
    </View>
  );
});

// ─── ChipOption ─────────────────────────────────────────────────────────────

interface ChipOptionProps<T> {
  items: readonly { value: T; label: string; count?: number }[];
  selected: (value: T) => boolean;
  onToggle: (value: T) => void;
}

export function ChipOptionList<T extends string | number>({
  items,
  selected,
  onToggle,
}: ChipOptionProps<T>) {
  return (
    <>
      {items.map((item) => (
        <Chip
          key={String(item.value)}
          active={selected(item.value)}
          onPress={() => onToggle(item.value)}
        >
          {item.label}
          {item.count !== undefined ? ` (${item.count})` : ''}
        </Chip>
      ))}
    </>
  );
}

// ─── FilterModalFooter ──────────────────────────────────────────────────────

interface FilterModalFooterProps {
  onApply: () => void;
  resultCount: number;
  palette: ThemeColors;
}

export const FilterModalFooter = memo(function FilterModalFooter({
  onApply,
  resultCount,
  palette,
}: FilterModalFooterProps) {
  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: palette.background,
          borderTopColor: palette.border,
        },
      ]}
    >
      <Button onPress={onApply} style={styles.applyButton}>
        {`Show ${resultCount} ${resultCount === 1 ? 'Coach' : 'Coaches'}`}
      </Button>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    textAlign: 'center',
  },
  clearAllText: {
    ...Typography.bodySemiBold,
  },
  section: {
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodySemiBold,
    marginBottom: Spacing.md,
  },
  chipGrid: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
  },
  applyButton: {
    width: '100%',
  },
});
