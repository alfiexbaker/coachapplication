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

const MINIMUM_RETENTION_SAMPLE = 5;

export const RetentionFunnel = memo(function RetentionFunnel({
  colors,
  retention,
}: RetentionFunnelProps) {
  const total = Math.max(
    retention.totalActiveClients + retention.clientsLost,
    retention.newClients + retention.returningClients + retention.clientsLost,
  );
  const activePercent = total > 0 ? (retention.totalActiveClients / total) * 100 : 0;
  const returningPercent = total > 0 ? (retention.returningClients / total) * 100 : 0;
  const remainingForThreshold = Math.max(0, MINIMUM_RETENTION_SAMPLE - total);

  if (total < MINIMUM_RETENTION_SAMPLE) {
    return (
      <SurfaceCard style={styles.card}>
        <Row gap="xs" align="center" style={styles.header}>
          <Ionicons name="funnel" size={20} color={colors.tint} />
          <ThemedText style={styles.title}>Client Funnel</ThemedText>
        </Row>
        <View
          style={[
            styles.insufficientWrap,
            { backgroundColor: withAlpha(colors.warning, 0.08), borderColor: withAlpha(colors.warning, 0.2) },
          ]}
        >
          <Row gap="xs" align="center">
            <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
            <ThemedText style={[Typography.smallSemiBold, { color: colors.warning }]}>
              Insufficient data
            </ThemedText>
          </Row>
          <ThemedText style={[Typography.small, { color: colors.muted }]}>
            Retention funnel needs at least {MINIMUM_RETENTION_SAMPLE} client records. Current sample: {total}.
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: colors.muted }]}>
            {remainingForThreshold} more {remainingForThreshold === 1 ? 'record' : 'records'} needed
          </ThemedText>
        </View>
      </SurfaceCard>
    );
  }

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
  insufficientWrap: {
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  bar: {
    height: '100%',
    borderRadius: Radii.sm,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  barText: { ...Typography.smallSemiBold },
});
