import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, Components } from '@/constants/theme';
import type { RetentionMetrics } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export interface RetentionCardProps {
  /** Retention metrics data */
  metrics: RetentionMetrics;
  /** Title for the card */
  title?: string;
  /** Whether the card is loading */
  loading?: boolean;
  /** Callback when card is pressed */
  onPress?: () => void;
}

/**
 * RetentionCard displays client retention metrics including
 * new vs returning clients, churn rate, and retention rate.
 */
export function RetentionCard({
  metrics,
  title = 'Client Retention',
  loading = false,
  onPress,
}: RetentionCardProps) {
  const { colors: palette } = useTheme();

  const getRetentionColor = (rate: number): string => {
    if (rate >= 90) return palette.success;
    if (rate >= 75) return palette.warning;
    return palette.error;
  };

  const getChurnColor = (rate: number): string => {
    if (rate <= 5) return palette.success;
    if (rate <= 15) return palette.warning;
    return palette.error;
  };

  const retentionColor = getRetentionColor(metrics.retentionRate);
  const churnColor = getChurnColor(metrics.churnRate);

  return (
    <SurfaceCard
      style={styles.card}
      loading={loading}
      onPress={onPress}
      tactile={!!onPress}
    >
      <View style={styles.header}>
        <Row style={styles.titleRow}>
          <Ionicons name="people" size={20} color={palette.tint} />
          <ThemedText style={styles.title}>{title}</ThemedText>
        </Row>
      </View>

      {/* Main retention rate */}
      <View style={styles.mainMetric}>
        <View style={styles.progressRing}>
          <View
            style={[
              styles.progressBackground,
              { borderColor: palette.border },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  borderColor: retentionColor,
                  transform: [
                    { rotate: `${(metrics.retentionRate / 100) * 360}deg` },
                  ],
                },
              ]}
            />
          </View>
          <View style={styles.progressCenter}>
            <ThemedText style={[styles.retentionValue, { color: retentionColor }]}>
              {metrics.retentionRate.toFixed(0)}%
            </ThemedText>
            <ThemedText style={[styles.retentionLabel, { color: palette.muted }]}>
              Retention
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Client breakdown */}
      <Row style={styles.clientBreakdown}>
        <Row style={styles.clientStat}>
          <View style={[styles.clientDot, { backgroundColor: palette.success }]} />
          <View style={styles.clientInfo}>
            <ThemedText style={styles.clientValue}>
              {metrics.returningClients}
            </ThemedText>
            <ThemedText style={[styles.clientLabel, { color: palette.muted }]}>
              Returning
            </ThemedText>
          </View>
        </Row>
        <Row style={styles.clientStat}>
          <View style={[styles.clientDot, { backgroundColor: palette.tint }]} />
          <View style={styles.clientInfo}>
            <ThemedText style={styles.clientValue}>
              {metrics.newClients}
            </ThemedText>
            <ThemedText style={[styles.clientLabel, { color: palette.muted }]}>
              New
            </ThemedText>
          </View>
        </Row>
        <Row style={styles.clientStat}>
          <View style={[styles.clientDot, { backgroundColor: palette.error }]} />
          <View style={styles.clientInfo}>
            <ThemedText style={styles.clientValue}>
              {metrics.clientsLost}
            </ThemedText>
            <ThemedText style={[styles.clientLabel, { color: palette.muted }]}>
              Lost
            </ThemedText>
          </View>
        </Row>
      </Row>

      {/* Additional metrics */}
      <Row style={[styles.metricsRow, { borderTopColor: palette.border }]}>
        <View style={styles.metricItem}>
          <ThemedText style={styles.metricValue}>
            {metrics.totalActiveClients}
          </ThemedText>
          <ThemedText style={[styles.metricLabel, { color: palette.muted }]}>
            Active Clients
          </ThemedText>
        </View>
        <View style={styles.metricItem}>
          <ThemedText style={styles.metricValue}>
            {metrics.avgSessionsPerClient.toFixed(1)}
          </ThemedText>
          <ThemedText style={[styles.metricLabel, { color: palette.muted }]}>
            Avg Sessions
          </ThemedText>
        </View>
        <View style={styles.metricItem}>
          <ThemedText style={[styles.metricValue, { color: churnColor }]}>
            {metrics.churnRate.toFixed(1)}%
          </ThemedText>
          <ThemedText style={[styles.metricLabel, { color: palette.muted }]}>
            Churn Rate
          </ThemedText>
        </View>
      </Row>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Components.card.padding,
  },
  header: {
    marginBottom: Spacing.md,
  },
  titleRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: { ...Typography.subheading },
  mainMetric: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressRing: {
    width: 120,
    height: 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBackground: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: Radii.pill,
    borderWidth: 8,
  },
  progressFill: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: Radii.pill,
    borderWidth: 8,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  progressCenter: {
    alignItems: 'center',
  },
  retentionValue: { ...Typography.display },
  retentionLabel: { ...Typography.caption, marginTop: Spacing.micro },
  clientBreakdown: {
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  clientStat: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  clientDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  clientInfo: {
    alignItems: 'flex-start',
  },
  clientValue: { ...Typography.subheading },
  clientLabel: { ...Typography.caption },
  metricsRow: {
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: { ...Typography.heading },
  metricLabel: { ...Typography.caption, textAlign: 'center',
    marginTop: Spacing.micro },
});
