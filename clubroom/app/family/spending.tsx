/**
 * Family Spending Screen
 *
 * Shows spending breakdown across all children with charts,
 * month comparison, date filters, recent transactions, and tips.
 */

import { View, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { SpendingChart } from '@/components/family/SpendingChart';
import { SpendingComparisonCard } from '@/components/family/spending-comparison-card';
import { SpendingTransactions } from '@/components/family/spending-transactions';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useFamilySpending, DATE_FILTERS, DATE_FILTER_LABELS } from '@/hooks/use-family-spending';

export default function FamilySpendingScreen() {
  const { colors } = useTheme();
  const {
    status, error, refreshing, onRefresh, retry, spending, dateFilter, spendingSummary,
    handleDateFilterChange, getMonthsToShow, recentTransactions,
  } = useFamilySpending();

  if (status === 'loading') {
    return (
      <PageContainer header={<PageHeader title="Family Spending" subtitle="Track costs across all children" showBack />}>
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer header={<PageHeader title="Family Spending" subtitle="Track costs across all children" showBack />}>
        <ErrorState message={error?.message || 'Failed to load family spending.'} onRetry={retry} />
      </PageContainer>
    );
  }

  if (status === 'empty') {
    return (
      <PageContainer header={<PageHeader title="Family Spending" subtitle="Track costs across all children" showBack />}>
        <EmptyState
          icon="wallet-outline"
          title="No spending data yet"
          message="Spending insights will appear once sessions are booked and paid."
          actionLabel="View Calendar"
          onPressAction={() => router.push(Routes.FAMILY_CALENDAR)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={<PageHeader title="Family Spending" subtitle="Track costs across all children" showBack />}
      gap={Spacing.md}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Month Comparison */}
      {spendingSummary && (
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <SpendingComparisonCard thisMonth={spendingSummary.thisMonth} lastMonth={spendingSummary.lastMonth} trend={spendingSummary.trend} trendPercent={spendingSummary.trendPercent} />
        </Animated.View>
      )}

      {/* Date Range Filter */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {DATE_FILTERS.map((filter) => (
            <Clickable
              key={filter}
              onPress={() => handleDateFilterChange(filter)}
              style={[styles.filterChip, { borderColor: colors.border }, dateFilter === filter ? { backgroundColor: colors.tint, borderColor: colors.tint } : undefined].filter(Boolean) as ViewStyle[]}
            >
              <ThemedText style={[Typography.smallSemiBold, dateFilter === filter ? { color: colors.onPrimary } : undefined]}>
                {DATE_FILTER_LABELS[filter]}
              </ThemedText>
            </Clickable>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Chart */}
      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <SpendingChart spending={spending} currency="GBP" showMonthly monthsToShow={getMonthsToShow()} />
      </Animated.View>

      {/* Recent Transactions */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <SpendingTransactions transactions={recentTransactions} />
      </Animated.View>

      {/* Tips Card */}
      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <SurfaceCard style={[styles.tipsCard, { backgroundColor: withAlpha(colors.tint, 0.03) }]}>
          <Row gap="xs" align="center">
            <Ionicons name="bulb" size={20} color={colors.tint} />
            <ThemedText type="defaultSemiBold" style={Typography.bodySmall}>Save on Sessions</ThemedText>
          </Row>
          <ThemedText style={[Typography.small, { color: colors.muted }]}>
            Consider booking session packages to save up to 15% on regular training. Packages are available from most coaches.
          </ThemedText>
          <Clickable onPress={() => router.push(Routes.PACKAGES)} style={[styles.tipsButton, { borderColor: colors.tint }]}>
            <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>View Packages</ThemedText>
          </Clickable>
        </SurfaceCard>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <Row gap="sm">
          <Clickable onPress={() => router.push(Routes.WALLET)} style={[styles.actionButton, { backgroundColor: colors.tint }]}>
            <Row align="center" justify="center" gap="xs">
              <Ionicons name="wallet" size={20} color={colors.onPrimary} />
              <ThemedText style={[Typography.bodySemiBold, { color: colors.onPrimary }]}>Top Up Wallet</ThemedText>
            </Row>
          </Clickable>
          <Clickable onPress={() => router.push(Routes.FAMILY_CALENDAR)} style={[styles.actionButtonSecondary, { borderColor: colors.border }]}>
            <Row align="center" justify="center" gap="xs">
              <Ionicons name="calendar-outline" size={20} color={colors.tint} />
              <ThemedText style={[Typography.bodySemiBold, { color: colors.tint }]}>View Calendar</ThemedText>
            </Row>
          </Clickable>
        </Row>
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  filterRow: { gap: Spacing.xs, paddingVertical: Spacing.xs },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.pill, borderWidth: 1.5 },
  tipsCard: { padding: Spacing.md, gap: Spacing.sm },
  tipsButton: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.pill, borderWidth: 1.5, marginTop: Spacing.xs },
  actionButton: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radii.lg },
  actionButtonSecondary: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radii.lg, borderWidth: 1.5 },
});
