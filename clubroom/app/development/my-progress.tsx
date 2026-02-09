import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TextInput, Alert, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ProgressDashboard, SkillLevelGrid, FeedbackList } from '@/components/progress';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { progressService, AthleteProgress, SessionFeedback } from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import { createLogger } from '@/utils/logger';
import type { BadgeAward } from '@/constants/types';

const logger = createLogger('MyProgressScreen');

export default function MyProgressScreen() {
  const { colors: palette } = useTheme();
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
  }, [currentUser?.id, currentUser?.name]);

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
      await progressService.createGoal(
        currentUser.id,
        {
          userId: currentUser.id,
          athleteId: currentUser.id,
          title: newGoalTitle.trim(),
          category: 'OTHER',
          progress: 0,
          milestones: [],
          status: 'ACTIVE',
          createdBy: 'ATHLETE',
          createdById: currentUser.id,
        }
      );

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

  // Compact tabs for better mobile display
  const tabs = [
    { id: 'overview', label: 'Overview', shortLabel: 'Home', icon: 'grid-outline' },
    { id: 'skills', label: 'Skills', shortLabel: 'Skills', icon: 'analytics-outline' },
    { id: 'goals', label: 'Goals', shortLabel: 'Goals', icon: 'flag-outline' },
    { id: 'feedback', label: 'Feedback', shortLabel: 'Notes', icon: 'chatbubble-outline' },
    { id: 'badges', label: 'Badges', shortLabel: 'Awards', icon: 'ribbon-outline' },
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
          <View style={[styles.trendBadge, { backgroundColor: withAlpha(trend.color, 0.09) }]}>
            <Ionicons name={trend.icon as keyof typeof Ionicons.glyphMap} size={12} color={trend.color} />
            <ThemedText style={[styles.trendText, { color: trend.color }]}>
              {trend.label}
            </ThemedText>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Level Badge */}
      <View style={[styles.levelBanner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
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
            <View style={[styles.levelProgressBar, { backgroundColor: withAlpha(palette.tint, 0.19) }]}>
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

      {/* Tab Bar - Icon-only for compact display */}
      <View style={[styles.tabBar, { borderBottomColor: palette.border }]}>
        <View style={styles.tabsRow}>
          {tabs.map((tab) => (
            <Clickable
              key={tab.id}
              onPress={() => setActiveTab(tab.id as typeof activeTab)}
              style={[
                styles.tab,
                activeTab === tab.id ? [styles.activeTab, { borderBottomColor: palette.tint }] : undefined,
              ].filter(Boolean) as ViewStyle[]}
            >
              <View style={[
                styles.tabIconContainer,
                activeTab === tab.id ? { backgroundColor: withAlpha(palette.tint, 0.09) } : undefined,
              ]}>
                <Ionicons
                  name={tab.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={activeTab === tab.id ? palette.tint : palette.muted}
                />
              </View>
              <ThemedText
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.id ? palette.tint : palette.muted },
                ]}
                numberOfLines={1}
              >
                {tab.shortLabel}
              </ThemedText>
            </Clickable>
          ))}
        </View>
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
                style={[styles.addGoalBtn, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
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
                    <ThemedText style={{ color: palette.onPrimary, fontWeight: '600' }}>Create</ThemedText>
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
                      <View style={[styles.goalProgressBar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
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
                    <View style={[styles.badgeIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
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
    gap: Spacing.xxs,
  },
  headerTitle: {
    ...Typography.heading,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  trendText: {
    ...Typography.caption,
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
    borderRadius: Radii.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    ...Typography.title,
  },
  levelInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  levelName: {
    ...Typography.bodySmall,
  },
  levelProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  levelProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  levelProgressText: {
    ...Typography.caption,
    minWidth: 32,
  },
  levelStats: {
    alignItems: 'center',
  },
  pointsValue: {
    ...Typography.title,
  },
  pointsLabel: {
    ...Typography.micro,
    textTransform: 'uppercase',
  },
  tabBar: {
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    marginBottom: -1,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    ...Typography.caption,
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
    ...Typography.heading,
  },
  sectionSubtitle: {
    ...Typography.small,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.bodySemiBold,
  },
  emptySubtext: {
    ...Typography.small,
    textAlign: 'center',
  },
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  addGoalBtnText: {
    ...Typography.smallSemiBold,
  },
  goalForm: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  goalInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
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
    ...Typography.body,
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
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  goalProgressText: {
    ...Typography.caption,
    minWidth: 32,
    textAlign: 'right',
  },
  goalDescription: {
    ...Typography.small,
  },
  completedLabel: {
    ...Typography.bodySmall,
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
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  badgeLabel: {
    ...Typography.subheading,
    textAlign: 'center',
  },
  badgeReason: {
    ...Typography.small,
    textAlign: 'center',
    lineHeight: 18,
  },
  badgeCategory: {
    marginTop: Spacing.xs,
  },
});
