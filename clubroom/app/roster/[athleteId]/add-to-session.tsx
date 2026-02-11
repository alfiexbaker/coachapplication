import { useState, useCallback } from 'react';
import { StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';

import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { groupSessionService } from '@/services/group-session-service';
import { rosterService } from '@/services/roster-service';
import type { GroupSession } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError } from '@/types/result';
import { AddToSessionHeader, AddToSessionCard } from '@/components/roster/add-to-session-sections';

const logger = createLogger('AddToSession');

export default function AddToSessionScreen() {
  const { athleteId, athleteName } = useLocalSearchParams<{
    athleteId: string;
    athleteName: string;
  }>();
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const [adding, setAdding] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<{ sessions: GroupSession[]; athleteInfo: { parentId?: string } }>({
        sessions: [],
        athleteInfo: {},
      });
    }

    try {
      const coachSessions = await groupSessionService.getCoachSessions(currentUser.id);
      const available = coachSessions.filter(
        (session) =>
          session.status === 'PUBLISHED' && session.currentParticipants < session.maxParticipants,
      );

      let athleteInfo: { parentId?: string } = {};
      if (athleteId) {
        const roster = await rosterService.getRoster(currentUser.id);
        const athlete = roster.find((entry) => entry.athleteId === athleteId);
        if (athlete) athleteInfo = { parentId: athlete.parentId };
      }

      return ok<{ sessions: GroupSession[]; athleteInfo: { parentId?: string } }>({
        sessions: available,
        athleteInfo,
      });
    } catch (error) {
      logger.error('Failed to load sessions', error);
      return err(serviceError('UNKNOWN', 'Failed to load available sessions.', error));
    }
  }, [currentUser?.id, athleteId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<{
    sessions: GroupSession[];
    athleteInfo: { parentId?: string };
  }>({
    load: loadData,
    deps: [currentUser?.id, athleteId],
    isEmpty: (value) => value.sessions.length === 0,
    refetchOnFocus: true,
  });

  const sessions = data?.sessions ?? [];
  const athleteInfo = data?.athleteInfo ?? {};

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return date.toLocaleDateString('en-GB', { weekday: 'long' });
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }, []);

  const handleAddToSession = useCallback(
    async (session: GroupSession) => {
      if (!athleteId || !athleteName) return;

      setAdding(session.id);
      try {
        await groupSessionService.register(
          session.id,
          athleteId,
          athleteInfo.parentId || 'parent_unknown',
        );

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Added!', `${athleteName} has been added to ${session.title}`, [
          { text: 'Done', onPress: () => router.back() },
        ]);
        logger.info('athlete_added_to_session', { athleteId, sessionId: session.id });
        onRefresh();
      } catch (submitError) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to add athlete to session');
        logger.error('add_to_session_failed', submitError);
      } finally {
        setAdding(null);
      }
    },
    [athleteId, athleteName, athleteInfo.parentId, onRefresh],
  );

  const header = (
    <AddToSessionHeader colors={palette} athleteName={athleteName} onClose={() => router.back()} />
  );

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        {header}
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        {header}
        <ErrorState
          message={error?.message || 'Failed to load upcoming sessions.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        {header}
        <EmptyState
          icon="calendar-outline"
          title="No upcoming sessions"
          message="Create a published session first, then you can add athletes to it."
          actionLabel="Create Session"
          onPressAction={() => router.push(Routes.GROUP_SESSIONS_CREATE)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      {header}
      <FlatList
        data={sessions}
        renderItem={({ item, index }) => (
          <AddToSessionCard
            colors={palette}
            session={item}
            index={index}
            isAdding={adding === item.id}
            onAdd={handleAddToSession}
            formatDate={formatDate}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    flexGrow: 1,
  },
});
