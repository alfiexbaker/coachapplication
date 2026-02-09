/**
 * Filter Panel — Extracted sections
 *
 * Constants and reusable sub-components for FilterPanel.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SESSION_TYPE_OPTIONS = ['1-on-1', 'Small group', 'Team'];
export const SPECIALTIES = ['Dribbling', 'Finishing', 'Passing', 'Goalkeeping', 'Fitness'];
export const AVAILABILITY_OPTIONS = ['Today', 'This week', 'This month'];
export const SORT_OPTIONS = ['Distance', 'Price', 'Rating', 'Newest'];

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// PillRow
// ---------------------------------------------------------------------------

export interface PillRowProps {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  singleSelect?: boolean;
}

export function PillRow({ options, selected, onToggle, singleSelect }: PillRowProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.pillRow}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <Clickable
            key={option}
            onPress={() => onToggle(option)}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                borderColor: isSelected ? palette.tint : palette.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <ThemedText style={{ color: isSelected ? palette.tint : palette.text }}>
              {singleSelect && !isSelected ? '○ ' : ''}
              {option}
            </ThemedText>
          </Clickable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: { ...Typography.body },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
});
