import { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { TimeSlot } from '@/constants/types';
import { getNextFourteenDays, addMinutesToTime } from './time-proposal-helpers';
import {
  OriginalTimeCard,
  DatePickerSection,
  TimeGridSection,
  DurationSection,
  ProposalSummary,
} from './time-proposal-sections';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimeProposalFormProps {
  originalTime: TimeSlot;
  onSubmit: (proposedTime: TimeSlot, message?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

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

  const days = getNextFourteenDays();

  const handleSubmit = () => {
    const proposedTime: TimeSlot = {
      date: selectedDate,
      startTime: selectedTime,
      endTime: addMinutesToTime(selectedTime, duration),
      location: location || originalTime.location,
    };
    onSubmit(proposedTime, message.trim() || undefined);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <OriginalTimeCard originalTime={originalTime} />
      <DatePickerSection days={days} selectedDate={selectedDate} onSelect={setSelectedDate} />
      <TimeGridSection selectedTime={selectedTime} onSelect={setSelectedTime} />
      <DurationSection duration={duration} onSelect={setDuration} />

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

      <ProposalSummary
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        duration={duration}
        location={location}
      />

      {/* Action buttons */}
      <Row gap="sm" style={styles.buttonRow}>
        <Clickable
          onPress={onCancel}
          style={[styles.cancelButton, { borderColor: palette.border }]}
          disabled={isLoading}
        >
          <ThemedText style={{ color: palette.text }}>Cancel</ThemedText>
        </Clickable>
        <Button onPress={handleSubmit} disabled={isLoading} style={styles.submitButton}>
          <Row align="center" gap="xs">
            {isLoading ? (
              <ThemedText style={[styles.submitButtonText, { color: palette.onPrimary }]}>
                Sending...
              </ThemedText>
            ) : (
              <>
                <Ionicons name="send" size={16} color={palette.onPrimary} />
                <ThemedText style={[styles.submitButtonText, { color: palette.onPrimary }]}>
                  {submitLabel}
                </ThemedText>
              </>
            )}
          </Row>
        </Button>
      </Row>
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.xxs,
  },
  textInput: {
    ...Typography.body,
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  textArea: {
    ...Typography.body,
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md,
    minHeight: 80,
  },
  buttonRow: {
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
  submitButtonContent: {},
  submitButtonText: {
    ...Typography.bodySemiBold,
  },
});
