import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Routes } from '@/navigation/routes';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/constants/theme';
import {
  AddToSessionHeader,
  AddToSessionActionCard,
} from '@/components/roster/add-to-session-sections';
import { ThemedText } from '@/components/themed-text';

export default function AddToSessionScreen() {
  const { colors: palette } = useTheme();
  const { athleteId, athleteName } = useLocalSearchParams<{
    athleteId: string;
    athleteName?: string;
  }>();

  const selectedAthleteName = athleteName || 'Athlete';

  const handleBookNewSession = () => {
    if (!athleteId) return;
    router.push(
      Routes.sessionsCreateIntent({
        intent: 'new',
        source: 'roster',
        athleteIds: athleteId,
        athleteNames: selectedAthleteName,
      }),
    );
  };

  const handleAddToExisting = () => {
    if (!athleteId) return;
    router.push(
      Routes.sessionsCreateIntent({
        intent: 'existing',
        source: 'roster',
        athleteIds: athleteId,
        athleteNames: selectedAthleteName,
      }),
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <AddToSessionHeader
        colors={palette}
        athleteName={selectedAthleteName}
        onClose={() => router.back()}
      />

      <View style={styles.content}>
        <AddToSessionActionCard
          colors={palette}
          title="Book New Session"
          description="Create a fresh session and invite this athlete from the same flow."
          icon="add-circle-outline"
          ctaLabel="Create"
          onPress={handleBookNewSession}
        />
        <AddToSessionActionCard
          colors={palette}
          title="Add to Existing Session"
          description="Choose one of your upcoming sessions and send invite(s)."
          icon="calendar-outline"
          ctaLabel="Select"
          onPress={handleAddToExisting}
        />

        <ThemedText style={[styles.helperText, { color: palette.muted }]}>
          One flow, context-aware. Start here, then choose new or existing.
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  helperText: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
});
