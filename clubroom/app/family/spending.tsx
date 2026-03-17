/**
 * Family Spending Records Screen
 *
 * Keeps family spending as a lightweight records surface:
 * recent booked-session costs, child totals, and links back to live bookings.
 */

import { StyleSheet, View } from 'react-native';
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
import { SpendingTransactions } from '@/components/family/spending-transactions';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useFamilySpending } from '@/hooks/use-family-spending';

function formatLastSessionLabel(iso?: string): string {
  if (!iso) {
    return 'No completed sessions yet';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Completed session date unavailable';
  }

  return `Last completed ${date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })}`;
}

export default function FamilySpendingScreen() {
  const { colors } = useTheme();
  const { status, error, refreshing, onRefresh, retry, recentTransactions, ledgerItems } =
    useFamilySpending();
  const handleOpenCalendar = () => router.push(Routes.FAMILY_CALENDAR);
  const handleOpenBookings = () => router.push(Routes.BOOKINGS);

  if (status === 'loading') {
    return (
      <PageContainer
        header={
          <PageHeader
            title="Spending Records"
            subtitle="Review booked-session costs and billing context"
            showBack
          />
        }
      >
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer
        header={
          <PageHeader
            title="Spending Records"
            subtitle="Review booked-session costs and billing context"
            showBack
          />
        }
      >
        <ErrorState
          message={error?.message || 'Failed to load spending records.'}
          onRetry={retry}
        />
      </PageContainer>
    );
  }

  if (status === 'empty') {
    return (
      <PageContainer
        header={
          <PageHeader
            title="Spending Records"
            subtitle="Review booked-session costs and billing context"
            showBack
          />
        }
      >
        <EmptyState
          icon="receipt-outline"
          title="No spending records yet"
          message="Booked-session records will appear once your family has confirmed or completed sessions."
          actionLabel="Open Calendar"
          onPressAction={handleOpenCalendar}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={
        <PageHeader
          title="Spending Records"
          subtitle="Review booked-session costs and billing context"
          showBack
        />
      }
      gap={Spacing.md}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <SurfaceCard style={styles.contextCard}>
          <Row align="center" gap="sm">
            <Ionicons name="receipt-outline" size={18} color={colors.tint} />
            <ThemedText type="defaultSemiBold">Use records, not a finance dashboard</ThemedText>
          </Row>
          <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>
            Check recent booked-session costs here, then open the calendar or a booking when you
            need support ownership, coach changes, or full billing detail.
          </ThemedText>
        </SurfaceCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(125).springify()}>
        <SpendingTransactions transactions={recentTransactions} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <SurfaceCard style={styles.ledgerCard}>
          <Row align="center" justify="space-between">
            <ThemedText type="defaultSemiBold" style={Typography.bodySmall}>
              Child totals
            </ThemedText>
            <ThemedText style={[Typography.small, { color: colors.muted }]}>
              {ledgerItems.length} {ledgerItems.length === 1 ? 'child' : 'children'}
            </ThemedText>
          </Row>
          <View style={styles.ledgerList}>
            {ledgerItems.map((item) => (
              <Row
                key={item.childId}
                align="center"
                justify="space-between"
                style={styles.ledgerRow}
              >
                <Row gap="sm" align="center" style={styles.ledgerInfo}>
                  <View style={[styles.dot, { backgroundColor: item.colorCode }]} />
                  <View style={styles.ledgerText}>
                    <ThemedText style={Typography.bodySmall}>{item.childName}</ThemedText>
                    <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                      {item.sessionCount} session{item.sessionCount === 1 ? '' : 's'} ·{' '}
                      {formatLastSessionLabel(item.lastSession)}
                    </ThemedText>
                  </View>
                </Row>
                <View style={styles.ledgerAmounts}>
                  <ThemedText type="defaultSemiBold" style={Typography.bodySmall}>
                    {'\u00A3'}
                    {item.totalSpent.toFixed(0)}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                    {'\u00A3'}
                    {item.averagePerSession.toFixed(0)} avg
                  </ThemedText>
                </View>
              </Row>
            ))}
          </View>
        </SurfaceCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(275).springify()}>
        <Row gap="sm">
          <Clickable
            onPress={handleOpenBookings}
            style={[styles.actionButton, { backgroundColor: colors.tint }]}
          >
            <Row align="center" justify="center" gap="xs">
              <Ionicons name="receipt-outline" size={20} color={colors.onPrimary} />
              <ThemedText style={[Typography.bodySemiBold, { color: colors.onPrimary }]}>
                Open Bookings
              </ThemedText>
            </Row>
          </Clickable>
          <Clickable
            onPress={handleOpenCalendar}
            style={[styles.actionButtonSecondary, { borderColor: colors.border }]}
          >
            <Row align="center" justify="center" gap="xs">
              <Ionicons name="calendar-outline" size={20} color={colors.tint} />
              <ThemedText style={[Typography.bodySemiBold, { color: colors.tint }]}>
                Open Calendar
              </ThemedText>
            </Row>
          </Clickable>
        </Row>
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  contextCard: { gap: Spacing.sm },
  ledgerCard: { gap: Spacing.md },
  ledgerList: { gap: Spacing.sm },
  ledgerRow: { gap: Spacing.md },
  ledgerInfo: { flex: 1 },
  ledgerText: { flex: 1, gap: Spacing.micro },
  ledgerAmounts: { alignItems: 'flex-end', gap: Spacing.micro },
  dot: { width: 10, height: 10, borderRadius: Radii.sm },
  actionButton: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radii.lg },
  actionButtonSecondary: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
});
