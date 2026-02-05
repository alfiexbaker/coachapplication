/**
 * Smart Slots
 *
 * Booking pattern analysis and scheduling suggestions for coaches.
 * Shows a heatmap of popular booking times, actionable suggestions
 * to add or remove slots, and quick actions like "Copy last week".
 *
 * For MVP: uses hardcoded mock analysis data.
 * Future: reads from booking-service to calculate real patterns.
 *
 * USER STORY:
 * "As a coach, I want to see which time slots are most popular so I
 * can open more availability when demand is highest."
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, Typography, Shadows, Components } from '@/constants/theme';
import { CardStyles, LayoutStyles } from '@/constants/styles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SmartSlotsProps {
  coachId: string;
  onAddSlot?: (day: string, time: string) => void;
  onRemoveSlot?: (day: string, time: string) => void;
  onCopyLastWeek?: () => void;
}

interface SlotSuggestion {
  id: string;
  day: string;
  time: string;
  metric: string;
  type: 'add' | 'remove';
  description: string;
}

interface DayHeatmapData {
  day: string;
  shortDay: string;
  slots: { time: string; bookingRate: number }[];
}

// ---------------------------------------------------------------------------
// Mock analysis data (MVP)
// ---------------------------------------------------------------------------

const MOCK_SUGGESTIONS: SlotSuggestion[] = [
  {
    id: 's1',
    day: 'Saturday',
    time: '10:00 AM',
    metric: '90% booked',
    type: 'add',
    description: 'Saturdays 10am: Frequently booked. Consider adding a second group.',
  },
  {
    id: 's2',
    day: 'Wednesday',
    time: '4:00 PM',
    metric: '85% booked',
    type: 'add',
    description: 'Weekday after-school slot consistently popular. 3 families on waitlist.',
  },
  {
    id: 's3',
    day: 'Sunday',
    time: '9:00 AM',
    metric: '5 searches',
    type: 'add',
    description: 'Sunday mornings: High search volume but you have no slots open.',
  },
  {
    id: 's4',
    day: 'Wednesday',
    time: '8:00 PM',
    metric: '0% booked',
    type: 'remove',
    description: 'Wednesday eves: No bookings in last 4 weeks.',
  },
  {
    id: 's5',
    day: 'Tuesday',
    time: '11:00 AM',
    metric: '15% booked',
    type: 'remove',
    description: 'Mid-morning slot rarely booked. Consider removing or discounting.',
  },
];

const MOCK_HEATMAP: DayHeatmapData[] = [
  {
    day: 'Monday',
    shortDay: 'Mon',
    slots: [
      { time: '9am', bookingRate: 0.3 },
      { time: '10am', bookingRate: 0.5 },
      { time: '11am', bookingRate: 0.2 },
      { time: '2pm', bookingRate: 0.4 },
      { time: '3pm', bookingRate: 0.6 },
      { time: '4pm', bookingRate: 0.8 },
      { time: '5pm', bookingRate: 0.7 },
    ],
  },
  {
    day: 'Tuesday',
    shortDay: 'Tue',
    slots: [
      { time: '9am', bookingRate: 0.2 },
      { time: '10am', bookingRate: 0.3 },
      { time: '11am', bookingRate: 0.15 },
      { time: '2pm', bookingRate: 0.5 },
      { time: '3pm', bookingRate: 0.6 },
      { time: '4pm', bookingRate: 0.75 },
      { time: '5pm', bookingRate: 0.6 },
    ],
  },
  {
    day: 'Wednesday',
    shortDay: 'Wed',
    slots: [
      { time: '9am', bookingRate: 0.4 },
      { time: '10am', bookingRate: 0.5 },
      { time: '11am', bookingRate: 0.3 },
      { time: '2pm', bookingRate: 0.6 },
      { time: '3pm', bookingRate: 0.7 },
      { time: '4pm', bookingRate: 0.85 },
      { time: '5pm', bookingRate: 0.7 },
    ],
  },
  {
    day: 'Thursday',
    shortDay: 'Thu',
    slots: [
      { time: '9am', bookingRate: 0.25 },
      { time: '10am', bookingRate: 0.4 },
      { time: '11am', bookingRate: 0.2 },
      { time: '2pm', bookingRate: 0.5 },
      { time: '3pm', bookingRate: 0.65 },
      { time: '4pm', bookingRate: 0.8 },
      { time: '5pm', bookingRate: 0.65 },
    ],
  },
  {
    day: 'Friday',
    shortDay: 'Fri',
    slots: [
      { time: '9am', bookingRate: 0.2 },
      { time: '10am', bookingRate: 0.35 },
      { time: '11am', bookingRate: 0.15 },
      { time: '2pm', bookingRate: 0.4 },
      { time: '3pm', bookingRate: 0.55 },
      { time: '4pm', bookingRate: 0.7 },
      { time: '5pm', bookingRate: 0.5 },
    ],
  },
  {
    day: 'Saturday',
    shortDay: 'Sat',
    slots: [
      { time: '9am', bookingRate: 0.8 },
      { time: '10am', bookingRate: 0.9 },
      { time: '11am', bookingRate: 0.85 },
      { time: '2pm', bookingRate: 0.6 },
      { time: '3pm', bookingRate: 0.5 },
      { time: '4pm', bookingRate: 0.3 },
      { time: '5pm', bookingRate: 0.1 },
    ],
  },
  {
    day: 'Sunday',
    shortDay: 'Sun',
    slots: [
      { time: '9am', bookingRate: 0.0 },
      { time: '10am', bookingRate: 0.0 },
      { time: '11am', bookingRate: 0.0 },
      { time: '2pm', bookingRate: 0.0 },
      { time: '3pm', bookingRate: 0.0 },
      { time: '4pm', bookingRate: 0.0 },
      { time: '5pm', bookingRate: 0.0 },
    ],
  },
];

const MOCK_STATS = {
  totalSessionsLastMonth: 34,
  averageBookingRate: 0.62,
  peakDay: 'Saturday',
  peakTime: '10:00 AM',
  waitlistCount: 8,
};

// ---------------------------------------------------------------------------
// Heatmap helpers
// ---------------------------------------------------------------------------

function getHeatColor(rate: number): string {
  if (rate === 0) return Colors.light.background;
  if (rate < 0.3) return Colors.light.success + '20';
  if (rate < 0.6) return Colors.light.success + '50';
  if (rate < 0.8) return Colors.light.success + '80';
  return Colors.light.success + 'CC';
}

function getHeatTextColor(rate: number): string {
  if (rate >= 0.6) return Colors.light.surface;
  return Colors.light.muted;
}

// ---------------------------------------------------------------------------
// Heatmap grid
// ---------------------------------------------------------------------------

function HeatmapGrid({ data }: { data: DayHeatmapData[] }) {
  const timeLabels = data[0]?.slots.map((s) => s.time) ?? [];

  return (
    <View style={heatStyles.container}>
      {/* Time header */}
      <View style={heatStyles.headerRow}>
        <View style={heatStyles.dayLabelCell} />
        {timeLabels.map((t) => (
          <View key={t} style={heatStyles.timeCell}>
            <Text style={heatStyles.timeLabel}>{t}</Text>
          </View>
        ))}
      </View>

      {/* Day rows */}
      {data.map((dayData) => (
        <View key={dayData.day} style={heatStyles.dayRow}>
          <View style={heatStyles.dayLabelCell}>
            <Text style={heatStyles.dayLabel}>{dayData.shortDay}</Text>
          </View>
          {dayData.slots.map((slot) => (
            <View
              key={`${dayData.day}-${slot.time}`}
              style={[heatStyles.heatCell, { backgroundColor: getHeatColor(slot.bookingRate) }]}
            >
              {slot.bookingRate > 0 && (
                <Text
                  style={[heatStyles.heatText, { color: getHeatTextColor(slot.bookingRate) }]}
                >
                  {Math.round(slot.bookingRate * 100)}
                </Text>
              )}
            </View>
          ))}
        </View>
      ))}

      {/* Legend */}
      <View style={heatStyles.legend}>
        <Text style={heatStyles.legendLabel}>Less busy</Text>
        {[0.1, 0.3, 0.6, 0.8, 0.95].map((rate) => (
          <View
            key={rate}
            style={[heatStyles.legendSwatch, { backgroundColor: getHeatColor(rate) }]}
          />
        ))}
        <Text style={heatStyles.legendLabel}>More busy</Text>
      </View>
    </View>
  );
}

const heatStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    ...Shadows.light.card,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabelCell: {
    width: 36,
    justifyContent: 'center',
  },
  timeCell: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.light.muted,
  },
  dayRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  dayLabel: {
    ...Typography.caption,
    color: Colors.light.muted,
  },
  heatCell: {
    flex: 1,
    aspectRatio: 1.4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  heatText: {
    fontSize: 9,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  legendLabel: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.light.muted,
  },
  legendSwatch: {
    width: 16,
    height: 10,
    borderRadius: 2,
  },
});

// ---------------------------------------------------------------------------
// Suggestion card
// ---------------------------------------------------------------------------

function SuggestionCard({
  suggestion,
  onAction,
}: {
  suggestion: SlotSuggestion;
  onAction: (suggestion: SlotSuggestion) => void;
}) {
  const isAdd = suggestion.type === 'add';
  const iconName: keyof typeof Ionicons.glyphMap = isAdd ? 'trending-up' : 'trending-down';
  const iconColor = isAdd ? Colors.light.success : Colors.light.warning;

  return (
    <View style={suggStyles.card}>
      <View style={suggStyles.cardHeader}>
        <View style={[suggStyles.iconCircle, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        <View style={suggStyles.cardHeaderText}>
          <Text style={suggStyles.cardTitle}>
            {suggestion.day} {suggestion.time}
          </Text>
          <View style={[suggStyles.metricBadge, { backgroundColor: iconColor + '18' }]}>
            <Text style={[suggStyles.metricText, { color: iconColor }]}>{suggestion.metric}</Text>
          </View>
        </View>
      </View>
      <Text style={suggStyles.cardDescription}>{suggestion.description}</Text>
      <Pressable
        style={[
          suggStyles.actionButton,
          { backgroundColor: isAdd ? Colors.light.tint : Colors.light.surface },
          !isAdd && { borderWidth: 1, borderColor: Colors.light.border },
        ]}
        onPress={() => onAction(suggestion)}
      >
        <Ionicons
          name={isAdd ? 'add' : 'remove'}
          size={16}
          color={isAdd ? '#FFFFFF' : Colors.light.muted}
        />
        <Text style={[suggStyles.actionButtonText, { color: isAdd ? '#FFFFFF' : Colors.light.muted }]}>
          {isAdd ? 'Add slot' : 'Remove slot'}
        </Text>
      </Pressable>
    </View>
  );
}

const suggStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    ...Shadows.light.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  cardHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...Typography.bodySemiBold,
    color: Colors.light.text,
  },
  metricBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  metricText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  cardDescription: {
    ...Typography.small,
    color: Colors.light.muted,
    marginBottom: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    alignSelf: 'flex-end',
  },
  actionButtonText: {
    ...Typography.caption,
    fontWeight: '600',
  },
});

