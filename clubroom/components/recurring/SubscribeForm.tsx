import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { FrequencyPicker } from './FrequencyPicker';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { RecurrenceFrequency, CreateRecurringBookingParams } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDayName, getFrequencyLabel } from '@/services/recurring-booking-service';

/**
 * Coach information for the form
 */
interface CoachInfo {
  id: string;
  name: string;
  photoUrl?: string;
  sessionTypes?: string[];
  pricePerSession?: number;
  location?: string;
}

/**
 * Athlete information (if booking for a child)
 */
interface AthleteInfo {
  id: string;
  name: string;
}

/**
 * Props for the SubscribeForm component
 */
interface SubscribeFormProps {
  /** Coach to book with */
  coach: CoachInfo;
  /** Current user info */
  userId: string;
  userName: string;
  /** Athletes to choose from (children) */
  athletes?: AthleteInfo[];
  /** Called when form is submitted */
  onSubmit: (params: CreateRecurringBookingParams) => Promise<void>;
  /** Called when form is cancelled */
  onCancel?: () => void;
  /** Whether the form is submitting */
  submitting?: boolean;
  /** Pre-selected values */
  defaultValues?: Partial<{
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    time: string;
    frequency: RecurrenceFrequency;
    sessionType: string;
    duration: number;
  }>;
}

/**
 * Day option for the day selector
 */
interface DayOption {
  value: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  shortLabel: string;
}

