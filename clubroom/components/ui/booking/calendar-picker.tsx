import { View, StyleSheet } from 'react-native';
import { toDateStr } from '@/utils/format';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { Clickable } from '@/components/primitives/clickable';
import type { AvailabilitySlot } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

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
  const { colors: palette } = useTheme();

  const days = Array.from({ length: daysToShow }).map((_, idx) => {
    const date = new Date();
    date.setDate(date.getDate() + idx);
    return date;
  });

  return (
    <Row wrap gap="sm">
      {days.map((date) => {
        const iso = toDateStr(date);
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
              <Row align="center" gap="xxs" style={styles.indicator}>
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
              </Row>
            )}
          </Clickable>
        );
      })}
    </Row>
  );
}

const styles = StyleSheet.create({
  // row replaced by Row primitive
  day: {
    width: '22%',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    gap: Spacing.xxs,
  },
  indicator: {
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
