/**
 * CreateSlotsStep — Time slot selection step for the create invite wizard.
 *
 * Uses the SlotPicker component to show real availability, plus
 * a summary of selected slots.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Column } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';
import { SlotPicker } from '@/components/coach/slot-picker';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { AvailabilitySlot, SessionTemplate } from '@/constants/types';

export interface CreateSlotsStepProps {
  coachId: string;
  selectedTemplate: SessionTemplate | null;
  selectedSlots: AvailabilitySlot[];
  onSelectionChange: (slots: AvailabilitySlot[]) => void;
  colors: ThemeColors;
}

// ============================================================================
// SELECTED SLOT ROW
// ============================================================================

interface SelectedSlotRowProps {
  slot: AvailabilitySlot;
  colors: ThemeColors;
}

const SelectedSlotRow = memo(function SelectedSlotRow({ slot, colors }: SelectedSlotRowProps) {
  return (
    <View
      style={[styles.slotItem, { backgroundColor: withAlpha(colors.tint, 0.06), borderColor: colors.tint }]}
    >
      <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
      <Column gap="micro" style={styles.slotInfo}>
        <ThemedText type="defaultSemiBold">
          {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
        </ThemedText>
        <ThemedText style={{ color: colors.muted }}>
          {slot.startTime} – {slot.endTime}
          {slot.location && ` · ${slot.location}`}
        </ThemedText>
      </Column>
    </View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CreateSlotsStep = memo(function CreateSlotsStep({
  coachId,
  selectedTemplate,
  selectedSlots,
  onSelectionChange,
  colors,
}: CreateSlotsStepProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Pick Time Slots
        </ThemedText>
        <ThemedText style={[styles.stepDescription, { color: colors.muted }]}>
          Select up to 3 available times from your schedule
        </ThemedText>

        <SlotPicker
          coachId={coachId}
          sessionTemplateId={selectedTemplate?.id}
          onSelectionChange={onSelectionChange}
        />

        {/* Selected slots summary */}
        {selectedSlots.length > 0 && (
          <Column gap="sm" style={styles.slotsList}>
            <ThemedText style={styles.formLabel}>Selected Slots</ThemedText>
            {selectedSlots.map((slot) => (
              <SelectedSlotRow
                key={`${slot.date}_${slot.startTime}`}
                slot={slot}
                colors={colors}
              />
            ))}
          </Column>
        )}
      </Column>
    </Animated.View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  stepTitle: {
    ...Typography.title,
  },
  stepDescription: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  formLabel: {
    ...Typography.bodySmallSemiBold,
    marginBottom: Spacing.xxs,
  },
  slotsList: {
    marginTop: Spacing.md,
  },
  slotItem: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  slotInfo: {
    flex: 1,
  },
});
