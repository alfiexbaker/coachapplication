/**
 * Extracted sub-components for SquadPicker.
 *
 * SquadPickerItem — single squad selection row with checkbox.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { squadService } from '@/services/squad-service';
import type { ClubSquad } from '@/constants/types';

export { QuickActionBar } from './squad-picker-quick-action-bar';
export type { QuickActionBarProps } from './squad-picker-quick-action-bar';
export { SelectedBanner } from './squad-picker-selected-banner';
export type { SelectedBannerProps } from './squad-picker-selected-banner';

// ============================================================================
// SQUAD PICKER ITEM
// ============================================================================

interface SquadPickerItemProps {
  squad: ClubSquad;
  isSelected: boolean;
  onToggle: (squadId: string) => void;
}

export const SquadPickerItem = function SquadPickerItem({
  squad,
  isSelected,
  onToggle,
}: SquadPickerItemProps) {
  const { colors: palette } = useTheme();
  const ageGroup = squadService.getAgeGroupLabel(squad);

  const handlePress = () => {
    onToggle(squad.id);
  };

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
      <Row align="center" gap="md">
        <View style={[styles.squadIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="people" size={24} color={palette.tint} />
        </View>
        <View style={styles.squadInfo}>
          <ThemedText type="defaultSemiBold">{squad.name}</ThemedText>
          <Row align="center" gap="sm">
            <View style={[styles.metaChip, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
              <ThemedText style={{ ...Typography.caption, color: palette.tint }}>
                {ageGroup}
              </ThemedText>
            </View>
            <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
              {squad.memberCount} athlete{squad.memberCount !== 1 ? 's' : ''}
            </ThemedText>
          </Row>
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
      </Row>
    </Clickable>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  squadItem: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  squadIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadInfo: { flex: 1, gap: Spacing.micro },
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
