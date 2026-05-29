import { useState } from 'react';
import { StyleSheet, View, TextInput, Platform } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';
import { DURATION_OPTIONS } from '@/hooks/use-subscribe-form';
import type { AthleteInfo } from '@/hooks/use-subscribe-form';

interface Props {
  athletes?: AthleteInfo[];
  selectedAthleteId?: string;
  onAthleteChange: (id: string) => void;
  sessionTypes: string[];
  sessionType: string;
  onSessionTypeChange: (type: string) => void;
  duration: number;
  onDurationChange: (d: number) => void;
  location: string;
  onLocationChange: (text: string) => void;
  notes: string;
  onNotesChange: (text: string) => void;
  hasEndDate: boolean;
  onToggleEndDate: () => void;
  endDate?: Date;
  showEndDatePicker: boolean;
  onShowEndDatePicker: (show: boolean) => void;
  onEndDateChange: (event: unknown, date?: Date) => void;
}

function SubscribeOptionsSectionInner({
  athletes,
  selectedAthleteId,
  onAthleteChange,
  sessionTypes,
  sessionType,
  onSessionTypeChange,
  duration,
  onDurationChange,
  location,
  onLocationChange,
  notes,
  onNotesChange,
  hasEndDate,
  onToggleEndDate,
  endDate,
  showEndDatePicker,
  onShowEndDatePicker,
  onEndDateChange,
}: Props) {
  const { colors: palette, isDark } = useTheme();
  const [today] = useState(() => new Date());

  return (
    <>
      {/* Athlete Selector */}
      {athletes && athletes.length > 1 && (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Booking For
          </ThemedText>
          <Row wrap gap="xs">
            {athletes.map((athlete) => {
              const isSelected = selectedAthleteId === athlete.id;
              return (
                <Clickable
                  key={athlete.id}
                  onPress={() => onAthleteChange(athlete.id)}
                  style={[
                    styles.chipOption,
                    {
                      backgroundColor: isSelected ? withAlpha(palette.tint, 0.1) : palette.surface,
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
                </Clickable>
              );
            })}
          </Row>
        </View>
      )}

      {/* Session Type */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Session Type
        </ThemedText>
        <Row wrap gap="xs">
          {sessionTypes.map((type) => {
            const isSelected = sessionType === type;
            return (
              <Clickable
                key={type}
                onPress={() => onSessionTypeChange(type)}
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: isSelected ? withAlpha(palette.tint, 0.1) : palette.surface,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.typeText,
                    { color: isSelected ? palette.tint : palette.foreground },
                  ]}
                >
                  {type}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
      </View>

      {/* Duration */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Duration
        </ThemedText>
        <Row gap="xs">
          {DURATION_OPTIONS.map((d) => {
            const isSelected = duration === d;
            return (
              <Clickable
                key={d}
                onPress={() => onDurationChange(d)}
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
                    { color: isSelected ? palette.onPrimary : palette.foreground },
                  ]}
                >
                  {d} min
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
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
          onChangeText={onLocationChange}

            maxLength={100}
          />
      </View>

      {/* End Date */}
      <View style={styles.section}>
        <Row justify="between" align="center">
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            End Date
          </ThemedText>
          <Clickable
            onPress={onToggleEndDate}
            style={[
              styles.toggleButton,
              { backgroundColor: hasEndDate ? withAlpha(palette.tint, 0.1) : palette.surface },
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
          </Clickable>
        </Row>
        {hasEndDate && (
          <>
            <Clickable
              onPress={() => onShowEndDatePicker(true)}
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
            </Clickable>
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate || today}
                mode="date"
                minimumDate={today}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor={palette.text}
                themeVariant={isDark ? 'dark' : 'light'}
                onChange={onEndDateChange}
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
          onChangeText={onNotesChange}
          multiline

            maxLength={500}
          />
      </View>
    </>
  );
}

export const SubscribeOptionsSection = SubscribeOptionsSectionInner;

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionTitle: { marginBottom: Spacing.xxs },
  chipOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  typeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  typeText: { ...Typography.small, fontWeight: '500' },
  durationOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  durationText: { ...Typography.smallSemiBold },
  textInput: { borderWidth: 1, borderRadius: Radii.md, padding: Spacing.md, ...Typography.body },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  toggleText: { ...Typography.small },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  timeText: { flex: 1, ...Typography.body },
});
