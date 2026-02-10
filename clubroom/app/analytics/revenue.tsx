import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { AnalyticsStatCard, RevenueChart } from '@/components/analytics';
import { RevenueMainCard, RevenueBreakdownCard, RevenueInsightsCard } from '@/components/analytics/revenue-detail-cards';
import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { ok } from '@/types/result';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useRevenueAnalytics, PERIOD_OPTIONS } from '@/hooks/use-revenue-analytics';

export default function RevenueScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const router = useRouter();
  const {
    analytics, revenueData, period, loading, refreshing,
    handleRefresh, handlePeriodChange, formatCurrency, getPeriodLabel,
  } = useRevenueAnalytics();

  if (loading && !analytics) return <LoadingState variant="card" />;
  if (!analytics) return <EmptyState icon="cash-outline" title="No revenue data" message="Revenue will appear after completing sessions" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Row style={styles.titleRow}>
            <Clickable onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
            <ThemedText type="title" style={styles.title}>Revenue</ThemedText>
          </Row>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>{getPeriodLabel()} earnings breakdown</ThemedText>
        </View>

        {/* Period selector */}
        <Row style={styles.periodSelector}>
          {PERIOD_OPTIONS.map((option) => (
            <Clickable key={option.value} onPress={() => handlePeriodChange(option.value)}
              style={[styles.periodButton, { backgroundColor: period === option.value ? palette.tint : 'transparent', borderColor: period === option.value ? palette.tint : palette.border }]}>
              <ThemedText style={[styles.periodButtonText, { color: period === option.value ? palette.onPrimary : palette.text }]}>{option.label}</ThemedText>
            </Clickable>
          ))}
        </Row>

        {analytics && (
          <>
            <RevenueMainCard analytics={analytics} formatCurrency={formatCurrency} />

            {/* Key metrics */}
            <Row style={styles.statsGrid}>
              <AnalyticsStatCard label="Avg/Session" value={analytics.avgRevenuePerSession} icon="cash-outline" iconColor={palette.tint} isCurrency />
              <AnalyticsStatCard label="Sessions" value={analytics.sessions.totalSessions} icon="calendar" iconColor={palette.tint} />
            </Row>

            {analytics.projectedRevenue !== undefined && (
              <Row style={styles.statsGrid}>
                <AnalyticsStatCard label="Projected" value={analytics.projectedRevenue} icon="analytics" iconColor={palette.success} isCurrency />
                <AnalyticsStatCard label="Lost to Cancel" value={analytics.cancellations.revenueLost} icon="close-circle" iconColor={palette.error} isCurrency />
              </Row>
            )}

            <RevenueChart data={revenueData} title="Revenue Over Time" loading={loading} />
            <RevenueBreakdownCard analytics={analytics} formatCurrency={formatCurrency} />
            <RevenueInsightsCard analytics={analytics} formatCurrency={formatCurrency} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing['2xl'], gap: Spacing.md },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { ...Typography.body },
  header: { marginBottom: Spacing.sm },
  titleRow: { alignItems: 'center', gap: Spacing.sm },
  backButton: { padding: Spacing.xxs, marginLeft: -4 },
  title: { ...Typography.display, letterSpacing: -0.5 },
  subtitle: { ...Typography.body, marginTop: Spacing.xxs, marginLeft: 32 },
  periodSelector: { gap: Spacing.xs, marginBottom: Spacing.sm },
  periodButton: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center' },
  periodButtonText: { ...Typography.bodySmallSemiBold },
  statsGrid: { gap: Spacing.md },
});
