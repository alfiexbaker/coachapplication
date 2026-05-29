/**
 * Matches Screen
 *
 * Displays fixtures and results with filter tabs,
 * season record stats, and grouped match cards.
 */

import { FlatList, StyleSheet, View, RefreshControl, type ListRenderItemInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

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
import type { ThemeColors } from '@/hooks/useTheme';
import { useMatchesScreen, MATCH_FILTERS, type MatchFilter } from '@/hooks/use-matches-screen';
import type { Match } from '@/constants/types';

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
  const matchFilterItems = getMatchFilterItems(filter, palette, setFilter);
  const matchGroupItems = getMatchGroupItems(groupedMatches, isCoach, palette);
  const listHeader = (
    <>
      {filter === 'past' && stats.total > 0 ? (
        <SurfaceCard style={styles.statsCard}>
          <ThemedText type="defaultSemiBold" style={styles.statsTitle}>
            Season Record
          </ThemedText>
          <Row align="center" style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText type="title" style={[Typography.display, { color: palette.success }]}>
                {stats.wins}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>Wins</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="title" style={[Typography.display, { color: palette.warning }]}>
                {stats.draws}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>Draws</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="title" style={[Typography.display, { color: palette.error }]}>
                {stats.losses}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>Losses</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="title" style={Typography.display}>
                {stats.total}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>Played</ThemedText>
            </View>
          </Row>
        </SurfaceCard>
      ) : null}

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
        data={matchFilterItems}
        keyExtractor={keyMatchFilterItem}
        renderItem={renderMatchFilterItem}
      />
    </>
  );

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
              rightActionLoading={false}
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
              rightActionLoading={false}
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
            rightActionLoading={refreshing}
          />
        }
        gap={0}
        horizontalSpacing={0}
      >
        <FlatList
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          data={matchGroupItems}
          keyExtractor={keyMatchGroupItem}
          renderItem={renderMatchGroupItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.matchesList}>
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
                onPressAction={isCoach && filter === 'upcoming' ? handleCreateMatch : undefined}
              />
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      </PageContainer>
    </>
  );
}

interface MatchFilterItem {
  key: MatchFilter;
  label: string;
  icon: string;
  isActive: boolean;
  palette: ThemeColors;
  onPress: () => void;
}

function getMatchFilterItems(
  selectedFilter: MatchFilter,
  palette: ThemeColors,
  onSelectFilter: (filter: MatchFilter) => void,
): MatchFilterItem[] {
  return MATCH_FILTERS.map((filter) => ({
    key: filter.key,
    label: filter.label,
    icon: filter.icon,
    isActive: selectedFilter === filter.key,
    palette,
    onPress: () => onSelectFilter(filter.key),
  }));
}

function keyMatchFilterItem(item: MatchFilterItem): string {
  return item.key;
}

function renderMatchFilterItem({ item }: ListRenderItemInfo<MatchFilterItem>) {
  return (
    <Clickable
      style={[
        styles.filterTab,
        item.isActive
          ? { backgroundColor: withAlpha(item.palette.tint, 0.09), borderColor: item.palette.tint }
          : { borderColor: item.palette.border },
      ]}
      onPress={item.onPress}
      accessibilityRole="tab"
      accessibilityLabel={`${item.label} matches`}
      accessibilityState={{ selected: item.isActive }}
    >
      <Row align="center" gap="xs">
        <Ionicons
          name={item.icon as keyof typeof Ionicons.glyphMap}
          size={16}
          color={item.isActive ? item.palette.tint : item.palette.muted}
        />
        <ThemedText
          style={[
            Typography.smallSemiBold,
            { color: item.isActive ? item.palette.tint : item.palette.muted },
          ]}
        >
          {item.label}
        </ThemedText>
      </Row>
    </Clickable>
  );
}

interface MatchGroupItem {
  key: string;
  month: string;
  matches: Match[];
  isCoach: boolean;
  palette: ThemeColors;
}

function getMatchGroupItems(
  groupedMatches: [string, Match[]][],
  isCoach: boolean,
  palette: ThemeColors,
): MatchGroupItem[] {
  return groupedMatches.map(([month, monthMatches]) => ({
    key: month,
    month,
    matches: monthMatches,
    isCoach,
    palette,
  }));
}

function keyMatchGroupItem(item: MatchGroupItem): string {
  return item.key;
}

function renderMatchGroupItem({ item }: ListRenderItemInfo<MatchGroupItem>) {
  return (
    <View style={styles.monthGroup}>
      <ThemedText
        type="defaultSemiBold"
        style={[styles.monthHeader, { color: item.palette.muted }]}
      >
        {item.month}
      </ThemedText>
      {item.matches.map((match) => (
        <MatchCard key={match.id} match={match} isCoach={item.isCoach} />
      ))}
    </View>
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
