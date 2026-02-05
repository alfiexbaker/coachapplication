/**
 * Drill Library Screen (Coach View)
 *
 * Screen for coaches to view and manage their drill library.
 * Supports creating new drills, filtering by category, and assigning drills.
 */

import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { DrillList } from '@/components/drills';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { Drill, DrillCategory } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';
import { createLogger } from '@/utils/logger';

const CATEGORIES: (DrillCategory | null)[] = [null, 'WARMUP', 'TECHNIQUE', 'FITNESS', 'COOLDOWN', 'TACTICAL'];

const logger = createLogger('DrillLibraryScreen');

/**
 * Drill library screen for coaches to manage their drills.
 */
export default function DrillLibraryScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // State
  const [drills, setDrills] = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<DrillCategory | null>(null);
  const [searchQuery] = useState('');

  // Get current coach ID
  const coachId = currentUser?.id ?? 'coach1';

  /**
   * Load drill library
   */
  const loadData = useCallback(async () => {
    try {
      const data = await drillService.getDrillLibrary(coachId);
      setDrills(data);
    } catch (error) {
      logger.error('Failed to load drill library:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coachId]);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  /**
   * Pull to refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  /**
   * Filter drills by category and search
   */
  const filteredDrills = useMemo(() => {
    let filtered = drills;

    // Filter by category
    if (categoryFilter) {
      filtered = filtered.filter((d) => d.category === categoryFilter);
    }

    // Filter by search (title, description, tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query) ||
          d.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [drills, categoryFilter, searchQuery]);

  /**
   * Get category counts
   */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: drills.length };
    for (const drill of drills) {
      counts[drill.category] = (counts[drill.category] ?? 0) + 1;
    }
    return counts;
  }, [drills]);

  /**
   * Handle drill press - navigate to assign screen
   */
  const handleDrillPress = useCallback((drill: Drill) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/drills/assign', params: { drillId: drill.id } });
  }, []);

  /**
   * Handle create drill
   */
  const handleCreateDrill = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/drills/create');
  }, []);

  /**
   * Handle category filter change
   */
  const handleCategoryChange = useCallback((category: DrillCategory | null) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategoryFilter(category);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Drill Library
          </ThemedText>
        </View>
        <Clickable
          onPress={handleCreateDrill}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Clickable>
      </View>

      {/* Search */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.searchContainer}>
        <View style={[styles.searchInput, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="search" size={20} color={palette.muted} />
          <ThemedText
            style={[styles.searchPlaceholder, { color: palette.muted }]}
            numberOfLines={1}
          >
            {searchQuery || 'Search drills...'}
          </ThemedText>
        </View>
      </Animated.View>

      {/* Category Filter */}
      <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const isSelected = categoryFilter === cat;
              const count = cat === null ? categoryCounts.all : (categoryCounts[cat] ?? 0);

              if (cat === null) {
                return (
                  <Clickable
                    key="all"
                    onPress={() => handleCategoryChange(null)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? palette.tint : palette.surface,
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? '#FFFFFF' : palette.text },
                      ]}
                    >
                      All
                    </ThemedText>
                    <View
                      style={[
                        styles.categoryCount,
                        { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : palette.surfaceSecondary },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.categoryCountText,
                          { color: isSelected ? '#FFFFFF' : palette.muted },
                        ]}
                      >
                        {count}
                      </ThemedText>
                    </View>
                  </Clickable>
                );
              }

              const info = drillService.getCategoryInfo(cat);

              return (
                <Clickable
                  key={cat}
                  onPress={() => handleCategoryChange(cat)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected ? `${info.color}20` : palette.surface,
                      borderColor: isSelected ? info.color : palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={info.icon as keyof typeof Ionicons.glyphMap}
                    size={14}
                    color={isSelected ? info.color : palette.muted}
                  />
                  <ThemedText
                    style={[
                      styles.categoryChipText,
                      { color: isSelected ? info.color : palette.text },
                    ]}
                  >
                    {info.label}
                  </ThemedText>
                  {count > 0 && (
                    <View
                      style={[
                        styles.categoryCount,
                        { backgroundColor: isSelected ? `${info.color}30` : palette.surfaceSecondary },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.categoryCountText,
                          { color: isSelected ? info.color : palette.muted },
                        ]}
                      >
                        {count}
                      </ThemedText>
                    </View>
                  )}
                </Clickable>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Stats Summary */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <View style={[styles.statsRow, { backgroundColor: palette.surface }]}>
          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold" style={styles.statValue}>
              {drills.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Total Drills
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold" style={styles.statValue}>
              {drills.filter((d) => d.videoUrl).length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              With Video
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold" style={styles.statValue}>
              {drills.reduce((sum, d) => sum + (d.assignmentCount ?? 0), 0)}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Assignments
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      {/* Drill List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.listContainer}>
          <DrillList
            drills={filteredDrills}
            onDrillPress={handleDrillPress}
            loading={loading}
            showAssignmentCount
            emptyMessage={
              categoryFilter
                ? `No ${drillService.getCategoryInfo(categoryFilter).label.toLowerCase()} drills`
                : 'No drills yet'
            }
            emptyDescription={
              categoryFilter
                ? 'Create a drill in this category to get started.'
                : 'Build your drill library to assign homework to athletes.'
            }
            onEmptyAction={handleCreateDrill}
            emptyActionLabel="Create First Drill"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerTitle: {
    fontSize: scaleFont(24),
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: scaleFont(15),
  },
  categoryContainer: {
    marginBottom: Spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: scaleFont(13),
    fontWeight: '500',
  },
  categoryCount: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  categoryCountText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: scaleFont(20),
  },
  statLabel: {
    fontSize: scaleFont(11),
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
  },
});
