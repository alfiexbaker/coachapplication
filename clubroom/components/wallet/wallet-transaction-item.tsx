/**
 * WalletTransactionItem — Single transaction row for the FlatList.
 *
 * Wrapped in memo() for FlatList renderItem performance.
 */

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, Radii, withAlpha, Components } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { WalletTransaction } from '@/services/wallet-service';
import { walletService } from '@/services/wallet-service';
import { getTransactionIcon, formatWalletDate } from '@/hooks/use-wallet';

interface WalletTransactionItemProps {
  transaction: WalletTransaction;
}

export const WalletTransactionItem = memo(function WalletTransactionItem({
  transaction,
}: WalletTransactionItemProps) {
  const { colors } = useTheme();

  const isCredit = transaction.amount > 0;
  const iconName = getTransactionIcon(transaction.type);
  const isPending = transaction.status === 'PENDING';

  const iconBgColor = isPending
    ? withAlpha(colors.warning, 0.09)
    : isCredit
      ? withAlpha(colors.success, 0.09)
      : withAlpha(colors.error, 0.09);

  const iconColor = isPending ? colors.warning : isCredit ? colors.success : colors.error;

  const amountColor = isPending ? colors.warning : isCredit ? colors.success : colors.text;

  return (
    <Row align="center" gap="md" style={styles.container}>
      <View style={[styles.icon, { backgroundColor: iconBgColor }]}>
        <Ionicons name={iconName} size={Components.icon.md} color={iconColor} />
      </View>
      <Column gap="micro" style={styles.details}>
        <ThemedText type="defaultSemiBold" style={styles.description}>
          {transaction.description}
        </ThemedText>
        <ThemedText style={[styles.date, { color: colors.muted }]}>
          {formatWalletDate(transaction.createdAt)}
          {isPending && ' - Pending'}
        </ThemedText>
      </Column>
      <ThemedText type="defaultSemiBold" style={[styles.amount, { color: amountColor }]}>
        {isCredit ? '+' : ''}
        {walletService.formatAmount(transaction.amount)}
      </ThemedText>
    </Row>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
  },
  description: {
    ...Typography.body,
  },
  date: {
    ...Typography.caption,
  },
  amount: {
    ...Typography.body,
  },
});
