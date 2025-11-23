import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Clickable } from '@/components/primitives/clickable';

const DAYS = Array.from({ length: 14 }).map((_, idx) => {
  const date = new Date();
  date.setDate(date.getDate() + idx);
  return date;
});

export function CalendarPicker({ selectedDate, onSelect }: { selectedDate?: string; onSelect: (iso: string) => void }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={styles.row}>
      {DAYS.map((date) => {
        const iso = date.toISOString().split('T')[0];
        const active = selectedDate === iso;
        return (
          <Clickable
            key={iso}
            onPress={() => onSelect(iso)}
            style={[
              styles.day,
              {
                backgroundColor: active ? `${palette.tint}15` : palette.surface,
                borderColor: active ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText type="defaultSemiBold">{date.toLocaleDateString('en-GB', { weekday: 'short' })}</ThemedText>
            <ThemedText style={{ color: palette.muted }}>{date.getDate()}</ThemedText>
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
    gap: 6,
  },
});
