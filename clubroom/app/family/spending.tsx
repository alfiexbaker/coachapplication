import { useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView, ViewStyle } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SpendingChart } from '@/components/family/SpendingChart';
import { Spacing, Radii, Typography  , withAlpha } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { familyService, type FamilySpending, type FamilyMember } from '@/services/family';

const logger = createLogger('FamilySpendingScreen');

type DateRangeFilter = '1m' | '3m' | '6m' | '1y' | 'all';

/**
 * Family Spending Screen - Shows spending breakdown across all children
 * Includes charts, trends, and detailed per-child breakdown
 */
export default function FamilySpendingScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [spending, setSpending] = useState<FamilySpending[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_members, setMembers] = useState<FamilyMember[]>([]);
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('3m');
  const [spendingSummary, setSpendingSummary] = useState<{
    totalSpent: number;
    thisMonth: number;
    lastMonth: number;
    currency: string;
    trend: 'up' | 'down' | 'stable';
    trendPercent: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const [spendingData, membersData, summaryData] = await Promise.all([
        familyService.getFamilySpending(currentUser.id),
        familyService.getFamilyMembers(currentUser.id),
        familyService.getFamilySpendingSummary(currentUser.id),
      ]);

      setSpending(spendingData);
      setMembers(membersData);
      setSpendingSummary(summaryData);
    } catch (error) {
      logger.error('Failed to load spending data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDateFilterChange = (filter: DateRangeFilter) => {
    setDateFilter(filter);
    // In a real app, this would reload data with the new date range
  };

  const getMonthsToShow = (): number => {
    switch (dateFilter) {
      case '1m':
        return 1;
      case '3m':
        return 3;
      case '6m':
        return 6;
      case '1y':
        return 12;
      default:
        return 6;
    }
  };

  if (loading) {
    return (
      <PageContainer
        header={
          <PageHeader
            title="Family Spending"
            subtitle="Track costs across all children"
            showBack
          />
        }
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading spending data...
          </ThemedText>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={
        <PageHeader
          title="Family Spending"
          subtitle="Track costs across all children"
          showBack
        />
      }
      gap={Spacing.md}
    >
      {/* Month Comparison */}
      {spendingSummary && (
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <View style={styles.comparisonRow}>
            <SurfaceCard style={styles.comparisonCard}>
              <ThemedText style={[styles.comparisonLabel, { color: palette.muted }]}>
                This Month
              </ThemedText>
              <ThemedText style={styles.comparisonValue}>
                {'\u00A3'}{spendingSummary.thisMonth.toFixed(0)}
              </ThemedText>
              <View style={styles.trendRow}>
                <Ionicons
                  name={
                    spendingSummary.trend === 'up'
                      ? 'trending-up'
                      : spendingSummary.trend === 'down'
                      ? 'trending-down'
                      : 'remove'
                  }
                  size={14}
                  color={
                    spendingSummary.trend === 'up'
                      ? palette.error
                      : spendingSummary.trend === 'down'
                      ? palette.success
                      : palette.muted
                  }
                />
                <ThemedText
                  style={[
                    styles.trendText,
                    {
                      color:
                        spendingSummary.trend === 'up'
                          ? palette.error
                          : spendingSummary.trend === 'down'
                          ? palette.success
                          : palette.muted },
                  ]}
                >
                  {spendingSummary.trendPercent}% vs last month
                </ThemedText>
              </View>
            </SurfaceCard>
            <SurfaceCard style={styles.comparisonCard}>
              <ThemedText style={[styles.comparisonLabel, { color: palette.muted }]}>
                Last Month
              </ThemedText>
              <ThemedText style={styles.comparisonValue}>
                {'\u00A3'}{spendingSummary.lastMonth.toFixed(0)}
              </ThemedText>
              <ThemedText style={[styles.comparisonSubtext, { color: palette.muted }]}>
                Completed sessions
              </ThemedText>
            </SurfaceCard>
          </View>
        </Animated.View>
      )}

      {/* Date Range Filter */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(['1m', '3m', '6m', '1y', 'all'] as DateRangeFilter[]).map((filter) => (
            <Clickable
              key={filter}
              onPress={() => handleDateFilterChange(filter)}
              style={[
                styles.filterChip,
                { borderColor: palette.border },
                dateFilter === filter ? { backgroundColor: palette.tint, borderColor: palette.tint } : undefined,
              ].filter(Boolean) as ViewStyle[]}
            >
              <ThemedText
                style={[
                  styles.filterChipText,
                  dateFilter === filter ? { color: palette.onPrimary } : undefined,
                ]}
              >
                {filter === '1m'
                  ? '1 Month'
                  : filter === '3m'
                  ? '3 Months'
                  : filter === '6m'
                  ? '6 Months'
                  : filter === '1y'
                  ? '1 Year'
                  : 'All Time'}
              </ThemedText>
            </Clickable>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Spending Chart */}
      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <SpendingChart
          spending={spending}
          currency="GBP"
          showMonthly={true}
          monthsToShow={getMonthsToShow()}
        />
      </Animated.View>

      {/* Recent Transactions */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <SurfaceCard style={styles.transactionsCard}>
          <View style={styles.transactionsHeader}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Recent Sessions
            </ThemedText>
            <Clickable onPress={() => router.push(Routes.FAMILY_CALENDAR)}>
              <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>
                View All
              </ThemedText>
            </Clickable>
          </View>
          <View style={styles.transactionsList}>
            {spending
              .flatMap((s) =>
                (s.monthlyBreakdown || []).slice(0, 1).map((mb) => ({
                  childName: s.childName,
                  colorCode: s.colorCode,
                  month: mb.month,
                  amount: mb.amount,
                  sessionCount: mb.sessionCount }))
              )
              .slice(0, 5)
              .map((item, index) => (
                <View key={`${item.childName}-${item.month}-${index}`} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <View
                      style={[
                        styles.transactionDot,
                        { backgroundColor: item.colorCode },
                      ]}
                    />
                    <View style={styles.transactionInfo}>
                      <ThemedText style={styles.transactionName}>
                        {item.childName}
                      </ThemedText>
                      <ThemedText style={[styles.transactionMeta, { color: palette.muted }]}>
                        {item.sessionCount} sessions
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText type="defaultSemiBold" style={styles.transactionAmount}>
                    {'\u00A3'}{item.amount.toFixed(2)}
                  </ThemedText>
                </View>
              ))}
          </View>
        </SurfaceCard>
      </Animated.View>

      {/* Tips Card */}
      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <SurfaceCard style={[styles.tipsCard, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color={palette.tint} />
            <ThemedText type="defaultSemiBold" style={styles.tipsTitle}>
              Save on Sessions
            </ThemedText>
          </View>
          <ThemedText style={[styles.tipsText, { color: palette.muted }]}>
            Consider booking session packages to save up to 15% on regular training.
            Packages are available from most coaches.
          </ThemedText>
          <Clickable
            onPress={() => router.push(Routes.PACKAGES)}
            style={[styles.tipsButton, { borderColor: palette.tint }]}
          >
            <ThemedText style={[styles.tipsButtonText, { color: palette.tint }]}>
              View Packages
            </ThemedText>
          </Clickable>
        </SurfaceCard>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <View style={styles.quickActions}>
          <Clickable
            onPress={() => router.push(Routes.WALLET)}
            style={[styles.actionButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="wallet" size={20} color={palette.onPrimary} />
            <ThemedText style={[styles.actionButtonText, { color: palette.onPrimary }]}>Top Up Wallet</ThemedText>
          </Clickable>
          <Clickable
            onPress={() => router.push(Routes.FAMILY_CALENDAR)}
            style={[styles.actionButtonSecondary, { borderColor: palette.border }]}
          >
            <Ionicons name="calendar-outline" size={20} color={palette.tint} />
            <ThemedText style={[styles.actionButtonTextSecondary, { color: palette.tint }]}>
              View Calendar
            </ThemedText>
          </Clickable>
        </View>
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md },
  loadingText: {
    ...Typography.bodySmall },
  comparisonRow: {
    flexDirection: 'row',
    gap: Spacing.sm },
  comparisonCard: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.xxs },
  comparisonLabel: {
    ...Typography.caption },
  comparisonValue: {
    ...Typography.display },
  comparisonSubtext: {
    ...Typography.caption },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs },
  trendText: {
    ...Typography.caption },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1.5 },
  filterChipText: {
    ...Typography.smallSemiBold },
  sectionTitle: {
    ...Typography.bodySmall },
  viewAllText: {
    ...Typography.smallSemiBold },
  transactionsCard: {
    padding: Spacing.md,
    gap: Spacing.md },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' },
  transactionsList: {
    gap: Spacing.sm },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  transactionDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm },
  transactionInfo: {
    gap: Spacing.micro },
  transactionName: {
    ...Typography.bodySmall },
  transactionMeta: {
    ...Typography.caption },
  transactionAmount: {
    ...Typography.bodySmall },
  tipsCard: {
    padding: Spacing.md,
    gap: Spacing.sm },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs },
  tipsTitle: {
    ...Typography.bodySmall },
  tipsText: {
    ...Typography.small },
  tipsButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    marginTop: Spacing.xs },
  tipsButtonText: {
    ...Typography.smallSemiBold },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg },
  actionButtonText: {
    ...Typography.bodySemiBold },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5 },
  actionButtonTextSecondary: {
    ...Typography.bodySemiBold } });