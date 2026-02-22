import { useCallback, useMemo, type ComponentProps } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useTheme } from '@/hooks/useTheme';
import { useScreen } from '@/hooks/use-screen';
import { apiClient } from '@/services/api-client';
import { err, ok, serviceError } from '@/types/result';
import { createLogger } from '@/utils/logger';

interface JournalEntryRecord {
  id: string;
  sessionId: string;
  athleteId: string;
  personalNotes: string;
  mood: number;
  energyLevel: number;
  createdAt: string;
  coachNotes?: string;
}

const logger = createLogger('AthleteJournalScreen');

function normalizeParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function resolveMoodIcon(mood: number): ComponentProps<typeof Ionicons>['name'] {
  if (mood <= 1) return 'sad-outline';
  if (mood === 2) return 'happy-outline';
  if (mood === 3 || mood === 4) return 'happy';
  return 'flame-outline';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AthleteJournalScreen() {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const { children, activeChildId } = useChildContext();
  const { athleteId: athleteIdParam } = useLocalSearchParams<{
    athleteId?: string | string[];
  }>();

  const targetAthleteId = useMemo(() => {
    const paramAthleteId = normalizeParam(athleteIdParam);
    if (paramAthleteId) {
      return paramAthleteId;
    }
    if (currentUser?.role === 'PARENT') {
      return activeChildId ?? children[0]?.id ?? null;
    }
    if (currentUser?.role === 'COACH') {
      return null;
    }
    if (currentUser?.id) {
      return currentUser.id;
    }
    return null;
  }, [activeChildId, athleteIdParam, children, currentUser?.id, currentUser?.role]);

  const loadEntries = useCallback(async () => {
    if (!targetAthleteId) {
      return ok<JournalEntryRecord[]>([]);
    }

    try {
      const entries = await apiClient.get<JournalEntryRecord[]>(STORAGE_KEYS.SESSION_JOURNAL, []);
      const athleteEntries = entries
        .filter((entry) => entry.athleteId === targetAthleteId)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

      return ok(athleteEntries);
    } catch (error) {
      logger.error('Failed to load journal entries', { targetAthleteId, error });
      return err(serviceError('UNKNOWN', 'Failed to load journal entries.', error));
    }
  }, [targetAthleteId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<JournalEntryRecord[]>({
    load: loadEntries,
    deps: [targetAthleteId],
    isEmpty: (entries) => entries.length === 0,
    refetchOnFocus: true,
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Journal" showBack centerTitle onBackPress={() => router.back()} />

      {status === 'loading' ? <LoadingState variant="detail" /> : null}

      {status === 'error' ? (
        <ErrorState message={error?.message ?? 'Unable to load journal entries.'} onRetry={retry} />
      ) : null}

      {status === 'empty' ? (
        <EmptyState
          icon="journal-outline"
          title="No journal entries yet"
          message="Save your first post-session note from My Progress."
        />
      ) : null}

      {status === 'success' && data ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <Column gap="sm">
            {data.map((entry) => (
              <SurfaceCard key={entry.id}>
                <Column gap="xs">
                  <Row align="center" justify="between">
                    <Row align="center" gap="xxs">
                      <Ionicons
                        name={resolveMoodIcon(entry.mood)}
                        size={16}
                        color={colors.tint}
                      />
                      <ThemedText style={styles.dateText}>{formatDate(entry.createdAt)}</ThemedText>
                    </Row>
                    <ThemedText style={[styles.energyText, { color: colors.muted }]}>
                      Energy {entry.energyLevel}/5
                    </ThemedText>
                  </Row>

                  <ThemedText style={styles.noteText}>
                    {entry.personalNotes || 'No personal notes captured.'}
                  </ThemedText>

                  {entry.coachNotes ? (
                    <Row
                      style={[
                        styles.coachNote,
                        {
                          borderColor: withAlpha(colors.tint, 0.25),
                          backgroundColor: withAlpha(colors.tint, 0.08),
                        },
                      ]}
                    >
                      <ThemedText style={[styles.coachNoteText, { color: colors.muted }]}>
                        Coach note: {entry.coachNotes}
                      </ThemedText>
                    </Row>
                  ) : null}
                </Column>
              </SurfaceCard>
            ))}
          </Column>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing['3xl'],
  },
  dateText: {
    ...Typography.bodySmallSemiBold,
  },
  energyText: {
    ...Typography.caption,
  },
  noteText: {
    ...Typography.bodySmall,
  },
  coachNote: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  coachNoteText: {
    ...Typography.caption,
  },
});
