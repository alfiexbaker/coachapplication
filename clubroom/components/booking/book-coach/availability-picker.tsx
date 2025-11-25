import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { DayAvailability, SlotInstance, ServiceType } from '@/constants/booking-types';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const selectedDay = availability.find((entry) => entry.id === selectedDayId);

  return (
    <View>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Select Date
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
        {availability.map((day) => {
          const isSelected = day.id === selectedDayId;
          const dateObj = new Date(day.date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = dateObj.getDate();
          const month = dateObj.toLocaleDateString('en-US', { month: 'short' });

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
              <ThemedText style={[styles.dayName, { color: isSelected ? '#fff' : palette.text }]}>{dayName}</ThemedText>
              <ThemedText style={[styles.dayNum, { color: isSelected ? '#fff' : palette.text }]}>{dayNum}</ThemedText>
              <ThemedText style={[styles.monthText, { color: isSelected ? '#fff' : palette.muted }]}>{month}</ThemedText>
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

function SlotRow({ slot, selected, onPress }: { slot: SlotInstance; selected: boolean; onPress: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const timeString = slot.start.toLocaleTimeString('en-US', {
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
          backgroundColor: selected ? `${palette.tint}15` : palette.surface,
          borderColor: selected ? palette.tint : palette.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.slotContent}>
        <View style={styles.slotLeft}>
          <ThemedText type="defaultSemiBold" style={styles.slotTitle}>
            {slot.title}
          </ThemedText>
          <ThemedText style={[styles.slotFocus, { color: palette.muted }]}>{slot.focus}</ThemedText>
          <View style={styles.slotMeta}>
            <Ionicons name="time-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.slotTime, { color: palette.muted }]}>
              {timeString} · {slot.durationMinutes} min
            </ThemedText>
          </View>
        </View>
        {selected && <Ionicons name="checkmark-circle" size={24} color={palette.tint} />}
      </View>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  dateList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  dateCard: {
    width: 72,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dayName: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayNum: {
    fontSize: 20,
    fontWeight: '700',
  },
  monthText: {
    fontSize: 12,
  },
  noSlotsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  slotList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  slotCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.lg,
  },
  slotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  slotLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  slotTitle: {
    fontSize: 16,
  },
  slotFocus: {
    fontSize: 13,
  },
  slotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  slotTime: {
    fontSize: 13,
  },
});

export type { DayAvailability, SlotInstance } from '@/constants/booking-types';