const DAYS: DayOption[] = [
  { value: 0, label: 'Sunday', shortLabel: 'Sun' },
  { value: 1, label: 'Monday', shortLabel: 'Mon' },
  { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { value: 4, label: 'Thursday', shortLabel: 'Thu' },
  { value: 5, label: 'Friday', shortLabel: 'Fri' },
  { value: 6, label: 'Saturday', shortLabel: 'Sat' },
];

const DURATION_OPTIONS = [30, 45, 60, 90, 120];

const DEFAULT_SESSION_TYPES = [
  '1-on-1 Training',
  'Group Training',
  'Skills Assessment',
  'Technique Coaching',
];

/**
 * Convert hex color to rgba with alpha
 */
function withAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace('#', '');
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * SubscribeForm allows users to create a new recurring booking subscription
 * by selecting day, time, frequency, and other options.
 */
export function SubscribeForm({
  coach,
  userId,
  userName,
  athletes,
  onSubmit,
  onCancel,
  submitting = false,
  defaultValues,
}: SubscribeFormProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Form state
  const [dayOfWeek, setDayOfWeek] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(
    defaultValues?.dayOfWeek ?? 1
  );
  const [time, setTime] = useState(defaultValues?.time ?? '10:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    defaultValues?.frequency ?? 'WEEKLY'
  );
  const [sessionType, setSessionType] = useState(
    defaultValues?.sessionType ?? coach.sessionTypes?.[0] ?? DEFAULT_SESSION_TYPES[0]
  );
  const [duration, setDuration] = useState(defaultValues?.duration ?? 60);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | undefined>(
    athletes?.[0]?.id
  );
  const [location, setLocation] = useState(coach.location ?? '');
  const [notes, setNotes] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const sessionTypes = coach.sessionTypes ?? DEFAULT_SESSION_TYPES;
  const selectedAthlete = athletes?.find((a) => a.id === selectedAthleteId);

  // Calculate monthly estimate
  const monthlyEstimate = useMemo(() => {
    if (!coach.pricePerSession) return null;
    const sessionsPerMonth =
      frequency === 'WEEKLY' ? 4 : frequency === 'BIWEEKLY' ? 2 : 1;
    return coach.pricePerSession * sessionsPerMonth;
  }, [coach.pricePerSession, frequency]);

  // Create time Date object for picker
  const timeDate = useMemo(() => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }, [time]);

  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleTimeChange = (event: unknown, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    }
  };

  const handleEndDateChange = (event: unknown, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    // Calculate start date (next occurrence of selected day)
    const startDate = new Date();
    while (startDate.getDay() !== dayOfWeek) {
      startDate.setDate(startDate.getDate() + 1);
    }

    const params: CreateRecurringBookingParams = {
      userId,
      userName,
      coachId: coach.id,
      coachName: coach.name,
      coachPhotoUrl: coach.photoUrl,
      athleteId: selectedAthleteId,
      athleteName: selectedAthlete?.name,
      dayOfWeek,
      time,
      duration,
      location,
      sessionType,
      frequency,
      startDate: startDate.toISOString(),
      endDate: hasEndDate && endDate ? endDate.toISOString() : undefined,
      pricePerSession: coach.pricePerSession,
      notes: notes.trim() || undefined,
    };

    await onSubmit(params);
  };

  const isValid = location.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Coach Header */}
        <SurfaceCard style={styles.coachCard}>
          <View style={styles.coachRow}>
            {coach.photoUrl ? (
              <Image source={{ uri: coach.photoUrl }} style={styles.coachAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.coachAvatarPlaceholder, { backgroundColor: palette.border }]}>
                <Ionicons name="person" size={24} color={palette.muted} />
              </View>
            )}
            <View style={styles.coachInfo}>
              <ThemedText type="defaultSemiBold">{coach.name}</ThemedText>
              {coach.pricePerSession && (
                <ThemedText style={[styles.coachPrice, { color: palette.muted }]}>
                  ${coach.pricePerSession} per session
                </ThemedText>
              )}
            </View>
          </View>
        </SurfaceCard>

        {/* Athlete Selector (if multiple) */}
        {athletes && athletes.length > 1 && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Booking For
            </ThemedText>
            <View style={styles.athleteOptions}>
              {athletes.map((athlete) => {
                const isSelected = selectedAthleteId === athlete.id;
                return (
                  <Pressable
                    key={athlete.id}
                    onPress={() => setSelectedAthleteId(athlete.id)}
                    style={[
                      styles.athleteOption,
                      {
                        backgroundColor: isSelected
                          ? withAlpha(palette.tint, 0.1)
                          : palette.surface,
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={isSelected ? palette.tint : palette.muted}
                    />
                    <ThemedText style={{ color: isSelected ? palette.tint : palette.foreground }}>
                      {athlete.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Day Selector */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Day of Week
          </ThemedText>
          <View style={styles.dayGrid}>
            {DAYS.map((day) => {
              const isSelected = dayOfWeek === day.value;
              return (
                <Pressable
                  key={day.value}
                  onPress={() => setDayOfWeek(day.value)}
                  style={[
                    styles.dayOption,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.surface,
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.dayLabel,
                      { color: isSelected ? '#FFFFFF' : palette.foreground },
                    ]}
                  >
                    {day.shortLabel}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Time Selector */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Time
          </ThemedText>
          <Pressable
            onPress={() => setShowTimePicker(true)}
            style={[styles.timeSelector, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <Ionicons name="time-outline" size={20} color={palette.icon} />
            <ThemedText style={styles.timeText}>{formatTime(time)}</ThemedText>
            <Ionicons name="chevron-down" size={16} color={palette.muted} />
          </Pressable>
          {showTimePicker && (
            <DateTimePicker
              value={timeDate}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Frequency Selector */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Frequency
          </ThemedText>
          <FrequencyPicker
            value={frequency}
            onChange={setFrequency}
            pricePerSession={coach.pricePerSession}
          />
        </View>

        {/* Session Type */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Session Type
          </ThemedText>
          <View style={styles.sessionTypeOptions}>
            {sessionTypes.map((type) => {
              const isSelected = sessionType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setSessionType(type)}
                  style={[
                    styles.sessionTypeOption,
                    {
                      backgroundColor: isSelected
                        ? withAlpha(palette.tint, 0.1)
                        : palette.surface,
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.sessionTypeText,
                      { color: isSelected ? palette.tint : palette.foreground },
                    ]}
                  >
                    {type}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Duration
          </ThemedText>
          <View style={styles.durationOptions}>
            {DURATION_OPTIONS.map((d) => {
              const isSelected = duration === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDuration(d)}
                  style={[
                    styles.durationOption,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.surface,
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.durationText,
                      { color: isSelected ? '#FFFFFF' : palette.foreground },
                    ]}
                  >
                    {d} min
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Location
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.foreground,
              },
            ]}
            placeholder="Enter session location"
            placeholderTextColor={palette.muted}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* End Date (Optional) */}
        <View style={styles.section}>
          <View style={styles.endDateHeader}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              End Date
            </ThemedText>
            <Pressable
              onPress={() => setHasEndDate(!hasEndDate)}
              style={[
                styles.toggleButton,
                {
                  backgroundColor: hasEndDate
                    ? withAlpha(palette.tint, 0.1)
                    : palette.surface,
                },
              ]}
            >
              <Ionicons
                name={hasEndDate ? 'checkbox' : 'square-outline'}
                size={20}
                color={hasEndDate ? palette.tint : palette.muted}
              />
              <ThemedText
                style={[styles.toggleText, { color: hasEndDate ? palette.tint : palette.muted }]}
              >
                Set end date
              </ThemedText>
            </Pressable>
          </View>
          {hasEndDate && (
            <>
              <Pressable
                onPress={() => setShowEndDatePicker(true)}
                style={[
                  styles.timeSelector,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Ionicons name="calendar-outline" size={20} color={palette.icon} />
                <ThemedText style={styles.timeText}>
                  {endDate
                    ? endDate.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Select end date'}
                </ThemedText>
                <Ionicons name="chevron-down" size={16} color={palette.muted} />
              </Pressable>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  minimumDate={new Date()}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndDateChange}
                />
              )}
            </>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Notes (Optional)
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              styles.notesInput,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.foreground,
              },
            ]}
            placeholder="Any special requests or notes for your coach"
            placeholderTextColor={palette.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Summary */}
        <SurfaceCard style={styles.summaryCard}>
          <ThemedText type="defaultSemiBold" style={styles.summaryTitle}>
            Subscription Summary
          </ThemedText>
          <View style={styles.summaryRow}>
            <ThemedText style={{ color: palette.muted }}>Schedule</ThemedText>
            <ThemedText type="defaultSemiBold">
              {getDayName(dayOfWeek)}s at {formatTime(time)}
            </ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText style={{ color: palette.muted }}>Frequency</ThemedText>
            <ThemedText type="defaultSemiBold">{getFrequencyLabel(frequency)}</ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText style={{ color: palette.muted }}>Session</ThemedText>
            <ThemedText type="defaultSemiBold">
              {sessionType} ({duration} min)
            </ThemedText>
          </View>
          {selectedAthlete && (
            <View style={styles.summaryRow}>
              <ThemedText style={{ color: palette.muted }}>Athlete</ThemedText>
              <ThemedText type="defaultSemiBold">{selectedAthlete.name}</ThemedText>
            </View>
          )}
          {monthlyEstimate !== null && (
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <ThemedText style={{ color: palette.muted }}>Est. Monthly Cost</ThemedText>
              <ThemedText type="subtitle" style={{ color: palette.tint }}>
                ${monthlyEstimate}
              </ThemedText>
            </View>
          )}
        </SurfaceCard>
      </ScrollView>

      {/* Action Buttons */}
      <ThemedView style={[styles.footer, { borderTopColor: palette.border }]}>
        {onCancel && (
          <Button variant="outline" onPress={onCancel} style={styles.cancelButton}>
            Cancel
          </Button>
        )}
        <Button
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          style={styles.submitButton}
        >
          {submitting ? 'Creating...' : 'Start Subscription'}
        </Button>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: 100,
  },
  coachCard: {
    marginBottom: 0,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  coachAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  coachAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInfo: {
    flex: 1,
  },
  coachPrice: {
    ...Typography.small,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  athleteOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  athleteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  dayGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dayOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  dayLabel: {
    ...Typography.small,
    fontWeight: '600',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  timeText: {
    flex: 1,
    ...Typography.body,
  },
  sessionTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  sessionTypeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  sessionTypeText: {
    ...Typography.small,
    fontWeight: '500',
  },
  durationOptions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  durationOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  durationText: {
    ...Typography.small,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.body,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  endDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  toggleText: {
    ...Typography.small,
  },
  summaryCard: {
    gap: Spacing.sm,
  },
  summaryTitle: {
    marginBottom: Spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotal: {
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    marginTop: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
