/**
 * InviteSlotList — Shows proposed time slots for a session invite.
 *
 * In selectable mode (canRespond), slots act as radio buttons.
 * In view-only mode, just displays the proposed times.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row, Column } from '@/components/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { TimeSlot } from '@/constants/types';

interface InviteSlotListProps {
  slots: TimeSlot[];
  selectedSlot: number | null;
  canRespond: boolean;
  colors: ThemeColors;
  onSelectSlot: (index: number) => void;
  delay?: number;
}

const SlotItem = memo(function SlotItem({
  slot,
  index,
  isSelected,
  canRespond,
  colors,
  onSelect,
}: {
  slot: TimeSlot;
  index: number;
  isSelected: boolean;
  canRespond: boolean;
  colors: ThemeColors;
  onSelect: () => void;
}) {
  const slotDate = new Date(slot.date);

  return (
    <Clickable
      onPress={canRespond ? onSelect : undefined}
      disabled={!canRespond}
      accessibilityLabel={`Time slot ${index + 1}: ${slot.startTime} to ${slot.endTime}`}
      style={[
        styles.slotItem,
        {
          backgroundColor: isSelected ? withAlpha(colors.tint, 0.06) : colors.surface,
          borderColor: isSelected ? colors.tint : colors.border,
        },
      ]}
    >
      <Column align="center" style={styles.slotDate}>
        <ThemedText style={[styles.slotDay, { color: colors.tint }]}>
          {slotDate.toLocaleDateString('en-GB', { weekday: 'short' })}
        </ThemedText>
        <ThemedText type="heading">{slotDate.getDate()}</ThemedText>
        <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
          {slotDate.toLocaleDateString('en-GB', { month: 'short' })}
        </ThemedText>
      </Column>

      <Column gap="xxs" style={styles.slotDetails}>
        <ThemedText type="defaultSemiBold">
          {slot.startTime} - {slot.endTime}
        </ThemedText>
        {slot.location && (
          <Row gap="xxs" align="center">
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <ThemedText style={{ color: colors.muted, ...Typography.small }}>
              {slot.location}
            </ThemedText>
          </Row>
        )}
      </Column>

      {canRespond && (
        <View
          style={[
            styles.radioButton,
            {
              backgroundColor: isSelected ? colors.tint : 'transparent',
              borderColor: isSelected ? colors.tint : colors.border,
            },
          ]}
        >
          {isSelected && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
        </View>
      )}
    </Clickable>
  );
});

export const InviteSlotList = memo(function InviteSlotList({
  slots,
  selectedSlot,
  canRespond,
  colors,
  onSelectSlot,
  delay = 200,
}: InviteSlotListProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {canRespond ? 'Select a Time Slot' : 'Proposed Times'}
        </ThemedText>

        {slots.map((slot, index) => (
          <SlotItem
            key={`slot-${slot.date}-${slot.startTime}`}
            slot={slot}
            index={index}
            isSelected={selectedSlot === index}
            canRespond={canRespond}
            colors={colors}
            onSelect={() => onSelectSlot(index)}
          />
        ))}
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  slotItem: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  slotDate: {
    width: 50,
  },
  slotDay: {
    ...Typography.caption,
    textTransform: 'uppercase',
  },
  slotDetails: {
    flex: 1,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
