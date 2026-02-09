/**
 * TimeSlotForm — Form to add time slots + list of added slots.
 *
 * Shared between group and squad invite wizards.
 * Contains the add-slot card with date/time/location fields,
 * an "Add Time Slot" button, and a list of proposed slots with remove.
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Column, Row } from '@/components/primitives';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { TimeSlot } from '@/constants/types';

// ─── Slot Item (memo'd for list) ────────────────────────────────────────────

interface SlotItemProps {
  slot: TimeSlot;
  index: number;
  onRemove: (index: number) => void;
  colors: ThemeColors;
}

const SlotItem = memo(function SlotItem({ slot, index, onRemove, colors }: SlotItemProps) {
  const handleRemove = useCallback(() => onRemove(index), [onRemove, index]);

  return (
    <Row
      align="center"
      style={[styles.slotItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Column gap="micro" style={styles.slotInfo}>
        <ThemedText type="defaultSemiBold">
          {new Date(slot.date).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
        </ThemedText>
        <ThemedText style={{ color: colors.muted }}>
          {slot.startTime} - {slot.endTime}
          {slot.location && ` at ${slot.location}`}
        </ThemedText>
      </Column>
      <Clickable
        onPress={handleRemove}
        accessibilityLabel={`Remove time slot ${index + 1}`}
        hitSlop={8}
      >
        <Ionicons name="close-circle" size={22} color={colors.error} />
      </Clickable>
    </Row>
  );
});

// ─── Main Component ─────────────────────────────────────────────────────────

export interface TimeSlotFormProps {
  /** Current list of proposed slots */
  proposedSlots: TimeSlot[];
  /** Called with updated slots array when a slot is added */
  onAddSlot: (slot: TimeSlot) => void;
  /** Called with index when a slot is removed */
  onRemoveSlot: (index: number) => void;
  /** Time slot form field values */
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  slotLocation: string;
  onSlotDateChange: (value: string) => void;
  onSlotStartTimeChange: (value: string) => void;
  onSlotEndTimeChange: (value: string) => void;
  onSlotLocationChange: (value: string) => void;
  colors: ThemeColors;
}

export const TimeSlotForm = memo(function TimeSlotForm({
  proposedSlots,
  onAddSlot,
  onRemoveSlot,
  slotDate,
  slotStartTime,
  slotEndTime,
  slotLocation,
  onSlotDateChange,
  onSlotStartTimeChange,
  onSlotEndTimeChange,
  onSlotLocationChange,
  colors,
}: TimeSlotFormProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Propose Time Slots
        </ThemedText>
        <ThemedText style={[styles.stepDescription, { color: colors.muted }]}>
          Add one or more time options for parents to choose from
        </ThemedText>

        <SurfaceCard style={styles.addSlotCard}>
          <Row gap="sm">
            <DateTimeField
              mode="date"
              label="Date"
              value={slotDate}
              onChange={onSlotDateChange}
            />
          </Row>
          <Row gap="sm">
            <DateTimeField
              mode="time"
              label="Start"
              value={slotStartTime}
              onChange={onSlotStartTimeChange}
              style={styles.flex1}
            />
            <DateTimeField
              mode="time"
              label="End"
              value={slotEndTime}
              onChange={onSlotEndTimeChange}
              style={styles.flex1}
            />
          </Row>
          <Row gap="sm">
            <Column gap="xxs" style={styles.flex1}>
              <ThemedText style={styles.inputLabel}>Location (optional)</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Hackney Marshes"
                placeholderTextColor={colors.muted}
                value={slotLocation}
                onChangeText={onSlotLocationChange}
                accessibilityLabel="Location input"
              />
            </Column>
          </Row>
          <Clickable
            onPress={() =>
              onAddSlot({
                date: slotDate,
                startTime: slotStartTime,
                endTime: slotEndTime,
                location: slotLocation || undefined,
              })
            }
            style={[styles.addSlotButton, { backgroundColor: colors.tint }]}
            accessibilityLabel="Add time slot"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={18} color={colors.onPrimary} />
            <ThemedText style={{ color: colors.onPrimary, ...Typography.bodySemiBold }}>
              Add Time Slot
            </ThemedText>
          </Clickable>
        </SurfaceCard>

        {proposedSlots.length > 0 && (
          <Column gap="sm" style={styles.slotsList}>
            <ThemedText style={styles.formLabel}>
              Proposed Slots ({proposedSlots.length})
            </ThemedText>
            {proposedSlots.map((slot, index) => (
              <SlotItem
                key={`${slot.date}-${slot.startTime}-${index}`}
                slot={slot}
                index={index}
                onRemove={onRemoveSlot}
                colors={colors}
              />
            ))}
          </Column>
        )}
      </Column>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  stepTitle: {
    ...Typography.title,
  },
  stepDescription: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  addSlotCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  inputLabel: {
    ...Typography.caption,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
    minHeight: 44,
  },
  slotsList: {
    marginTop: Spacing.md,
  },
  slotItem: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  slotInfo: {
    flex: 1,
  },
  formLabel: {
    ...Typography.bodySmallSemiBold,
    marginBottom: Spacing.xxs,
  },
});
