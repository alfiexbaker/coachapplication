import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { AnalyticsStatCard, RetentionCard, CancellationChart } from '@/components/analytics';
import { RetentionFunnel } from '@/components/analytics/retention-funnel';
import { RetentionRecommendations } from '@/components/analytics/retention-recommendations';
import { LoadingState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useRetentionAnalytics } from '@/hooks/use-retention-analytics';

export default function RetentionScreen() {
  const { colors: palette } = useTheme();
  const { retention, cancellations, loading, refreshing, status, handleRefresh } = useRetentionAnalytics();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <LoadingState variant="card" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Row gap="sm" align="center">
            <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={24} color={palette.text} />
            </Clickable>
            <ThemedText type="title">Client Retention</ThemedText>
          </Row>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>Understanding your client base</ThemedText>
        </View>

        {retention && (
          <>
            {/* Status badge */}
            <SurfaceCard style={styles.statusCard}>
              <Row gap="md" align="center">
                <View style={[styles.statusIcon, { backgroundColor: withAlpha(status.color, 0.12) }]}>
                  <Ionicons name={status.icon} size={28} color={status.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.statusLabel, { color: status.color }]}>{status.label}</ThemedText>
                  <ThemedText style={Typography.title}>{retention.retentionRate.toFixed(1)}% Retention Rate</ThemedText>
                </View>
              </Row>
            </SurfaceCard>

            <Row gap="md">
              <AnalyticsStatCard label="Active Clients" value={retention.totalActiveClients} icon="people" iconColor={palette.tint} />
              <AnalyticsStatCard label="Avg Sessions" value={retention.avgSessionsPerClient.toFixed(1)} icon="calendar" iconColor={palette.tint} />
            </Row>
            <Row gap="md">
              <AnalyticsStatCard label="New Clients" value={retention.newClients} icon="person-add" iconColor={palette.success} />
              <AnalyticsStatCard label="Returning" value={retention.returningClients} icon="repeat" iconColor={palette.tint} />
            </Row>
            <Row gap="md">
              <AnalyticsStatCard label="Churn Rate" value={`${retention.churnRate.toFixed(1)}%`} icon="trending-down" iconColor={palette.error} />
              <AnalyticsStatCard label="Clients Lost" value={retention.clientsLost} icon="person-remove" iconColor={palette.error} />
            </Row>

            <RetentionCard metrics={retention} title="Retention Overview" />
            <RetentionFunnel colors={palette} retention={retention} />
          </>
        )}

        {cancellations && cancellations.totalCancellations > 0 && (
          <CancellationChart stats={cancellations} title="Cancellation Analysis" />
        )}

        <RetentionRecommendations colors={palette} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing['2xl'], gap: Spacing.md },
  header: { marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, marginTop: Spacing.xxs, marginLeft: 32 },
  statusCard: { padding: Spacing.md },
  statusIcon: { width: 56, height: 56, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  statusLabel: { ...Typography.bodySmallSemiBold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xxs },
});
