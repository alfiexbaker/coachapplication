/**
 * BillSummaryCard — Total expenses, paid/pending split.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BillSummary } from '@/constants/types';

interface BillSummaryCardProps {
  summary: BillSummary;
}

function BillSummaryCardInner({ summary }: BillSummaryCardProps) {
  const { colors } = useTheme();

  const formatGBP = (amount: number) => `£${amount.toFixed(2)}`;

  return (
    <SurfaceCard>
      <Row align="center" gap="sm" style={styles.header}>
        <Ionicons name="receipt-outline" size={20} color={colors.tint} />
        <ThemedText type="defaultSemiBold">Expense Summary</ThemedText>
      </Row>

      <ThemedText style={[styles.totalLabel, { color: colors.muted }]}>Total Expenses</ThemedText>
      <ThemedText style={[styles.totalAmount, { color: colors.text }]}>
        {formatGBP(summary.totalExpenses)}
      </ThemedText>

      <Row gap="md" style={styles.splitRow}>
        <View style={[styles.splitItem, { backgroundColor: withAlpha(colors.success, 0.06) }]}>
          <ThemedText style={[Typography.caption, { color: colors.success }]}>Paid</ThemedText>
          <ThemedText style={[Typography.heading, { color: colors.success }]}>
            {formatGBP(summary.totalPaid)}
          </ThemedText>
          <ThemedText style={[Typography.micro, { color: colors.muted }]}>
            {summary.paidCount} {summary.paidCount === 1 ? 'bill' : 'bills'}
          </ThemedText>
        </View>

        <View style={[styles.splitItem, { backgroundColor: withAlpha(colors.warning, 0.06) }]}>
          <ThemedText style={[Typography.caption, { color: colors.warning }]}>Pending</ThemedText>
          <ThemedText style={[Typography.heading, { color: colors.warning }]}>
            {formatGBP(summary.totalPending)}
          </ThemedText>
          <ThemedText style={[Typography.micro, { color: colors.muted }]}>
            {summary.pendingCount} {summary.pendingCount === 1 ? 'bill' : 'bills'}
          </ThemedText>
        </View>
      </Row>
    </SurfaceCard>
  );
}

export const BillSummaryCard = memo(BillSummaryCardInner);

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.sm,
  },
  totalLabel: {
    ...Typography.caption,
  },
  totalAmount: {
    ...Typography.display,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  splitRow: {
    marginTop: Spacing.xs,
  },
  splitItem: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: 12,
    gap: Spacing.xxs,
  },
});
