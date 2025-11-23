import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Clickable } from '@/components/primitives/clickable';

const SLOTS = ['09:00', '10:00', '11:00', '13:00', '15:00', '17:00', '18:00'];

export function TimeSlotPicker({ selectedSlot, onSelect }: { selectedSlot?: string; onSelect: (slot: string) => void }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={styles.wrap}>
      {SLOTS.map((slot) => {
        const active = selectedSlot === slot;
        return (
          <Clickable
            key={slot}
            style={[
              styles.slot,
              {
                backgroundColor: active ? `${palette.tint}15` : palette.surface,
                borderColor: active ? palette.tint : palette.border,
              },
            ]}
            onPress={() => onSelect(slot)}
          >
            <ThemedText type="defaultSemiBold">{slot}</ThemedText>
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
  },
});
