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
  const openSessionBuilder = (intent: 'new' | 'existing') => {
    if (!athleteId) return;
    router.push(
      Routes.sessionsCreateIntent({
        intent,
        source: 'roster',
        athleteIds: athleteId,
        athleteNames: selectedAthleteName,
      }),
    );
  };

  const handleBookNewSession = () => {
    openSessionBuilder('new');
  };

  const handleAddToExisting = () => {
    openSessionBuilder('existing');
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <AddToSessionHeader
        colors={palette}
        athleteName={selectedAthleteName}
        onClose={() => router.back()}
      />

      <View style={styles.content}>
        <AddToSessionActionCard
          colors={palette}
          variant="new"
          accentKey="tint"
          title="Create New Session"
          description="Build a new session (time, focus, price) and invite this athlete in the same flow."
          icon="sparkles-outline"
          ctaLabel="Start Builder"
          onPress={handleBookNewSession}
        />
        <AddToSessionActionCard
          colors={palette}
          variant="existing"
          accentKey="success"
          title="Invite to Existing Session"
          description="Choose an already published session and send a quick invite immediately."
          icon="calendar-clear-outline"
          ctaLabel="Pick Session"
          onPress={handleAddToExisting}
        />

        <ThemedText style={[styles.helperText, { color: palette.muted }]}>
          Create New is best for custom coaching. Existing is fastest when you already have a live
          session.
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
