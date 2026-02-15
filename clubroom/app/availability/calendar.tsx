import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { CalendarGrid, CalendarDayDetail } from '@/components/availability/calendar-grid';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { useAvailabilityCalendar, MONTHS } from '@/hooks/use-availability-calendar';

export default function AvailabilityCalendarScreen() {
  const { colors: palette } = useTheme();
  const {
    currentMonth,
    selectedDate,
    status,
    error,
    refreshing,
    calendarDays,
    selectedSlots,
    setSelectedDate,
    navigateMonth,
    formatTime,
    onRefresh,
    retry,
  } = useAvailabilityCalendar();
  const handleAddTemplate = () => router.push(Routes.AVAILABILITY_ADD_TEMPLATE);
  const handleBlockDate = () => router.push(Routes.AVAILABILITY_BLOCK_DATE);

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader title="Availability Calendar" showBack onBackPress={() => router.back()} />
        <LoadingState variant="calendar" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader title="Availability Calendar" showBack onBackPress={() => router.back()} />
        <ErrorState
          message={error?.message || 'Failed to load availability calendar.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader title="Availability Calendar" showBack onBackPress={() => router.back()} />
        <EmptyState
          icon="calendar-outline"
          title="No availability yet"
          message="Add your first recurring availability template to start accepting bookings."
          actionLabel="Add Template"
          onPressAction={handleAddTemplate}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Availability Calendar" showBack onBackPress={() => router.back()} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        {/* Month Navigation */}
        <Row style={[styles.monthNav, { backgroundColor: palette.surface }]}>
          <Clickable onPress={() => navigateMonth(-1)} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="subtitle">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </ThemedText>
          <Clickable onPress={() => navigateMonth(1)} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={palette.text} />
          </Clickable>
        </Row>

        {/* Legend */}
        <Row style={styles.legend}>
          <Row style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>Available</ThemedText>
          </Row>
          <Row style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: palette.error }]} />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>Blocked</ThemedText>
          </Row>
          <Row style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: palette.tint }]} />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>Booked</ThemedText>
          </Row>
        </Row>

        {/* Calendar Grid */}
        <CalendarGrid
          calendarDays={calendarDays}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* Selected Day Details */}
        {selectedDate && (
          <CalendarDayDetail
            selectedDate={selectedDate}
            selectedSlots={selectedSlots}
            formatTime={formatTime}
            onBlockDate={handleBlockDate}
            onAddTemplate={handleAddTemplate}
          />
        )}

        {/* Summary Stats */}
        <SurfaceCard style={styles.statsCard}>
          <ThemedText type="subtitle" style={styles.statsTitle}>
            This Month
          </ThemedText>
          <Row style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ color: palette.success }}>
                {calendarDays.filter((d) => d.isCurrentMonth && d.hasAvailability).length}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Available Days
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ color: palette.error }}>
                {calendarDays.filter((d) => d.isCurrentMonth && d.isBlocked).length}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Blocked Days
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ color: palette.tint }}>
                {calendarDays.filter((d) => d.isCurrentMonth && d.bookingCount > 0).length}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Days with Bookings
              </ThemedText>
            </View>
          </Row>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  contentInner: { padding: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthNav: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  navButton: { padding: Spacing.xs },
  legend: { justifyContent: 'center', gap: Spacing.lg },
  legendItem: { alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: Radii.sm },
  legendText: { ...Typography.caption },
  statsCard: { padding: Spacing.md },
  statsTitle: { marginBottom: Spacing.sm },
  statsGrid: { justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statLabel: { ...Typography.caption, marginTop: Spacing.micro },
});
