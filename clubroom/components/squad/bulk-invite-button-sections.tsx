/**
 * Bulk Invite Button — Extracted sections
 *
 * Compact variant of the bulk invite button.
 */

import { memo } from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// CompactBulkInviteButton
// ---------------------------------------------------------------------------

export interface CompactBulkInviteButtonProps {
  selectedCount: number;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const CompactBulkInviteButton = memo(function CompactBulkInviteButton({
  selectedCount,
  onPress,
  loading = false,
  disabled = false,
}: CompactBulkInviteButtonProps) {
  const { colors: palette } = useTheme();
  const isDisabled = disabled || loading || selectedCount === 0;

  return (
    <Clickable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.compactButton,
        {
          backgroundColor: palette.tint,
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}
    >
      <Row align="center" gap="xs">
        {loading ? (
          <ActivityIndicator size="small" color={palette.onPrimary} />
        ) : (
          <>
            <Ionicons name="paper-plane" size={16} color={palette.onPrimary} />
            <ThemedText style={[styles.compactButtonText, { color: palette.onPrimary }]}>
              Invite {selectedCount}
            </ThemedText>
          </>
        )}
      </Row>
    </Clickable>
  );
});

const styles = StyleSheet.create({
  compactButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  compactButtonText: { ...Typography.smallSemiBold },
});
