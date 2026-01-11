import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useEffect, useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSessionsForAthlete, getUserById, formatDate } from '@/constants/mock-data';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, Goal, SkillProgress } from '@/constants/types';
import { badgeService } from '@/services/badge-service';
import { SkillRadar } from '@/components/analytics/skill-radar';
import { SkillsSummary, SkillProgressBar, SkillCategoryGroup } from '@/components/analytics/skill-progress-bar';
import { StatsRow, MetricsSummary, ProgressMetric, EmptyMetrics } from '@/components/analytics/enhanced-stats';
import { GoalProgress, GoalsSummary } from '@/components/analytics/goal-progress';

const logger = createLogger('AthleteProgressScreen');

type TabType = 'progress' | 'badges' | 'goals';

export function AthleteProgressScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('progress');
  const [goals, setGoals] = useState<Goal[]>([]);

  if (!currentUser) {
    return null;
  }

  useEffect(() => {
    badgeService.listAwardsForAthlete(currentUser.id).then(setAwards);
    // Mock goals for demo - in real app would fetch from service
    setGoals(getMockGoals(currentUser.id));
  }, [currentUser.id]);

  const athlete = getUserById(currentUser.id);
  if (!athlete) {
    return null;
  }

  const sessions = getSessionsForAthlete(currentUser.id);

  // Calculate progress trend based on last 3 sessions vs previous 3
  const getProgressTrend = () => {
    if (sessions.length < 2) return 'steady';

    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    const recentAvg = sortedSessions.slice(0, 3).reduce((sum, s) => sum + s.performanceRating, 0) / Math.min(3, sortedSessions.length);
    const previousAvg = sortedSessions.slice(3, 6).reduce((sum, s) => sum + s.performanceRating, 0) / Math.min(3, sortedSessions.slice(3, 6).length);

    if (sortedSessions.length < 4) return 'steady';
    if (recentAvg > previousAvg + 0.3) return 'improving';
    if (recentAvg < previousAvg - 0.3) return 'declining';
    return 'steady';
  };

  // Calculate level badge based on total sessions
  const getLevel = () => {
    const count = sessions.length;
    if (count >= 20) return { name: 'Gold', icon: 'trophy' as const, color: '#FFD700' };
    if (count >= 10) return { name: 'Silver', icon: 'medal' as const, color: '#C0C0C0' };
    return { name: 'Bronze', icon: 'ribbon' as const, color: '#CD7F32' };
  };

  const trend = getProgressTrend();
  const level = getLevel();

  const trendText = trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Needs Focus' : 'Steady';
  const trendColor = trend === 'improving' ? Colors.light.success : trend === 'declining' ? Colors.light.error : palette.muted;
  const trendIcon = trend === 'improving' ? 'trending-up' : trend === 'declining' ? 'trending-down' : 'pulse';

  // Sort sessions by date (newest first)
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  // Generate mock skills data for demo
  const skills: SkillProgress[] = useMemo(() => generateMockSkills(sessions), [sessions]);

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const grouped: Record<string, SkillProgress[]> = {};
    skills.forEach(skill => {
      const cat = skill.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(skill);
    });
    return grouped;
  }, [skills]);

  // Calculate stats
  const avgRating = sessions.length > 0
    ? (sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length).toFixed(1)
    : '0.0';

  const activeGoals = goals.filter(g => g.status === 'ACTIVE');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');

  logger.debug('Athlete progress rendered', {
    athleteId: currentUser.id,
    sessionCount: sessions.length,
    trend,
    level: level.name
  });

  const tabs: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'progress', label: 'Progress', icon: 'stats-chart' },
    { key: 'badges', label: 'Badges', icon: 'ribbon' },
    { key: 'goals', label: 'Goals', icon: 'flag' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            My Progress
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Track your football development
          </ThemedText>
        </View>

        {/* Profile Summary Card */}
        <SurfaceCard style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
              <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                {athlete.avatar || athlete.name.charAt(0)}
              </ThemedText>
            </View>
            <View style={styles.profileInfo}>
              <ThemedText type="subtitle" style={styles.name}>
                {athlete.name}
              </ThemedText>
              <View style={styles.badgeRow}>
                <View style={[styles.levelBadge, { backgroundColor: level.color + '20' }]}>
                  <Ionicons name={level.icon} size={12} color={level.color} />
                  <ThemedText style={[styles.levelText, { color: level.color }]}>
                    {level.name}
                  </ThemedText>
                </View>
                <View style={[styles.trendBadge, { backgroundColor: trendColor + '20' }]}>
                  <Ionicons name={trendIcon} size={12} color={trendColor} />
                  <ThemedText style={[styles.trendText, { color: trendColor }]}>
                    {trendText}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={[styles.quickStats, { borderTopColor: palette.border }]}>
            <View style={styles.quickStat}>
              <ThemedText type="defaultSemiBold" style={styles.quickStatValue}>
                {sessions.length}
              </ThemedText>
              <ThemedText style={[styles.quickStatLabel, { color: palette.muted }]}>
                Sessions
              </ThemedText>
            </View>
            <View style={[styles.quickStatDivider, { backgroundColor: palette.border }]} />
            <View style={styles.quickStat}>
              <View style={styles.quickStatValueRow}>
                <ThemedText type="defaultSemiBold" style={styles.quickStatValue}>
                  {avgRating}
                </ThemedText>
                <Ionicons name="star" size={14} color="#F59E0B" />
              </View>
              <ThemedText style={[styles.quickStatLabel, { color: palette.muted }]}>
                Avg Rating
              </ThemedText>
            </View>
            <View style={[styles.quickStatDivider, { backgroundColor: palette.border }]} />
            <View style={styles.quickStat}>
              <ThemedText type="defaultSemiBold" style={styles.quickStatValue}>
                {awards.length}
              </ThemedText>
              <ThemedText style={[styles.quickStatLabel, { color: palette.muted }]}>
                Badges
              </ThemedText>
            </View>
            <View style={[styles.quickStatDivider, { backgroundColor: palette.border }]} />
            <View style={styles.quickStat}>
              <ThemedText type="defaultSemiBold" style={styles.quickStatValue}>
                {activeGoals.length}
              </ThemedText>
              <ThemedText style={[styles.quickStatLabel, { color: palette.muted }]}>
                Goals
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: palette.surface }]}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tab,
                  isActive && [styles.tabActive, { backgroundColor: palette.tint }],
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={isActive ? '#fff' : palette.muted}
                />
                <ThemedText
                  style={[
                    styles.tabLabel,
                    { color: isActive ? '#fff' : palette.muted },
                    isActive && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Tab Content */}
        {activeTab === 'progress' && (
          <Animated.View entering={FadeIn} style={styles.tabContent}>
            {/* Skills Summary */}
            <SkillsSummary skills={skills} />

            {/* Skills Radar */}
            {skills.length > 0 && (
              <SkillRadar
                skills={skills}
                title="Skill Overview"
                showDetailedList={true}
              />
            )}

            {/* Skills by Category */}
            {Object.entries(skillsByCategory).length > 0 && (
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Skills by Category
                </ThemedText>
                <View style={styles.categoryList}>
                  {Object.entries(skillsByCategory).map(([category, categorySkills], index) => (
                    <SkillCategoryGroup
                      key={category}
                      category={category}
                      skills={categorySkills}
                      initialExpanded={index === 0}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Recent Sessions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Recent Sessions
                </ThemedText>
                <ThemedText style={[styles.sectionCount, { color: palette.muted }]}>
                  {sortedSessions.length} total
                </ThemedText>
              </View>

              {sortedSessions.length === 0 ? (
                <EmptyMetrics
                  icon="football-outline"
                  title="No Sessions Yet"
                  description="Book your first session to start tracking your progress"
                />
              ) : (
                <View style={styles.sessionList}>
                  {sortedSessions.slice(0, 5).map((session, index) => {
                    const hasNotes = session.notes && session.notes.trim() !== '';
                    const hasVideos = session.videoUrls && session.videoUrls.length > 0;

                    return (
                      <Animated.View
                        key={session.id}
                        entering={FadeInDown.delay(index * 50).springify()}
                      >
                        <Clickable
                          onPress={() => {
                            logger.press('SessionCard', { sessionId: session.id, source: 'MyProgress' });
                            router.push({
                              pathname: '/development/athlete-session/[sessionId]',
                              params: { sessionId: session.id },
                            });
                          }}
                        >
                          <SurfaceCard style={styles.sessionCard}>
                            <View style={styles.sessionHeader}>
                              <View style={styles.sessionLeft}>
                                <ThemedText type="defaultSemiBold" style={styles.sessionDate}>
                                  {formatDate(session.completedAt)}
                                </ThemedText>
                                <ThemedText style={[styles.coachName, { color: palette.muted }]}>
                                  with {session.coachName}
                                </ThemedText>
                              </View>
                              <View style={styles.ratingBadge}>
                                <ThemedText style={styles.ratingValue}>{session.performanceRating}</ThemedText>
                                <Ionicons name="star" size={14} color="#F59E0B" />
                              </View>
                            </View>

                            {session.skillsWorkedOn.length > 0 && (
                              <View style={styles.skillsRow}>
                                {session.skillsWorkedOn.map((skill, idx) => (
                                  <View key={idx} style={[styles.skillChip, { backgroundColor: palette.tint + '12' }]}>
                                    <ThemedText style={[styles.skillChipText, { color: palette.tint }]}>
                                      {skill}
                                    </ThemedText>
                                  </View>
                                ))}
                              </View>
                            )}

                            <View style={styles.sessionFooter}>
                              <View style={styles.sessionIndicators}>
                                {hasNotes && (
                                  <View style={styles.indicator}>
                                    <Ionicons name="document-text" size={12} color={palette.muted} />
                                    <ThemedText style={[styles.indicatorText, { color: palette.muted }]}>Notes</ThemedText>
                                  </View>
                                )}
                                {hasVideos && (
                                  <View style={styles.indicator}>
                                    <Ionicons name="videocam" size={12} color={palette.muted} />
                                    <ThemedText style={[styles.indicatorText, { color: palette.muted }]}>
                                      {session.videoUrls!.length} video{session.videoUrls!.length > 1 ? 's' : ''}
                                    </ThemedText>
                                  </View>
                                )}
                              </View>
                              <Ionicons name="chevron-forward" size={16} color={palette.icon} />
                            </View>
                          </SurfaceCard>
                        </Clickable>
                      </Animated.View>
                    );
                  })}
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {activeTab === 'badges' && (
          <Animated.View entering={FadeIn} style={styles.tabContent}>
            {/* Badges Summary */}
            <SurfaceCard style={styles.badgesSummaryCard}>
              <View style={styles.badgesSummaryHeader}>
                <View style={[styles.badgesSummaryIcon, { backgroundColor: `${palette.tint}12` }]}>
                  <Ionicons name="ribbon" size={28} color={palette.tint} />
                </View>
                <View style={styles.badgesSummaryInfo}>
                  <ThemedText type="heading" style={styles.badgesSummaryCount}>
                    {awards.length}
                  </ThemedText>
                  <ThemedText style={[styles.badgesSummaryLabel, { color: palette.muted }]}>
                    Total Badges Earned
                  </ThemedText>
                </View>
              </View>

              {/* Badge Categories */}
              <View style={styles.badgeCategoryRow}>
                {[
                  { label: 'Leadership', count: awards.filter(a => a.badgeCategory === 'leadership').length, color: '#8B5CF6' },
                  { label: 'Technique', count: awards.filter(a => a.badgeCategory === 'technique').length, color: '#10B981' },
                  { label: 'Mindset', count: awards.filter(a => a.badgeCategory === 'mindset').length, color: '#F59E0B' },
                ].map((cat) => (
                  <View key={cat.label} style={styles.badgeCategoryItem}>
                    <View style={[styles.badgeCategoryDot, { backgroundColor: cat.color }]} />
                    <ThemedText style={[styles.badgeCategoryText, { color: palette.muted }]}>
                      {cat.label}: <ThemedText style={{ fontWeight: '600', color: palette.text }}>{cat.count}</ThemedText>
                    </ThemedText>
                  </View>
                ))}
              </View>
            </SurfaceCard>

            {/* Badge List */}
            {awards.length === 0 ? (
              <EmptyMetrics
                icon="ribbon-outline"
                title="No Badges Yet"
                description="Complete training sessions and achieve milestones to earn badges from your coaches"
              />
            ) : (
              <View style={styles.badgeList}>
                {awards.map((award, index) => (
                  <Animated.View
                    key={award.id}
                    entering={FadeInRight.delay(index * 50).springify()}
                  >
                    <SurfaceCard style={styles.badgeCard}>
                      <View style={[styles.badgeIconContainer, { backgroundColor: getBadgeColor(award.badgeCategory) + '15' }]}>
                        <Ionicons
                          name={getBadgeIcon(award.badgeCategory)}
                          size={24}
                          color={getBadgeColor(award.badgeCategory)}
                        />
                        {award.badgeTier && (
                          <View style={[styles.badgeTierIndicator, { backgroundColor: getTierColor(award.badgeTier) }]}>
                            <ThemedText style={styles.badgeTierText}>{award.badgeTier}</ThemedText>
                          </View>
                        )}
                      </View>
                      <View style={styles.badgeContent}>
                        <ThemedText type="defaultSemiBold" style={styles.badgeLabel}>
                          {award.badgeLabel}
                        </ThemedText>
                        <ThemedText style={[styles.badgeReason, { color: palette.muted }]}>
                          {award.reason}
                        </ThemedText>
                        <View style={styles.badgeMeta}>
                          <ThemedText style={[styles.badgeDate, { color: palette.muted }]}>
                            {formatDate(award.awardedAt)}
                          </ThemedText>
                          {award.coachName && (
                            <ThemedText style={[styles.badgeCoach, { color: palette.muted }]}>
                              from {award.coachName}
                            </ThemedText>
                          )}
                        </View>
                      </View>
                    </SurfaceCard>
                  </Animated.View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {activeTab === 'goals' && (
          <Animated.View entering={FadeIn} style={styles.tabContent}>
            {/* Goals Summary */}
            <GoalsSummary
              activeGoals={activeGoals.length}
              completedGoals={completedGoals.length}
            />

            {/* Active Goals */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Active Goals
                </ThemedText>
                <View style={[styles.sectionBadge, { backgroundColor: palette.tint + '15' }]}>
                  <ThemedText style={[styles.sectionBadgeText, { color: palette.tint }]}>
                    {activeGoals.length}
                  </ThemedText>
                </View>
              </View>

              {activeGoals.length === 0 ? (
                <EmptyMetrics
                  icon="flag-outline"
                  title="No Active Goals"
                  description="Set goals with your coach to track your progress towards specific achievements"
                />
              ) : (
                <View style={styles.goalsList}>
                  {activeGoals.map((goal, index) => (
                    <Animated.View
                      key={goal.id}
                      entering={FadeInDown.delay(index * 50).springify()}
                    >
                      <GoalProgress goal={goal} expanded={index === 0} />
                    </Animated.View>
                  ))}
                </View>
              )}
            </View>

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                    Completed Goals
                  </ThemedText>
                  <View style={[styles.sectionBadge, { backgroundColor: palette.success + '15' }]}>
                    <Ionicons name="checkmark" size={12} color={palette.success} />
                    <ThemedText style={[styles.sectionBadgeText, { color: palette.success }]}>
                      {completedGoals.length}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.goalsList}>
                  {completedGoals.slice(0, 3).map((goal, index) => (
                    <Animated.View
                      key={goal.id}
                      entering={FadeInDown.delay(index * 50).springify()}
                    >
                      <GoalProgress goal={goal} />
                    </Animated.View>
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions
function generateMockSkills(sessions: any[]): SkillProgress[] {
  if (sessions.length === 0) return [];

  const skillNames = ['Dribbling', 'Passing', 'Shooting', 'Defending', 'Positioning', 'First Touch'];
  const categories = ['Technical', 'Technical', 'Technical', 'Physical', 'Tactical', 'Technical'];

  return skillNames.map((name, index) => ({
    skillName: name,
    category: categories[index],
    currentLevel: Math.floor(40 + Math.random() * 45),
    previousLevel: Math.floor(35 + Math.random() * 40),
    changePercent: Math.floor(-5 + Math.random() * 20),
    history: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      level: Math.floor(35 + Math.random() * 50),
    })),
  }));
}

function getMockGoals(athleteId: string): Goal[] {
  return [
    {
      id: 'goal-1',
      athleteId,
      title: 'Master 1v1 Dribbling',
      description: 'Improve close control and beat defenders consistently in 1v1 situations',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 65,
      milestones: [
        { id: 'm1', title: 'Complete 10 dribbling drills', isCompleted: true, completedAt: new Date().toISOString() },
        { id: 'm2', title: 'Successfully beat defender in 5 sessions', isCompleted: true },
        { id: 'm3', title: 'Use both feet consistently', isCompleted: false },
        { id: 'm4', title: 'Apply in match situation', isCompleted: false },
      ],
      status: 'ACTIVE',
      createdBy: 'COACH',
      createdById: 'coach-1',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'goal-2',
      athleteId,
      title: 'Improve Passing Accuracy',
      description: 'Increase passing accuracy to 85% in training sessions',
      targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 40,
      milestones: [
        { id: 'm5', title: 'Complete passing fundamentals course', isCompleted: true },
        { id: 'm6', title: 'Practice weighted passes daily', isCompleted: false },
        { id: 'm7', title: 'Achieve 80% accuracy in drills', isCompleted: false },
      ],
      status: 'ACTIVE',
      createdBy: 'ATHLETE',
      createdById: athleteId,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'goal-3',
      athleteId,
      title: 'First Touch Control',
      description: 'Control the ball within one touch consistently',
      progress: 100,
      milestones: [
        { id: 'm8', title: 'Practice wall passes', isCompleted: true },
        { id: 'm9', title: 'Receive and turn drill mastery', isCompleted: true },
      ],
      status: 'COMPLETED',
      createdBy: 'COACH',
      createdById: 'coach-1',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function getBadgeColor(category?: string): string {
  const colors: Record<string, string> = {
    leadership: '#8B5CF6',
    consistency: '#3B82F6',
    technique: '#10B981',
    mindset: '#F59E0B',
    teamwork: '#EC4899',
    resilience: '#EF4444',
  };
  return colors[category || ''] || '#6366F1';
}

function getBadgeIcon(category?: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    leadership: 'people',
    consistency: 'calendar',
    technique: 'football',
    mindset: 'bulb',
    teamwork: 'hand-left',
    resilience: 'fitness',
  };
  return icons[category || ''] || 'ribbon';
}

function getTierColor(tier?: number): string {
  if (tier === 3) return '#FFD700';
  if (tier === 2) return '#C0C0C0';
  return '#CD7F32';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  header: {
    gap: Spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Profile Card
  profileCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  quickStatDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  quickStatValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
  },
  tabActive: {},
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  tabContent: {
    gap: Spacing.md,
  },

  // Sections
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
  },
  sectionCount: {
    fontSize: 12,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryList: {
    gap: Spacing.sm,
  },

  // Sessions
  sessionList: {
    gap: Spacing.sm,
  },
  sessionCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionLeft: {
    gap: 2,
  },
  sessionDate: {
    fontSize: 14,
  },
  coachName: {
    fontSize: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  skillChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionIndicators: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicatorText: {
    fontSize: 11,
  },

  // Badges Tab
  badgesSummaryCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  badgesSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  badgesSummaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgesSummaryInfo: {
    gap: 2,
  },
  badgesSummaryCount: {
    fontSize: 28,
  },
  badgesSummaryLabel: {
    fontSize: 12,
  },
  badgeCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  badgeCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeCategoryText: {
    fontSize: 12,
  },
  badgeList: {
    gap: Spacing.sm,
  },
  badgeCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  badgeIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeTierIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTierText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  badgeContent: {
    flex: 1,
    gap: 4,
  },
  badgeLabel: {
    fontSize: 14,
  },
  badgeReason: {
    fontSize: 12,
  },
  badgeMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 2,
  },
  badgeDate: {
    fontSize: 11,
  },
  badgeCoach: {
    fontSize: 11,
  },

  // Goals Tab
  goalsList: {
    gap: Spacing.sm,
  },
});
