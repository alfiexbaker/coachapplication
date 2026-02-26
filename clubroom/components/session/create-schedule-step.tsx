/**
 * CreateScheduleStep — Step 2 of session creation wizard.
 *
 * Frequency/camp length, dates, time windows, location, and pricing.
 */

import React, { memo, useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { Row, Column } from '@/components/primitives';
import AddLocationPicker from '@/components/location/add-location-picker';
import type { SaveLocationPresetPayload } from '@/components/location/add-location-picker.types';
import type { CoachLocationPreset } from '@/constants/location-presets';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { CampDailyTime } from '@/hooks/use-create-session';
import {
  type CampLength,
  type RecurrenceType,
  type SessionType,
  CAMP_LENGTH_OPTIONS,
  RECURRENCE_OPTIONS,
} from './create-session-types';
import { formatInUserTimezone } from '@/utils/timezone';

interface CreateScheduleStepProps {
  colors: ThemeColors;
  sessionType: SessionType;
  recurrence: RecurrenceType;
  allowedRecurrenceOptions: RecurrenceType[];
  selectedDate: string;
  campLength: CampLength;
  campEndDate: string;
  selectedTime: string;
  selectedEndTime: string;
  campDatesPreview: string[];
  useCampDailyTimes: boolean;
  campDailyTimes: Record<string, CampDailyTime>;
  location: string;
  venueName: string;
  locationCoordinates?: { latitude: number; longitude: number } | null;
  price: string;
  savedLocations: CoachLocationPreset[];
  onCampLengthChange: (v: CampLength) => void;
  onCampEndDateChange: (v: string) => void;
  onUseCampDailyTimesChange: (v: boolean) => void;
  onCampDailyTimeChange: (date: string, field: keyof CampDailyTime, value: string) => void;
  onRecurrenceChange: (v: RecurrenceType) => void;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  onEndTimeChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onVenueNameChange: (v: string) => void;
  onSelectSavedLocation: (preset: CoachLocationPreset) => void;
  onSaveLocationPreset: (payload: SaveLocationPresetPayload) => void;
  onLocationCoordinatesChange: (coordinates: { latitude: number; longitude: number } | null) => void;
  onPriceChange: (v: string) => void;
}

function parseTimeToMinutes(time: string): number | null {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = parseInt(hoursRaw, 10);
  const minutes = parseInt(minutesRaw, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

function durationBetween(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) return 0;
  return end - start;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

function formatCampDateLabel(dateStr: string): string {
  const formatted = formatInUserTimezone(`${dateStr}T00:00:00`, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return formatted || dateStr;
}

function isValidDuration(minutes: number): boolean {
  return minutes >= 30 && minutes <= 480;
}

export const CreateScheduleStep = memo(function CreateScheduleStep({
  colors,
  sessionType,
  recurrence,
  allowedRecurrenceOptions,
  selectedDate,
  campLength,
  campEndDate,
  selectedTime,
  selectedEndTime,
  campDatesPreview,
  useCampDailyTimes,
  campDailyTimes,
  location,
  venueName,
  locationCoordinates,
  price,
  savedLocations,
  onCampLengthChange,
  onCampEndDateChange,
  onUseCampDailyTimesChange,
  onCampDailyTimeChange,
  onRecurrenceChange,
  onDateChange,
  onTimeChange,
  onEndTimeChange,
  onLocationChange,
  onVenueNameChange,
  onSelectSavedLocation,
  onSaveLocationPreset,
  onLocationCoordinatesChange,
  onPriceChange,
}: CreateScheduleStepProps) {
  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    d.setDate(d.getDate() + 365);
    return d;
  }, []);
  const isCamp = sessionType === 'camp';
  const supportsPerDayTimes = isCamp && campLength === 'multi_day' && campDatesPreview.length > 0;
  const showDefaultTimeFields = !supportsPerDayTimes || !useCampDailyTimes;

  const defaultDurationMinutes = useMemo(
    () => durationBetween(selectedTime, selectedEndTime),
    [selectedTime, selectedEndTime],
  );
  const defaultDurationValid = isValidDuration(defaultDurationMinutes);
  const campDateRangeError = useMemo(() => {
    if (!isCamp || campLength !== 'multi_day' || !selectedDate || !campEndDate) return null;
    if (campEndDate < selectedDate) return 'End date must be same day or after start date';
    const start = new Date(`${selectedDate}T00:00:00`);
    const end = new Date(`${campEndDate}T00:00:00`);
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days > 14) return 'Maximum camp duration is 14 days';
    if (end > maxDate) return 'Date must be within 1 year';
    return null;
  }, [isCamp, campLength, selectedDate, campEndDate, maxDate]);
  const priceError = useMemo(() => {
    if (!price.trim()) return null;
    if (!/^\d+$/.test(price)) return 'Price must be between £10 and £200 (whole pounds only)';
    const parsed = Number.parseInt(price, 10);
    if (parsed === 0) return null;
    if (parsed < 10 || parsed > 200) return 'Price must be between £10 and £200 (whole pounds only)';
    return null;
  }, [price]);

  const inputColors = {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
  };

  return (
    <Animated.View entering={FadeInRight.springify()}>
      <Column gap="lg">
        {!isCamp && (
          <Column gap="sm">
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Frequency
            </ThemedText>
            <Row wrap gap="sm">
              {RECURRENCE_OPTIONS.filter((option) =>
                allowedRecurrenceOptions.includes(option.key),
              ).map((opt) => {
                const selected = recurrence === opt.key;
                return (
                  <Clickable
                    key={opt.key}
                    onPress={() => onRecurrenceChange(opt.key)}
                    accessibilityLabel={`Select ${opt.label} frequency`}
                    style={[
                      styles.recurrenceCard,
                      {
                        backgroundColor: selected ? withAlpha(colors.tint, 0.07) : colors.surface,
                        borderColor: selected ? colors.tint : colors.border,
                      },
                    ]}
                  >
                    <Row align="center" gap="xs">
                      <Ionicons
                        name={opt.icon}
                        size={20}
                        color={selected ? colors.tint : colors.muted}
                      />
                      <ThemedText
                        style={[
                          styles.recurrenceLabel,
                          { color: selected ? colors.tint : colors.text },
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Row>
                  </Clickable>
                );
              })}
            </Row>
          </Column>
        )}

        {isCamp && (
          <Column gap="sm">
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Camp Length
            </ThemedText>
            <Row wrap gap="sm">
              {CAMP_LENGTH_OPTIONS.map((option) => {
                const selected = campLength === option.key;
                return (
                  <Clickable
                    key={option.key}
                    onPress={() => onCampLengthChange(option.key)}
                    accessibilityLabel={`Set ${option.label} camp length`}
                    style={[
                      styles.recurrenceCard,
                      {
                        backgroundColor: selected ? withAlpha(colors.tint, 0.07) : colors.surface,
                        borderColor: selected ? colors.tint : colors.border,
                      },
                    ]}
                  >
                    <Column gap="micro">
                      <ThemedText
                        style={[
                          styles.recurrenceLabel,
                          { color: selected ? colors.tint : colors.text },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                      <ThemedText style={[styles.caption, { color: colors.muted }]}>
                        {option.description}
                      </ThemedText>
                    </Column>
                  </Clickable>
                );
              })}
            </Row>
          </Column>
        )}

        <DateTimeField
          mode="date"
          label={
            isCamp
              ? 'Camp Start Date *'
              : recurrence === 'once'
                ? 'Date *'
                : 'Start Date *'
          }
          value={selectedDate}
          onChange={onDateChange}
          minimumDate={today}
          maximumDate={maxDate}
        />
        <ThemedText style={[styles.caption, { color: colors.muted }]}>
          Sessions can be scheduled up to 1 year in advance
        </ThemedText>

        {isCamp && campLength === 'multi_day' && (
          <Column gap="xs">
            <DateTimeField
              mode="date"
              label="Camp End Date *"
              value={campEndDate}
              onChange={onCampEndDateChange}
              minimumDate={selectedDate ? new Date(`${selectedDate}T00:00:00`) : today}
              maximumDate={maxDate}
              error={campDateRangeError ?? undefined}
            />
            {campDateRangeError ? (
              <ThemedText style={[styles.caption, { color: colors.error }]}>
                {campDateRangeError}
              </ThemedText>
            ) : null}
          </Column>
        )}

        {supportsPerDayTimes && (
          <Column gap="sm">
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Daily Time Plan
            </ThemedText>
            <Row gap="sm">
              <Clickable
                onPress={() => onUseCampDailyTimesChange(false)}
                style={[
                  styles.toggleCard,
                  {
                    borderColor: !useCampDailyTimes ? colors.tint : colors.border,
                    backgroundColor: !useCampDailyTimes
                      ? withAlpha(colors.tint, 0.07)
                      : colors.surface,
                  },
                ]}
              >
                <ThemedText
                  style={{ color: !useCampDailyTimes ? colors.tint : colors.text, ...Typography.smallSemiBold }}
                >
                  Same each day
                </ThemedText>
              </Clickable>
              <Clickable
                onPress={() => onUseCampDailyTimesChange(true)}
                style={[
                  styles.toggleCard,
                  {
                    borderColor: useCampDailyTimes ? colors.tint : colors.border,
                    backgroundColor: useCampDailyTimes
                      ? withAlpha(colors.tint, 0.07)
                      : colors.surface,
                  },
                ]}
              >
                <ThemedText
                  style={{ color: useCampDailyTimes ? colors.tint : colors.text, ...Typography.smallSemiBold }}
                >
                  Different by day
                </ThemedText>
              </Clickable>
            </Row>
          </Column>
        )}

        {showDefaultTimeFields && (
          <Column gap="sm">
            <ThemedText type="defaultSemiBold" style={styles.label}>
              {isCamp ? 'Daily Time Window *' : 'Time Window *'}
            </ThemedText>
            <Row gap="sm" style={styles.timeFieldRow}>
              <DateTimeField
                mode="time"
                label="Start"
                value={selectedTime}
                onChange={onTimeChange}
                minuteInterval={5}
                style={styles.timeField}
              />
              <DateTimeField
                mode="time"
                label="End"
                value={selectedEndTime}
                onChange={onEndTimeChange}
                minuteInterval={5}
                style={styles.timeField}
              />
            </Row>
            <ThemedText
              style={[
                styles.caption,
                { color: defaultDurationValid ? colors.muted : colors.error },
              ]}
            >
              {defaultDurationValid
                ? `Session length: ${formatDuration(defaultDurationMinutes)}`
                : 'End time must be after start (30 min to 8 hours).'}
            </ThemedText>
          </Column>
        )}

        {supportsPerDayTimes && useCampDailyTimes && (
          <Column gap="sm">
            {campDatesPreview.map((date) => {
              const dayTime = campDailyTimes[date] ?? {
                startTime: selectedTime,
                endTime: selectedEndTime,
              };
              const dayDuration = durationBetween(dayTime.startTime, dayTime.endTime);
              const dayValid = isValidDuration(dayDuration);

              return (
                <View
                  key={`camp-time-${date}`}
                  style={[
                    styles.dayCard,
                    {
                      borderColor: dayValid ? colors.border : colors.error,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Row align="center" justify="space-between">
                    <ThemedText type="defaultSemiBold">{formatCampDateLabel(date)}</ThemedText>
                    <ThemedText style={{ color: dayValid ? colors.muted : colors.error, ...Typography.caption }}>
                      {dayValid ? formatDuration(dayDuration) : 'Invalid range'}
                    </ThemedText>
                  </Row>
                  <Row gap="sm" style={styles.timeFieldRow}>
                    <DateTimeField
                      mode="time"
                      label="Start"
                      value={dayTime.startTime}
                      onChange={(value) => onCampDailyTimeChange(date, 'startTime', value)}
                      minuteInterval={5}
                      style={styles.timeField}
                    />
                    <DateTimeField
                      mode="time"
                      label="End"
                      value={dayTime.endTime}
                      onChange={(value) => onCampDailyTimeChange(date, 'endTime', value)}
                      minuteInterval={5}
                      style={styles.timeField}
                    />
                  </Row>
                </View>
              );
            })}
          </Column>
        )}

        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Location *
          </ThemedText>
          <AddLocationPicker
            value={location}
            venueName={venueName}
            coordinates={locationCoordinates}
            savedLocations={savedLocations}
            onChangeValue={onLocationChange}
            onChangeVenueName={onVenueNameChange}
            onChangeCoordinates={onLocationCoordinatesChange}
            onSelectSavedLocation={onSelectSavedLocation}
            onSavePreset={onSaveLocationPreset}
          />
        </Column>

        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.label}>
            {isCamp ? 'Price per Athlete' : 'Price per Session'}
          </ThemedText>
          <Row align="center" gap="sm">
            <ThemedText style={[styles.currency, { color: colors.muted }]}>£</ThemedText>
            <TextInput
              style={[styles.input, styles.priceInput, inputColors]}
              placeholder="0 for free"
              placeholderTextColor={colors.muted}
              value={price}
              onChangeText={onPriceChange}
              keyboardType="number-pad"
              accessibilityLabel="Session price"
            />
          </Row>
          <ThemedText style={[styles.hint, { color: priceError ? colors.error : colors.muted }]}>
            {priceError ?? 'Leave empty or set to 0 for free sessions. Whole pounds only (£10-£200 otherwise).'}
          </ThemedText>
        </Column>
      </Column>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  label: { ...Typography.bodySmall },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    borderWidth: 1,
  },
  recurrenceCard: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  recurrenceLabel: { ...Typography.smallSemiBold },
  toggleCard: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  timeFieldRow: {},
  timeField: {
    flex: 1,
  },
  dayCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  caption: { ...Typography.caption },
  currency: { ...Typography.heading },
  priceInput: { flex: 1, maxWidth: 120 },
  hint: { ...Typography.caption, marginTop: Spacing.xs },
});
