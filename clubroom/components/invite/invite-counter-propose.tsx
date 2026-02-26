/** InviteCounterPropose — Counter-proposal form for parents to add alternative time slots. */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { StyleSheet, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { ThemedText } from '@/components/themed-text';
import { Row, Column } from '@/components/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { TimeSlot } from '@/constants/types';

interface InviteCounterProposeProps {
  colors: ThemeColors;
  onClose: () => void;
  onSubmit: (slots: TimeSlot[], note: string) => void;
  responding: boolean;
  delay?: number;
}

export const InviteCounterPropose = memo(function InviteCounterPropose({
  colors,
  onClose,
  onSubmit,
  responding,
  delay = 250,
}: InviteCounterProposeProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loc, setLoc] = useState('');

  const addSlot = useCallback(() => {
    if (!date || !start || !end) {
      Alert.alert('Missing Info', 'Please fill in date, start time, and end time');
      return;
    }
    setSlots((p) => [...p, { date, startTime: start, endTime: end, location: loc || undefined }]);
    setDate('');
    setStart('');
    setEnd('');
    setLoc('');
  }, [date, start, end, loc]);

  const removeSlot = useCallback(
    (i: number) => setSlots((p) => p.filter((_, idx) => idx !== i)),
    [],
  );

  const handleSubmit = useCallback(() => {
    if (slots.length === 0) {
      Alert.alert('Add Times', 'Please add at least one alternative time slot');
      return;
    }
    onSubmit(slots, note);
  }, [slots, note, onSubmit]);

  const today = useMemo(() => new Date(), []);

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <SurfaceCard style={st.card}>
        <Row justify="between" align="center">
          <ThemedText type="defaultSemiBold">Propose Alternative Times</ThemedText>
          <Clickable onPress={onClose} accessibilityLabel="Close counter proposal">
            <Ionicons name="close" size={20} color={colors.muted} />
          </Clickable>
        </Row>
        <ThemedText style={[st.desc, { color: colors.muted }]}>
          Add one or more times that work better for you
        </ThemedText>
        {slots.map((slot, i) => (
          <Row
            key={`c-${slot.date}-${slot.startTime}`}
            gap="md"
            align="center"
            style={[
              st.slotItem,
              { backgroundColor: withAlpha(colors.tint, 0.06), borderColor: colors.tint },
            ]}
          >
            <Column gap="xxs" style={st.flex}>
              <ThemedText type="defaultSemiBold">
                {new Date(slot.date).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </ThemedText>
              <ThemedText style={{ color: colors.muted }}>
                {slot.startTime} - {slot.endTime}
              </ThemedText>
            </Column>
            <Clickable onPress={() => removeSlot(i)} accessibilityLabel="Remove time slot">
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </Clickable>
          </Row>
        ))}
        <Column gap="sm">
          <DateTimeField
            mode="date"
            label="Date"
            value={date}
            onChange={setDate}
            minimumDate={today}
          />
          <Row gap="sm">
            <DateTimeField
              mode="time"
              label="Start"
              value={start}
              onChange={setStart}
              minuteInterval={5}
              style={st.flex}
            />
            <DateTimeField
              mode="time"
              label="End"
              value={end}
              onChange={setEnd}
              minuteInterval={5}
              style={st.flex}
            />
          </Row>
          <Row gap="sm">
            <Column gap="xxs" style={st.flex}>
              <ThemedText style={[st.label, { color: colors.muted }]}>
                Location (optional)
              </ThemedText>
              <TextInput
                style={[st.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Local Park"
                placeholderTextColor={colors.muted}
                value={loc}
                onChangeText={setLoc}
                accessibilityLabel="Location input"

            maxLength={100}
          />
            </Column>
          </Row>
          <Clickable
            onPress={addSlot}
            accessibilityLabel="Add time slot"
            style={[st.addBtn, { backgroundColor: withAlpha(colors.tint, 0.06) }]}
          >
            <Row gap="xs" align="center" justify="center">
              <Ionicons name="add" size={16} color={colors.tint} />
              <ThemedText style={{ color: colors.tint, ...Typography.bodySemiBold }}>
                Add Time Slot
              </ThemedText>
            </Row>
          </Clickable>
        </Column>
        <Column gap="sm">
          <ThemedText style={[st.label, { color: colors.muted }]}>
            Note to coach (optional)
          </ThemedText>
          <TextInput
            style={[st.textArea, { color: colors.text, borderColor: colors.border }]}
            placeholder="Let the coach know why you're suggesting alternative times..."
            placeholderTextColor={colors.muted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            accessibilityLabel="Note to coach"

            maxLength={500}
          />
        </Column>
      </SurfaceCard>
      <Row gap="md" style={[st.footer, { borderTopColor: colors.border }]}>
        <Clickable
          onPress={onClose}
          accessibilityLabel="Cancel counter proposal"
          style={[st.cancelBtn, { borderColor: colors.border }]}
        >
          <ThemedText style={{ ...Typography.bodySemiBold }}>Cancel</ThemedText>
        </Clickable>
        <Clickable
          onPress={handleSubmit}
          disabled={responding || slots.length === 0}
          accessibilityLabel="Send counter proposal"
          style={[
            st.submitBtn,
            { backgroundColor: colors.tint, opacity: responding || slots.length === 0 ? 0.5 : 1 },
          ]}
        >
          <Row gap="xs" align="center" justify="center">
            <Ionicons name="swap-horizontal" size={18} color={colors.onPrimary} />
            <ThemedText style={{ color: colors.onPrimary, ...Typography.bodySemiBold }}>
              {responding ? 'Sending...' : 'Send Counter Proposal'}
            </ThemedText>
          </Row>
        </Clickable>
      </Row>
    </Animated.View>
  );
});

const st = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.md },
  desc: { ...Typography.small, marginTop: -Spacing.sm },
  slotItem: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  flex: { flex: 1 },
  label: { ...Typography.caption },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  textArea: {
    height: 80,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.body,
    textAlignVertical: 'top',
  },
  addBtn: { padding: Spacing.sm, borderRadius: Radii.md, minHeight: 44 },
  footer: { padding: Spacing.lg, borderTopWidth: 1, marginTop: Spacing.md },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minHeight: 44,
  },
  submitBtn: { flex: 2, paddingVertical: Spacing.md, borderRadius: Radii.md, minHeight: 44 },
});
