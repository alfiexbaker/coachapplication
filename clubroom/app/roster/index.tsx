import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { createLogger } from '@/utils/logger';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { AthleteRow } from '@/components/roster/athlete-row';
import { AthleteFilters } from '@/components/roster/athlete-filters';
import {
  RosterHeader,
  RosterSearchBar,
  RosterStatsRow,
} from '@/components/roster/roster-screen-sections';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { rosterService, RosterFilters, RosterStats } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';
import { err, ok, serviceError } from '@/types/result';

const logger = createLogger('RosterScreen');

export default function RosterScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<RosterFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const coachId = currentUser?.id || 'coach_1';

  const loadData = useCallback(async () => {
    try {
      const [rosterData, statsData] = await Promise.all([
        rosterService.getRoster(coachId, { ...filters, search: searchQuery }),
        rosterService.getStats(coachId),
      ]);

      const tags = await rosterService.getAllTags(coachId);
      return ok<{ roster: RosterEntry[]; stats: RosterStats | null; allTags: string[] }>({
        roster: rosterData,
        stats: statsData,
        allTags: tags,
      });
    } catch (error) {
      logger.error('Failed to load roster:', error);
      return err(serviceError('UNKNOWN', 'Failed to load athlete roster.', error));
    }
  }, [coachId, filters, searchQuery]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<{
    roster: RosterEntry[];
    stats: RosterStats | null;
    allTags: string[];
  }>({
    load: loadData,
    deps: [coachId, filters, searchQuery],
    isEmpty: (value) => value.roster.length === 0,
    refetchOnFocus: true,
  });

  const roster = data?.roster ?? [];
  const stats = data?.stats ?? null;
  const allTags = data?.allTags ?? [];

  const handleFilterChange = (newFilters: RosterFilters) => setFilters(newFilters);

  const renderItem = ({ item, index }: { item: RosterEntry; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
      <AthleteRow entry={item} onPress={() => router.push(Routes.rosterAthlete(item.athleteId))} />
    </Animated.View>
  );

  const activeFiltersCount = Object.values(filters).filter(
    (value) => value !== undefined && (Array.isArray(value) ? value.length > 0 : true),
  ).length;

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
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
        <ErrorState message={error?.message || 'Failed to load athlete roster.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <RosterHeader colors={palette} total={stats?.total || 0} onBack={() => router.back()} />
      <RosterStatsRow colors={palette} stats={stats} />
      <RosterSearchBar
        colors={palette}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onToggleFilters={() => setShowFilters((value) => !value)}
      />

      {/* Filters */}
      {showFilters && (
        <Animated.View entering={FadeInDown.springify()}>
          <AthleteFilters
            filters={filters}
            availableTags={allTags}
            onFilterChange={handleFilterChange}
            onClear={() => setFilters({})}
          />
        </Animated.View>
      )}

      {/* Roster List */}
      <FlatList
        data={roster}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No athletes found"
            message={
              searchQuery || activeFiltersCount > 0
                ? 'Try adjusting your search or filters'
                : 'Your roster is empty. Athletes will appear here once they book sessions.'
            }
            actionLabel={activeFiltersCount > 0 ? 'Clear Filters' : undefined}
            onPressAction={activeFiltersCount > 0 ? () => setFilters({}) : undefined}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  separator: {
    height: Spacing.sm,
  },
});
