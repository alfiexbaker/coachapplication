import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { AthleteRow } from '@/components/roster/athlete-row';
import { AthleteFilters } from '@/components/roster/athlete-filters';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { rosterService, RosterFilters, RosterStats } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';

const logger = createLogger('RosterScreen');

export default function RosterScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [stats, setStats] = useState<RosterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<RosterFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);

  const coachId = currentUser?.id || 'coach_1';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rosterData, statsData] = await Promise.all([
        rosterService.getRoster(coachId, { ...filters, search: searchQuery }),
        rosterService.getStats(coachId),
      ]);
      setRoster(rosterData);
      setStats(statsData);
    } catch (error) {
      logger.error('Failed to load roster:', error);
    } finally {
      setLoading(false);
    }
  }, [coachId, filters, searchQuery]);

  const loadTags = useCallback(async () => {
    try {
      const tags = await rosterService.getAllTags(coachId);
      setAllTags(tags);
    } catch (error) {
      logger.error('Failed to load tags:', error);
    }
  }, [coachId]);

  useEffect(() => {
    loadData();
    loadTags();
  }, [loadData, loadTags]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleFilterChange = (newFilters: RosterFilters) => {
    setFilters(newFilters);
  };

  const renderItem = ({ item, index }: { item: RosterEntry; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
      <AthleteRow
        entry={item}
        onPress={() =>
          router.push(Routes.rosterAthlete(item.athleteId))
        }
      />
    </Animated.View>
  );

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Athlete Roster</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {stats?.total || 0} athletes
          </ThemedText>
        </View>
      </View>

      {/* Stats Row */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <ThemedText type="heading" style={{ color: palette.success }}>
              {stats.active}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Active</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <ThemedText type="heading" style={{ color: palette.warning }}>
              {stats.paused}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Paused</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <ThemedText type="heading" style={{ color: palette.tint }}>
              {stats.graduated}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Graduated</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <ThemedText type="heading" style={{ color: palette.tint }}>
              {rosterService.formatRevenue(stats.totalRevenue)}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Revenue</ThemedText>
          </View>
        </View>
      )}

      {/* Search & Filter Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: palette.surface }]}>
          <Ionicons name="search" size={18} color={palette.muted} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Search athletes..."
            placeholderTextColor={palette.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Clickable accessibilityLabel="Clear search" onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={palette.muted} />
            </Clickable>
          )}
        </View>
        <Clickable
          onPress={() => setShowFilters(!showFilters)}
          style={[
            styles.filterButton,
            {
              backgroundColor: activeFiltersCount > 0 ? palette.tint : palette.surface },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFiltersCount > 0 ? palette.onPrimary : palette.text}
          />
          {activeFiltersCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: palette.surface }]}>
              <ThemedText style={[styles.filterBadgeText, { color: palette.text }]}>{activeFiltersCount}</ThemedText>
            </View>
          )}
        </Clickable>
      </View>

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
          loading ? null : (
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
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md },
  headerTitle: {
    flex: 1 },
  subtitle: {
    ...Typography.small,
    marginTop: Spacing.micro },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md },
  statLabel: {
    ...Typography.micro,
    marginTop: Spacing.micro },
  searchSection: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: Radii.md,
    gap: Spacing.xs },
  searchInput: {
    flex: 1,
    ...Typography.body },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center' },
  filterBadgeText: {
    ...Typography.micro },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl },
  separator: {
    height: Spacing.sm } });