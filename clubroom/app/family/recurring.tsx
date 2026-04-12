import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { RecurringList } from '@/components/recurring';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { Routes } from '@/navigation/routes';
import { useTheme } from '@/hooks/useTheme';
import { useFamilyRecurring } from '@/hooks/use-family-recurring';

export default function FamilyRecurringScreen() {
  const { colors: palette } = useTheme();
  const {
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    plans,
    highlightedPlan,
    handlePause,
    handleResume,
    handleCancel,
    handleCreatePlan,
  } = useFamilyRecurring();

  const recurringBookings = plans.map((plan) => plan.recurring);
  const highlightNextLabel = highlightedPlan?.nextScheduledAt
    ? new Date(highlightedPlan.nextScheduledAt).toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  if (status === 'loading') {
    return (
      <PageContainer
        header={<PageHeader title="Recurring Plans" subtitle="Manage weekly and monthly sessions" showBack />}
      >
        <LoadingState variant="list" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer
        header={<PageHeader title="Recurring Plans" subtitle="Manage weekly and monthly sessions" showBack />}
      >
        <ErrorState message={error?.message || 'Failed to load recurring plans.'} onRetry={retry} />
      </PageContainer>
    );
  }

  if (status === 'empty') {
    return (
      <PageContainer
        header={<PageHeader title="Recurring Plans" subtitle="Manage weekly and monthly sessions" showBack />}
      >
        <EmptyState
          icon="repeat"
          title="No recurring plans yet"
          message="Weekly and monthly coaching plans will show here once you subscribe."
          actionLabel="Start Recurring Plan"
          onPressAction={handleCreatePlan}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={<PageHeader title="Recurring Plans" subtitle="Manage weekly and monthly sessions" showBack />}
      gap={Spacing.md}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <SurfaceCard style={styles.helperCard}>
          <Row align="center" gap="sm">
            <Ionicons name="shield-checkmark-outline" size={18} color={palette.info} />
            <ThemedText type="defaultSemiBold">Recurring plan rules</ThemedText>
          </Row>
          <ThemedText style={[Typography.bodySmall, { color: palette.muted }]}>
            Pause keeps sessions already on the calendar. Cancel ends the plan and cancels future
            recurring sessions that were generated from it.
          </ThemedText>
        </SurfaceCard>
      </Animated.View>

      {highlightedPlan ? (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard
            style={[
              styles.highlightCard,
              { borderColor: withAlpha(palette.tint, 0.25), borderWidth: 1 },
            ]}
          >
            <Row justify="between" align="center" gap="sm">
              <View style={styles.flexOne}>
                <ThemedText type="defaultSemiBold">This booking belongs to a recurring plan</ThemedText>
                <ThemedText style={[Typography.bodySmall, { color: palette.muted }]}>
                  {highlightedPlan.athleteName} trains with {highlightedPlan.coachName}.{' '}
                  {highlightNextLabel ? `Next session: ${highlightNextLabel}.` : 'No future session is currently scheduled.'}
                </ThemedText>
              </View>
              {highlightedPlan.nextBookingId ? (
                <Clickable
                  onPress={() => router.push(Routes.booking(highlightedPlan.nextBookingId!, { returnTo: Routes.FAMILY_RECURRING as string }))}
                  style={[styles.inlineButton, { backgroundColor: palette.tint }]}
                >
                  <ThemedText style={[Typography.caption, { color: palette.onPrimary }]}>
                    Open Next
                  </ThemedText>
                </Clickable>
              ) : null}
            </Row>
          </SurfaceCard>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.listContainer}>
        <RecurringList
          bookings={recurringBookings}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
          onCreatePress={handleCreatePlan}
          emptyTitle="No recurring plans"
          emptyMessage="Start a recurring plan when you want the same session on the calendar every week."
        />
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  helperCard: { gap: Spacing.sm },
  highlightCard: { gap: Spacing.sm },
  listContainer: { flex: 1 },
  flexOne: { flex: 1 },
  inlineButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.sm,
  },
});
