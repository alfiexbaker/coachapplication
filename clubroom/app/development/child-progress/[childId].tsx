import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageContainer } from '@/components/primitives/page-container';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ProgressDashboard, SkillLevelGrid, FeedbackList } from '@/components/progress';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getUserById, getSessionsForAthlete, formatDate } from '@/constants/mock-data';
import { progressService, AthleteProgress, SessionFeedback } from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, Goal } from '@/constants/types';

const logger = createLogger('ChildProgressScreen');

export default function ChildProgressScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [child, setChild] = useState<any>(null);
  const [progress, setProgress] = useState<AthleteProgress | null>(null);
  const [feedback, setFeedback] = useState<SessionFeedback[]>([]);
  const [badges, setBadges] = useState<BadgeAward[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'feedback' | 'badges'>('overview');

  const loadData = useCallback(async () => {
    if (!childId) return;

    try {
      // Get child info
      const childData = getUserById(childId);
      setChild(childData);

      // Load progress data (as parent viewer)
      const progressData = await progressService.getAthleteProgress(childId, 'parent');
      progressData.athleteName = childData?.name || 'Athlete';
      setProgress(progressData);

      // Load feedback (parent visibility)
      const feedbackData = await progressService.getFeedbackForAthlete(childId, 'parent');
      setFeedback(feedbackData);

      // Load badges (visible to parent)
      const badgesData = await badgeService.listAwardsForAthlete(childId);
      const visibleBadges = badgesData.filter(b => b.visibility !== 'coach_only');
      setBadges(visibleBadges);

      logger.info('Child progress loaded', {
        childId,
        sessionCount: progressData.totalSessions,
        feedbackCount: feedbackData.length,
        badgeCount: visibleBadges.length,
      });
    } catch (error) {
      logger.error('Failed to load child progress', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading progress...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!child || !progress) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Child not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const getTrendInfo = () => {
    switch (progress.overallTrend) {
      case 'improving':
        return { icon: 'trending-up', color: palette.success, label: 'Improving' };
      case 'declining':
        return { icon: 'trending-down', color: palette.error, label: 'Needs Attention' };
      default:
        return { icon: 'remove', color: palette.muted, label: 'Steady Progress' };
    }
  };

  const trend = getTrendInfo();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'grid-outline' },
    { id: 'skills', label: 'Skills', icon: 'analytics-outline' },
    { id: 'feedback', label: 'Feedback', icon: 'chatbubble-outline' },
    { id: 'badges', label: 'Badges', icon: 'ribbon-outline' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.foreground} />
        </Clickable>
        <View style={styles.headerCenter}>
          <ThemedText type="title" style={styles.headerTitle}>
            {child.name}
          </ThemedText>
          <View style={[styles.trendBadge, { backgroundColor: `${trend.color}15` }]}>
            <Ionicons name={trend.icon as any} size={12} color={trend.color} />
            <ThemedText style={[styles.trendText, { color: trend.color }]}>
              {trend.label}
            </ThemedText>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: palette.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
          {tabs.map((tab) => (
            <Clickable
              key={tab.id}
              onPress={() => setActiveTab(tab.id as typeof activeTab)}
              style={[
                styles.tab,
                activeTab === tab.id && { borderBottomColor: palette.tint, borderBottomWidth: 2 },
              ]}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.id ? palette.tint : palette.muted}
              />
              <ThemedText
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.id ? palette.tint : palette.muted },
                ]}
              >
                {tab.label}
              </ThemedText>
            </Clickable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'overview' && (
          <ProgressDashboard
            progress={progress}
            athleteName={child.name}
            viewerRole="parent"
            onViewAllSkills={() => setActiveTab('skills')}
            onViewAllFeedback={() => setActiveTab('feedback')}
            onViewBadges={() => setActiveTab('badges')}
          />
        )}

        {activeTab === 'skills' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading" style={styles.sectionTitle}>
                Skill Levels
              </ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                Based on coach assessments
              </ThemedText>
            </View>

            {progress.skills.length > 0 ? (
              <SkillLevelGrid skills={progress.skills} />
            ) : (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="analytics-outline" size={32} color={palette.muted} />
                <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                  No skill ratings yet
                </ThemedText>
                <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
                  Coaches will rate skills during sessions
                </ThemedText>
              </SurfaceCard>
            )}
          </View>
        )}

        {activeTab === 'feedback' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading" style={styles.sectionTitle}>
                Session Feedback
              </ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                Notes from coaches after each session
              </ThemedText>
            </View>

            <FeedbackList
              feedback={feedback}
              showCoachName
              emptyMessage="No session feedback yet. Coaches will provide feedback after sessions."
            />
          </View>
        )}

        {activeTab === 'badges' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading" style={styles.sectionTitle}>
                Badges & Achievements
              </ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                {badges.length} badge{badges.length !== 1 ? 's' : ''} earned
              </ThemedText>
            </View>

            {badges.length > 0 ? (
              <View style={styles.badgesGrid}>
                {badges.map((badge) => (
                  <SurfaceCard key={badge.id} style={styles.badgeCard}>
                    <View style={[styles.badgeIcon, { backgroundColor: `${palette.tint}15` }]}>
                      <Ionicons name="ribbon" size={24} color={palette.tint} />
                    </View>
                    <ThemedText type="defaultSemiBold" style={styles.badgeLabel}>
                      {badge.badgeLabel}
                    </ThemedText>
                    <ThemedText style={[styles.badgeReason, { color: palette.muted }]}>
                      {badge.reason}
                    </ThemedText>
                    <View style={styles.badgeMeta}>
                      <ThemedText style={[styles.badgeDate, { color: palette.muted }]}>
                        {formatDate(badge.awardedAt)}
                      </ThemedText>
                      {badge.coachName && (
                        <ThemedText style={[styles.badgeCoach, { color: palette.muted }]}>
                          by {badge.coachName}
                        </ThemedText>
                      )}
                    </View>
                  </SurfaceCard>
                ))}
              </View>
            ) : (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="ribbon-outline" size={32} color={palette.muted} />
                <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                  No badges earned yet
                </ThemedText>
                <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
                  Coaches award badges for achievements and milestones
                </ThemedText>
              </SurfaceCard>
            )}
          </View>
        )}

        {/* Quick Stats Footer */}
        <View style={[styles.statsFooter, { borderTopColor: palette.border }]}>
          <View style={styles.statItem}>
            <ThemedText type="heading" style={styles.statValue}>
              {progress.totalSessions}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Sessions
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="heading" style={styles.statValue}>
              {progress.averagePerformance.toFixed(1)}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Avg Rating
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="heading" style={styles.statValue}>
              {badges.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Badges
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerCenter: {
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabBar: {
    borderBottomWidth: 1,
  },
  tabContent: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: -1,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  sectionHeader: {
    gap: 4,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  badgesGrid: {
    gap: Spacing.sm,
  },
  badgeCard: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  badgeLabel: {
    fontSize: 16,
  },
  badgeReason: {
    fontSize: 13,
    lineHeight: 18,
  },
  badgeMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  badgeDate: {
    fontSize: 11,
  },
  badgeCoach: {
    fontSize: 11,
  },
  statsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginTop: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  statValue: {
    fontSize: 22,
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
