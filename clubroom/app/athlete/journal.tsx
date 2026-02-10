/**
 * Athlete Session Journal Screen
 *
 * Private journal for athletes to record mood, energy, and personal
 * notes after sessions. Shows coach notes (read-only) and a timeline
 * of past entries.
 */

import { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { SessionJournal } from '@/components/development/session-journal';
import type { JournalEntry } from '@/components/development/session-journal';
import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { ok } from '@/types/result';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { MOCK_JOURNAL_ENTRIES } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AthleteJournalScreen');

export default function AthleteJournalScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { currentUser } = useAuth();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const userId = currentUser?.id ?? 'user2';

  const loadData = useCallback(async () => {
    try {
      setError(false);
      const stored = await apiClient.get<JournalEntry[]>(STORAGE_KEYS.SESSION_JOURNAL, []);
      // Use mock data as fallback
      const data = stored.length > 0
        ? stored.filter((e) => e.athleteId === userId)
        : MOCK_JOURNAL_ENTRIES.filter((e) => e.athleteId === userId);
      setEntries(data);
    } catch (err) {
      logger.error('Failed to load journal', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

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

        Platform.OS !== 'web' && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEntries((prev) => [newEntry, ...prev]);
        logger.info('Journal entry saved', { entryId: newEntry.id });
      } catch (err) {
        logger.error('Failed to save journal entry', err);
      }
    },
    [userId]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <ErrorState message="Failed to load journal entries" onRetry={loadData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
