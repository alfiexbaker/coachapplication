/**
 * Matches Screen
 *
 * Displays fixtures and results with filter tabs,
 * season record stats, and grouped match cards.
 */

import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { MatchCard } from '@/components/match/match-card';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useMatchesScreen, MATCH_FILTERS } from '@/hooks/use-matches-screen';

export default function MatchesScreen() {
  const { colors: palette } = useTheme();
  const {
    matches, filter, setFilter, isLoading, isRefreshing, isCoach,
    stats, groupedMatches,
    handleRefresh, handleCreateMatch,
  } = useMatchesScreen();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PageContainer
        header={<PageHeader title="Fixtures" subtitle={`${matches.length} matches`} action={isCoach ? 'Create Match' : undefined} actionIcon="add" onActionPress={isCoach ? handleCreateMatch : undefined} />}
        gap={0}
        horizontalSpacing={0}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}>

          {/* Stats card for past matches */}
          {filter === 'past' && stats.total > 0 && (
            <SurfaceCard style={styles.statsCard}>
              <ThemedText type="defaultSemiBold" style={styles.statsTitle}>Season Record</ThemedText>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <ThemedText type="title" style={[Typography.display, { color: palette.success }]}>{stats.wins}</ThemedText>
                  <ThemedText style={[Typography.caption, { color: palette.muted }]}>Wins</ThemedText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
                <View style={styles.statItem}>
                  <ThemedText type="title" style={[Typography.display, { color: palette.warning }]}>{stats.draws}</ThemedText>
                  <ThemedText style={[Typography.caption, { color: palette.muted }]}>Draws</ThemedText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
                <View style={styles.statItem}>
                  <ThemedText type="title" style={[Typography.display, { color: palette.error }]}>{stats.losses}</ThemedText>
                  <ThemedText style={[Typography.caption, { color: palette.muted }]}>Losses</ThemedText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
                <View style={styles.statItem}>
                  <ThemedText type="title" style={Typography.display}>{stats.total}</ThemedText>
                  <ThemedText style={[Typography.caption, { color: palette.muted }]}>Played</ThemedText>
                </View>
              </View>
            </SurfaceCard>
          )}

          {/* Filter tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
            {MATCH_FILTERS.map((f) => (
              <Clickable key={f.key} style={[styles.filterTab, filter === f.key ? { backgroundColor: withAlpha(palette.tint, 0.09), borderColor: palette.tint } : { borderColor: palette.border }]} onPress={() => setFilter(f.key)}>
                <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={16} color={filter === f.key ? palette.tint : palette.muted} />
                <ThemedText style={[Typography.smallSemiBold, { color: filter === f.key ? palette.tint : palette.muted }]}>{f.label}</ThemedText>
              </Clickable>
            ))}
          </ScrollView>

          {/* Matches list */}
          <View style={styles.matchesList}>
            {isLoading ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={{ color: palette.muted }}>Loading matches...</ThemedText>
              </View>
            ) : matches.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name={filter === 'upcoming' ? 'calendar-outline' : 'trophy-outline'} size={48} color={palette.muted} />
                <ThemedText type="defaultSemiBold" style={{ textAlign: 'center' }}>
                  {filter === 'upcoming' ? 'No upcoming matches' : filter === 'past' ? 'No completed matches yet' : 'No matches found'}
                </ThemedText>
                <ThemedText style={[Typography.bodySmall, { color: palette.muted, textAlign: 'center' }]}>
                  {isCoach ? 'Create a new match to get started' : 'Check back later for scheduled fixtures'}
                </ThemedText>
                {isCoach && filter === 'upcoming' && (
                  <Clickable style={[styles.createButton, { backgroundColor: palette.tint }]} onPress={() => router.push(Routes.MATCHES_CREATE)}>
                    <Ionicons name="add" size={20} color={palette.onPrimary} />
                    <ThemedText style={[Typography.bodySemiBold, { color: palette.onPrimary }]}>Create Match</ThemedText>
                  </Clickable>
                )}
              </View>
            ) : (
              groupedMatches.map(([month, monthMatches]) => (
                <View key={month} style={styles.monthGroup}>
                  <ThemedText type="defaultSemiBold" style={[styles.monthHeader, { color: palette.muted }]}>{month}</ThemedText>
                  {monthMatches.map((match) => <MatchCard key={match.id} match={match} isCoach={isCoach} />)}
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
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl * 2 },
  statsCard: { margin: Spacing.md, gap: Spacing.sm },
  statsTitle: { textAlign: 'center', marginBottom: Spacing.xs },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32 },
  filterScroll: { marginTop: Spacing.sm },
  filterContainer: { paddingHorizontal: Spacing.md, gap: Spacing.xs },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill, borderWidth: 1 },
  matchesList: { padding: Spacing.md },
  monthGroup: { marginBottom: Spacing.md },
  monthHeader: { ...Typography.small, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  emptyContainer: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radii.md, marginTop: Spacing.sm },
});
