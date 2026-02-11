import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { DayAvailability, SlotInstance, ServiceType } from '@/constants/booking-types';
import { useTheme } from '@/hooks/useTheme';

interface AvailabilityPickerProps {
  availability: DayAvailability[];
  selectedDayId?: string;
  selectedSlotId?: string;
  selectedService?: ServiceType;
  onSelectDay: (dayId: string) => void;
  onSelectSlot: (slotId: string) => void;
}

export function AvailabilityPicker({
  availability,
  selectedDayId,
  selectedSlotId,
  selectedService,
  onSelectDay,
  onSelectSlot,
}: AvailabilityPickerProps) {
  const { colors: palette } = useTheme();
  const selectedDay = availability.find((entry) => entry.id === selectedDayId);

  return (
    <View>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Select Date
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateList}
      >
        {availability.map((day) => {
          const isSelected = day.id === selectedDayId;
          const dateObj = new Date(day.date);
          const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'short' });
          const dayNum = dateObj.getDate();
          const month = dateObj.toLocaleDateString('en-GB', { month: 'short' });

          return (
            <Clickable
              key={day.id}
              onPress={() => onSelectDay(day.id)}
              style={({ pressed }) => [
                styles.dateCard,
                {
                  backgroundColor: isSelected ? palette.tint : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <ThemedText
                style={[styles.dayName, { color: isSelected ? palette.onPrimary : palette.text }]}
              >
                {dayName}
              </ThemedText>
              <ThemedText
                style={[styles.dayNum, { color: isSelected ? palette.onPrimary : palette.text }]}
              >
                {dayNum}
              </ThemedText>
              <ThemedText
                style={[
                  styles.monthText,
                  { color: isSelected ? palette.onPrimary : palette.muted },
                ]}
              >
                {month}
              </ThemedText>
            </Clickable>
          );
        })}
      </ScrollView>

      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Available Times
      </ThemedText>
      {selectedDay?.slots.length === 0 ? (
        <View style={styles.noSlotsContainer}>
          <ThemedText style={{ color: palette.muted }}>
            No {selectedService?.title} slots available for this date
          </ThemedText>
        </View>
      ) : (
        <View style={styles.slotList}>
          {selectedDay?.slots.map((slot) => (
            <SlotRow
              key={slot.id}
              slot={slot}
              selected={slot.id === selectedSlotId}
              onPress={() => onSelectSlot(slot.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function SlotRow({
  slot,
  selected,
  onPress,
}: {
  slot: SlotInstance;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors: palette } = useTheme();
  const timeString = slot.start.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Clickable
      onPress={onPress}
      style={({ pressed }) => [
        styles.slotCard,
        {
          backgroundColor: selected ? withAlpha(palette.tint, 0.09) : palette.surface,
          borderColor: selected ? palette.tint : palette.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Row align="center" justify="between" gap="sm">
        <View style={styles.slotLeft}>
          <ThemedText type="defaultSemiBold" style={styles.slotTitle}>
            {slot.title}
          </ThemedText>
          <ThemedText style={[styles.slotFocus, { color: palette.muted }]}>{slot.focus}</ThemedText>
          <Row align="center" gap={Spacing.xs / 2}>
            <Ionicons name="time-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.slotTime, { color: palette.muted }]}>
              {timeString} · {slot.durationMinutes} min
            </ThemedText>
          </Row>
        </View>
        {selected && <Ionicons name="checkmark-circle" size={24} color={palette.tint} />}
      </Row>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  dateList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  dateCard: {
    width: 64,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  dayName: { ...Typography.smallSemiBold },
  dayNum: { ...Typography.title },
  monthText: { ...Typography.caption },
  noSlotsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  slotList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  slotCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  // slotContent replaced by Row primitive
  slotLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  slotTitle: { ...Typography.subheading },
  slotFocus: { ...Typography.small },
  // slotMeta replaced by Row primitive
  slotTime: { ...Typography.small },
});

export type { DayAvailability, SlotInstance } from '@/constants/booking-types';