// ---------------------------------------------------------------------------
// Stats summary
// ---------------------------------------------------------------------------

function StatsSummary() {
  return (
    <View style={statStyles.container}>
      <View style={statStyles.stat}>
        <Text style={statStyles.statValue}>{MOCK_STATS.totalSessionsLastMonth}</Text>
        <Text style={statStyles.statLabel}>Sessions (30d)</Text>
      </View>
      <View style={statStyles.divider} />
      <View style={statStyles.stat}>
        <Text style={statStyles.statValue}>{Math.round(MOCK_STATS.averageBookingRate * 100)}%</Text>
        <Text style={statStyles.statLabel}>Fill rate</Text>
      </View>
      <View style={statStyles.divider} />
      <View style={statStyles.stat}>
        <Text style={statStyles.statValue}>{MOCK_STATS.waitlistCount}</Text>
        <Text style={statStyles.statLabel}>On waitlist</Text>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    ...Shadows.light.card,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.title,
    color: Colors.light.text,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.light.muted,
    marginTop: 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.light.border,
  },
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SmartSlots({
  coachId,
  onAddSlot,
  onRemoveSlot,
  onCopyLastWeek,
}: SmartSlotsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const suggestions = useMemo(
    () => MOCK_SUGGESTIONS.filter((s) => !dismissedIds.has(s.id)),
    [dismissedIds],
  );

  const addSuggestions = suggestions.filter((s) => s.type === 'add');
  const removeSuggestions = suggestions.filter((s) => s.type === 'remove');

  const handleSuggestionAction = useCallback(
    (suggestion: SlotSuggestion) => {
      if (suggestion.type === 'add') {
        onAddSlot?.(suggestion.day, suggestion.time);
        Alert.alert(
          'Slot added',
          `${suggestion.day} at ${suggestion.time} has been added to your availability.`,
        );
      } else {
        onRemoveSlot?.(suggestion.day, suggestion.time);
        Alert.alert(
          'Slot removed',
          `${suggestion.day} at ${suggestion.time} has been removed from your availability.`,
        );
      }
      setDismissedIds((prev) => new Set(prev).add(suggestion.id));
    },
    [onAddSlot, onRemoveSlot],
  );

  const handleCopyLastWeek = useCallback(() => {
    Alert.alert(
      'Copy last week?',
      'This will duplicate your availability from last week into next week.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: () => {
            onCopyLastWeek?.();
            Alert.alert('Done', "Last week's availability has been copied to next week.");
          },
        },
      ],
    );
  }, [onCopyLastWeek]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerArea}>
        <Text style={styles.headerTitle}>Smart Slots</Text>
        <Text style={styles.headerSubtitle}>
          Insights from your booking patterns to help optimise your availability.
        </Text>
      </View>

      {/* Stats */}
      <StatsSummary />

      {/* Heatmap */}
      <Text style={styles.sectionTitle}>Booking heatmap</Text>
      <HeatmapGrid data={MOCK_HEATMAP} />

      {/* Quick action: Copy last week */}
      <Pressable style={styles.copyWeekButton} onPress={handleCopyLastWeek}>
        <Ionicons name="copy-outline" size={18} color={Colors.light.tint} />
        <Text style={styles.copyWeekText}>Copy last week's schedule</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.light.muted} />
      </Pressable>

      {/* Add suggestions */}
      {addSuggestions.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={18} color={Colors.light.success} />
            <Text style={styles.sectionTitle}>Popular slots to add</Text>
          </View>
          <View style={styles.suggestionsContainer}>
            {addSuggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onAction={handleSuggestionAction} />
            ))}
          </View>
        </>
      )}

      {/* Remove suggestions */}
      {removeSuggestions.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics-outline" size={18} color={Colors.light.warning} />
            <Text style={styles.sectionTitle}>Low-demand slots</Text>
          </View>
          <View style={styles.suggestionsContainer}>
            {removeSuggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onAction={handleSuggestionAction} />
            ))}
          </View>
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  contentContainer: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
  },

  // Header
  headerArea: {
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.title,
    color: Colors.light.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.light.muted,
  },

  // Sections
  sectionTitle: {
    ...Typography.heading,
    color: Colors.light.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },

  // Copy week
  copyWeekButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 14,
    marginTop: Spacing.md,
    ...Shadows.light.subtle,
  },
  copyWeekText: {
    flex: 1,
    ...Typography.bodySemiBold,
    color: Colors.light.tint,
  },

  // Suggestions
  suggestionsContainer: {
    gap: Spacing.xs,
  },

  bottomSpacer: {
    height: Spacing.lg,
  },
});
