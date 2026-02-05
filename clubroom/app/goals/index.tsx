/**
 * Goals Dashboard Screen
 *
 * Main screen for viewing and managing goals. Shows goal statistics,
 * active goals, and completed goals. Supports filtering by status and category.
 */

import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import {
  GoalCard,
  ProgressRing,
} from '@/components/goals';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { Goal, GoalCategory } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { progressService } from '@/services/progress-service';
import { scaleFont } from '@/utils/scale';

const logger = createLogger('GoalsDashboardScreen');

type TabFilter = 'active' | 'completed' | 'all';

/**
 * Goals dashboard screen showing goal statistics and lists.
 */
export default function GoalsDashboardScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // State
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('active');
  const [categoryFilter, setCategoryFilter] = useState<GoalCategory | null>(null);

  // Get current user ID (athlete or parent's child)
  const userId = currentUser?.id ?? 'user1';

  // Load goals
  const loadGoals = useCallback(async () => {
    try {
      const userGoals = await progressService.getUserGoals(userId);
      setGoals(userGoals);
    } catch (error) {
      logger.error('Failed to load goals', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadGoals();
  }, [loadGoals]);

  // Filter goals
  const filteredGoals = useMemo(() => {
    let filtered = goals;

    // Filter by tab
    if (activeTab === 'active') {
      filtered = filtered.filter((g) => g.status === 'ACTIVE' || g.status === 'PAUSED');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter((g) => g.status === 'COMPLETED');
    }

    // Filter by category
    if (categoryFilter) {
      filtered = filtered.filter((g) => g.category === categoryFilter);
    }

    return filtered;
  }, [goals, activeTab, categoryFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const active = goals.filter((g) => g.status === 'ACTIVE').length;
    const completed = goals.filter((g) => g.status === 'COMPLETED').length;
    const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
    const avgProgress =
      activeGoals.length > 0
        ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
        : 0;
    return { active, completed, total: goals.length, avgProgress };
  }, [goals]);

  // Navigation
  const handleGoalPress = useCallback((goal: Goal) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/goals/[id]', params: { id: goal.id } });
  }, []);

  const handleCreateGoal = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/goals/create');
  }, []);

  const handleTabChange = useCallback((tab: TabFilter) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  const handleCategoryToggle = useCallback((cat: GoalCategory) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategoryFilter((prev) => (prev === cat ? null : cat));
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
            Goals
          </ThemedText>
        </View>
        <Clickable
          onPress={handleCreateGoal}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Clickable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Stats Overview */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ProgressRing progress={stats.avgProgress} size={64} />
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  Avg Progress
                </ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ThemedText type="title" style={styles.statValue}>
                  {stats.active}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  Active
                </ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ThemedText type="title" style={[styles.statValue, { color: palette.success }]}>
                  {stats.completed}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  Completed
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Tab Filter */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.tabRow}>
          {(['active', 'completed', 'all'] as TabFilter[]).map((tab) => (
            <Clickable
              key={tab}
              onPress={() => handleTabChange(tab)}
              style={[
                styles.tab,
                {
                  backgroundColor: activeTab === tab ? palette.tint : 'transparent',
                  borderColor: activeTab === tab ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? '#FFFFFF' : palette.text },
                ]}
              >
                {tab === 'active' ? 'Active' : tab === 'completed' ? 'Completed' : 'All'}
              </ThemedText>
            </Clickable>
          ))}
        </Animated.View>

        {/* Category Filter */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.categoryRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryChips}>
              {(['SPEED', 'TECHNIQUE', 'FITNESS', 'TACTICAL', 'MENTAL', 'OTHER'] as GoalCategory[]).map(
                (cat) => {
                  const { color, icon, label } = progressService.getCategoryInfo(cat);
                  const isSelected = categoryFilter === cat;

                  return (
                    <Clickable
                      key={cat}
                      onPress={() => handleCategoryToggle(cat)}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: isSelected ? `${color}20` : palette.surface,
                          borderColor: isSelected ? color : palette.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={icon as keyof typeof Ionicons.glyphMap}
                        size={14}
                        color={isSelected ? color : palette.muted}
                      />
                      <ThemedText
                        style={[
                          styles.categoryChipText,
                          { color: isSelected ? color : palette.text },
                        ]}
                      >
                        {label}
                      </ThemedText>
                    </Clickable>
                  );
                }
              )}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Goals List */}
        <View style={styles.goalsSection}>
          {loading ? (
            <View style={styles.loadingPlaceholder}>
              <ThemedText style={{ color: palette.muted }}>Loading goals...</ThemedText>
            </View>
          ) : filteredGoals.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: `${palette.tint}15` }]}>
                <Ionicons name="flag-outline" size={48} color={palette.tint} />
              </View>
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                {activeTab === 'active'
                  ? 'No Active Goals'
                  : activeTab === 'completed'
                    ? 'No Completed Goals'
                    : 'No Goals Yet'}
              </ThemedText>
              <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                {activeTab === 'active'
                  ? 'Create a goal to start tracking your progress!'
                  : activeTab === 'completed'
                    ? 'Complete some goals to see them here.'
                    : 'Set goals to track your training journey.'}
              </ThemedText>
              {activeTab !== 'completed' && (
                <Button onPress={handleCreateGoal} style={styles.emptyButton}>
                  Create Goal
                </Button>
              )}
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(250).springify()}>
              {filteredGoals.map((goal, index) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onPress={() => handleGoalPress(goal)}
                  variant="default"
                />
              ))}
            </Animated.View>
          )}
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  statsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: scaleFont(28),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: scaleFont(13),
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  tabText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  categoryRow: {
    marginBottom: Spacing.md,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  categoryChips: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
    gap: 4,
  },
  categoryChipText: {
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  goalsSection: {
    flex: 1,
  },
  loadingPlaceholder: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: Spacing.sm,
  },
});
