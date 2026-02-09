import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { AnalyticsStatCard, RevenueChart } from '@/components/analytics';
import { RevenueMainCard, RevenueBreakdownCard, RevenueInsightsCard } from '@/components/analytics/revenue-detail-cards';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useRevenueAnalytics, PERIOD_OPTIONS } from '@/hooks/use-revenue-analytics';

export default function RevenueScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();
  const {
    analytics, revenueData, period, loading, refreshing,
    handleRefresh, handlePeriodChange, formatCurrency, getPeriodLabel,
  } = useRevenueAnalytics();

  if (loading && !analytics) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>Loading revenue data...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Clickable onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
            <ThemedText type="title" style={styles.title}>Revenue</ThemedText>
          </View>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>{getPeriodLabel()} earnings breakdown</ThemedText>
        </View>

        {/* Period selector */}
        <View style={styles.periodSelector}>
          {PERIOD_OPTIONS.map((option) => (
            <Clickable key={option.value} onPress={() => handlePeriodChange(option.value)}
              style={[styles.periodButton, { backgroundColor: period === option.value ? palette.tint : 'transparent', borderColor: period === option.value ? palette.tint : palette.border }]}>
              <ThemedText style={[styles.periodButtonText, { color: period === option.value ? palette.onPrimary : palette.text }]}>{option.label}</ThemedText>
            </Clickable>
          ))}
        </View>

        {analytics && (
          <>
            <RevenueMainCard analytics={analytics} formatCurrency={formatCurrency} />

            {/* Key metrics */}
            <View style={styles.statsGrid}>
              <AnalyticsStatCard label="Avg/Session" value={analytics.avgRevenuePerSession} icon="cash-outline" iconColor={palette.tint} isCurrency />
              <AnalyticsStatCard label="Sessions" value={analytics.sessions.totalSessions} icon="calendar" iconColor={palette.tint} />
            </View>

            {analytics.projectedRevenue !== undefined && (
              <View style={styles.statsGrid}>
                <AnalyticsStatCard label="Projected" value={analytics.projectedRevenue} icon="analytics" iconColor={palette.success} isCurrency />
                <AnalyticsStatCard label="Lost to Cancel" value={analytics.cancellations.revenueLost} icon="close-circle" iconColor={palette.error} isCurrency />
              </View>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backButton: { padding: Spacing.xxs, marginLeft: -4 },
  title: { ...Typography.display, letterSpacing: -0.5 },
  subtitle: { ...Typography.body, marginTop: Spacing.xxs, marginLeft: 32 },
  periodSelector: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  periodButton: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center' },
  periodButtonText: { ...Typography.bodySmallSemiBold },
  statsGrid: { flexDirection: 'row', gap: Spacing.md },
});
