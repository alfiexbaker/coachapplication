/**
 * Availability Calendar Screen
 *
 * Provides a full calendar view of the coach's availability, showing:
 * - Days with scheduled availability (from templates)
 * - Blocked dates (from overrides)
 * - Existing bookings/sessions
 *
 * USER STORY:
 * "As a coach, I want to see my availability at a glance on a calendar
 * so I can quickly understand my schedule and spot any gaps."
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilityTemplate, AvailabilityOverride, AvailabilitySlot } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';

const logger = createLogger('AvailabilityCalendar');

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasAvailability: boolean;
  isBlocked: boolean;
  bookingCount: number;
  slots: AvailabilitySlot[];
}

export default function AvailabilityCalendarScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      // Calculate date range for current month view
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      // Extend to include visible days from prev/next month
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());

      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

      const startStr = toDateStr(startDate);
      const endStr = toDateStr(endDate);

      const [templatesData, overridesData, slotsData] = await Promise.all([
        availabilityService.getTemplates(currentUser.id),
        availabilityService.getOverrides(currentUser.id, startStr, endStr),
        availabilityService.getAvailableSlots(currentUser.id, startStr, endStr),
      ]);

      setTemplates(templatesData);
      setOverrides(overridesData);
      setSlots(slotsData);

      logger.debug('Calendar data loaded', {
        templates: templatesData.length,
        overrides: overridesData.length,
        slots: slotsData.length,
      });
    } catch (error) {
      logger.error('Failed to load calendar data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id, currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Generate calendar days for the current month view
  const generateCalendarDays = (): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // Start from the first visible day (Sunday of the week containing the 1st)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // End on the last visible day (Saturday of the week containing the last day)
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = toDateStr(date);
      const dayOfWeek = date.getDay();

      // Check if there's availability on this day of week
      const hasTemplate = templates.some(t => t.dayOfWeek === dayOfWeek);

      // Check if date is blocked
      const override = overrides.find(o => o.date === dateStr);
      const isBlocked = override?.isBlocked ?? false;

      // Get slots for this date
      const daySlots = slots.filter(s => s.date === dateStr);
      const bookedSlots = daySlots.filter(s => !s.isAvailable);

      days.push({
        date: new Date(date),
        dayOfMonth: date.getDate(),
        isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
        isToday: date.getTime() === today.getTime(),
        hasAvailability: hasTemplate && !isBlocked,
        isBlocked,
        bookingCount: bookedSlots.length,
        slots: daySlots,
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const navigateMonth = (direction: number) => {
    setLoading(true);
    setSelectedDate(null);
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getSelectedDateSlots = () => {
    if (!selectedDate) return [];
    const dateStr = toDateStr(selectedDate);
    return slots.filter(s => s.date === dateStr);
  };

  const selectedSlots = getSelectedDateSlots();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader title="Availability Calendar" showBack onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader title="Availability Calendar" showBack onBackPress={() => router.back()} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.tint}
          />
        }
      >
        {/* Month Navigation */}
        <View style={[styles.monthNav, { backgroundColor: palette.surface }]}>
          <Pressable onPress={() => navigateMonth(-1)} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </Pressable>
          <ThemedText type="subtitle">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </ThemedText>
          <Pressable onPress={() => navigateMonth(1)} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={palette.text} />
          </Pressable>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>Available</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: palette.error }]} />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>Blocked</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: palette.tint }]} />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>Booked</ThemedText>
          </View>
        </View>

        {/* Calendar Grid */}
        <SurfaceCard style={styles.calendar}>
          {/* Day Headers */}
          <View style={styles.weekHeader}>
            {DAYS_OF_WEEK.map(day => (
              <View key={day} style={styles.dayHeaderCell}>
                <ThemedText style={[styles.dayHeaderText, { color: palette.muted }]}>
                  {day}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={styles.daysGrid}>
            {calendarDays.map((day, index) => {
              const isSelected = selectedDate?.toDateString() === day.date.toDateString();
              return (
                <Pressable
                  key={index}
                  style={[
                    styles.dayCell,
                    !day.isCurrentMonth && styles.otherMonthDay,
                    isSelected && { backgroundColor: withAlpha(palette.tint, 0.12) },
                  ]}
                  onPress={() => setSelectedDate(day.date)}
                >
                  <ThemedText
                    style={[
                      styles.dayNumber,
                      !day.isCurrentMonth && { color: palette.muted },
                      day.isToday && { color: palette.tint, fontWeight: '700' },
                      isSelected && { color: palette.tint },
                    ]}
                  >
                    {day.dayOfMonth}
                  </ThemedText>

                  {/* Status Indicators */}
                  <View style={styles.indicators}>
                    {day.isBlocked && (
                      <View style={[styles.indicator, { backgroundColor: palette.error }]} />
                    )}
                    {day.hasAvailability && !day.isBlocked && (
                      <View style={[styles.indicator, { backgroundColor: palette.success }]} />
                    )}
                    {day.bookingCount > 0 && (
                      <View style={[styles.indicator, { backgroundColor: palette.tint }]} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </SurfaceCard>

        {/* Selected Day Details */}
        {selectedDate && (
          <SurfaceCard style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <ThemedText type="subtitle">
                {selectedDate.toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </ThemedText>
              <View style={styles.detailsActions}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: withAlpha(palette.error, 0.09) }]}
                  onPress={() => router.push(Routes.AVAILABILITY_BLOCK_DATE)}
                >
                  <Ionicons name="close-circle-outline" size={18} color={palette.error} />
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
                  onPress={() => router.push(Routes.AVAILABILITY_ADD_TEMPLATE)}
                >
                  <Ionicons name="add-circle-outline" size={18} color={palette.tint} />
                </Pressable>
              </View>
            </View>

            {selectedSlots.length === 0 ? (
              <View style={styles.noSlots}>
                <Ionicons name="calendar-outline" size={32} color={palette.muted} />
                <ThemedText style={{ color: palette.muted, marginTop: Spacing.xs }}>
                  No availability set for this day
                </ThemedText>
              </View>
            ) : (
              <View style={styles.slotsList}>
                {selectedSlots.map((slot, index) => (
                  <View
                    key={index}
                    style={[
                      styles.slotItem,
                      { borderLeftColor: slot.isAvailable ? palette.success : palette.tint },
                    ]}
                  >
                    <View style={styles.slotTime}>
                      <ThemedText type="defaultSemiBold">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </ThemedText>
                      <View
                        style={[
                          styles.slotStatus,
                          { backgroundColor: slot.isAvailable ? withAlpha(palette.success, 0.09) : withAlpha(palette.tint, 0.09) },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.slotStatusText,
                            { color: slot.isAvailable ? palette.success : palette.tint },
                          ]}
                        >
                          {slot.isAvailable ? 'Available' : 'Booked'}
                        </ThemedText>
                      </View>
                    </View>
                    {slot.location && (
                      <View style={styles.slotLocation}>
                        <Ionicons name="location-outline" size={14} color={palette.muted} />
                        <ThemedText style={[styles.slotLocationText, { color: palette.muted }]}>
                          {slot.location}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </SurfaceCard>
        )}

        {/* Summary Stats */}
        <SurfaceCard style={styles.statsCard}>
          <ThemedText type="subtitle" style={styles.statsTitle}>This Month</ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ color: palette.success }}>
                {calendarDays.filter(d => d.isCurrentMonth && d.hasAvailability).length}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Available Days
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ color: palette.error }}>
                {calendarDays.filter(d => d.isCurrentMonth && d.isBlocked).length}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Blocked Days
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ color: palette.tint }}>
                {calendarDays.filter(d => d.isCurrentMonth && d.bookingCount > 0).length}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Days with Bookings
              </ThemedText>
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

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  navButton: { padding: Spacing.xs },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: Radii.sm },
  legendText: { ...Typography.caption },

  calendar: { padding: Spacing.sm },
  weekHeader: { flexDirection: 'row', marginBottom: Spacing.xs },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs },
  dayHeaderText: { ...Typography.caption },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.sm,
  },
  otherMonthDay: { opacity: 0.4 },
  dayNumber: { ...Typography.bodySmall },
  indicators: {
    flexDirection: 'row',
    gap: Spacing.micro,
    marginTop: Spacing.micro,
    height: 6,
  },
  indicator: { width: 6, height: 6, borderRadius: Radii.xs },

  detailsCard: { padding: Spacing.md, gap: Spacing.sm },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsActions: { flexDirection: 'row', gap: Spacing.sm },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noSlots: { alignItems: 'center', paddingVertical: Spacing.lg },
  slotsList: { gap: Spacing.sm },
  slotItem: {
    paddingLeft: Spacing.md,
    paddingVertical: Spacing.sm,
    borderLeftWidth: 3,
  },
  slotTime: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotStatus: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  slotStatusText: { ...Typography.caption },
  slotLocation: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, marginTop: Spacing.xxs },
  slotLocationText: { ...Typography.caption },

  statsCard: { padding: Spacing.md },
  statsTitle: { marginBottom: Spacing.sm },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statLabel: { ...Typography.caption, marginTop: Spacing.micro },
});
