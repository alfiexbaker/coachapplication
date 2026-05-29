import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { Spacing } from '@/constants/theme';
import { Row } from '@/components/primitives';

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
  const today = new Date();

  const handleDate = (v: string) => onFieldChange('date', v);
  const handleStart = (v: string) => onFieldChange('startTime', v);
  const handleEnd = (v: string) => onFieldChange('endTime', v);
  const handleRsvp = (v: string) => onFieldChange('rsvpDeadline', v);

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        When is it?
      </ThemedText>

      <DateTimeField
        mode="date"
        value={date}
        onChange={handleDate}
        label="Date *"
        minimumDate={today}
      />

      <Row style={styles.rowInputs}>
        <DateTimeField
          mode="time"
          value={startTime}
          onChange={handleStart}
          label="Start Time"
          minuteInterval={5}
          style={styles.flex}
        />
        <DateTimeField
          mode="time"
          value={endTime}
          onChange={handleEnd}
          label="End Time"
          minuteInterval={5}
          style={styles.flex}
        />
      </Row>

      <DateTimeField
        mode="date"
        value={rsvpDeadline}
        onChange={handleRsvp}
        label="RSVP Deadline (optional)"
        minimumDate={today}
      />
    </Animated.View>
  );
}

export const CreateEventScheduleStep = CreateEventScheduleStepInner;

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  rowInputs: {
    gap: Spacing.md,
  },
  flex: {
    flex: 1,
  },
});
