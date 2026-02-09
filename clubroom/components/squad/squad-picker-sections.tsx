/**
 * Extracted sub-components for SquadPicker.
 *
 * SquadPickerItem — single squad selection row with checkbox.
 * QuickActionBar — select all / clear buttons for multi-select.
 * SelectedBanner — summary banner showing selection count.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { squadService } from '@/services/squad-service';
import type { ClubSquad } from '@/constants/types';

// ============================================================================
// SQUAD PICKER ITEM
// ============================================================================

interface SquadPickerItemProps {
  squad: ClubSquad;
  isSelected: boolean;
  onToggle: (squadId: string) => void;
}

export const SquadPickerItem = React.memo(function SquadPickerItem({
  squad,
  isSelected,
  onToggle,
}: SquadPickerItemProps) {
  const { colors: palette } = useTheme();
  const ageGroup = squadService.getAgeGroupLabel(squad);

  const handlePress = useCallback(() => {
    onToggle(squad.id);
  }, [squad.id, onToggle]);

  return (
    <Clickable
      onPress={handlePress}
      style={[
        styles.squadItem,
        {
          backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.surface,
          borderColor: isSelected ? palette.tint : palette.border,
        },
      ]}
    >
      <View style={[styles.squadIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons name="people" size={24} color={palette.tint} />
      </View>
      <View style={styles.squadInfo}>
        <ThemedText type="defaultSemiBold">{squad.name}</ThemedText>
        <View style={styles.squadMeta}>
          <View style={[styles.metaChip, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <ThemedText style={{ ...Typography.caption, color: palette.tint }}>{ageGroup}</ThemedText>
          </View>
          <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
            {squad.memberCount} athlete{squad.memberCount !== 1 ? 's' : ''}
          </ThemedText>
        </View>
        {squad.primaryCoach && (
          <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
            Coach: {squad.primaryCoach}
          </ThemedText>
        )}
      </View>
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: isSelected ? palette.tint : 'transparent',
            borderColor: isSelected ? palette.tint : palette.border,
          },
        ]}
      >
        {isSelected && <Ionicons name="checkmark" size={14} color={palette.onPrimary} />}
      </View>
    </Clickable>
  );
});

// ============================================================================
// QUICK ACTION BAR
// ============================================================================

interface QuickActionBarProps {
  onSelectAll: () => void;
  onClear: () => void;
}

export const QuickActionBar = React.memo(function QuickActionBar({
  onSelectAll,
  onClear,
}: QuickActionBarProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.quickActions}>
      <Clickable
        onPress={onSelectAll}
        style={[styles.quickActionButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
      >
        <Ionicons name="checkmark-done" size={14} color={palette.tint} />
        <ThemedText style={{ color: palette.tint, ...Typography.caption }}>Select All</ThemedText>
      </Clickable>
      <Clickable
        onPress={onClear}
        style={[styles.quickActionButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}
      >
        <ThemedText style={{ ...Typography.caption, color: palette.text }}>Clear</ThemedText>
      </Clickable>
    </View>
  );
});

// ============================================================================
// SELECTED BANNER
// ============================================================================

interface SelectedBannerProps {
  selectedCount: number;
  totalMembers: number;
}

export const SelectedBanner = React.memo(function SelectedBanner({
  selectedCount,
  totalMembers,
}: SelectedBannerProps) {
  const { colors: palette } = useTheme();

  if (selectedCount === 0) return null;

  return (
    <View style={[styles.selectedBanner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
      <Ionicons name="people" size={18} color={palette.tint} />
      <ThemedText style={{ color: palette.tint, fontWeight: '600', flex: 1 }}>
        {selectedCount} squad{selectedCount !== 1 ? 's' : ''} selected
        {totalMembers > 0 && ` (${totalMembers} athletes)`}
      </ThemedText>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  squadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  squadIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadInfo: { flex: 1, gap: Spacing.micro },
  squadMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metaChip: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
