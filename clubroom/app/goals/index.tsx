/**
 * Goals Dashboard Screen
 *
 * Main screen for viewing and managing goals. Shows statistics,
 * active/completed goals, and category filters.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { GoalCard, ProgressRing } from '@/components/goals';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useGoalsDashboard, GOAL_CATEGORIES, type TabFilter } from '@/hooks/use-goals-dashboard';
import { progressService } from '@/services/progress-service';
import { scaleFont } from '@/utils/scale';

export default function GoalsDashboardScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    goals,
    loading,
    status,
    error,
    refreshing,
    activeTab,
    categoryFilter,
    stats,
    handleRefresh,
    retry,
    handleTabChange,
    handleCategoryToggle,
  } = useGoalsDashboard();

  const handleCreateGoal = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(Routes.GOALS_CREATE);
  };

  const handleGoalPress = (goalId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.goal(goalId));
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <Row align="center" justify="space-between" style={styles.header}>
        <Row gap="md" align="center">
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <ThemedText
            type="title"
            style={{ ...Typography.display, fontSize: scaleFont(Typography.display.fontSize) }}
          >
            Goals
          </ThemedText>
        </Row>
        <Clickable
          accessibilityLabel="Create goal"
          onPress={handleCreateGoal}
          style={[styles.addButton, { backgroundColor: colors.tint }]}
        >
          <Ionicons name="add" size={24} color={colors.onPrimary} />
        </Clickable>
      </Row>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard style={styles.statsCard}>
            <Row align="center" justify="space-around">
              <View style={styles.statItem}>
                <ProgressRing progress={stats.avgProgress} size={64} />
                <ThemedText style={[styles.statLabel, { color: colors.muted }]}>
                  Avg Progress
                </ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <ThemedText type="title" style={styles.statValue}>
                  {stats.active}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.muted }]}>Active</ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <ThemedText type="title" style={[styles.statValue, { color: colors.success }]}>
                  {stats.completed}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.muted }]}>
                  Completed
                </ThemedText>
              </View>
            </Row>
          </SurfaceCard>
        </Animated.View>

        {/* Tabs */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Row gap="xs" style={styles.tabRow}>
            {(['active', 'completed', 'all'] as TabFilter[]).map((tab) => (
              <Clickable
                key={tab}
                onPress={() => handleTabChange(tab)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: activeTab === tab ? colors.tint : 'transparent',
                    borderColor: activeTab === tab ? colors.tint : colors.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.tabText,
                    { color: activeTab === tab ? colors.onPrimary : colors.text },
                  ]}
                >
                  {tab === 'active' ? 'Active' : tab === 'completed' ? 'Completed' : 'All'}
                </ThemedText>
              </Clickable>
            ))}
          </Row>
        </Animated.View>

        {/* Category chips */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.categoryRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Row gap="xs">
              {GOAL_CATEGORIES.map((cat) => {
                const { color, icon, label } = progressService.getCategoryInfo(cat);
                const isSelected = categoryFilter === cat;
                return (
                  <Clickable
                    key={cat}
                    onPress={() => handleCategoryToggle(cat)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? withAlpha(color, 0.12) : colors.surface,
                        borderColor: isSelected ? color : colors.border,
                      },
                    ]}
                  >
                    <Row align="center" gap="xxs">
                      <Ionicons
                        name={icon as keyof typeof Ionicons.glyphMap}
                        size={14}
                        color={isSelected ? color : colors.muted}
                      />
                      <ThemedText
                        style={[
                          styles.categoryChipText,
                          { color: isSelected ? color : colors.text },
                        ]}
                      >
                        {label}
                      </ThemedText>
                    </Row>
                  </Clickable>
                );
              })}
            </Row>
          </ScrollView>
        </Animated.View>

        {/* Goals List */}
        {loading ? (
          <LoadingState variant="list" />
        ) : status === 'error' ? (
          <ErrorState message={error?.message ?? 'Failed to load goals.'} onRetry={retry} />
        ) : goals.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
              <Ionicons name="flag-outline" size={48} color={colors.tint} />
            </View>
            <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
              {activeTab === 'active'
                ? 'No Active Goals'
                : activeTab === 'completed'
                  ? 'No Completed Goals'
                  : 'No Goals Yet'}
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
              {activeTab === 'active'
                ? 'Create a goal to start tracking your progress!'
                : activeTab === 'completed'
                  ? 'Complete some goals to see them here.'
                  : 'Set goals to track your training journey.'}
            </ThemedText>
            {activeTab !== 'completed' && (
              <Button onPress={handleCreateGoal} style={{ marginTop: Spacing.sm }}>
                Create Goal
              </Button>
            )}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(250).springify()}>
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onPress={() => handleGoalPress(goal.id)}
                variant="default"
              />
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  statsCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  statItem: { alignItems: 'center', gap: Spacing.xs },
  statValue: { ...Typography.display, fontSize: scaleFont(Typography.display.fontSize) },
  statLabel: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize) },
  statDivider: { width: 1, height: 40 },
  tabRow: { marginBottom: Spacing.md },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radii.pill, borderWidth: 1 },
  tabText: {
    ...Typography.bodySmallSemiBold,
    fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
  categoryRow: {
    marginBottom: Spacing.md,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  categoryChip: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  categoryChipText: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
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
    borderRadius: Radii['3xl' as keyof typeof Radii] ?? 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
    lineHeight: scaleFont(22),
    maxWidth: 280,
  },
});
