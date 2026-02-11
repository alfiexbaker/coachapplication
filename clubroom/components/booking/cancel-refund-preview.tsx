import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatTimeUntil } from '@/hooks/use-booking-cancel';
import type { RefundCalculation } from '@/constants/types';
import { Row } from '@/components/primitives';

interface CancelRefundPreviewProps {
  isCoach: boolean;
  bookingAmount: number;
  refundCalc: RefundCalculation | null;
}

export const CancelRefundPreview = memo(function CancelRefundPreview({
  isCoach,
  bookingAmount,
  refundCalc,
}: CancelRefundPreviewProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row style={styles.header}>
        <Ionicons
          name={refundCalc?.isEligible ? 'cash-outline' : 'close-circle-outline'}
          size={28}
          color={refundCalc?.isEligible ? palette.success : palette.error}
        />
        <ThemedText type="subtitle" style={styles.title}>
          {isCoach ? 'Refund to Parent' : 'Refund Preview'}
        </ThemedText>
      </Row>

      {refundCalc && (
        <>
          <View
            style={[
              styles.amountBox,
              {
                backgroundColor: refundCalc.isEligible
                  ? withAlpha(palette.success, 0.06)
                  : withAlpha(palette.error, 0.06),
              },
            ]}
          >
            <ThemedText style={[styles.label, { color: palette.muted }]}>
              {isCoach ? 'Parent receives' : "You'll receive"}
            </ThemedText>
            <ThemedText
              type="title"
              style={[
                styles.amount,
                { color: refundCalc.isEligible ? palette.success : palette.error },
              ]}
            >
              {'\u00A3'}
              {refundCalc.netRefundAmount.toFixed(2)}
            </ThemedText>
            {refundCalc.refundPercentage > 0 && refundCalc.refundPercentage < 100 && (
              <ThemedText style={[styles.percent, { color: palette.muted }]}>
                ({refundCalc.refundPercentage}% of {'\u00A3'}
                {bookingAmount.toFixed(2)})
              </ThemedText>
            )}
          </View>

          <View style={styles.breakdown}>
            <Row style={styles.row}>
              <ThemedText style={{ color: palette.muted }}>Original amount</ThemedText>
              <ThemedText>
                {'\u00A3'}
                {refundCalc.originalAmount.toFixed(2)}
              </ThemedText>
            </Row>
            <Row style={styles.row}>
              <ThemedText style={{ color: palette.muted }}>
                Refund ({refundCalc.refundPercentage}%)
              </ThemedText>
              <ThemedText>
                {'\u00A3'}
                {refundCalc.refundAmount.toFixed(2)}
              </ThemedText>
            </Row>
            {refundCalc.platformFee > 0 && (
              <Row style={styles.row}>
                <ThemedText style={{ color: palette.muted }}>Platform fee</ThemedText>
                <ThemedText style={{ color: palette.error }}>
                  -{'\u00A3'}
                  {refundCalc.platformFee.toFixed(2)}
                </ThemedText>
              </Row>
            )}
            <Row style={[styles.row, styles.total, { borderTopColor: palette.border }]}>
              <ThemedText type="defaultSemiBold">Net refund</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
                {'\u00A3'}
                {refundCalc.netRefundAmount.toFixed(2)}
              </ThemedText>
            </Row>
          </View>

          <Row style={[styles.timeNotice, { backgroundColor: withAlpha(palette.warning, 0.06) }]}>
            <Ionicons name="time-outline" size={18} color={palette.warning} />
            <ThemedText style={[styles.timeText, { color: palette.warning }]}>
              {formatTimeUntil(refundCalc.hoursUntilSession)} until session
            </ThemedText>
          </Row>
        </>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.lg, gap: Spacing.md },
  header: { alignItems: 'center', gap: Spacing.sm },
  title: { flex: 1 },
  amountBox: {
    padding: Spacing.lg,
    borderRadius: Radii.md,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  label: { ...Typography.small },
  amount: { ...Typography.display, letterSpacing: -1 },
  percent: { ...Typography.small },
  breakdown: { gap: Spacing.xs },
  row: { justifyContent: 'space-between', paddingVertical: Spacing.xxs },
  total: { borderTopWidth: 1, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  timeNotice: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  timeText: { ...Typography.smallSemiBold },
});
