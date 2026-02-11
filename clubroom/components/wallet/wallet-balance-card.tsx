/**
 * WalletBalanceCard — Displays wallet balance, pending amount, and top-up CTA.
 */

import { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, Radii, Components } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Wallet } from '@/services/wallet-service';
import { walletService } from '@/services/wallet-service';

interface WalletBalanceCardProps {
  wallet: Wallet | null;
  onTopUp: () => void;
}

export const WalletBalanceCard = memo(function WalletBalanceCard({
  wallet,
  onTopUp,
}: WalletBalanceCardProps) {
  const { colors } = useTheme();

  const handleTopUp = useCallback(() => {
    onTopUp();
  }, [onTopUp]);

  return (
    <Animated.View entering={FadeInDown.delay(50).springify()}>
      <SurfaceCard style={styles.card}>
        <Column align="center" gap="sm">
          <ThemedText style={[styles.label, { color: colors.muted }]}>
            Available Balance
          </ThemedText>
          <ThemedText style={styles.amount}>
            {wallet ? walletService.formatAmount(wallet.balance) : '\u00A30.00'}
          </ThemedText>
          {wallet && wallet.pendingBalance > 0 && (
            <Row align="center" gap="xs">
              <Ionicons name="time-outline" size={14} color={colors.warning} />
              <ThemedText style={[styles.pendingText, { color: colors.warning }]}>
                {walletService.formatAmount(wallet.pendingBalance)} pending
              </ThemedText>
            </Row>
          )}
          <Clickable
            style={[styles.topUpButton, { backgroundColor: colors.tint }]}
            onPress={handleTopUp}
            accessibilityLabel="Top up wallet"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={20} color={colors.onPrimary} />
            <ThemedText style={[styles.topUpText, { color: colors.onPrimary }]}>
              Top Up
            </ThemedText>
          </Clickable>
        </Column>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
  },
  label: {
    ...Typography.bodySmallSemiBold,
  },
  amount: {
    ...Typography.display,
    letterSpacing: -1,
  },
  pendingText: {
    ...Typography.smallSemiBold,
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    marginTop: Spacing.sm,
    minHeight: Components.button.height,
  },
  topUpText: {
    ...Typography.subheading,
  },
});
