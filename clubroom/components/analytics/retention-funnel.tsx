import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { RetentionMetrics } from '@/constants/types';

interface RetentionFunnelProps {
  colors: ThemeColors;
  retention: RetentionMetrics;
}

export const RetentionFunnel = memo(function RetentionFunnel({
  colors,
  retention,
}: RetentionFunnelProps) {
  const total = retention.totalActiveClients + retention.clientsLost;
  const activePercent = total > 0 ? (retention.totalActiveClients / total) * 100 : 0;
  const returningPercent = total > 0 ? (retention.returningClients / total) * 100 : 0;

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="xs" align="center" style={styles.header}>
        <Ionicons name="funnel" size={20} color={colors.tint} />
        <ThemedText style={styles.title}>Client Funnel</ThemedText>
      </Row>
      <Column gap="sm">
        <FunnelBar
          width="100%"
          color={withAlpha(colors.tint, 0.38)}
          label={`${total} Total`}
          fgColor={colors.onPrimary}
        />
        <FunnelBar
          width={`${activePercent}%`}
          color={withAlpha(colors.tint, 0.5)}
          label={`${retention.totalActiveClients} Active`}
          fgColor={colors.onPrimary}
        />
        <FunnelBar
          width={`${returningPercent}%`}
          color={withAlpha(colors.success, 0.5)}
          label={`${retention.returningClients} Returning`}
          fgColor={colors.onPrimary}
        />
      </Column>
    </SurfaceCard>
  );
});

function FunnelBar({
  width,
  color,
  label,
  fgColor,
}: {
  width: string;
  color: string;
  label: string;
  fgColor: string;
}) {
  return (
    <View style={styles.step}>
      <View style={[styles.bar, { width: width as never, backgroundColor: color, minWidth: 80 }]}>
        <ThemedText style={[styles.barText, { color: fgColor }]}>{label}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.md },
  header: { marginBottom: Spacing.md },
  title: { ...Typography.subheading },
  step: { height: 36 },
  bar: {
    height: '100%',
    borderRadius: Radii.sm,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  barText: { ...Typography.smallSemiBold },
});
