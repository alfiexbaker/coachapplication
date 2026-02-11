/**
 * WalletQuickActions — Top Up and History action buttons.
 */

import { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, Radii, Components } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface WalletQuickActionsProps {
  onTopUp: () => void;
  onHistory?: () => void;
}

export const WalletQuickActions = memo(function WalletQuickActions({
  onTopUp,
  onHistory,
}: WalletQuickActionsProps) {
  const { colors } = useTheme();

  const handleTopUp = useCallback(() => {
    onTopUp();
  }, [onTopUp]);

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <Row gap="sm">
        <Clickable
          style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleTopUp}
          accessibilityLabel="Top up wallet"
          accessibilityRole="button"
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.tint} />
          <ThemedText style={[styles.label, { color: colors.text }]}>Top Up</ThemedText>
        </Clickable>
        <Clickable
          style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={onHistory ?? (() => {})}
          disabled={!onHistory}
          accessibilityState={{ disabled: !onHistory }}
          accessibilityLabel="View transaction history"
          accessibilityRole="button"
        >
          <Ionicons name="receipt-outline" size={24} color={colors.tint} />
          <ThemedText style={[styles.label, { color: colors.text }]}>History</ThemedText>
        </Clickable>
      </Row>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    minHeight: Components.button.height,
  },
  label: {
    ...Typography.bodySmallSemiBold,
  },
});
