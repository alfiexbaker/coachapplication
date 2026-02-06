import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { createLogger } from '@/utils/logger';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { AnalyticsStatCard, RetentionCard, CancellationChart } from '@/components/analytics';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { coachAnalyticsService } from '@/services/analytics-service';
import type { RetentionMetrics, CancellationStats } from '@/constants/types';

const logger = createLogger('RetentionScreen');

/**
 * Retention Metrics Screen
 *
 * Deep dive into client retention and churn analytics including:
 * - Retention and churn rates
 * - New vs returning clients
 * - Client lifetime value
 * - Cancellation patterns and reasons
 * - Recommendations for improvement
 */
export default function RetentionScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();
  const { currentUser } = useAuth();

  const [retention, setRetention] = useState<RetentionMetrics | null>(null);
  const [cancellations, setCancellations] = useState<CancellationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const [retentionData, cancellationData] = await Promise.all([
        coachAnalyticsService.getRetentionMetrics(currentUser.id),
        coachAnalyticsService.getCancellationPatterns(currentUser.id),
      ]);
      setRetention(retentionData);
      setCancellations(cancellationData);
    } catch (error) {
      logger.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const getRetentionStatus = (): { label: string; color: string; icon: keyof typeof Ionicons.glyphMap } => {
    if (!retention) return { label: 'Unknown', color: palette.muted, icon: 'help-circle' };
    if (retention.retentionRate >= 90) {
      return { label: 'Excellent', color: palette.success, icon: 'checkmark-circle' };
    }
    if (retention.retentionRate >= 75) {
      return { label: 'Good', color: palette.warning, icon: 'alert-circle' };
    }
    return { label: 'Needs Improvement', color: palette.error, icon: 'close-circle' };
  };

  const status = getRetentionStatus();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading retention data...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={palette.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>
              Client Retention
            </ThemedText>
          </View>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Understanding your client base
          </ThemedText>
        </View>

        {retention && (
          <>
            {/* Status badge */}
            <SurfaceCard style={styles.statusCard}>
              <View style={styles.statusContent}>
                <View style={[styles.statusIcon, { backgroundColor: withAlpha(status.color, 0.12) }]}>
                  <Ionicons name={status.icon} size={28} color={status.color} />
                </View>
                <View style={styles.statusInfo}>
                  <ThemedText style={[styles.statusLabel, { color: status.color }]}>
                    {status.label}
                  </ThemedText>
                  <ThemedText style={styles.statusValue}>
                    {retention.retentionRate.toFixed(1)}% Retention Rate
                  </ThemedText>
                </View>
              </View>
            </SurfaceCard>

            {/* Key metrics */}
            <View style={styles.statsGrid}>
              <AnalyticsStatCard
                label="Active Clients"
                value={retention.totalActiveClients}
                icon="people"
                iconColor={palette.tint}
              />
              <AnalyticsStatCard
                label="Avg Sessions"
                value={retention.avgSessionsPerClient.toFixed(1)}
                icon="calendar"
                iconColor={palette.tint}
              />
            </View>

            <View style={styles.statsGrid}>
              <AnalyticsStatCard
                label="New Clients"
                value={retention.newClients}
                icon="person-add"
                iconColor={palette.success}
              />
              <AnalyticsStatCard
                label="Returning"
                value={retention.returningClients}
                icon="repeat"
                iconColor={palette.tint}
              />
            </View>

            <View style={styles.statsGrid}>
              <AnalyticsStatCard
                label="Churn Rate"
                value={`${retention.churnRate.toFixed(1)}%`}
                icon="trending-down"
                iconColor={palette.error}
              />
              <AnalyticsStatCard
                label="Clients Lost"
                value={retention.clientsLost}
                icon="person-remove"
                iconColor={palette.error}
              />
            </View>

            {/* Retention breakdown card */}
            <RetentionCard metrics={retention} title="Retention Overview" />

            {/* Client funnel */}
            <SurfaceCard style={styles.funnelCard}>
              <View style={styles.funnelHeader}>
                <Ionicons name="funnel" size={20} color={palette.tint} />
                <ThemedText style={styles.funnelTitle}>Client Funnel</ThemedText>
              </View>
              <View style={styles.funnelSteps}>
                <View style={styles.funnelStep}>
                  <View style={[styles.funnelBar, { width: '100%', backgroundColor: withAlpha(palette.tint, 0.38) }]}>
                    <ThemedText style={styles.funnelBarText}>
                      {retention.totalActiveClients + retention.clientsLost} Total
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.funnelStep}>
                  <View
                    style={[
                      styles.funnelBar,
                      {
                        width: `${(retention.totalActiveClients / (retention.totalActiveClients + retention.clientsLost)) * 100}%`,
                        backgroundColor: withAlpha(palette.tint, 0.5),
                      },
                    ]}
                  >
                    <ThemedText style={styles.funnelBarText}>
                      {retention.totalActiveClients} Active
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.funnelStep}>
                  <View
                    style={[
                      styles.funnelBar,
                      {
                        width: `${(retention.returningClients / (retention.totalActiveClients + retention.clientsLost)) * 100}%`,
                        backgroundColor: withAlpha(palette.success, 0.5),
                      },
                    ]}
                  >
                    <ThemedText style={styles.funnelBarText}>
                      {retention.returningClients} Returning
                    </ThemedText>
                  </View>
                </View>
              </View>
            </SurfaceCard>
          </>
        )}

        {/* Cancellation patterns */}
        {cancellations && cancellations.totalCancellations > 0 && (
          <CancellationChart stats={cancellations} title="Cancellation Analysis" />
        )}

        {/* Recommendations */}
        <SurfaceCard style={styles.recommendationsCard}>
          <View style={styles.recommendationsHeader}>
            <Ionicons name="bulb" size={20} color={palette.warning} />
            <ThemedText style={styles.recommendationsTitle}>
              Tips to Improve Retention
            </ThemedText>
          </View>
          <View style={styles.recommendationsList}>
            <View style={styles.recommendationItem}>
              <View style={[styles.recommendationIcon, { backgroundColor: withAlpha(palette.success, 0.12) }]}>
                <Ionicons name="chatbubble" size={16} color={palette.success} />
              </View>
              <View style={styles.recommendationContent}>
                <ThemedText style={styles.recommendationText}>
                  Follow up with clients after sessions
                </ThemedText>
                <ThemedText style={[styles.recommendationSub, { color: palette.muted }]}>
                  A quick message shows you care about their progress
                </ThemedText>
              </View>
            </View>
            <View style={styles.recommendationItem}>
              <View style={[styles.recommendationIcon, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                <Ionicons name="gift" size={16} color={palette.tint} />
              </View>
              <View style={styles.recommendationContent}>
                <ThemedText style={styles.recommendationText}>
                  Offer package discounts
                </ThemedText>
                <ThemedText style={[styles.recommendationSub, { color: palette.muted }]}>
                  Incentivize commitment with multi-session packages
                </ThemedText>
              </View>
            </View>
            <View style={styles.recommendationItem}>
              <View style={[styles.recommendationIcon, { backgroundColor: withAlpha(palette.warning, 0.12) }]}>
                <Ionicons name="trophy" size={16} color={palette.warning} />
              </View>
              <View style={styles.recommendationContent}>
                <ThemedText style={styles.recommendationText}>
                  Set and track goals together
                </ThemedText>
                <ThemedText style={[styles.recommendationSub, { color: palette.muted }]}>
                  Clients with clear goals are more likely to return
                </ThemedText>
              </View>
            </View>
            <View style={styles.recommendationItem}>
              <View style={[styles.recommendationIcon, { backgroundColor: withAlpha(palette.error, 0.12) }]}>
                <Ionicons name="calendar-outline" size={16} color={palette.error} />
              </View>
              <View style={styles.recommendationContent}>
                <ThemedText style={styles.recommendationText}>
                  Reduce cancellation rate
                </ThemedText>
                <ThemedText style={[styles.recommendationSub, { color: palette.muted }]}>
                  Send reminders and have a clear cancellation policy
                </ThemedText>
              </View>
            </View>
          </View>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xxs,
    marginLeft: -4,
  },
  title: {
    ...Typography.display,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.body,
    marginTop: Spacing.xxs,
    marginLeft: 32,
  },
  statusCard: {
    padding: Spacing.md,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    ...Typography.bodySmallSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xxs,
  },
  statusValue: {
    ...Typography.title,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  funnelCard: {
    padding: Spacing.md,
  },
  funnelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  funnelTitle: {
    ...Typography.subheading,
  },
  funnelSteps: {
    gap: Spacing.sm,
  },
  funnelStep: {
    height: 36,
  },
  funnelBar: {
    height: '100%',
    borderRadius: Radii.sm,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    minWidth: 80,
  },
  funnelBarText: {
    ...Typography.smallSemiBold,
    color: Colors.light.onPrimary,
  },
  recommendationsCard: {
    padding: Spacing.md,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  recommendationsTitle: {
    ...Typography.subheading,
  },
  recommendationsList: {
    gap: Spacing.md,
  },
  recommendationItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  recommendationIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationText: {
    ...Typography.bodySmallSemiBold,
    marginBottom: Spacing.micro,
  },
  recommendationSub: {
    ...Typography.small,
  },
});
