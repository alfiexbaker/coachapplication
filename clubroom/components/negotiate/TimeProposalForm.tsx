import { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { toDateStr } from '@/utils/format';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { TimeSlot } from '@/constants/types';

interface TimeProposalFormProps {
  originalTime: TimeSlot;
  onSubmit: (proposedTime: TimeSlot, message?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

const TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
];

const DURATION_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

function getNextSevenDays(): { date: string; label: string; dayName: string }[] {
  const days: { date: string; label: string; dayName: string }[] = [];
  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dateStr = toDateStr(date);
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
    const label = date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });

    days.push({ date: dateStr, label, dayName });
  }

  return days;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

export function TimeProposalForm({
  originalTime,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Send Proposal',
}: TimeProposalFormProps) {
  const { colors: palette } = useTheme();

  const [selectedDate, setSelectedDate] = useState<string>(originalTime.date);
  const [selectedTime, setSelectedTime] = useState<string>(originalTime.startTime);
  const [duration, setDuration] = useState<number>(60);
  const [message, setMessage] = useState<string>('');
  const [location, setLocation] = useState<string>(originalTime.location || '');

  const days = getNextSevenDays();

  const handleSubmit = () => {
    const proposedTime: TimeSlot = {
      date: selectedDate,
      startTime: selectedTime,
      endTime: addMinutesToTime(selectedTime, duration),
      location: location || originalTime.location,
    };
    onSubmit(proposedTime, message.trim() || undefined);
  };

  const formatOriginalTime = () => {
    const date = new Date(originalTime.date);
    const dateStr = date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return `${dateStr} at ${originalTime.startTime}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Original time reference */}
      <View style={[styles.originalTimeCard, { backgroundColor: palette.background }]}>
        <View style={styles.originalTimeHeader}>
          <Ionicons name="calendar-outline" size={16} color={palette.muted} />
          <ThemedText style={[styles.originalTimeLabel, { color: palette.muted }]}>
            Current booking
          </ThemedText>
        </View>
        <ThemedText style={styles.originalTimeValue}>{formatOriginalTime()}</ThemedText>
        {originalTime.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.locationText, { color: palette.muted }]}>
              {originalTime.location}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Date selection */}
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
                onPress={() => setSelectedDate(day.date)}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.dateDayName,
                    { color: isSelected ? palette.tint : palette.muted },
                  ]}
                >
                  {day.dayName}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.dateLabel,
                    { color: isSelected ? palette.tint : palette.text },
                  ]}
                >
                  {day.label}
                </ThemedText>
              </Clickable>
            );
          })}
        </ScrollView>
      </View>

      {/* Time selection */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Select Time
        </ThemedText>
        <View style={styles.timeGrid}>
          {TIME_SLOTS.map((time) => {
            const isSelected = time === selectedTime;
            return (
              <Clickable
                key={time}
                onPress={() => setSelectedTime(time)}
                style={[
                  styles.timeChip,
                  {
                    backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.timeLabel,
                    { color: isSelected ? palette.tint : palette.text },
                  ]}
                >
                  {time}
                </ThemedText>
              </Clickable>
            );
          })}
        </View>
      </View>

      {/* Duration selection */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Duration
        </ThemedText>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((option) => {
            const isSelected = option.value === duration;
            return (
              <Clickable
                key={option.value}
                onPress={() => setDuration(option.value)}
                style={[
                  styles.durationChip,
                  {
                    backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.durationLabel,
                    { color: isSelected ? palette.tint : palette.text },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Clickable>
            );
          })}
        </View>
      </View>

      {/* Location (optional) */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Location (Optional)
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              borderColor: palette.border,
              color: palette.text,
              backgroundColor: palette.surface,
            },
          ]}
          placeholder="Same location or enter new"
          placeholderTextColor={palette.muted}
          value={location}
          onChangeText={setLocation}
        />
      </View>

      {/* Message */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Message (Optional)
        </ThemedText>
        <TextInput
          style={[
            styles.textArea,
            {
              borderColor: palette.border,
              color: palette.text,
              backgroundColor: palette.surface,
            },
          ]}
          placeholder="Explain why you need to change the time..."
          placeholderTextColor={palette.muted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Summary */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: withAlpha(palette.tint, 0.03), borderColor: withAlpha(palette.tint, 0.12) },
        ]}
      >
        <ThemedText style={[styles.summaryTitle, { color: palette.tint }]}>
          Your proposal
        </ThemedText>
        <View style={styles.summaryRow}>
          <Ionicons name="calendar" size={16} color={palette.tint} />
          <ThemedText style={{ color: palette.tint }}>
            {new Date(selectedDate).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}
          </ThemedText>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="time" size={16} color={palette.tint} />
          <ThemedText style={{ color: palette.tint }}>
            {selectedTime} - {addMinutesToTime(selectedTime, duration)}
          </ThemedText>
        </View>
        {location && (
          <View style={styles.summaryRow}>
            <Ionicons name="location" size={16} color={palette.tint} />
            <ThemedText style={{ color: palette.tint }}>{location}</ThemedText>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.buttonRow}>
        <Clickable
          onPress={onCancel}
          style={[styles.cancelButton, { borderColor: palette.border }]}
          disabled={isLoading}
        >
          <ThemedText style={{ color: palette.text }}>Cancel</ThemedText>
        </Clickable>
        <Button
          onPress={handleSubmit}
          disabled={isLoading}
          style={styles.submitButton}
        >
          <View style={styles.submitButtonContent}>
            {isLoading ? (
              <ThemedText style={[styles.submitButtonText, { color: palette.onPrimary }]}>Sending...</ThemedText>
            ) : (
              <>
                <Ionicons name="send" size={16} color={palette.onPrimary} />
                <ThemedText style={[styles.submitButtonText, { color: palette.onPrimary }]}>{submitLabel}</ThemedText>
              </>
            )}
          </View>
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  originalTimeCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.xxs,
  },
  originalTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  originalTimeLabel: {
    ...Typography.sm,
  },
  originalTimeValue: {
    ...Typography.bodySemiBold,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.micro,
  },
  locationText: {
    ...Typography.sm,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.xxs,
  },
  dateScrollContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  dateChip: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minWidth: 70,
  },
  dateDayName: {
    ...Typography.sm,
    fontWeight: '600',
  },
  dateLabel: {
    ...Typography.sm,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  timeChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  timeLabel: {
    ...Typography.sm,
    fontWeight: '500',
  },
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  durationChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  durationLabel: {
    ...Typography.sm,
    fontWeight: '500',
  },
  textInput: { ...Typography.body, borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md },
  textArea: { ...Typography.body, borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md,
    minHeight: 80 },
  summaryCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  summaryTitle: {
    ...Typography.sm,
    fontWeight: '600',
    marginBottom: Spacing.xxs,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  submitButton: {
    flex: 2,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: { ...Typography.bodySemiBold },
});
