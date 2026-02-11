/**
 * WalletPendingSection — Displays pending transactions in a card.
 */

import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { WalletTransaction } from '@/services/wallet-service';
import { walletService } from '@/services/wallet-service';

interface WalletPendingSectionProps {
  transactions: WalletTransaction[];
}

export const WalletPendingSection = memo(function WalletPendingSection({
  transactions,
}: WalletPendingSectionProps) {
  const { colors } = useTheme();

  if (transactions.length === 0) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown.delay(150).springify()}>
      <SurfaceCard style={styles.card}>
        <Row align="center" gap="xs">
          <Ionicons name="time-outline" size={18} color={colors.warning} />
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Pending Transactions
          </ThemedText>
        </Row>
        {transactions.map((transaction) => (
          <Row
            key={transaction.id}
            align="center"
            style={[styles.item, { borderTopColor: colors.border }]}
          >
            <ThemedText style={styles.description}>{transaction.description}</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: colors.warning }}>
              {walletService.formatAmount(Math.abs(transaction.amount))}
            </ThemedText>
          </Row>
        ))}
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.body,
  },
  item: {
    paddingVertical: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  description: {
    flex: 1,
  },
});
