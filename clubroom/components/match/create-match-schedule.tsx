import React, { memo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface CreateMatchScheduleProps {
  date: string;
  kickoffTime: string;
  meetTime: string;
  maxPlayers: string;
  notes: string;
  colors: ThemeColors;
  onDateChange: (val: string) => void;
  onKickoffTimeChange: (val: string) => void;
  onMeetTimeChange: (val: string) => void;
  onMaxPlayersChange: (val: string) => void;
  onNotesChange: (val: string) => void;
}

export const CreateMatchSchedule = memo(function CreateMatchSchedule({
  date, kickoffTime, meetTime, maxPlayers, notes, colors,
  onDateChange, onKickoffTimeChange, onMeetTimeChange, onMaxPlayersChange, onNotesChange,
}: CreateMatchScheduleProps) {
  return (
    <View style={styles.stepContent}>
      <ThemedText type="defaultSemiBold" style={styles.stepTitle}>Schedule</ThemedText>

      <DateTimeField mode="date" label="Date *" value={date} onChange={onDateChange} />
      <DateTimeField mode="time" label="Kickoff Time *" value={kickoffTime} onChange={onKickoffTimeChange} />
      <DateTimeField mode="time" label="Meeting Time (optional)" value={meetTime} onChange={onMeetTimeChange} placeholder="Select meeting time" />

      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: colors.muted }]}>Squad Size</ThemedText>
        <TextInput
          style={[styles.input, styles.smallInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="14" placeholderTextColor={colors.muted} value={maxPlayers} onChangeText={onMaxPlayersChange} keyboardType="number-pad"
        />
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>Maximum number of players for the match day squad</ThemedText>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: colors.muted }]}>Coach Notes (optional)</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="Any special instructions or reminders for parents..." placeholderTextColor={colors.muted}
          value={notes} onChangeText={onNotesChange} multiline numberOfLines={3}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  stepContent: { gap: Spacing.md },
  stepTitle: { ...Typography.heading, marginBottom: Spacing.sm },
  fieldGroup: { gap: Spacing.xs },
  fieldLabel: { ...Typography.smallSemiBold },
  input: { borderRadius: Radii.md, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.body },
  smallInput: { width: 100 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
});
