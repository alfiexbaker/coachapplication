import { memo } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { TIME_SLOTS, DURATION_OPTIONS, addMinutesToTime } from './time-proposal-helpers';
import type { TimeSlot } from '@/constants/types';
import { styles } from './time-proposal-styles';

// ─── Original Time Card ─────────────────────────────────────────────────────

interface OriginalTimeCardProps {
  originalTime: TimeSlot;
}

export const OriginalTimeCard = memo(function OriginalTimeCard({ originalTime }: OriginalTimeCardProps) {
  const { colors: palette } = useTheme();

  const formatted = (() => {
    const date = new Date(originalTime.date);
    const dateStr = date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short' });
    return `${dateStr} at ${originalTime.startTime}`;
  })();

  return (
    <View style={[styles.originalTimeCard, { backgroundColor: palette.background }]}>
      <Row align="center" gap="xxs">
        <Ionicons name="calendar-outline" size={16} color={palette.muted} />
        <ThemedText style={[styles.originalTimeLabel, { color: palette.muted }]}>
          Current booking
        </ThemedText>
      </Row>
      <ThemedText style={styles.originalTimeValue}>{formatted}</ThemedText>
      {originalTime.location && (
        <Row align="center" gap="xxs" style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.locationText, { color: palette.muted }]}>
            {originalTime.location}
          </ThemedText>
        </Row>
      )}
    </View>
  );
});

// ─── Date Picker ────────────────────────────────────────────────────────────

interface DatePickerSectionProps {
  days: { date: string; label: string; dayName: string }[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

export const DatePickerSection = memo(function DatePickerSection({
  days,
  selectedDate,
  onSelect }: DatePickerSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Select Date
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateScrollContent}
      >
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          return (
            <Clickable
              key={day.date}
              onPress={() => onSelect(day.date)}
              style={[
                styles.dateChip,
                {
                  backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border },
              ]}
            >
              <ThemedText
                style={[styles.dateDayName, { color: isSelected ? palette.tint : palette.muted }]}
              >
                {day.dayName}
              </ThemedText>
              <ThemedText
                style={[styles.dateLabel, { color: isSelected ? palette.tint : palette.text }]}
              >
                {day.label}
              </ThemedText>
            </Clickable>
          );
        })}
      </ScrollView>
    </View>
  );
});

// ─── Time Grid ──────────────────────────────────────────────────────────────

interface TimeGridSectionProps {
  selectedTime: string;
  onSelect: (time: string) => void;
}

export const TimeGridSection = memo(function TimeGridSection({
  selectedTime,
  onSelect }: TimeGridSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Select Time
      </ThemedText>
      <Row wrap gap="xs">
        {TIME_SLOTS.map((time) => {
          const isSelected = time === selectedTime;
          return (
            <Clickable
              key={time}
              onPress={() => onSelect(time)}
              style={[
                styles.timeChip,
                {
                  backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border },
              ]}
            >
              <ThemedText
                style={[styles.timeLabel, { color: isSelected ? palette.tint : palette.text }]}
              >
                {time}
              </ThemedText>
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
});

// ─── Duration Picker ────────────────────────────────────────────────────────

interface DurationSectionProps {
  duration: number;
  onSelect: (value: number) => void;
}

export const DurationSection = memo(function DurationSection({
  duration,
  onSelect }: DurationSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Duration
      </ThemedText>
      <Row gap="sm">
        {DURATION_OPTIONS.map((option) => {
          const isSelected = option.value === duration;
          return (
            <Clickable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[
                styles.durationChip,
                {
                  backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border },
              ]}
            >
              <ThemedText
                style={[styles.durationLabel, { color: isSelected ? palette.tint : palette.text }]}
              >
                {option.label}
              </ThemedText>
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
});

// ─── Summary Card ───────────────────────────────────────────────────────────

interface ProposalSummaryProps {
  selectedDate: string;
  selectedTime: string;
  duration: number;
  location: string;
}

export const ProposalSummary = memo(function ProposalSummary({
  selectedDate,
  selectedTime,
  duration,
  location }: ProposalSummaryProps) {
  const { colors: palette } = useTheme();

  return (
    <View
      style={[
        styles.summaryCard,
        { backgroundColor: withAlpha(palette.tint, 0.03), borderColor: withAlpha(palette.tint, 0.12) },
      ]}
    >
      <ThemedText style={[styles.summaryTitle, { color: palette.tint }]}>Your proposal</ThemedText>
      <Row align="center" gap="xs">
        <Ionicons name="calendar" size={16} color={palette.tint} />
        <ThemedText style={{ color: palette.tint }}>
          {new Date(selectedDate).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'short' })}
        </ThemedText>
      </Row>
      <Row align="center" gap="xs">
        <Ionicons name="time" size={16} color={palette.tint} />
        <ThemedText style={{ color: palette.tint }}>
          {selectedTime} - {addMinutesToTime(selectedTime, duration)}
        </ThemedText>
      </Row>
      {location ? (
        <Row align="center" gap="xs">
          <Ionicons name="location" size={16} color={palette.tint} />
          <ThemedText style={{ color: palette.tint }}>{location}</ThemedText>
        </Row>
      ) : null}
    </View>
  );
});

export { styles };
