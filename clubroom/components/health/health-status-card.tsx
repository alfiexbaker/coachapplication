import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';

import type { ThemeColors } from '@/hooks/useTheme';
import type { Injury } from '@/constants/types';
import { Row } from '@/components/primitives';

interface HealthStatusCardProps {
  colors: ThemeColors;
  injuries: Injury[];
  activeCount: number;
  avgRecovery: number;
}

export const HealthStatusCard = function HealthStatusCard({
  colors,
  injuries,
  activeCount,
  avgRecovery,
}: HealthStatusCardProps) {
  if (activeCount === 0) {
    return (
      <SurfaceCard style={styles.card}>
        <View style={styles.healthyState}>
          <View style={[styles.healthyIcon, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          </View>
          <ThemedText type="subtitle" style={styles.healthyTitle}>
            All Clear!
          </ThemedText>
          <ThemedText style={[styles.healthyText, { color: colors.muted }]}>
            You have no active injuries. Keep up the great work!
          </ThemedText>
        </View>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.statusContent}>
        <Row style={styles.statusRow}>
          <StatusItem
            icon="pulse"
            iconColor={colors.error}
            value={String(injuries.filter((i) => i.status === 'ACTIVE').length)}
            valueColor={colors.error}
            label="Active"
            labelColor={colors.muted}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <StatusItem
            icon="trending-up"
            iconColor={colors.warning}
            value={String(injuries.filter((i) => i.status === 'RECOVERING').length)}
            valueColor={colors.warning}
            label="Recovering"
            labelColor={colors.muted}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <StatusItem
            icon="fitness"
            iconColor={colors.tint}
            value={`${avgRecovery}%`}
            valueColor={colors.tint}
            label="Avg Recovery"
            labelColor={colors.muted}
          />
        </Row>
      </View>
    </SurfaceCard>
  );
};

interface StatusItemProps {
  icon: string;
  iconColor: string;
  value: string;
  valueColor: string;
  label: string;
  labelColor: string;
}

function StatusItem({ icon, iconColor, value, valueColor, label, labelColor }: StatusItemProps) {
  return (
    <View style={styles.statusItem}>
      <View style={[styles.statusIcon, { backgroundColor: withAlpha(iconColor, 0.09) }]}>
        <Ionicons name={icon as never} size={24} color={iconColor} />
      </View>
      <ThemedText type="title" style={{ color: valueColor }}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.statusLabel, { color: labelColor }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md },
  healthyState: { alignItems: 'center', padding: Spacing.md },
  healthyIcon: {
    width: 80,
    height: 80,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  healthyTitle: { marginBottom: Spacing.xxs },
  healthyText: { textAlign: 'center', ...Typography.bodySmall },
  statusContent: { padding: Spacing.sm },
  statusRow: { alignItems: 'center', justifyContent: 'space-around' },
  statusItem: { alignItems: 'center', flex: 1 },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statusLabel: { ...Typography.caption },
  divider: { width: 1, height: 50 },
});
