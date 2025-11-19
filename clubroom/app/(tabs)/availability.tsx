import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = [
  { label: '6am', value: '6a' },
  { label: '8am', value: '8a' },
  { label: '10am', value: '10a' },
  { label: '12pm', value: '12p' },
  { label: '2pm', value: '2p' },
  { label: '4pm', value: '4p' },
  { label: '6pm', value: '6p' },
  { label: '8pm', value: '8p' },
];

type SlotKey = `${string}-${string}`;

export default function AvailabilityScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(
    new Set(['Mon-4p', 'Wed-4p', 'Fri-4p'] as SlotKey[])
  );

  const toggleSlot = (day: string, slot: string) => {
    const key = `${day}-${slot}` as SlotKey;
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader
          eyebrow="Sprint 1 · Coach Ops"
          title="Availability builder"
          subtitle="Tap slots to toggle availability. Drag-to-create and haptics coming in next sprint."
        />
        <SurfaceCard>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: `${palette.tint}25`, borderColor: palette.tint }]} />
              <ThemedText style={styles.legendText}>Available</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'transparent', borderColor: palette.border }]} />
              <ThemedText style={styles.legendText}>Unavailable</ThemedText>
            </View>
          </View>
          <View style={styles.gridContainer}>
            <View style={styles.timeColumn}>
              <View style={styles.timeHeaderSpacer} />
              {TIME_SLOTS.map((slot) => (
                <View key={slot.value} style={styles.timeCell}>
                  <ThemedText style={styles.timeLabel}>{slot.label}</ThemedText>
                </View>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridScroll}>
              <View>
                <View style={styles.gridHeader}>
                  {DAYS.map((day) => (
                    <ThemedText key={day} style={styles.gridHeaderText}>
                      {day}
                    </ThemedText>
                  ))}
                </View>
                {TIME_SLOTS.map((slot) => (
                  <View key={slot.value} style={styles.row}>
                    {DAYS.map((day) => {
                      const slotKey = `${day}-${slot.value}` as SlotKey;
                      const isSelected = selectedSlots.has(slotKey);
                      return (
                        <Pressable
                          key={slotKey}
                          onPress={() => toggleSlot(day, slot.value)}
                          style={({ pressed }) => [
                            styles.cell,
                            {
                              borderColor: isSelected ? palette.tint : palette.border,
                              backgroundColor: isSelected
                                ? `${palette.tint}${scheme === 'dark' ? '35' : '15'}`
                                : pressed
                                  ? palette.surface
                                  : 'transparent',
                            },
                          ]}>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={20} color={palette.tint} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timeColumn: {
    gap: Spacing.xs,
  },
  timeHeaderSpacer: {
    height: 32,
  },
  timeCell: {
    height: 56,
    justifyContent: 'center',
    paddingRight: Spacing.sm,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  gridScroll: {
    paddingRight: Spacing.lg,
  },
  gridHeader: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  gridHeaderText: {
    width: 64,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  cell: {
    width: 64,
    height: 56,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
