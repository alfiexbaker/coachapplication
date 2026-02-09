import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Transaction {
  childName: string;
  colorCode: string;
  month: string;
  amount: number;
  sessionCount: number;
}

interface SpendingTransactionsProps {
  transactions: Transaction[];
}

export const SpendingTransactions = memo(function SpendingTransactions({ transactions }: SpendingTransactionsProps) {
  const { colors } = useTheme();

  const handleViewAll = useCallback(() => {
    router.push(Routes.FAMILY_CALENDAR);
  }, []);

  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" justify="space-between">
        <ThemedText type="defaultSemiBold" style={Typography.bodySmall}>Recent Sessions</ThemedText>
        <Clickable onPress={handleViewAll}>
          <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>View All</ThemedText>
        </Clickable>
      </Row>
      <View style={{ gap: Spacing.sm }}>
        {transactions.map((item, index) => (
          <Row key={`${item.childName}-${item.month}-${index}`} align="center" justify="space-between" style={styles.item}>
            <Row gap="sm" align="center">
              <View style={[styles.dot, { backgroundColor: item.colorCode }]} />
              <View style={{ gap: Spacing.micro }}>
                <ThemedText style={Typography.bodySmall}>{item.childName}</ThemedText>
                <ThemedText style={[Typography.caption, { color: colors.muted }]}>{item.sessionCount} sessions</ThemedText>
              </View>
            </Row>
            <ThemedText type="defaultSemiBold" style={Typography.bodySmall}>{'\u00A3'}{item.amount.toFixed(2)}</ThemedText>
          </Row>
        ))}
      </View>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.md },
  item: { paddingVertical: Spacing.xs },
  dot: { width: 10, height: 10, borderRadius: Radii.sm },
});
