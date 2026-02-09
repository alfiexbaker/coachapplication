import React, { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { SESSION_TYPES, FOCUSES } from '@/hooks/use-squad-invite';
import type { TimeSlot } from '@/constants/types';

interface SquadInviteSessionFormProps {
  sessionTitle: string;
  sessionType: string;
  focus: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  slotLocation: string;
  proposedSlots: TimeSlot[];
  onTitleChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onFocusChange: (v: string) => void;
  onSlotDateChange: (v: string) => void;
  onSlotStartChange: (v: string) => void;
  onSlotEndChange: (v: string) => void;
  onSlotLocationChange: (v: string) => void;
  onAddSlot: () => void;
  onRemoveSlot: (index: number) => void;
}

export const SquadInviteSessionForm = memo(function SquadInviteSessionForm({
  sessionTitle, sessionType, focus, slotDate, slotStartTime, slotEndTime, slotLocation, proposedSlots,
  onTitleChange, onTypeChange, onFocusChange, onSlotDateChange, onSlotStartChange, onSlotEndChange,
  onSlotLocationChange, onAddSlot, onRemoveSlot,
}: SquadInviteSessionFormProps) {
  const { colors: palette } = useTheme();

  return (
    <>
      {/* Session Details */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Session Details</ThemedText>
        <View style={styles.formRow}>
          <ThemedText style={styles.formLabel}>Title</ThemedText>
          <TextInput style={[styles.input, { color: palette.text, borderColor: palette.border }]} placeholder="Session title" placeholderTextColor={palette.muted} value={sessionTitle} onChangeText={onTitleChange} />
        </View>
        <View style={styles.formRow}>
          <ThemedText style={styles.formLabel}>Type</ThemedText>
          <View style={styles.optionsRow}>
            {SESSION_TYPES.map((type) => (
              <Clickable key={type} onPress={() => onTypeChange(type)} style={[styles.optionChip, { backgroundColor: sessionType === type ? palette.tint : palette.surface, borderColor: sessionType === type ? palette.tint : palette.border }]}>
                <ThemedText style={{ color: sessionType === type ? palette.onPrimary : palette.text, ...Typography.caption }}>{type}</ThemedText>
              </Clickable>
            ))}
          </View>
        </View>
        <View style={styles.formRow}>
          <ThemedText style={styles.formLabel}>Focus</ThemedText>
          <View style={styles.optionsRow}>
            {FOCUSES.map((f) => (
              <Clickable key={f} onPress={() => onFocusChange(f)} style={[styles.optionChip, { backgroundColor: focus === f ? palette.tint : palette.surface, borderColor: focus === f ? palette.tint : palette.border }]}>
                <ThemedText style={{ color: focus === f ? palette.onPrimary : palette.text, ...Typography.caption }}>{f}</ThemedText>
              </Clickable>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Time Slots */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Time Slots</ThemedText>
        <SurfaceCard style={styles.slotFormCard}>
          <View style={styles.slotFormRow}>
            <DateTimeField mode="date" label="Date" value={slotDate} onChange={onSlotDateChange} style={{ flex: 1 }} />
          </View>
          <View style={styles.slotFormRow}>
            <DateTimeField mode="time" label="Start" value={slotStartTime} onChange={onSlotStartChange} style={{ flex: 1 }} />
            <DateTimeField mode="time" label="End" value={slotEndTime} onChange={onSlotEndChange} style={{ flex: 1 }} />
          </View>
          <View style={styles.slotFormRow}>
            <View style={{ flex: 1 }}>
              <TextInput style={[styles.input, { color: palette.text, borderColor: palette.border }]} placeholder="Location (optional)" placeholderTextColor={palette.muted} value={slotLocation} onChangeText={onSlotLocationChange} />
            </View>
            <Clickable accessibilityLabel="Add time slot" onPress={onAddSlot} style={[styles.addButton, { backgroundColor: palette.tint }]}>
              <Ionicons name="add" size={20} color={palette.onPrimary} />
            </Clickable>
          </View>
        </SurfaceCard>

        {proposedSlots.length > 0 && (
          <View style={styles.slotsList}>
            {proposedSlots.map((slot, index) => (
              <View key={index} style={[styles.slotItem, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.slotInfo}>
                  <ThemedText type="defaultSemiBold" style={{ ...Typography.small }}>
                    {new Date(slot.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </ThemedText>
                  <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                    {slot.startTime} - {slot.endTime}{slot.location && ` at ${slot.location}`}
                  </ThemedText>
                </View>
                <Clickable accessibilityLabel="Remove time slot" onPress={() => onRemoveSlot(index)}>
                  <Ionicons name="close-circle" size={20} color={palette.error} />
                </Clickable>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </>
  );
});

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { ...Typography.body, marginBottom: Spacing.xs },
  formRow: { gap: Spacing.xs, marginBottom: Spacing.sm },
  formLabel: { ...Typography.smallSemiBold },
  input: { height: 42, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, ...Typography.bodySmall },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  optionChip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm, borderWidth: 1 },
  slotFormCard: { padding: Spacing.md, gap: Spacing.sm },
  slotFormRow: { flexDirection: 'row', gap: Spacing.sm },
  addButton: { width: 42, height: 42, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  slotsList: { gap: Spacing.xs, marginTop: Spacing.xs },
  slotItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  slotInfo: { flex: 1, gap: Spacing.micro },
});
