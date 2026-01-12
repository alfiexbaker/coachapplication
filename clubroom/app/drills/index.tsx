/**
 * Drills Dashboard Screen (Athlete View)
 *
 * Main screen for athletes to view their assigned drills.
 * Shows drill statistics, pending and completed assignments.
 * Supports filtering and pull-to-refresh.
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
import { SurfaceCard } from '@/components/primitives/surface-card';
import { DrillList } from '@/components/drills';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { AssignedDrill, DrillAssignmentStats } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';

type TabFilter = 'pending' | 'completed' | 'all';

/**
 * Drills dashboard screen for athletes showing assigned drills.
 */
export default function DrillsDashboardScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // State
  const [assignments, setAssignments] = useState<AssignedDrill[]>([]);
  const [stats, setStats] = useState<DrillAssignmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('pending');

  // Get current user ID (athlete)
  const userId = currentUser?.id ?? 'user1';

  /**
   * Load assignments and stats
   */
  const loadData = useCallback(async () => {
    try {
      const [assignmentsData, statsData] = await Promise.all([
        drillService.getAthleteAssignments(userId, true),
        drillService.getAssignmentStats(userId),
      ]);
      setAssignments(assignmentsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load drills:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

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
   * Filter assignments by tab
   */
  const filteredAssignments = useMemo(() => {
    if (activeTab === 'pending') {
      return assignments.filter((a) => !a.isCompleted);
    } else if (activeTab === 'completed') {
      return assignments.filter((a) => a.isCompleted);
    }
    return assignments;
  }, [assignments, activeTab]);

  /**
   * Handle assignment press - navigate to detail
   */
  const handleAssignmentPress = useCallback((assignment: AssignedDrill) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/drills/[id]', params: { id: assignment.id } });
  }, []);

  /**
   * Handle drill completion toggle
   */
  const handleComplete = useCallback(async (assignment: AssignedDrill) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (assignment.isCompleted) {
        await drillService.uncompleteDrill(assignment.id);
      } else {
        await drillService.completeDrill(assignment.id);
      }
      // Reload data to update UI
      loadData();
    } catch (error) {
      console.error('Failed to toggle completion:', error);
    }
  }, [loadData]);

  /**
   * Handle tab change
   */
  const handleTabChange = useCallback((tab: TabFilter) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
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
            My Drills
          </ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Stats Overview */}
        {stats && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <SurfaceCard style={styles.statsCard}>
              <View style={styles.statsRow}>
                {/* Pending */}
                <View style={styles.statItem}>
                  <ThemedText type="title" style={[styles.statValue, { color: palette.warning }]}>
                    {stats.pending}
                  </ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                    Pending
                  </ThemedText>
                </View>

                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />

                {/* Overdue */}
                <View style={styles.statItem}>
                  <ThemedText type="title" style={[styles.statValue, { color: stats.overdue > 0 ? palette.error : palette.muted }]}>
                    {stats.overdue}
                  </ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                    Overdue
                  </ThemedText>
                </View>

                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />

                {/* Completed */}
                <View style={styles.statItem}>
                  <ThemedText type="title" style={[styles.statValue, { color: palette.success }]}>
                    {stats.completed}
                  </ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                    Completed
                  </ThemedText>
                </View>

                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />

                {/* Streak */}
                <View style={styles.statItem}>
                  <View style={styles.streakContainer}>
                    <Ionicons name="flame" size={16} color="#F59E0B" />
                    <ThemedText type="title" style={styles.statValue}>
                      {stats.currentStreak}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                    Day Streak
                  </ThemedText>
                </View>
              </View>

              {/* Completion rate progress bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
                    Completion Rate
                  </ThemedText>
                  <ThemedText style={[styles.progressValue, { color: palette.text }]}>
                    {stats.completionRate}%
                  </ThemedText>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: palette.surfaceSecondary }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { backgroundColor: palette.success, width: `${stats.completionRate}%` },
                    ]}
                  />
                </View>
              </View>
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Tab Filter */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.tabRow}>
          {(['pending', 'completed', 'all'] as TabFilter[]).map((tab) => {
            const count = tab === 'pending'
              ? stats?.pending ?? 0
              : tab === 'completed'
                ? stats?.completed ?? 0
                : stats?.totalAssigned ?? 0;

            return (
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
                  {tab === 'pending' ? 'To Do' : tab === 'completed' ? 'Done' : 'All'}
                </ThemedText>
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.2)' : palette.surfaceSecondary,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.tabBadgeText,
                      { color: activeTab === tab ? '#FFFFFF' : palette.muted },
                    ]}
                  >
                    {count}
                  </ThemedText>
                </View>
              </Clickable>
            );
          })}
        </Animated.View>

        {/* Assignments List */}
        <View style={styles.listSection}>
          <DrillList
            assignments={filteredAssignments}
            onAssignmentPress={handleAssignmentPress}
            onAssignmentComplete={handleComplete}
            loading={loading}
            emptyMessage={
              activeTab === 'pending'
                ? 'No pending drills'
                : activeTab === 'completed'
                  ? 'No completed drills yet'
                  : 'No drills assigned'
            }
            emptyDescription={
              activeTab === 'pending'
                ? 'Great job! You\'ve completed all your drills.'
                : activeTab === 'completed'
                  ? 'Complete some drills to see them here.'
                  : 'Ask your coach to assign some drills.'
            }
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
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: scaleFont(24),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: scaleFont(12),
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: scaleFont(13),
  },
  progressValue: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  tabText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  listSection: {
    flex: 1,
  },
});
