import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ProgressDashboard, SkillLevelGrid, FeedbackList } from '@/components/progress';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { progressService, AthleteProgress, SessionFeedback } from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, Goal } from '@/constants/types';

const logger = createLogger('MyProgressScreen');

export default function MyProgressScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<AthleteProgress | null>(null);
  const [feedback, setFeedback] = useState<SessionFeedback[]>([]);
  const [badges, setBadges] = useState<BadgeAward[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'feedback' | 'goals' | 'badges'>('overview');

  // Goal creation
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      // Load progress data (as athlete viewer)
      const progressData = await progressService.getAthleteProgress(currentUser.id, 'athlete');
      progressData.athleteName = currentUser.name || 'Me';
      setProgress(progressData);

      // Load feedback (athlete visibility)
      const feedbackData = await progressService.getFeedbackForAthlete(currentUser.id, 'athlete');
      setFeedback(feedbackData);

      // Load badges
      const badgesData = await badgeService.listAwardsForAthlete(currentUser.id);
      const visibleBadges = badgesData.filter(b => b.visibility !== 'coach_only');
      setBadges(visibleBadges);

      logger.info('My progress loaded', {
        userId: currentUser.id,
        sessionCount: progressData.totalSessions,
        feedbackCount: feedbackData.length,
        badgeCount: visibleBadges.length,
      });
    } catch (error) {
      logger.error('Failed to load progress', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim() || !currentUser) return;

    try {
      await progressService.createGoal({
        athleteId: currentUser.id,
        title: newGoalTitle.trim(),
        progress: 0,
        milestones: [],
        status: 'ACTIVE',
        createdBy: 'ATHLETE',
        createdById: currentUser.id,
      });

      setNewGoalTitle('');
      setShowGoalForm(false);
      loadData();
      Alert.alert('Success', 'Goal created!');
    } catch (error) {
      logger.error('Failed to create goal', error);
      Alert.alert('Error', 'Failed to create goal');
    }
  };

  if (loading || !currentUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading your progress...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!progress) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Unable to load progress</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const getTrendInfo = () => {
    switch (progress.overallTrend) {
      case 'improving':
        return { icon: 'trending-up', color: palette.success, label: 'Improving' };
      case 'declining':
        return { icon: 'trending-down', color: palette.error, label: 'Keep Pushing' };
      default:
        return { icon: 'remove', color: palette.muted, label: 'Steady' };
    }
  };

  const trend = getTrendInfo();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'grid-outline' },
    { id: 'skills', label: 'Skills', icon: 'analytics-outline' },
    { id: 'goals', label: 'Goals', icon: 'flag-outline' },
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
            My Progress
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

      {/* Level Badge */}
      <View style={[styles.levelBanner, { backgroundColor: `${palette.tint}10` }]}>
        <View style={[styles.levelCircle, { borderColor: palette.tint }]}>
          <ThemedText style={[styles.levelNumber, { color: palette.tint }]}>
            {progress.currentLevel.level}
          </ThemedText>
        </View>
        <View style={styles.levelInfo}>
          <ThemedText type="defaultSemiBold" style={styles.levelName}>
            Level {progress.currentLevel.level}: {progress.currentLevel.name}
          </ThemedText>
          <View style={styles.levelProgressRow}>
            <View style={[styles.levelProgressBar, { backgroundColor: `${palette.tint}30` }]}>
              <View
                style={[
                  styles.levelProgressFill,
                  { width: `${progress.progressToNextLevel}%`, backgroundColor: palette.tint },
                ]}
              />
            </View>
            <ThemedText style={[styles.levelProgressText, { color: palette.muted }]}>
              {progress.progressToNextLevel}%
            </ThemedText>
          </View>
        </View>
        <View style={styles.levelStats}>
          <ThemedText type="heading" style={[styles.pointsValue, { color: palette.tint }]}>
            {progress.totalPoints}
          </ThemedText>
          <ThemedText style={[styles.pointsLabel, { color: palette.muted }]}>
            points
          </ThemedText>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: palette.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
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
            athleteName="My"
            viewerRole="athlete"
            onViewAllSkills={() => setActiveTab('skills')}
            onViewAllFeedback={() => setActiveTab('feedback')}
            onViewBadges={() => setActiveTab('badges')}
          />
        )}

        {activeTab === 'skills' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading" style={styles.sectionTitle}>
                My Skills
              </ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                Based on coach assessments
              </ThemedText>
            </View>

            {progress.skills.length > 0 ? (
              <SkillLevelGrid skills={progress.skills} groupByCategory showUpdatedBy />
            ) : (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="analytics-outline" size={32} color={palette.muted} />
                <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                  No skill ratings yet
                </ThemedText>
                <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
                  Complete sessions to get skill ratings from coaches
                </ThemedText>
              </SurfaceCard>
            )}
          </View>
        )}

        {activeTab === 'goals' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading" style={styles.sectionTitle}>
                My Goals
              </ThemedText>
              <Clickable
                onPress={() => setShowGoalForm(!showGoalForm)}
                style={[styles.addGoalBtn, { backgroundColor: `${palette.tint}15` }]}
              >
                <Ionicons name="add" size={18} color={palette.tint} />
                <ThemedText style={[styles.addGoalBtnText, { color: palette.tint }]}>
                  Add Goal
                </ThemedText>
              </Clickable>
            </View>

            {/* Goal Form */}
            {showGoalForm && (
              <SurfaceCard style={styles.goalForm}>
                <TextInput
                  value={newGoalTitle}
                  onChangeText={setNewGoalTitle}
                  placeholder="What do you want to achieve?"
                  placeholderTextColor={palette.muted}
                  style={[styles.goalInput, { color: palette.foreground, borderColor: palette.border }]}
                />
                <View style={styles.goalFormActions}>
                  <Clickable
                    onPress={() => setShowGoalForm(false)}
                    style={[styles.goalFormBtn, { borderColor: palette.border }]}
                  >
                    <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
                  </Clickable>
                  <Clickable
                    onPress={handleCreateGoal}
                    style={[styles.goalFormBtn, { backgroundColor: palette.tint }]}
                  >
                    <ThemedText style={{ color: '#FFFFFF', fontWeight: '600' }}>Create</ThemedText>
                  </Clickable>
                </View>
              </SurfaceCard>
            )}

            {/* Active Goals */}
            {progress.activeGoals.length > 0 ? (
              <View style={styles.goalsList}>
                {progress.activeGoals.map((goal) => (
                  <SurfaceCard key={goal.id} style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                      <Ionicons name="flag" size={18} color={palette.tint} />
                      <ThemedText type="defaultSemiBold" style={styles.goalTitle}>
                        {goal.title}
                      </ThemedText>
                    </View>
                    <View style={styles.goalProgress}>
                      <View style={[styles.goalProgressBar, { backgroundColor: `${palette.tint}20` }]}>
                        <View
                          style={[
                            styles.goalProgressFill,
                            { width: `${goal.progress}%`, backgroundColor: palette.tint },
                          ]}
                        />
                      </View>
                      <ThemedText style={[styles.goalProgressText, { color: palette.muted }]}>
                        {goal.progress}%
                      </ThemedText>
                    </View>
                    {goal.description && (
                      <ThemedText style={[styles.goalDescription, { color: palette.muted }]}>
                        {goal.description}
                      </ThemedText>
                    )}
                  </SurfaceCard>
                ))}
              </View>
            ) : (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="flag-outline" size={32} color={palette.muted} />
                <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                  No active goals
                </ThemedText>
                <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
                  Set goals to track your progress
                </ThemedText>
              </SurfaceCard>
            )}

            {/* Completed Goals */}
            {progress.completedGoals.length > 0 && (
              <>
                <ThemedText type="defaultSemiBold" style={styles.completedLabel}>
                  Completed Goals
                </ThemedText>
                {progress.completedGoals.map((goal) => (
                  <SurfaceCard
                    key={goal.id}
                    style={[styles.goalCard, styles.completedGoal, { opacity: 0.7 }]}
                  >
                    <View style={styles.goalHeader}>
                      <Ionicons name="checkmark-circle" size={18} color={palette.success} />
                      <ThemedText style={[styles.goalTitle, { textDecorationLine: 'line-through' }]}>
                        {goal.title}
                      </ThemedText>
                    </View>
                  </SurfaceCard>
                ))}
              </>
            )}
          </View>
        )}

        {activeTab === 'feedback' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading" style={styles.sectionTitle}>
                Coach Feedback
              </ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                Notes from your coaches
              </ThemedText>
            </View>

            <FeedbackList
              feedback={feedback}
              showCoachName
              emptyMessage="No feedback yet. Complete sessions to receive feedback from coaches."
            />
          </View>
        )}

        {activeTab === 'badges' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading" style={styles.sectionTitle}>
                My Badges
              </ThemedText>
              <Chip dense>{badges.length} earned</Chip>
            </View>

            {badges.length > 0 ? (
              <View style={styles.badgesGrid}>
                {badges.map((badge) => (
                  <SurfaceCard key={badge.id} style={styles.badgeCard}>
                    <View style={[styles.badgeIcon, { backgroundColor: `${palette.tint}15` }]}>
                      <Ionicons name="ribbon" size={28} color={palette.tint} />
                    </View>
                    <ThemedText type="defaultSemiBold" style={styles.badgeLabel}>
                      {badge.badgeLabel}
                    </ThemedText>
                    <ThemedText style={[styles.badgeReason, { color: palette.muted }]}>
                      {badge.reason}
                    </ThemedText>
                    {badge.badgeCategory && (
                      <Chip dense style={styles.badgeCategory}>
                        {badge.badgeCategory}
                      </Chip>
                    )}
                  </SurfaceCard>
                ))}
              </View>
            ) : (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="ribbon-outline" size={32} color={palette.muted} />
                <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                  No badges yet
                </ThemedText>
                <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
                  Keep training to earn badges and achievements
                </ThemedText>
              </SurfaceCard>
            )}
          </View>
        )}
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
  levelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radii.lg,
    gap: Spacing.md,
  },
  levelCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  levelInfo: {
    flex: 1,
    gap: 6,
  },
  levelName: {
    fontSize: 14,
  },
  levelProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  levelProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  levelProgressText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 32,
  },
  levelStats: {
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 22,
  },
  pointsLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  tabBar: {
    borderBottomWidth: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
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
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  addGoalBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  goalForm: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  goalInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    fontSize: 15,
  },
  goalFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  goalFormBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  goalsList: {
    gap: Spacing.sm,
  },
  goalCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  completedGoal: {},
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  goalTitle: {
    fontSize: 15,
    flex: 1,
  },
  goalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  goalProgressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalProgressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
  goalDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  completedLabel: {
    fontSize: 14,
    marginTop: Spacing.md,
  },
  badgesGrid: {
    gap: Spacing.sm,
  },
  badgeCard: {
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  badgeLabel: {
    fontSize: 16,
    textAlign: 'center',
  },
  badgeReason: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  badgeCategory: {
    marginTop: Spacing.xs,
  },
});
