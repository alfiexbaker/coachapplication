/**
 * PaymentSummaryCard — Income summary: owed vs collected split, optional written-off line.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface PaymentSummaryCardProps {
  totalOwed: number;
  totalCollected: number;
  unpaidCount: number;
  paidCount: number;
  totalWrittenOff?: number;
  writtenOffCount?: number;
}

function PaymentSummaryCardInner({
  totalOwed,
  totalCollected,
  unpaidCount,
  paidCount,
  totalWrittenOff = 0,
  writtenOffCount = 0,
}: PaymentSummaryCardProps) {
  const { colors } = useTheme();

  const formatGBP = (amount: number) => `\u00A3${amount.toFixed(2)}`;

  return (
    <SurfaceCard>
      <Row align="center" gap="sm" style={styles.header}>
        <Ionicons name="cash-outline" size={20} color={colors.tint} />
        <ThemedText type="defaultSemiBold">Payment Summary</ThemedText>
      </Row>

      <Row gap="md" style={styles.splitRow}>
        <View style={[styles.splitItem, { backgroundColor: withAlpha(colors.warning, 0.06) }]}>
          <ThemedText style={[Typography.caption, { color: colors.warning }]}>Owed</ThemedText>
          <ThemedText style={[Typography.heading, { color: colors.warning }]}>
            {formatGBP(totalOwed)}
          </ThemedText>
          <ThemedText style={[Typography.micro, { color: colors.muted }]}>
            {unpaidCount} {unpaidCount === 1 ? 'session' : 'sessions'}
          </ThemedText>
        </View>

        <View style={[styles.splitItem, { backgroundColor: withAlpha(colors.success, 0.06) }]}>
          <ThemedText style={[Typography.caption, { color: colors.success }]}>Collected</ThemedText>
          <ThemedText style={[Typography.heading, { color: colors.success }]}>
            {formatGBP(totalCollected)}
          </ThemedText>
          <ThemedText style={[Typography.micro, { color: colors.muted }]}>
            {paidCount} {paidCount === 1 ? 'session' : 'sessions'}
          </ThemedText>
        </View>
      </Row>

      {writtenOffCount > 0 && (
        <Row align="center" gap="xs" style={styles.writtenOffRow}>
          <Ionicons name="close-circle-outline" size={14} color={colors.muted} />
          <ThemedText style={[Typography.caption, { color: colors.muted }]}>
            {formatGBP(totalWrittenOff)} written off ({writtenOffCount} {writtenOffCount === 1 ? 'session' : 'sessions'})
          </ThemedText>
        </Row>
      )}
    </SurfaceCard>
  );
}

export const PaymentSummaryCard = memo(PaymentSummaryCardInner);

const styles = StyleSheet.create({
  header: {
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
  writtenOffRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
  },
});
