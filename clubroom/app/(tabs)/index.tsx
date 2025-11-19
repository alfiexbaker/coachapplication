import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoachCard } from '@/components/discover/coach-card';
import { BookingFlowPreview } from '@/components/discover/booking-flow';
import { SectionHeader } from '@/components/primitives/section-header';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { coachProfiles } from '@/constants/mock-data';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function DiscoverScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { width } = useWindowDimensions();
  const isWide = width > 900;
  const [selectedCoachId, setSelectedCoachId] = useState(coachProfiles[0]?.id);
  const selectedCoach = coachProfiles.find((coach) => coach.id === selectedCoachId);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader
          eyebrow="Sprint 3 · Coaching OS"
          title="Book a coach without the noise"
          subtitle="Sports marketplace clutter is gone. Families tap a coach, preview the journey, and lock a slot through a polished booking flow."
        />
        <View style={[styles.split, isWide && styles.splitWide]}>
          <View style={[styles.listColumn, isWide && styles.listColumnWide]}>
            {coachProfiles.map((coach) => (
              <CoachCard
                key={coach.id}
                coach={coach}
                active={coach.id === selectedCoachId}
                onPress={() => setSelectedCoachId(coach.id)}
              />
            ))}
            {!coachProfiles.length ? (
              <View style={styles.emptyState}>
                <ThemedText type="subtitle">No coaches yet</ThemedText>
                <ThemedText>As soon as calendars sync, the roster appears here.</ThemedText>
              </View>
            ) : null}
          </View>
          <View style={[styles.bookingColumn, isWide && styles.bookingColumnWide]}>
            <BookingFlowPreview coach={selectedCoach} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  split: {
    flex: 1,
    gap: Spacing.lg,
  },
  splitWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listColumn: {
    flex: 1,
    gap: Spacing.md,
  },
  listColumnWide: {
    maxWidth: 520,
  },
  bookingColumn: {
    flex: 1,
  },
  bookingColumnWide: {
    maxWidth: 540,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing['2xl'],
  },
});
