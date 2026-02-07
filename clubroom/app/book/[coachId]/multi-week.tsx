/**
 * Multi-Week Booking Screen
 *
 * Allows parents to select multiple weeks of sessions with a coach
 * and book them all at once as a BookingSeries.
 *
 * Route: /book/[coachId]/multi-week
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { MultiWeekPicker, type WeekRow } from '@/components/bookings/multi-week-picker';
import { MultiWeekConfirmation } from '@/components/bookings/multi-week-confirmation';
import { Colors, Spacing, Typography, Radii, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { availabilityService } from '@/services/availability-service';
import { multiWeekBookingService } from '@/services/multi-week-booking-service';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MultiWeekScreen');
const WEEKS_TO_SHOW = 8;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MultiWeekScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { currentUser } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState<Set<string>>(new Set());
  const [showConfirmation, setShowConfirmation] = useState(false);

  // TODO(T3.4): Resolve coach data from coachId via API
  const coachName = 'Coach';
  const sessionType = '1:1 Session';
  const defaultPrice = 60;
  const defaultDuration = 60;

  // Build week rows from availability
  const loadWeeks = useCallback(async () => {
    if (!coachId) return;
    setLoading(true);

    try {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + WEEKS_TO_SHOW * 7);
      const endDateStr = endDate.toISOString().split('T')[0];

      const slots = await availabilityService.getAvailableSlots(
        coachId,
        startDate,
        endDateStr,
        defaultDuration
      );

      // Group by week and pick the first available slot per week
      const weekMap = new Map<string, WeekRow>();

      for (const slot of slots) {
        // Get Monday of this slot's week
        const slotDate = new Date(slot.date + 'T00:00:00');
        const dayOfWeek = slotDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(slotDate);
        monday.setDate(slotDate.getDate() + mondayOffset);
        const weekKey = monday.toISOString().split('T')[0];

        // Only keep the first available slot per week
        if (!weekMap.has(weekKey) || (!weekMap.get(weekKey)!.available && slot.isAvailable)) {
          const dateObj = new Date(slot.date + 'T00:00:00');
          weekMap.set(weekKey, {
            weekDate: slot.date,
            dayName: DAY_NAMES[dateObj.getDay()],
            dateLabel: dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            startTime: slot.startTime,
            endTime: slot.endTime,
            location: slot.location ?? '',
            price: defaultPrice,
            available: slot.isAvailable,
            unavailableReason: !slot.isAvailable ? 'Fully booked' : undefined,
          });
        }
      }

      // Sort by date and take WEEKS_TO_SHOW
      const sortedWeeks = Array.from(weekMap.values())
        .sort((a, b) => a.weekDate.localeCompare(b.weekDate))
        .slice(0, WEEKS_TO_SHOW);

      setWeeks(sortedWeeks);

      // Auto-select all available weeks
      const available = new Set(
        sortedWeeks.filter((w) => w.available).map((w) => w.weekDate)
      );
      setSelectedWeeks(available);
    } catch (error) {
      logger.error('Failed to load weeks', error);
      setWeeks([]);
    } finally {
      setLoading(false);
    }
  }, [coachId, defaultDuration, defaultPrice]);

  useEffect(() => {
    loadWeeks();
  }, [loadWeeks]);

  const handleToggleWeek = useCallback((weekDate: string) => {
    setSelectedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekDate)) {
        next.delete(weekDate);
      } else {
        next.add(weekDate);
      }
      return next;
    });
  }, []);

  const selectedWeekRows = useMemo(
    () => weeks.filter((w) => selectedWeeks.has(w.weekDate)),
    [weeks, selectedWeeks]
  );

  const primaryLocation = useMemo(() => {
    const firstSelected = selectedWeekRows[0];
    return firstSelected?.location ?? '';
  }, [selectedWeekRows]);

  const handleShowConfirmation = useCallback(() => {
    if (selectedWeeks.size === 0) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowConfirmation(true);
  }, [selectedWeeks.size]);

  const handleConfirm = useCallback(async () => {
    if (!coachId || !currentUser) return;
    setSubmitting(true);

    try {
      const result = await multiWeekBookingService.createSeries({
        createdById: currentUser.id,
        createdByName: currentUser.name ?? 'Parent',
        coachId,
        coachName,
        athleteIds: [currentUser.id], // TODO: Support child selection
        athleteNames: [currentUser.name ?? 'Athlete'],
        sessionType,
        pricePerSession: defaultPrice,
        selectedWeeks: selectedWeekRows.map((w) => w.weekDate),
        startTime: selectedWeekRows[0]?.startTime ?? '10:00',
        duration: defaultDuration,
        location: primaryLocation,
        patternLabel: `${selectedWeekRows.length} weeks`,
      });

      if (result.success) {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        Alert.alert(
          'Booking Confirmed',
          `${selectedWeekRows.length} sessions booked successfully!`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Booking Failed', result.error.message);
      }
    } catch (error) {
      logger.error('Failed to create series', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [coachId, currentUser, coachName, sessionType, defaultPrice, selectedWeekRows, defaultDuration, primaryLocation]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold">Book Multiple Weeks</ThemedText>
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            {coachName} - {sessionType}
          </ThemedText>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={palette.tint} size="large" />
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            Loading availability...
          </ThemedText>
        </View>
      ) : showConfirmation ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <MultiWeekConfirmation
            selectedWeeks={selectedWeekRows}
            coachName={coachName}
            sessionType={sessionType}
            location={primaryLocation}
            loading={submitting}
            onConfirm={handleConfirm}
            onCancel={() => setShowConfirmation(false)}
          />
        </ScrollView>
      ) : (
        <>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Info banner */}
            <View style={[styles.infoBanner, { backgroundColor: withAlpha(palette.info, 0.06) }]}>
              <Ionicons name="information-circle-outline" size={18} color={palette.info} />
              <ThemedText style={[Typography.small, { color: palette.info, flex: 1 }]}>
                Select the weeks you want to book. Each session is at the same time and location.
              </ThemedText>
            </View>

            <MultiWeekPicker
              weeks={weeks}
              selectedWeeks={selectedWeeks}
              onToggleWeek={handleToggleWeek}
            />
          </ScrollView>

          {/* Sticky footer */}
          <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.surface }]}>
            <Button
              variant="primary"
              onPress={handleShowConfirmation}
              disabled={selectedWeeks.size === 0}
              style={styles.footerButton}
            >
              {`Review ${selectedWeeks.size} Week${selectedWeeks.size !== 1 ? 's' : ''}`}
            </Button>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: Spacing.micro,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: {
    width: '100%',
  },
});
