import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { Column } from '@/components/primitives/column';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  useSessionHistory,
  type SessionHistoryFilter,
} from '@/hooks/use-session-history';
import { Routes } from '@/navigation/routes';
import { SessionTimelineCard } from '@/components/progress/session-timeline-card';

const FILTER_OPTIONS: { id: SessionHistoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'with_media', label: 'With Media' },
  { id: 'badges', label: 'Badges' },
];

function normalizeParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default function SessionHistoryScreen() {
  const { colors } = useTheme();
  const { athleteId } = useLocalSearchParams<{ athleteId?: string | string[] }>();
  const athleteIdParam = useMemo(() => normalizeParam(athleteId), [athleteId]);

  const {
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    filteredSessions,
    filter,
    setFilter,
    coachFilter,
    setCoachFilter,
    coachOptions,
    resolvedAthleteId,
  } = useSessionHistory(athleteIdParam);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Session History" showBack centerTitle onBackPress={() => router.back()} />

      {loading ? <LoadingState variant="detail" /> : null}

      {status === 'error' ? (
        <ErrorState message={error?.message ?? 'Unable to load session history.'} onRetry={retry} />
      ) : null}

      {status === 'empty' ? (
        <EmptyState
          icon="albums-outline"
          title="No session history yet"
          message="Completed sessions will appear here with feedback and media."
        />
      ) : null}

      {status === 'success' ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <Column gap="sm">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Row gap="xs">
                {FILTER_OPTIONS.map((option) => {
                  const selected = filter === option.id;
                  return (
                    <Clickable
                      key={option.id}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? colors.tint : colors.border,
                          backgroundColor: selected
                            ? withAlpha(colors.tint, 0.1)
                            : colors.background,
                        },
                      ]}
                      onPress={() => setFilter(option.id)}
                      accessibilityLabel={`Filter ${option.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          {
                            color: selected ? colors.tint : colors.muted,
                          },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </Clickable>
                  );
                })}
              </Row>
            </ScrollView>

            {coachOptions.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Row gap="xs">
                  <Clickable
                    style={[
                      styles.chip,
                      {
                        borderColor: coachFilter === 'all' ? colors.tint : colors.border,
                        backgroundColor:
                          coachFilter === 'all' ? withAlpha(colors.tint, 0.1) : colors.background,
                      },
                    ]}
                    onPress={() => setCoachFilter('all')}
                    accessibilityLabel="Filter all coaches"
                    accessibilityRole="button"
                    accessibilityState={{ selected: coachFilter === 'all' }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        {
                          color: coachFilter === 'all' ? colors.tint : colors.muted,
                        },
                      ]}
                    >
                      All Coaches
                    </ThemedText>
                  </Clickable>

                  {coachOptions.map((option) => {
                    const selected = coachFilter === option.coachName;
                    return (
                      <Clickable
                        key={option.coachName}
                        style={[
                          styles.chip,
                          {
                            borderColor: selected ? colors.tint : colors.border,
                            backgroundColor: selected
                              ? withAlpha(colors.tint, 0.1)
                              : colors.background,
                          },
                        ]}
                        onPress={() => setCoachFilter(option.coachName)}
                        accessibilityLabel={`Filter coach ${option.coachName}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <ThemedText
                          style={[
                            styles.chipText,
                            {
                              color: selected ? colors.tint : colors.muted,
                            },
                          ]}
                        >
                          {option.coachName} ({option.count})
                        </ThemedText>
                      </Clickable>
                    );
                  })}
                </Row>
              </ScrollView>
            ) : null}

            {filteredSessions.length === 0 ? (
              <ThemedText style={[styles.emptyFilteredText, { color: colors.muted }]}>
                No sessions match the selected filters.
              </ThemedText>
            ) : (
              <Column gap="sm">
                {filteredSessions.map((session) => (
                  <SessionTimelineCard
                    key={session.sessionId}
                    session={session}
                    onOpenMediaGallery={
                      resolvedAthleteId
                        ? () =>
                            router.push(
                              Routes.developmentMediaGallery({
                                athleteId: resolvedAthleteId,
                              }),
                            )
                        : undefined
                    }
                  />
                ))}
              </Column>
            )}
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
  chip: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  chipText: {
    ...Typography.caption,
  },
  emptyFilteredText: {
    ...Typography.bodySmall,
  },
});
