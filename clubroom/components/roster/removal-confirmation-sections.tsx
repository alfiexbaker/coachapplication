/**
 * Extracted sub-components for RemovalConfirmationModal.
 *
 * ATHLETE_REASONS, MEMBER_REASONS — reason option constants.
 * ReasonGrid — selectable reason cards grid.
 * WarningBox — contextual warning banner.
 * ArchiveToggle — keep history toggle row.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { RemovalReason } from '@/services/roster-service';
import type { MemberRemovalReason } from '@/services/club-service';

// ============================================================================
// CONSTANTS
// ============================================================================

export const ATHLETE_REASONS: { value: RemovalReason; label: string; icon: string }[] = [
  { value: 'GRADUATED', label: 'Graduated', icon: 'school-outline' },
  { value: 'MOVED', label: 'Moved away', icon: 'airplane-outline' },
  { value: 'INACTIVE', label: 'Inactive', icon: 'time-outline' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];

export const MEMBER_REASONS: { value: MemberRemovalReason; label: string; icon: string }[] = [
  { value: 'LEFT_CLUB', label: 'Left club', icon: 'exit-outline' },
  { value: 'INACTIVE', label: 'Inactive', icon: 'time-outline' },
  { value: 'CONDUCT', label: 'Conduct issue', icon: 'warning-outline' },
  { value: 'SEASON_END', label: 'Season ended', icon: 'calendar-outline' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];

// ============================================================================
// REASON GRID
// ============================================================================

type ReasonType = RemovalReason | MemberRemovalReason;

interface ReasonGridProps {
  reasons: { value: string; label: string; icon: string }[];
  selectedReason: ReasonType | null;
  onSelect: (reason: ReasonType) => void;
}

export const ReasonGrid = React.memo(function ReasonGrid({
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
          <Clickable
            key={reason.value}
            onPress={() => onSelect(reason.value as ReasonType)}
          >
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
                style={[
                  styles.reasonLabel,
                  { color: isSelected ? palette.tint : palette.text },
                ]}
              >
                {reason.label}
              </ThemedText>
            </Row>
          </Clickable>
        );
      })}
    </Row>
  );
});

// ============================================================================
// WARNING BOX
// ============================================================================

interface WarningBoxProps {
  archive: boolean;
}

export const WarningBox = React.memo(function WarningBox({ archive }: WarningBoxProps) {
  const { colors: palette } = useTheme();

  return (
    <Row align="center" gap="sm" style={[styles.warningBox, { backgroundColor: withAlpha(palette.warning, 0.06), borderColor: palette.warning }]}>
      <Ionicons name="information-circle" size={18} color={palette.warning} />
      <ThemedText style={{ ...Typography.small, color: palette.warning, flex: 1 }}>
        {archive
          ? 'This will remove them from active roster but keep their history.'
          : 'This action cannot be undone. All data will be permanently deleted.'}
      </ThemedText>
    </Row>
  );
});

// ============================================================================
// ARCHIVE TOGGLE
// ============================================================================

interface ArchiveToggleProps {
  archive: boolean;
  onToggle: (value: boolean) => void;
}

export const ArchiveToggle = React.memo(function ArchiveToggle({
  archive,
  onToggle,
}: ArchiveToggleProps) {
  const { colors: palette } = useTheme();

  return (
    <Row align="center" justify="between" style={[styles.archiveRow, { borderColor: palette.border }]}>
      <View style={styles.archiveInfo}>
        <ThemedText type="defaultSemiBold">Keep history</ThemedText>
        <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
          Archive session history and notes for records
        </ThemedText>
      </View>
      <Switch
        value={archive}
        onValueChange={onToggle}
        trackColor={{ false: palette.border, true: palette.tint }}
        thumbColor={archive ? palette.background : palette.surface}
      />
    </Row>
  );
});

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
  warningBox: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  archiveRow: {
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  archiveInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
});
