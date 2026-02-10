/**
 * Child Progress Screen
 *
 * Parent view of child's development: overview dashboard, skills grid,
 * radar chart, feedback list, badges — with tabbed navigation.
 */

import { View, StyleSheet, ScrollView, RefreshControl, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { ProgressDashboard, SkillLevelGrid, FeedbackList } from '@/components/progress';
import { SkillRadar } from '@/components/analytics/skill-radar';
import { ChildProgressStats } from '@/components/development/child-progress-stats';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useChildProgress, PROGRESS_TABS } from '@/hooks/use-child-progress';
import { formatDate } from '@/constants/mock-data';

export default function ChildProgressScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    loading, refreshing, child, progress, feedback, badges,
    activeTab, setActiveTab,
    handleRefresh, getTrendInfo,
  } = useChildProgress();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}><ThemedText>Loading progress...</ThemedText></View>
      </SafeAreaView>
    );
  }

  if (!child || !progress) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}><ThemedText>Child not found</ThemedText></View>
      </SafeAreaView>
    );
  }

  const trend = getTrendInfo(colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <Row align="center" justify="space-between" style={styles.header}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Clickable>
        <View style={styles.headerCenter}>
          <ThemedText type="title" style={Typography.heading}>{child.name}</ThemedText>
          <Row align="center" gap="xxs" style={[styles.trendBadge, { backgroundColor: withAlpha(trend.color, 0.09) }]}>
            <Ionicons name={trend.icon as keyof typeof Ionicons.glyphMap} size={12} color={trend.color} />
            <ThemedText style={[Typography.caption, { color: trend.color }]}>{trend.label}</ThemedText>
          </Row>
        </View>
        <View style={{ width: 24 }} />
      </Row>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
          {PROGRESS_TABS.map((tab) => (
            <Clickable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, activeTab === tab.id ? { borderBottomColor: colors.tint, borderBottomWidth: 2 } : undefined].filter(Boolean) as ViewStyle[]}
            >
              <Row align="center" gap="xxs">
                <Ionicons name={tab.icon as keyof typeof Ionicons.glyphMap} size={18} color={activeTab === tab.id ? colors.tint : colors.muted} />
                <ThemedText style={[Typography.smallSemiBold, { color: activeTab === tab.id ? colors.tint : colors.muted }]}>{tab.label}</ThemedText>
              </Row>
            </Clickable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {activeTab === 'overview' && (
          <ProgressDashboard progress={progress} athleteName={child.name} viewerRole="parent"
            onViewAllSkills={() => setActiveTab('skills')} onViewAllFeedback={() => setActiveTab('feedback')} onViewBadges={() => setActiveTab('badges')} />
        )}

        {activeTab === 'skills' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading">Skill Levels</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>Based on coach assessments</ThemedText>
            </View>
            {progress.skills.length > 0 ? (
              <SkillLevelGrid skills={progress.skills} />
            ) : (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="analytics-outline" size={32} color={colors.muted} />
                <ThemedText style={[Typography.bodySemiBold, { color: colors.muted }]}>No skill ratings yet</ThemedText>
                <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>Coaches will rate skills during sessions</ThemedText>
              </SurfaceCard>
            )}
          </View>
        )}

        {activeTab === 'feedback' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading">Session Feedback</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>Notes from coaches after each session</ThemedText>
            </View>
            <FeedbackList feedback={feedback} showCoachName emptyMessage="No session feedback yet. Coaches will provide feedback after sessions." />
          </View>
        )}

        {activeTab === 'radar' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading">Skills Radar</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>Visual breakdown of skill levels</ThemedText>
            </View>
            {progress.skills?.length > 0 ? (
              <SkillRadar skills={progress.skills.map((s) => ({
                skillName: s.skill, category: '', currentLevel: s.level,
                previousLevel: s.previousLevel ?? s.level, changePercent: 0, history: s.history.map((h) => ({ date: h.date, level: h.level })),
              }))} showDetailedList />
            ) : (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="stats-chart-outline" size={32} color={colors.muted} />
                <ThemedText style={[Typography.bodySemiBold, { color: colors.muted }]}>No skill data yet</ThemedText>
                <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>Skills radar will appear once coaches rate skills</ThemedText>
              </SurfaceCard>
            )}
          </View>
        )}

        {activeTab === 'badges' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading">Badges & Achievements</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>{badges.length} badge{badges.length !== 1 ? 's' : ''} earned</ThemedText>
            </View>
            {badges.length > 0 ? (
              <View style={{ gap: Spacing.sm }}>
                {badges.map((badge) => (
                  <SurfaceCard key={badge.id} style={styles.badgeCard}>
                    <View style={[styles.badgeIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
                      <Ionicons name="ribbon" size={24} color={colors.tint} />
                    </View>
                    <ThemedText type="defaultSemiBold">{badge.badgeLabel}</ThemedText>
                    <ThemedText style={[Typography.small, { color: colors.muted }]}>{badge.reason}</ThemedText>
                    <Row gap="sm">
                      <ThemedText style={[Typography.caption, { color: colors.muted }]}>{formatDate(badge.awardedAt)}</ThemedText>
                      {badge.coachName && <ThemedText style={[Typography.caption, { color: colors.muted }]}>by {badge.coachName}</ThemedText>}
                    </Row>
                  </SurfaceCard>
                ))}
              </View>
            ) : (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="ribbon-outline" size={32} color={colors.muted} />
                <ThemedText style={[Typography.bodySemiBold, { color: colors.muted }]}>No badges earned yet</ThemedText>
                <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>Coaches award badges for achievements and milestones</ThemedText>
              </SurfaceCard>
            )}
          </View>
        )}

        <ChildProgressStats totalSessions={progress.totalSessions} averagePerformance={progress.averagePerformance} badgeCount={badges.length} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backButton: { padding: Spacing.xs },
  headerCenter: { alignItems: 'center', gap: Spacing.xxs },
  trendBadge: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  tabBar: { borderBottomWidth: 1 },
  tabContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  tab: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, marginBottom: -1 },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing['2xl'] },
  tabSection: { gap: Spacing.sm },
  sectionHeader: { gap: Spacing.xxs, marginBottom: Spacing.sm },
  emptyCard: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  badgeCard: { padding: Spacing.md, gap: Spacing.xs },
  badgeIcon: { width: 48, height: 48, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
});
