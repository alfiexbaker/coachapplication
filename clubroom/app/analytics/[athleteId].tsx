/**
 * Athlete Analytics Screen
 *
 * Displays progress analytics for a specific athlete including
 * stats, performance summary, skills progress, and goals.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { AthleteStatCard } from '@/components/analytics/athlete-stat-card';
import { AthleteSkillBar } from '@/components/analytics/athlete-skill-bar';
import { AthleteGoalCard } from '@/components/analytics/athlete-goal-card';
import { AnalyticsPerformanceCard } from '@/components/analytics/analytics-performance-card';
import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { ok } from '@/types/result';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useAthleteAnalytics, ANALYTICS_ACCENT_COLOR, PERIOD_OPTIONS } from '@/hooks/use-athlete-analytics';

export default function AthleteAnalyticsScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { athleteId, analytics, loading, period, setPeriod, handleCompleteMilestone, handleShare } = useAthleteAnalytics();

  if (loading || !analytics) return <LoadingState variant="detail" />;
  if (!analytics) return <EmptyState icon="analytics-outline" title="No analytics" message="Analytics will appear after sessions" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row gap="md" align="center" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <View style={{ flex: 1 }}>
          <ThemedText type="title">{analytics.athleteName}</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>Progress Analytics</ThemedText>
        </View>
        <Clickable accessibilityLabel="Share analytics" onPress={handleShare} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </Clickable>
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.periodsContainer}>
        {PERIOD_OPTIONS.map((p) => (
          <Clickable key={p.key} onPress={() => setPeriod(p.key)}
            style={[styles.periodChip, { backgroundColor: period === p.key ? colors.tint : colors.surface }]}>
            <ThemedText style={[Typography.smallSemiBold, { color: period === p.key ? colors.onPrimary : colors.text }]}>{p.label}</ThemedText>
          </Clickable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}>
        <Row style={styles.statsGrid}>
          <AthleteStatCard icon="fitness-outline" label="Sessions" value={analytics.sessionsThisPeriod} color={colors.tint} index={0} />
          <AthleteStatCard icon="star-outline" label="Avg Rating" value={analytics.averageSessionRating.toFixed(1)} suffix="/5" color={colors.rating} index={1} />
          <AthleteStatCard icon="calendar-outline" label="Attendance" value={analytics.attendanceRate} suffix="%" color={colors.success} index={2} />
          <AthleteStatCard icon="trending-up-outline" label="Improvement" value={`+${analytics.improvementRate.toFixed(1)}`} suffix="%" color={ANALYTICS_ACCENT_COLOR} index={3} />
        </Row>

        <AnalyticsPerformanceCard analytics={analytics} />

        <View style={styles.section}>
          <Row align="center" justify="space-between" style={{ marginBottom: Spacing.md }}>
            <ThemedText type="subtitle">Skills Progress</ThemedText>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>{analytics.skills.length} tracked</ThemedText>
          </Row>
          <View style={{ gap: Spacing.md }}>
            {analytics.skills.map((skill, index) => (
              <AthleteSkillBar key={skill.skillName} skill={skill} index={index} />
            ))}
          </View>
        </View>

        {analytics.activeGoals.length > 0 && (
          <View style={styles.section}>
            <Row align="center" justify="space-between" style={{ marginBottom: Spacing.md }}>
              <ThemedText type="subtitle">Active Goals</ThemedText>
              <Clickable onPress={() => router.push(Routes.analyticsAthleteGoals(athleteId))} style={{ paddingVertical: Spacing.xxs, paddingHorizontal: 8 }}>
                <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>See all</ThemedText>
              </Clickable>
            </Row>
            <View style={{ gap: Spacing.md }}>
              {analytics.activeGoals.slice(0, 2).map((goal, index) => (
                <AthleteGoalCard key={goal.id} goal={goal} index={index} onComplete={(milestoneId) => handleCompleteMilestone(goal.id, milestoneId)} />
              ))}
            </View>
          </View>
        )}

        {analytics.completedGoals.length > 0 && (
          <View style={styles.section}>
            <Row align="center" justify="space-between" style={{ marginBottom: Spacing.md }}>
              <ThemedText type="subtitle">Completed Goals</ThemedText>
              <Row style={[styles.completedBadge, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <ThemedText style={[Typography.caption, { color: colors.success }]}>{analytics.completedGoals.length}</ThemedText>
              </Row>
            </Row>
            {analytics.completedGoals.slice(0, 1).map((goal) => (
              <SurfaceCard key={goal.id} style={{ padding: Spacing.md }}>
                <Row gap="md" align="center">
                  <Ionicons name="trophy" size={20} color={colors.success} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">{goal.title}</ThemedText>
                    <ThemedText style={[Typography.caption, { color: colors.muted, marginTop: Spacing.micro }]}>
                      Completed {new Date(goal.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </ThemedText>
                  </View>
                </Row>
              </SurfaceCard>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  periodsContainer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
  periodChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.full },
  content: { padding: Spacing.lg, paddingTop: 0 },
  statsGrid: { flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  section: { marginBottom: Spacing.lg },
  completedBadge: { alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: 8, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
});
