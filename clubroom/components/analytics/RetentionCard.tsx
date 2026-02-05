import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { RetentionMetrics } from '@/constants/types';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
        <View style={styles.titleRow}>
          <Ionicons name="people" size={20} color={palette.tint} />
          <ThemedText style={styles.title}>{title}</ThemedText>
        </View>
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
      <View style={styles.clientBreakdown}>
        <View style={styles.clientStat}>
          <View style={[styles.clientDot, { backgroundColor: palette.success }]} />
          <View style={styles.clientInfo}>
            <ThemedText style={styles.clientValue}>
              {metrics.returningClients}
            </ThemedText>
            <ThemedText style={[styles.clientLabel, { color: palette.muted }]}>
              Returning
            </ThemedText>
          </View>
        </View>
        <View style={styles.clientStat}>
          <View style={[styles.clientDot, { backgroundColor: palette.tint }]} />
          <View style={styles.clientInfo}>
            <ThemedText style={styles.clientValue}>
              {metrics.newClients}
            </ThemedText>
            <ThemedText style={[styles.clientLabel, { color: palette.muted }]}>
              New
            </ThemedText>
          </View>
        </View>
        <View style={styles.clientStat}>
          <View style={[styles.clientDot, { backgroundColor: palette.error }]} />
          <View style={styles.clientInfo}>
            <ThemedText style={styles.clientValue}>
              {metrics.clientsLost}
            </ThemedText>
            <ThemedText style={[styles.clientLabel, { color: palette.muted }]}>
              Lost
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Additional metrics */}
      <View style={[styles.metricsRow, { borderTopColor: palette.border }]}>
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
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
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
    borderRadius: 50,
    borderWidth: 8,
  },
  progressFill: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  progressCenter: {
    alignItems: 'center',
  },
  retentionValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  retentionLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  clientBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  clientStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  clientDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  clientInfo: {
    alignItems: 'flex-start',
  },
  clientValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  clientLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
});
