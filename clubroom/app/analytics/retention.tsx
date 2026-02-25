import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { AnalyticsStatCard, RetentionCard, CancellationChart } from '@/components/analytics';
import { RetentionFunnel } from '@/components/analytics/retention-funnel';
import { RetentionRecommendations } from '@/components/analytics/retention-recommendations';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useRetentionAnalytics } from '@/hooks/use-retention-analytics';

export default function RetentionScreen() {
  const { colors: palette } = useTheme();
  const retention = useRetentionAnalytics();
  const header = (
    <View style={styles.header}>
      <Row gap="sm" align="center">
        <Clickable onPress={retention.goBack} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title">Client Retention</ThemedText>
      </Row>
      <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
        Understanding your client base
      </ThemedText>
    </View>
  );

  if (retention.status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        {header}
        <LoadingState variant="card" />
      </SafeAreaView>
    );
  }

  if (retention.status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        {header}
        <ErrorState
          message={retention.error?.message || 'Failed to load retention analytics.'}
          onRetry={retention.retry}
        />
      </SafeAreaView>
    );
  }

  if (retention.status === 'empty' || !retention.retention) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        {header}
        <EmptyState
          icon="people-outline"
          title="No retention data"
          message="Retention data appears after you build an active client base."
          actionLabel="Refresh"
          onPressAction={retention.onRefresh}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={retention.refreshing} onRefresh={retention.onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {header}

        {/* Status badge */}
        <SurfaceCard style={styles.statusCard}>
          <Row gap="md" align="center">
            <View
              style={[
                styles.statusIcon,
                { backgroundColor: withAlpha(retention.retentionStatus.color, 0.12) },
              ]}
            >
              <Ionicons
                name={retention.retentionStatus.icon}
                size={28}
                color={retention.retentionStatus.color}
              />
            </View>
            <Column flex>
              <ThemedText style={[styles.statusLabel, { color: retention.retentionStatus.color }]}>
                {retention.retentionStatus.label}
              </ThemedText>
              <ThemedText style={Typography.title}>
                {retention.retention.retentionRate.toFixed(1)}% Retention Rate
              </ThemedText>
            </Column>
          </Row>
        </SurfaceCard>

        <Row gap="md">
          <AnalyticsStatCard
            label="Active Clients"
            value={retention.retention.totalActiveClients}
            icon="people"
            iconColor={palette.tint}
          />
          <AnalyticsStatCard
            label="Avg Sessions"
            value={retention.retention.avgSessionsPerClient.toFixed(1)}
            icon="calendar"
            iconColor={palette.tint}
          />
        </Row>
        <Row gap="md">
          <AnalyticsStatCard
            label="New Clients"
            value={retention.retention.newClients}
            icon="person-add"
            iconColor={palette.success}
          />
          <AnalyticsStatCard
            label="Returning"
            value={retention.retention.returningClients}
            icon="repeat"
            iconColor={palette.tint}
          />
        </Row>
        <Row gap="md">
          <AnalyticsStatCard
            label="Churn Rate"
            value={`${retention.retention.churnRate.toFixed(1)}%`}
            icon="trending-down"
            iconColor={palette.error}
          />
          <AnalyticsStatCard
            label="Clients Lost"
            value={retention.retention.clientsLost}
            icon="person-remove"
            iconColor={palette.error}
          />
        </Row>

        <RetentionCard metrics={retention.retention} title="Retention Overview" />
        <RetentionFunnel colors={palette} retention={retention.retention} />

        {retention.cancellations && retention.cancellations.totalCancellations > 0 && (
          <CancellationChart stats={retention.cancellations} title="Cancellation Analysis" />
        )}

        <RetentionRecommendations colors={palette} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  header: { marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, marginTop: Spacing.xxs, marginLeft: Spacing.lg },
  statusCard: { padding: Spacing.md },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    ...Typography.bodySmallSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xxs,
  },
});
