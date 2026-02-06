import React from 'react';
import { View, StyleSheet, Pressable, Switch } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives';
import { Colors, Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DAY_BUTTONS: { label: string; short: string; value: number }[] = [
  { label: 'Monday', short: 'Mon', value: 1 },
  { label: 'Tuesday', short: 'Tue', value: 2 },
  { label: 'Wednesday', short: 'Wed', value: 3 },
  { label: 'Thursday', short: 'Thu', value: 4 },
  { label: 'Friday', short: 'Fri', value: 5 },
  { label: 'Saturday', short: 'Sat', value: 6 },
  { label: 'Sunday', short: 'Sun', value: 0 },
];

interface CreateSessionScheduleStepProps {
  scheduleDate: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  isRecurring: boolean;
  recurringDayOfWeek: number;
  recurringUntil: string;
  onFieldChange: (field: string, value: unknown) => void;
}

function CreateSessionScheduleStepInner({
  scheduleDate,
  scheduleStartTime,
  scheduleEndTime,
  isRecurring,
  recurringDayOfWeek,
  recurringUntil,
  onFieldChange,
}: CreateSessionScheduleStepProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        When is it?
      </ThemedText>

      {/* Recurring Toggle */}
      <View style={[styles.recurringToggle, { backgroundColor: palette.surface }]}>
        <View style={styles.recurringToggleLeft}>
          <Ionicons name="repeat" size={20} color={palette.tint} />
          <View>
            <ThemedText type="defaultSemiBold">Recurring Session</ThemedText>
            <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
              Repeat weekly on a set day
            </ThemedText>
          </View>
        </View>
        <Switch
          value={isRecurring}
          onValueChange={(v) => onFieldChange('isRecurring', v)}
          trackColor={{ false: palette.border, true: withAlpha(palette.tint, 0.4) }}
          thumbColor={isRecurring ? palette.tint : palette.muted}
        />
      </View>

      {isRecurring ? (
        <>
          {/* Day of Week Picker */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Day of Week *</ThemedText>
            <View style={styles.dayGrid}>
              {DAY_BUTTONS.map((day) => {
                const selected = recurringDayOfWeek === day.value;
                return (
                  <Pressable
                    key={day.value}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: selected ? palette.tint : palette.surface,
                        borderColor: selected ? palette.tint : palette.border,
                      },
                    ]}
                    onPress={() => onFieldChange('recurringDayOfWeek', day.value)}
                    accessibilityLabel={day.label}
                    accessibilityState={{ selected }}
                  >
                    <ThemedText
                      style={{
                        ...Typography.smallSemiBold,
                        color: selected ? palette.onPrimary : palette.text,
                      }}
                    >
                      {day.short}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Runs Until */}
          <DateTimeField
            mode="date"
            label="Runs Until (optional)"
            value={recurringUntil}
            onChange={(v) => onFieldChange('recurringUntil', v)}
            placeholder="Select end date"
          />
        </>
      ) : (
        <DateTimeField
          mode="date"
          label="Date *"
          value={scheduleDate}
          onChange={(v) => onFieldChange('scheduleDate', v)}
        />
      )}

      <View style={styles.rowInputs}>
        <DateTimeField
          mode="time"
          label="Start Time"
          value={scheduleStartTime}
          onChange={(v) => onFieldChange('scheduleStartTime', v)}
          style={{ flex: 1 }}
        />
        <DateTimeField
          mode="time"
          label="End Time"
          value={scheduleEndTime}
          onChange={(v) => onFieldChange('scheduleEndTime', v)}
          style={{ flex: 1 }}
        />
      </View>
    </Animated.View>
  );
}

export const CreateSessionScheduleStep = React.memo(CreateSessionScheduleStepInner);

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  recurringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  recurringToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    ...Typography.smallSemiBold,
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  dayButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minWidth: 56,
    alignItems: 'center',
  },
});
