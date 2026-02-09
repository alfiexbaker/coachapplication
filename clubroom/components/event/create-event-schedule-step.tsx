import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';

interface CreateEventScheduleStepProps {
  date: string;
  startTime: string;
  endTime: string;
  rsvpDeadline: string;
  onFieldChange: (field: string, value: unknown) => void;
}

function CreateEventScheduleStepInner({
  date,
  startTime,
  endTime,
  rsvpDeadline,
  onFieldChange,
}: CreateEventScheduleStepProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        When is it?
      </ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Date *</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={palette.muted}
          value={date}
          onChangeText={(v) => onFieldChange('date', v)}
        />
      </View>

      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <ThemedText style={styles.inputLabel}>Start Time</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
            placeholder="10:00"
            placeholderTextColor={palette.muted}
            value={startTime}
            onChangeText={(v) => onFieldChange('startTime', v)}
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <ThemedText style={styles.inputLabel}>End Time</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
            placeholder="12:00"
            placeholderTextColor={palette.muted}
            value={endTime}
            onChangeText={(v) => onFieldChange('endTime', v)}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>RSVP Deadline</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
          placeholder="YYYY-MM-DD (optional)"
          placeholderTextColor={palette.muted}
          value={rsvpDeadline}
          onChangeText={(v) => onFieldChange('rsvpDeadline', v)}
        />
      </View>
    </Animated.View>
  );
}

export const CreateEventScheduleStep = React.memo(CreateEventScheduleStepInner);

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    ...Typography.smallSemiBold,
    fontSize: scaleFont(Typography.smallSemiBold.fontSize),
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});
