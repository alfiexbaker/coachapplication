/**
 * PaymentSummaryCard — Income summary: owed vs collected split, optional written-off line.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { uiFeedback } from '@/services/ui-feedback';

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

  const handleWriteOffInfo = useCallback(() => {
    uiFeedback.showToast('Written-off sessions are payments you\'ve decided not to chase. Common reasons:\n\n' +
        '\u2022 Athlete cancelled last minute\n' +
        '\u2022 Payment was waived as a favour\n' +
        '\u2022 Unable to collect after multiple reminders\n\n' +
        'You can restore a written-off session back to "owed" at any time.');
  }, []);

  const totalBilled = totalOwed + totalCollected + totalWrittenOff;
  const collectionRate = totalBilled > 0
    ? Math.round((totalCollected / totalBilled) * 100)
    : 0;

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
        <Clickable onPress={handleWriteOffInfo} accessibilityLabel="What does written off mean?">
          <Row align="center" gap="xs" style={styles.writtenOffRow}>
            <Ionicons name="close-circle-outline" size={14} color={colors.muted} />
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>
              {formatGBP(totalWrittenOff)} written off ({writtenOffCount} {writtenOffCount === 1 ? 'session' : 'sessions'})
            </ThemedText>
            <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
          </Row>
        </Clickable>
      )}

      {totalBilled > 0 && (
        <Row align="center" gap="xs" style={styles.collectionRow}>
          <Ionicons
            name={collectionRate >= 80 ? 'trending-up' : 'trending-down'}
            size={14}
            color={collectionRate >= 80 ? colors.success : colors.warning}
          />
          <ThemedText style={[Typography.caption, { color: colors.muted }]}>
            {collectionRate}% collection rate
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
    borderRadius: Radii.md,
    gap: Spacing.xxs,
  },
  writtenOffRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  collectionRow: {
    marginTop: Spacing.sm,
  },
});
