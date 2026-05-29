/**
 * Extracted sub-components for RemovalConfirmationModal.
 *
 * ReasonGrid — selectable reason cards grid.
 */

import { StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { RemovalReason } from '@/services/roster-service';
import type { MemberRemovalReason } from '@/services/club-service';

export { WarningBox } from './removal-warning-box';
export type { WarningBoxProps } from './removal-warning-box';
export { ArchiveToggle } from './removal-archive-toggle';
export type { ArchiveToggleProps } from './removal-archive-toggle';

// ============================================================================
// REASON GRID
// ============================================================================

type ReasonType = RemovalReason | MemberRemovalReason;

interface ReasonGridProps {
  reasons: { value: string; label: string; icon: string }[];
  selectedReason: ReasonType | null;
  onSelect: (reason: ReasonType) => void;
}

export const ReasonGrid = function ReasonGrid({
  reasons,
  selectedReason,
  onSelect,
}: ReasonGridProps) {
  const { colors: palette } = useTheme();

  return (
    <Row wrap gap="xs">
      {reasons.map((reason) => {
        const isSelected = selectedReason === reason.value;
        return (
          <Clickable key={reason.value} onPress={() => onSelect(reason.value as ReasonType)}>
            <Row
              align="center"
              gap="xs"
              style={[
                styles.reasonCard,
                {
                  borderColor: isSelected ? palette.tint : palette.border,
                  backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.surface,
                },
              ]}
            >
              <Ionicons
                name={reason.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={isSelected ? palette.tint : palette.icon}
              />
              <ThemedText
                style={[styles.reasonLabel, { color: isSelected ? palette.tint : palette.text }]}
              >
                {reason.label}
              </ThemedText>
            </Row>
          </Clickable>
        );
      })}
    </Row>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  reasonCard: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  reasonLabel: { ...Typography.bodySmallSemiBold },
});
