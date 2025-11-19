import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = ['6a', '8a', '10a', '12p', '2p', '4p', '6p'];

export default function AvailabilityScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader
          eyebrow="Sprint 1 · Coach Ops"
          title="Availability builder"
          subtitle="Drag-to-create blocks with haptics plus overrides for vacations keep coaches in control."
        />
        <SurfaceCard>
          <View style={styles.gridHeader}>
            {DAYS.map((day) => (
              <ThemedText key={day} style={styles.gridHeaderText}>
                {day}
              </ThemedText>
            ))}
          </View>
          {TIME_SLOTS.map((slot) => (
            <View key={slot} style={styles.row}>
              {DAYS.map((day, index) => (
                <View
                  key={`${day}-${slot}`}
                  style={[
                    styles.cell,
                    { borderColor: palette.border },
                    index % 2 === 0 && slot === '4p'
                      ? {
                          backgroundColor: `${palette.tint}15`,
                          borderColor: palette.tint,
                        }
                      : null,
                  ]}>
                  {index % 2 === 0 && slot === '4p' ? (
                    <ThemedText style={styles.cellLabel}>Group · 4 seats</ThemedText>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
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
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  gridHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  cell: {
    flex: 1,
    height: 56,
    borderRadius: Radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellLabel: {
    fontWeight: '600',
  },
});
