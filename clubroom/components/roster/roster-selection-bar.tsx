/**
 * RosterSelectionBar — Selection mode UI for bulk athlete operations.
 *
 * Shows selected count, "Select All" / "Clear" buttons when in selection mode.
 * Also renders the floating action button for sending invites to selected athletes.
 */

import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Shadows, withAlpha, Components } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface RosterSelectionBarProps {
  selectedCount: number;
  onSelectAll: () => void;
  onClear: () => void;
}

export const RosterSelectionBar = memo(function RosterSelectionBar({
  selectedCount,
  onSelectAll,
  onClear,
}: RosterSelectionBarProps) {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeInUp.springify()}
      style={[styles.bar, { backgroundColor: withAlpha(colors.tint, 0.06) }]}
    >
      <Row align="center" justify="between" flex>
        <ThemedText style={{ color: colors.tint, ...Typography.bodySemiBold }}>
          {selectedCount} selected
        </ThemedText>
        <Row gap="sm" align="center">
          <Clickable
            onPress={onSelectAll}
            style={styles.actionButton}
            accessibilityLabel="Select all visible athletes"
            accessibilityRole="button"
          >
            <ThemedText style={{ color: colors.tint, ...Typography.small }}>
              Select All
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={onClear}
            style={styles.actionButton}
            accessibilityLabel="Clear selection"
            accessibilityRole="button"
          >
            <ThemedText style={{ color: colors.tint, ...Typography.small }}>
              Clear
            </ThemedText>
          </Clickable>
        </Row>
      </Row>
    </Animated.View>
  );
});

// ── Floating Invite Button ──────────────────────────────────────────────────

interface RosterFloatingInviteProps {
  selectedCount: number;
  onPress: () => void;
}

export const RosterFloatingInvite = memo(function RosterFloatingInvite({
  selectedCount,
  onPress,
}: RosterFloatingInviteProps) {
  const { colors, scheme } = useTheme();

  return (
    <Animated.View
      entering={FadeInUp.springify()}
      style={[styles.floating, { backgroundColor: colors.tint, ...Shadows[scheme].card }]}
    >
      <Clickable
        onPress={onPress}
        style={styles.floatingButton}
        accessibilityLabel={`Invite ${selectedCount} selected athlete${selectedCount !== 1 ? 's' : ''}`}
        accessibilityRole="button"
      >
        <Row gap="sm" align="center" justify="center">
          <Ionicons name="mail" size={Components.icon.md} color={colors.onPrimary} />
          <ThemedText style={{ color: colors.onPrimary, ...Typography.bodySemiBold }}>
            Invite {selectedCount} Athlete{selectedCount !== 1 ? 's' : ''}
          </ThemedText>
        </Row>
      </Clickable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    minHeight: Components.button.height,
    justifyContent: 'center',
  },
  actionButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: Components.buttonCompact.height,
    justifyContent: 'center',
  },
  floating: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: Radii.md,
  },
  floatingButton: {
    paddingVertical: Spacing.md,
    minHeight: Components.button.height,
    justifyContent: 'center',
  },
});
