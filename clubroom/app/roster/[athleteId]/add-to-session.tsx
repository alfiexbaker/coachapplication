import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Routes } from '@/navigation/routes';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { rosterService } from '@/services/roster-service';
import { getRosterAthleteName } from '@/utils/roster-display';
import { err, ok, serviceError } from '@/types/result';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import {
  AddToSessionHeader,
  AddToSessionActionCard,
} from '@/components/roster/add-to-session-sections';

export default function AddToSessionScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const coachId = currentUser?.id ?? null;
  const { data, status, error, retry } = useScreen<{ athleteName: string }>({
    load: async () => {
      if (!coachId || currentUser?.role !== 'COACH') {
        return err(serviceError('UNAUTHORIZED', 'Sign in as a coach to add a player to a session.'));
      }
      if (!athleteId) {
        return err(serviceError('NOT_FOUND', 'Player is unavailable.'));
      }

      const entry = await rosterService.getRosterEntry(coachId, athleteId);
      if (!entry) {
        return err(serviceError('NOT_FOUND', 'Player is unavailable.'));
      }

      return ok({ athleteName: getRosterAthleteName(entry) });
    },
    deps: [athleteId, coachId, currentUser?.role],
    isEmpty: (value) => !value.athleteName,
    dataKey: `roster-add-to-session:${coachId ?? 'missing'}:${athleteId ?? 'missing'}`,
  });

  const selectedAthleteName = data?.athleteName ?? 'Athlete';
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

  const terminalAccessError = error?.code === 'NOT_FOUND' || error?.code === 'UNAUTHORIZED';

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error' || status === 'empty' || !data) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState
          title={terminalAccessError ? 'Session access unavailable' : undefined}
          message={
            terminalAccessError
              ? 'This player is not available from your roster.'
              : error?.message || 'Could not load session options.'
          }
          onRetry={terminalAccessError ? undefined : retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <AddToSessionHeader
        colors={palette}
        athleteName={selectedAthleteName}
        onClose={() => router.back()}
      />

      <View style={styles.content}>
        <AddToSessionActionCard
          colors={palette}
          accentKey="tint"
          title="New session"
          description="Set the time, focus and price."
          icon="calendar-outline"
          onPress={handleBookNewSession}
        />
        <AddToSessionActionCard
          colors={palette}
          accentKey="success"
          title="Existing session"
          description="Choose a published session."
          icon="calendar-clear-outline"
          onPress={handleAddToExisting}
        />
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
});
