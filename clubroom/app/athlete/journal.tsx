/**
 * Athlete Session Journal Screen
 *
 * Private journal for athletes to record mood, energy, and personal
 * notes after sessions. Shows coach notes (read-only) and a timeline
 * of past entries.
 */

import { useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { SessionJournal } from '@/components/development/session-journal';
import type { JournalEntry } from '@/components/development/session-journal';
import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { err, ok, serviceError } from '@/types/result';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { SESSION_JOURNAL_SEEDS } from '@/constants/session-journal-seeds';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AthleteJournalScreen');

export default function AthleteJournalScreen() {
  const { currentUser } = useAuth();

  const userId = currentUser?.id ?? 'user2';

  const loadData = useCallback(async () => {
    try {
      const stored = await apiClient.get<JournalEntry[]>(STORAGE_KEYS.SESSION_JOURNAL, []);
      const entries =
        stored.length > 0
          ? stored.filter((e) => e.athleteId === userId)
          : SESSION_JOURNAL_SEEDS.filter((e) => e.athleteId === userId);
      return ok<{ entries: JournalEntry[] }>({ entries });
    } catch (loadError) {
      logger.error('Failed to load journal', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load journal entries.', loadError));
    }
  }, [userId]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors: palette,
  } = useScreen<{ entries: JournalEntry[] }>({
    load: loadData,
    deps: [userId],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  const entries = data?.entries ?? [];

  const handleSave = useCallback(
    async (entry: { personalNotes: string; mood: number; energyLevel: number }) => {
      try {
        const newEntry: JournalEntry = {
          id: `journal_${Date.now()}`,
          sessionId: `session_${Date.now()}`,
          athleteId: userId,
          personalNotes: entry.personalNotes,
          mood: entry.mood,
          energyLevel: entry.energyLevel,
          createdAt: new Date().toISOString(),
        };

        const stored = await apiClient.get<JournalEntry[]>(STORAGE_KEYS.SESSION_JOURNAL, []);
        await apiClient.set(STORAGE_KEYS.SESSION_JOURNAL, [newEntry, ...stored]);

        Platform.OS !== 'web' &&
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onRefresh();
        logger.info('Journal entry saved', { entryId: newEntry.id });
      } catch (saveError) {
        logger.error('Failed to save journal entry', saveError);
      }
    },
    [userId, onRefresh],
  );

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState message={error?.message ?? 'Failed to load journal entries'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <Row align="center" gap="md" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title">Session Journal</ThemedText>
      </Row>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SessionJournal
          coachNotes={entries[0]?.coachNotes}
          pastEntries={entries}
          onSave={handleSave}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
});
