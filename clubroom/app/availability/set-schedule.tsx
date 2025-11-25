import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { useMemo, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_PRESETS = ['16:00 - 19:00', '09:00 - 12:00', '18:00 - 21:00'];

export default function SetScheduleScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [timeIndex, setTimeIndex] = useState(0);

  const timeRange = useMemo(() => TIME_PRESETS[timeIndex] ?? TIME_PRESETS[0], [timeIndex]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const cycleTime = () => {
    setTimeIndex((prev) => (prev + 1) % TIME_PRESETS.length);
  };

  const handleSaveTemplate = () => {
    Alert.alert('Saved', `Weekly template stored for ${selectedDays.join(', ') || 'no days'} at ${timeRange}.`);
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
          <Clickable style={[styles.input, { borderColor: palette.border }]} onPress={cycleTime}>
            <ThemedText>{timeRange}</ThemedText>
            <ThemedText style={{ color: palette.muted }}>Tap to cycle presets</ThemedText>
          </Clickable>
        </View>

        <Clickable style={[styles.save, { backgroundColor: palette.tint }]} onPress={handleSaveTemplate}>
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
