import { useEffect, useState, useMemo, useCallback } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { createLogger } from '@/utils/logger';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { MatchCard } from '@/components/match/match-card';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import type { Match } from '@/constants/types';
import { matchService } from '@/services/match-service';

const logger = createLogger('MatchesScreen');

type MatchFilter = 'upcoming' | 'past' | 'all';

const FILTERS: { key: MatchFilter; label: string; icon: string }[] = [
  { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
  { key: 'past', label: 'Results', icon: 'trophy-outline' },
  { key: 'all', label: 'All', icon: 'list-outline' },
];

export default function MatchesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<MatchFilter>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const loadMatches = useCallback(async () => {
    try {
      // For demo, using club_1; in real app would get from user's club
      const clubId = 'club_1';
      let data: Match[];

      if (filter === 'upcoming') {
        data = await matchService.getUpcomingMatches(clubId);
      } else if (filter === 'past') {
        data = await matchService.getPastMatches(clubId);
      } else {
        data = await matchService.getClubMatches(clubId);
      }

      setMatches(data);
    } catch (error) {
      logger.error('Failed to load matches:', error);
    }
  }, [filter]);

  useEffect(() => {
    setIsLoading(true);
    loadMatches().finally(() => setIsLoading(false));
  }, [loadMatches]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMatches();
    setIsRefreshing(false);
  };

  const stats = useMemo(() => {
    const completed = matches.filter(m => m.status === 'COMPLETED');
    let wins = 0, draws = 0, losses = 0;

    for (const match of completed) {
      if (!match.result) continue;
      const { home, away } = match.result;
      if (match.isHome) {
        if (home > away) wins++;
        else if (home < away) losses++;
        else draws++;
      } else {
        if (away > home) wins++;
        else if (away < home) losses++;
        else draws++;
      }
    }

    return { total: completed.length, wins, draws, losses };
  }, [matches]);

  const groupedMatches = useMemo(() => {
    const groups: { [key: string]: Match[] } = {};

    for (const match of matches) {
      const monthYear = new Date(match.date).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      });

      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(match);
    }

    return Object.entries(groups);
  }, [matches]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <PageContainer
        header={
          <PageHeader
            title="Fixtures"
            subtitle={`${matches.length} matches`}
            action={isCoach ? 'Create Match' : undefined}
            actionIcon="add"
            onActionPress={isCoach ? () => router.push('/matches/create') : undefined}
          />
        }
        gap={0}
        horizontalSpacing={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Stats card for past matches */}
          {filter === 'past' && stats.total > 0 && (
            <SurfaceCard style={styles.statsCard}>
              <ThemedText type="defaultSemiBold" style={styles.statsTitle}>
                Season Record
              </ThemedText>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <ThemedText type="title" style={[styles.statValue, { color: palette.success }]}>
                    {stats.wins}
                  </ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Wins</ThemedText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
                <View style={styles.statItem}>
                  <ThemedText type="title" style={[styles.statValue, { color: palette.warning }]}>
                    {stats.draws}
                  </ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Draws</ThemedText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
                <View style={styles.statItem}>
                  <ThemedText type="title" style={[styles.statValue, { color: palette.error }]}>
                    {stats.losses}
                  </ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Losses</ThemedText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
                <View style={styles.statItem}>
                  <ThemedText type="title" style={styles.statValue}>{stats.total}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Played</ThemedText>
                </View>
              </View>
            </SurfaceCard>
          )}

          {/* Filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterTab,
                  filter === f.key ? { backgroundColor: `${palette.tint}15`, borderColor: palette.tint } : undefined,
                  { borderColor: palette.border },
                ]}
                onPress={() => setFilter(f.key)}
              >
                <Ionicons
                  name={f.icon as any}
                  size={16}
                  color={filter === f.key ? palette.tint : palette.muted}
                />
                <ThemedText
                  style={[
                    styles.filterLabel,
                    { color: filter === f.key ? palette.tint : palette.muted },
                  ]}
                >
                  {f.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Matches list */}
          <View style={styles.matchesList}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ThemedText style={{ color: palette.muted }}>Loading matches...</ThemedText>
              </View>
            ) : matches.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name={filter === 'upcoming' ? 'calendar-outline' : 'trophy-outline'}
                  size={48}
                  color={palette.muted}
                />
                <ThemedText type="defaultSemiBold" style={{ textAlign: 'center' }}>
                  {filter === 'upcoming'
                    ? 'No upcoming matches'
                    : filter === 'past'
                    ? 'No completed matches yet'
                    : 'No matches found'}
                </ThemedText>
                <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
                  {isCoach
                    ? 'Create a new match to get started'
                    : 'Check back later for scheduled fixtures'}
                </ThemedText>
                {isCoach && filter === 'upcoming' && (
                  <TouchableOpacity
                    style={[styles.createButton, { backgroundColor: palette.tint }]}
                    onPress={() => router.push('/matches/create')}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                    <ThemedText style={styles.createButtonText}>Create Match</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              groupedMatches.map(([month, monthMatches]) => (
                <View key={month} style={styles.monthGroup}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={[styles.monthHeader, { color: palette.muted }]}
                  >
                    {month}
                  </ThemedText>
                  {monthMatches.map((match) => (
                    <MatchCard key={match.id} match={match} isCoach={isCoach} />
                  ))}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </PageContainer>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl * 2,
  },
  statsCard: {
    margin: Spacing.md,
    gap: Spacing.sm,
  },
  statsTitle: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  filterScroll: {
    marginTop: Spacing.sm,
  },
  filterContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  matchesList: {
    padding: Spacing.md,
  },
  monthGroup: {
    marginBottom: Spacing.md,
  },
  monthHeader: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptySubtext: {
    textAlign: 'center',
    fontSize: 14,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
