/**
 * Family Calendar Screen
 *
 * Calendar view of all children's sessions with child filtering,
 * color legend, month stats, and quick actions.
 */

import { View, StyleSheet } from 'react-native';
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
import { FamilyCalendar } from '@/components/family/FamilyCalendar';
import { ErrorBoundary } from '@/components/error-boundary';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useFamilyCalendar } from '@/hooks/use-family-calendar';
import { useChildContext } from '@/hooks/use-child-context';

export default function FamilyCalendarScreen() {
  const { colors: palette } = useTheme();
  const {
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    members,
    events,
    selectedDate,
    selectedChildId,
    monthStats,
    handleDateSelect,
    handleEventPress,
    handleChildFilterChange,
  } = useFamilyCalendar();
  const { isMultiChild, getChildById } = useChildContext();
  const handleBookSession = () => router.push(Routes.BOOK_COACH);
  const handleViewSpending = () => router.push(Routes.FAMILY_SPENDING);

  if (status === 'loading') {
    return (
      <PageContainer
        header={<PageHeader title="Family Calendar" subtitle="All sessions in one view" showBack />}
      >
        <LoadingState variant="calendar" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer
        header={<PageHeader title="Family Calendar" subtitle="All sessions in one view" showBack />}
      >
        <ErrorState message={error?.message || 'Failed to load family calendar.'} onRetry={retry} />
      </PageContainer>
    );
  }

  if (status === 'empty') {
    return (
      <PageContainer
        header={<PageHeader title="Family Calendar" subtitle="All sessions in one view" showBack />}
      >
        <EmptyState
          icon="calendar-outline"
          title="No sessions scheduled"
          message="Your family calendar will appear here once sessions or events are booked."
          actionLabel="Find Coaches"
          onPressAction={handleBookSession}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={<PageHeader title="Family Calendar" subtitle="All sessions in one view" showBack />}
      gap={Spacing.md}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Month Stats */}
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <Row gap="sm">
          <SurfaceCard style={styles.statCard}>
            <Row align="center" gap="sm">
              <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.tint, 0.15) }]}>
                <Ionicons name="calendar" size={20} color={palette.tint} />
              </View>
              <View style={styles.statText}>
                <ThemedText style={Typography.title}>{monthStats.totalSessions}</ThemedText>
                <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                  Upcoming
                </ThemedText>
              </View>
            </Row>
          </SurfaceCard>
          <SurfaceCard style={styles.statCard}>
            <Row align="center" gap="sm">
              <View
                style={[styles.statIcon, { backgroundColor: withAlpha(palette.success, 0.15) }]}
              >
                <Ionicons name="checkmark-circle" size={20} color={palette.success} />
              </View>
              <View style={styles.statText}>
                <ThemedText style={Typography.title}>{monthStats.completedSessions}</ThemedText>
                <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                  Completed
                </ThemedText>
              </View>
            </Row>
          </SurfaceCard>
        </Row>
      </Animated.View>

      {/* Legend */}
      {members.length > 1 && (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard style={styles.legendCard}>
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>
              Color Legend
            </ThemedText>
            <Row gap="md" wrap>
              {members.map((member) => (
                <Row key={member.id} gap="xxs" align="center">
                  <View style={[styles.legendDot, { backgroundColor: member.colorCode }]} />
                  <ThemedText style={Typography.small}>{member.name.split(' ')[0]}</ThemedText>
                </Row>
              ))}
            </Row>
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Calendar */}
      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <ErrorBoundary>
          <FamilyCalendar
            events={events}
            members={members}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onEventPress={handleEventPress}
            selectedChildId={selectedChildId}
            onChildFilterChange={handleChildFilterChange}
            isMultiChild={isMultiChild}
            getChildById={getChildById}
          />
        </ErrorBoundary>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <Row gap="sm">
          <Clickable
            onPress={handleBookSession}
            style={[styles.actionButton, { backgroundColor: palette.tint }]}
          >
            <Row align="center" justify="center" gap="xs">
              <Ionicons name="add" size={20} color={palette.onPrimary} />
              <ThemedText style={[Typography.bodySemiBold, { color: palette.onPrimary }]}>
                Book Session
              </ThemedText>
            </Row>
          </Clickable>
          <Clickable
            onPress={handleViewSpending}
            style={[styles.actionButtonSecondary, { borderColor: palette.border }]}
          >
            <Row align="center" justify="center" gap="xs">
              <Ionicons name="wallet-outline" size={20} color={palette.tint} />
              <ThemedText style={[Typography.bodySemiBold, { color: palette.tint }]}>
                View Spending
              </ThemedText>
            </Row>
          </Clickable>
        </Row>
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  statCard: { flex: 1, padding: Spacing.md },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: { gap: Spacing.micro },
  legendCard: { padding: Spacing.sm, gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: Radii.sm },
  actionButton: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radii.lg },
  actionButtonSecondary: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
});
