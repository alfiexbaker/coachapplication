import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { CalendarGrid, CalendarDayDetail } from '@/components/availability/calendar-grid';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAvailabilityCalendar, MONTHS } from '@/hooks/use-availability-calendar';

export default function AvailabilityCalendarScreen() {
  const { colors: palette } = useTheme();
  const {
    currentMonth, selectedDate, loading, refreshing,
    calendarDays, selectedSlots,
    setSelectedDate, navigateMonth, formatTime, onRefresh,
  } = useAvailabilityCalendar();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader title="Availability Calendar" showBack onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={palette.tint} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader title="Availability Calendar" showBack onBackPress={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />}>

        {/* Month Navigation */}
        <View style={[styles.monthNav, { backgroundColor: palette.surface }]}>
          <Clickable onPress={() => navigateMonth(-1)} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="subtitle">{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</ThemedText>
          <Clickable onPress={() => navigateMonth(1)} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={palette.text} />
          </Clickable>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: palette.success }]} /><ThemedText style={[styles.legendText, { color: palette.muted }]}>Available</ThemedText></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: palette.error }]} /><ThemedText style={[styles.legendText, { color: palette.muted }]}>Blocked</ThemedText></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: palette.tint }]} /><ThemedText style={[styles.legendText, { color: palette.muted }]}>Booked</ThemedText></View>
        </View>

        {/* Calendar Grid */}
        <CalendarGrid calendarDays={calendarDays} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {/* Selected Day Details */}
        {selectedDate && (
          <CalendarDayDetail selectedDate={selectedDate} selectedSlots={selectedSlots} formatTime={formatTime}
            onBlockDate={() => router.push(Routes.AVAILABILITY_BLOCK_DATE)} onAddTemplate={() => router.push(Routes.AVAILABILITY_ADD_TEMPLATE)} />
        )}

        {/* Summary Stats */}
        <SurfaceCard style={styles.statsCard}>
          <ThemedText type="subtitle" style={styles.statsTitle}>This Month</ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ color: palette.success }}>{calendarDays.filter(d => d.isCurrentMonth && d.hasAvailability).length}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Available Days</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ color: palette.error }}>{calendarDays.filter(d => d.isCurrentMonth && d.isBlocked).length}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Blocked Days</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ color: palette.tint }}>{calendarDays.filter(d => d.isCurrentMonth && d.bookingCount > 0).length}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Days with Bookings</ThemedText>
            </View>
          </View>
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
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderRadius: Radii.md },
  navButton: { padding: Spacing.xs },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: Radii.sm },
  legendText: { ...Typography.caption },
  statsCard: { padding: Spacing.md },
  statsTitle: { marginBottom: Spacing.sm },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statLabel: { ...Typography.caption, marginTop: Spacing.micro },
});
