import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SetScheduleScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [time, setTime] = useState('16:00 - 19:00');

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Recurring availability</ThemedText>
        <ThemedText style={{ color: palette.muted }}>Save a weekly template.</ThemedText>

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Days</ThemedText>
          <View style={styles.rowWrap}>
            {DAYS.map((day) => {
              const active = selectedDays.includes(day);
              return (
                <Clickable
                  key={day}
                  onPress={() => toggleDay(day)}
                  style={[styles.chip, { borderColor: active ? palette.tint : palette.border, backgroundColor: active ? `${palette.tint}12` : palette.surface }]}
                >
                  <ThemedText style={{ color: active ? palette.tint : palette.text }}>{day}</ThemedText>
                </Clickable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Time range</ThemedText>
          <Clickable style={[styles.input, { borderColor: palette.border }]}> 
            <ThemedText>{time}</ThemedText>
            <ThemedText style={{ color: palette.muted }}>Tap to adjust (mock)</ThemedText>
          </Clickable>
        </View>

        <Clickable style={[styles.save, { backgroundColor: palette.tint }]}> 
          <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Save template</ThemedText>
        </Clickable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  input: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: 4,
  },
  save: {
    padding: Spacing.md,
    borderRadius: Radii.button,
    alignItems: 'center',
  },
});
