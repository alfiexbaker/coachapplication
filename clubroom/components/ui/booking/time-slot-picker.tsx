import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { Clickable } from '@/components/primitives/clickable';
import type { AvailabilitySlot } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface TimeSlotPickerProps {
  selectedSlot?: string;
  onSelect: (slot: string) => void;
  slots?: AvailabilitySlot[];
  isLoading?: boolean;
}

export function TimeSlotPicker({ selectedSlot, onSelect, slots, isLoading }: TimeSlotPickerProps) {
  const { colors: palette } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={palette.tint} />
        <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
          Loading available times...
        </ThemedText>
      </View>
    );
  }

  // Filter to only show available slots
  const availableSlots = slots?.filter((slot) => slot.isAvailable) || [];

  if (availableSlots.length === 0) {
    return (
      <View style={styles.centered}>
        <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
          No available slots for this date.{'\n'}Please select another date.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {availableSlots.map((slot) => {
        const active = selectedSlot === slot.startTime;
        return (
          <Clickable
            key={`${slot.date}-${slot.startTime}`}
            style={[
              styles.slot,
              {
                backgroundColor: active ? withAlpha(palette.tint, 0.09) : palette.surface,
                borderColor: active ? palette.tint : palette.border,
              },
            ]}
            onPress={() => onSelect(slot.startTime)}
          >
            <ThemedText type="defaultSemiBold">{slot.startTime}</ThemedText>
            {slot.location && (
              <ThemedText style={[styles.location, { color: palette.muted }]} numberOfLines={1}>
                {slot.location}
              </ThemedText>
            )}
          </Clickable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  slot: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minWidth: 90,
  },
  location: { ...Typography.caption, marginTop: Spacing.micro },
  centered: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
