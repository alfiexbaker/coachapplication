import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Clickable } from '@/components/primitives/clickable';
import type { AvailabilitySlot } from '@/constants/types';

interface CalendarPickerProps {
  selectedDate?: string;
  onSelect: (iso: string) => void;
  availabilityByDate?: Record<string, AvailabilitySlot[]>;
  daysToShow?: number;
}

export function CalendarPicker({
  selectedDate,
  onSelect,
  availabilityByDate,
  daysToShow = 14,
}: CalendarPickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const days = Array.from({ length: daysToShow }).map((_, idx) => {
    const date = new Date();
    date.setDate(date.getDate() + idx);
    return date;
  });

  return (
    <View style={styles.row}>
      {days.map((date) => {
        const iso = date.toISOString().split('T')[0];
        const active = selectedDate === iso;

        // Check if this date has available slots
        const slotsForDate = availabilityByDate?.[iso] || [];
        const hasAvailableSlots = slotsForDate.some((slot) => slot.isAvailable);
        const totalAvailableSlots = slotsForDate.filter((slot) => slot.isAvailable).length;

        // If we have availability data and no slots, disable the date
        const isDisabled = availabilityByDate && !hasAvailableSlots;

        return (
          <Clickable
            key={iso}
            onPress={() => !isDisabled && onSelect(iso)}
            disabled={isDisabled}
            style={[
              styles.day,
              {
                backgroundColor: active ? withAlpha(palette.tint, 0.09) : palette.surface,
                borderColor: active ? palette.tint : palette.border,
                opacity: isDisabled ? 0.4 : 1,
              },
            ]}
          >
            <ThemedText type="defaultSemiBold">
              {date.toLocaleDateString('en-GB', { weekday: 'short' })}
            </ThemedText>
            <ThemedText style={{ color: palette.muted }}>{date.getDate()}</ThemedText>
            {availabilityByDate && (
              <View style={styles.indicator}>
                {hasAvailableSlots ? (
                  <View style={[styles.dot, { backgroundColor: palette.tint }]} />
                ) : (
                  <ThemedText style={[styles.noSlots, { color: palette.muted }]}>-</ThemedText>
                )}
                {hasAvailableSlots && totalAvailableSlots > 0 && (
                  <ThemedText style={[styles.slotCount, { color: palette.tint }]}>
                    {totalAvailableSlots}
                  </ThemedText>
                )}
              </View>
            )}
          </Clickable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  day: {
    width: '22%',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    gap: Spacing.xxs,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.micro,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
  },
  slotCount: { ...Typography.micro },
  noSlots: { ...Typography.micro },
});
