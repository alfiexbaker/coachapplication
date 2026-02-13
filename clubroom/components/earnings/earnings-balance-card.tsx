import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachEarnings } from '@/constants/types';
import { Row } from '@/components/primitives';

interface EarningsBalanceCardProps {
  earnings: CoachEarnings | null;
  formatCurrency: (amount: number) => string;
  onWithdraw: () => void;
}

export const EarningsBalanceCard = memo(function EarningsBalanceCard({
  earnings,
  formatCurrency,
  onWithdraw,
}: EarningsBalanceCardProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row style={styles.header}>
        <View style={[styles.icon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <Ionicons name="wallet" size={24} color={palette.success} />
        </View>
        <View style={styles.info}>
          <ThemedText style={{ color: palette.muted, ...Typography.small }}>
            Available Balance
          </ThemedText>
          <ThemedText type="title" style={styles.amount}>
            {formatCurrency(earnings?.availableBalance || 0).replace(/^[+-]/, '')}
          </ThemedText>
        </View>
      </Row>
      <View style={[styles.divider, { backgroundColor: palette.border }]} />
      <View style={styles.details}>
        <Row style={styles.row}>
          <Row style={styles.item}>
            <Ionicons name="time-outline" size={16} color={palette.warning} />
            <ThemedText style={{ color: palette.muted, ...Typography.small }}>Pending</ThemedText>
          </Row>
          <ThemedText type="defaultSemiBold">
            {formatCurrency(earnings?.pendingBalance || 0).replace(/^[+-]/, '')}
          </ThemedText>
        </Row>
        <Row style={styles.row}>
          <Row style={styles.item}>
            <Ionicons name="trending-up" size={16} color={palette.success} />
            <ThemedText style={{ color: palette.muted, ...Typography.small }}>
              Total Earned
            </ThemedText>
          </Row>
          <ThemedText type="defaultSemiBold">
            {formatCurrency(earnings?.totalEarned || 0).replace(/^[+-]/, '')}
          </ThemedText>
        </Row>
        <Row style={styles.row}>
          <Row style={styles.item}>
            <Ionicons name="arrow-down-circle-outline" size={16} color={palette.tint} />
            <ThemedText style={{ color: palette.muted, ...Typography.small }}>
              Total Withdrawn
            </ThemedText>
          </Row>
          <ThemedText type="defaultSemiBold">
            {formatCurrency(earnings?.totalWithdrawn || 0).replace(/^[+-]/, '')}
          </ThemedText>
        </Row>
      </View>
      <Clickable onPress={onWithdraw}>
        <Row style={[styles.withdrawBtn, { backgroundColor: palette.tint }]}>
          <Ionicons name="cash-outline" size={18} color={palette.onPrimary} />
          <ThemedText style={{ color: palette.onPrimary, ...Typography.bodySemiBold }}>
            Withdraw
          </ThemedText>
        </Row>
      </Clickable>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.lg, gap: Spacing.md },
  header: { alignItems: 'center', gap: Spacing.md },
  icon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: Spacing.micro },
  amount: { ...Typography.display, letterSpacing: -0.5 },
  divider: { height: 1, marginVertical: Spacing.xs },
  details: { gap: Spacing.sm },
  row: { justifyContent: 'space-between', alignItems: 'center' },
  item: { alignItems: 'center', gap: Spacing.xs },
  withdrawBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
    marginTop: Spacing.xs,
  },
});
