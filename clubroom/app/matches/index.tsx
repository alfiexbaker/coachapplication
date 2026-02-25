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
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { MatchCard } from '@/components/match/match-card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useMatchesScreen, MATCH_FILTERS } from '@/hooks/use-matches-screen';

export default function MatchesScreen() {
  const { colors: palette } = useTheme();
  const {
    matches,
    filter,
    setFilter,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    isCoach,
    stats,
    groupedMatches,
    handleCreateMatch,
  } = useMatchesScreen();

  if (status === 'loading') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <PageContainer
          header={
            <PageHeader
              title="Fixtures"
              subtitle="Loading matches"
              action={isCoach ? 'Create Match' : undefined}
              actionIcon="add"
              onActionPress={isCoach ? handleCreateMatch : undefined}
            />
          }
        >
          <LoadingState variant="list" />
        </PageContainer>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <PageContainer
          header={
            <PageHeader
              title="Fixtures"
              subtitle="Unable to load matches"
              action={isCoach ? 'Create Match' : undefined}
              actionIcon="add"
              onActionPress={isCoach ? handleCreateMatch : undefined}
            />
          }
        >
          <ErrorState message={error?.message || 'Failed to load matches.'} onRetry={retry} />
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PageContainer
        header={
          <PageHeader
            title="Fixtures"
            subtitle={`${matches.length} matches`}
            action={isCoach ? 'Create Match' : undefined}
            actionIcon="add"
            onActionPress={isCoach ? handleCreateMatch : undefined}
          />
        }
        gap={0}
        horizontalSpacing={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Stats card for past matches */}
          {filter === 'past' && stats.total > 0 && (
            <SurfaceCard style={styles.statsCard}>
              <ThemedText type="defaultSemiBold" style={styles.statsTitle}>
                Season Record
              </ThemedText>
              <Row align="center" style={styles.statsRow}>
                <View style={styles.statItem}>
                  <ThemedText type="title" style={[Typography.display, { color: palette.success }]}>
                    {stats.wins}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                    Wins
                  </ThemedText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
                <View style={styles.statItem}>
                  <ThemedText type="title" style={[Typography.display, { color: palette.warning }]}>
                    {stats.draws}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                    Draws
                  </ThemedText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
                <View style={styles.statItem}>
                  <ThemedText type="title" style={[Typography.display, { color: palette.error }]}>
                    {stats.losses}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                    Losses
                  </ThemedText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
                <View style={styles.statItem}>
                  <ThemedText type="title" style={Typography.display}>
                    {stats.total}
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                    Played
                  </ThemedText>
                </View>
              </Row>
            </SurfaceCard>
          )}

          {/* Filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            {MATCH_FILTERS.map((f) => (
              <Clickable
                key={f.key}
                style={[
                  styles.filterTab,
                  filter === f.key
                    ? { backgroundColor: withAlpha(palette.tint, 0.09), borderColor: palette.tint }
                    : { borderColor: palette.border },
                ]}
                onPress={() => setFilter(f.key)}
                accessibilityRole="tab"
                accessibilityLabel={`${f.label} matches`}
                accessibilityState={{ selected: filter === f.key }}
              >
                <Row align="center" gap="xs">
                  <Ionicons
                    name={f.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={filter === f.key ? palette.tint : palette.muted}
                  />
                  <ThemedText
                    style={[
                      Typography.smallSemiBold,
                      { color: filter === f.key ? palette.tint : palette.muted },
                    ]}
                  >
                    {f.label}
                  </ThemedText>
                </Row>
              </Clickable>
            ))}
          </ScrollView>

          {/* Matches list */}
          <View style={styles.matchesList}>
            {matches.length === 0 ? (
              <EmptyState
                icon={filter === 'upcoming' ? 'calendar-outline' : 'trophy-outline'}
                title={
                  filter === 'upcoming'
                    ? 'No upcoming matches'
                    : filter === 'past'
                      ? 'No completed matches yet'
                      : 'No matches found'
                }
                message={
                  isCoach
                    ? 'Create a new match to get started'
                    : 'Check back later for scheduled fixtures'
                }
                actionLabel={isCoach && filter === 'upcoming' ? 'Create Match' : undefined}
                onPressAction={
                  isCoach && filter === 'upcoming'
                    ? () => router.push(Routes.MATCHES_CREATE)
                    : undefined
                }
              />
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
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl * 2 },
  statsCard: { margin: Spacing.md, gap: Spacing.sm },
  statsTitle: { textAlign: 'center', marginBottom: Spacing.xs },
  statsRow: {},
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32 },
  filterScroll: { marginTop: Spacing.sm },
  filterContainer: { paddingHorizontal: Spacing.md, gap: Spacing.xs },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  matchesList: { padding: Spacing.md },
  monthGroup: { marginBottom: Spacing.md },
  monthHeader: {
    ...Typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
});
