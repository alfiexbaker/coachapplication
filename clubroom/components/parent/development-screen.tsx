import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Components , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getChildrenForParent, getSessionsForAthlete, formatDate } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, SkillProgress, Goal } from '@/constants/types';
import { badgeService } from '@/services/badge-service';
import { SkillRadar } from '@/components/analytics/skill-radar';
import { SkillsSummary } from '@/components/analytics/skill-progress-bar';
import { EmptyMetrics } from '@/components/analytics/enhanced-stats';
import { GoalProgress, GoalsSummary } from '@/components/analytics/goal-progress';

const logger = createLogger('ParentDevelopmentScreen');

type TabType = 'progress' | 'badges' | 'goals';

export function ParentDevelopmentScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // Get data before hooks (all hooks must be called unconditionally)
  const userId = currentUser?.id;
  const children = userId ? getChildrenForParent(userId) : [];
  const firstChildId = children[0]?.id;

  // All useState hooks must be before any early returns
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(firstChildId);
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [coachOnlyCount, setCoachOnlyCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('progress');

  // Derived data
  const selectedChild = children.find((c) => c.id === selectedChildId);
  const sessions = useMemo(() => {
    return selectedChild ? getSessionsForAthlete(selectedChild.id) : [];
  }, [selectedChild]);

  // Generate mock skills (useMemo before early return)
  const skills: SkillProgress[] = useMemo(() => {
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
  }, [sessions]);

  // Mock goals
  const goals: Goal[] = useMemo(() => {
    if (!selectedChild) return [];
    return [
      {
        id: 'goal-1',
        userId: selectedChild.id,
        athleteId: selectedChild.id,
        title: 'Master 1v1 Dribbling',
        description: 'Improve close control and beat defenders consistently',
        category: 'TECHNIQUE',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        progress: 65,
        milestones: [
          { id: 'm1', goalId: 'goal-1', order: 0, title: 'Complete 10 dribbling drills', isCompleted: true },
          { id: 'm2', goalId: 'goal-1', order: 1, title: 'Beat defender in 5 sessions', isCompleted: true },
          { id: 'm3', goalId: 'goal-1', order: 2, title: 'Use both feet consistently', isCompleted: false },
        ],
        status: 'ACTIVE',
        createdBy: 'COACH',
        createdById: 'coach-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'goal-2',
        userId: selectedChild.id,
        athleteId: selectedChild.id,
        title: 'Improve Passing Accuracy',
        category: 'TECHNIQUE',
        progress: 40,
        milestones: [
          { id: 'm4', goalId: 'goal-2', order: 0, title: 'Complete passing course', isCompleted: true },
          { id: 'm5', goalId: 'goal-2', order: 1, title: 'Achieve 80% accuracy', isCompleted: false },
        ],
        status: 'ACTIVE',
        createdBy: 'ATHLETE',
        createdById: selectedChild.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }, [selectedChild]);

  useEffect(() => {
    if (!selectedChildId) return;
    badgeService
      .listAwardsForAthlete(selectedChildId)
      .then((childAwards) => {
        const supporterVisible = childAwards.filter((award) => award.visibility !== 'coach_only');
        setAwards(supporterVisible);
        setCoachOnlyCount(childAwards.length - supporterVisible.length);
      });
  }, [selectedChildId]);

  const sharedBadges = useMemo(() => awards.filter((award) => award.shared), [awards]);

  // Early return after all hooks
  if (!currentUser) {
    return null;
  }

  const activeGoals = goals.filter(g => g.status === 'ACTIVE');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');

  // Calculate progress metrics
  const getProgressTrend = () => {
    if (sessions.length < 2) return 'steady';
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    const recentAvg = sorted.slice(0, 3).reduce((sum, s) => sum + s.performanceRating, 0) / Math.min(3, sorted.length);
    const previousAvg = sorted.slice(3, 6).reduce((sum, s) => sum + s.performanceRating, 0) / Math.min(3, sorted.slice(3, 6).length);
    if (sorted.length < 4) return 'steady';
    if (recentAvg > previousAvg + 0.3) return 'improving';
    if (recentAvg < previousAvg - 0.3) return 'declining';
    return 'steady';
  };

  const trend = getProgressTrend();
  const trendIcon = trend === 'improving' ? 'trending-up' : trend === 'declining' ? 'trending-down' : 'remove';
  const trendText = trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Needs Focus' : 'Steady';
  const trendColor = trend === 'improving' ? palette.success : trend === 'declining' ? palette.error : palette.muted;

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  // Stats
  const avgRating = sessions.length > 0
    ? (sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length).toFixed(1)
    : '0.0';

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
            Development
          </ThemedText>
          {children.length === 1 ? (
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              Tracking {children[0].name}&apos;s progress
            </ThemedText>
          ) : children.length > 1 ? (
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              Track your children&apos;s progress
            </ThemedText>
          ) : (
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              Add children to track their progress
            </ThemedText>
          )}
        </View>

        {/* Child Selector (if multiple children) */}
        {children.length > 1 && (
          <View style={[styles.childSelector, { backgroundColor: palette.surface }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childSelectorContent}
            >
              {children.map((child) => {
                const isSelected = child.id === selectedChildId;
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedChildId(child.id);
                      logger.press('ChildTab', { childId: child.id, childName: child.name });
                    }}
                    style={[
                      styles.childTab,
                      isSelected ? [styles.childTabActive, { backgroundColor: palette.tint }] : undefined,
                    ]}
                  >
                    <View style={[
                      styles.childAvatar,
                      { backgroundColor: isSelected ? withAlpha(palette.onPrimary, 0.2) : palette.border }
                    ]}>
                      <ThemedText style={[
                        styles.childAvatarText,
                        { color: isSelected ? palette.onPrimary : palette.tint }
                      ]}>
                        {child.name.charAt(0)}
                      </ThemedText>
                    </View>
                    <ThemedText style={[
                      styles.childName,
                      { color: isSelected ? palette.onPrimary : palette.text },
                      isSelected && styles.childNameActive,
                    ]}>
                      {child.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* No Children State */}
        {children.length === 0 && (
          <EmptyMetrics
            icon="people-outline"
            title="No Children Added"
            description="Add children to your account to track their development and progress"
          />
        )}

        {/* Child Content */}
        {selectedChild && (
          <>
            {/* Profile Summary Card */}
            <SurfaceCard style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                  <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                    {selectedChild.name.charAt(0)}
                  </ThemedText>
                </View>
                <View style={styles.profileInfo}>
                  <ThemedText type="subtitle" style={styles.profileName}>
                    {selectedChild.name}
                  </ThemedText>
                  <View style={styles.profileBadges}>
                    <View style={[styles.trendBadge, { backgroundColor: withAlpha(trendColor, 0.12) }]}>
                      <Ionicons name={trendIcon} size={12} color={trendColor} />
                      <ThemedText style={[styles.trendBadgeText, { color: trendColor }]}>
                        {trendText}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </View>

              {/* Quick Stats */}
              <View style={[styles.quickStats, { borderTopColor: palette.border }]}>
                <View style={styles.quickStat}>
                  <View style={[styles.quickStatIcon, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
                    <Ionicons name="calendar" size={16} color={palette.tint} />
                  </View>
                  <ThemedText type="defaultSemiBold" style={styles.quickStatValue}>
                    {sessions.length}
                  </ThemedText>
                  <ThemedText style={[styles.quickStatLabel, { color: palette.muted }]}>
                    Sessions
                  </ThemedText>
                </View>
                <View style={[styles.quickStatDivider, { backgroundColor: palette.border }]} />
                <View style={styles.quickStat}>
                  <View style={[styles.quickStatIcon, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                    <Ionicons name="star" size={16} color={palette.warning} />
                  </View>
                  <ThemedText type="defaultSemiBold" style={styles.quickStatValue}>
                    {avgRating}
                  </ThemedText>
                  <ThemedText style={[styles.quickStatLabel, { color: palette.muted }]}>
                    Avg Rating
                  </ThemedText>
                </View>
                <View style={[styles.quickStatDivider, { backgroundColor: palette.border }]} />
                <View style={styles.quickStat}>
                  <View style={[styles.quickStatIcon, { backgroundColor: withAlpha(palette.success, 0.07) }]}>
                    <Ionicons name="ribbon" size={16} color={palette.success} />
                  </View>
                  <ThemedText type="defaultSemiBold" style={styles.quickStatValue}>
                    {awards.length}
                  </ThemedText>
                  <ThemedText style={[styles.quickStatLabel, { color: palette.muted }]}>
                    Badges
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
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveTab(tab.key);
                    }}
                    style={[
                      styles.tab,
                      isActive ? [styles.tabActive, { backgroundColor: palette.tint }] : undefined,
                    ]}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={16}
                      color={isActive ? palette.onPrimary : palette.muted}
                    />
                    <ThemedText
                      style={[
                        styles.tabLabel,
                        { color: isActive ? palette.onPrimary : palette.muted },
                        isActive && styles.tabLabelActive,
                      ]}
                    >
                      {tab.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Progress Tab */}
            {activeTab === 'progress' && (
              <Animated.View entering={FadeIn} style={styles.tabContent}>
                {/* Skills Overview */}
                {skills.length > 0 ? (
                  <>
                    <SkillsSummary skills={skills} />
                    <SkillRadar
                      skills={skills}
                      title="Skill Overview"
                      showDetailedList={true}
                    />
                  </>
                ) : (
                  <EmptyMetrics
                    icon="analytics-outline"
                    title="No Skill Data Yet"
                    description="Skills will be tracked after completing training sessions"
                  />
                )}

                {/* Recent Sessions */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                      Recent Sessions
                    </ThemedText>
                    <ThemedText style={[styles.sectionCount, { color: palette.muted }]}>
                      {sessions.length} total
                    </ThemedText>
                  </View>

                  {sessions.length === 0 ? (
                    <EmptyMetrics
                      icon="calendar-outline"
                      title="No Sessions Yet"
                      description="Sessions will appear here once completed"
                    />
                  ) : (
                    <View style={styles.sessionsList}>
                      {sortedSessions.slice(0, 5).map((session, index) => (
                        <Animated.View
                          key={session.id}
                          entering={FadeInDown.delay(index * 50).springify()}
                        >
                          <Clickable
                            onPress={() => {
                              logger.press('SessionCard', { sessionId: session.id });
                              router.push(Routes.booking(session.bookingId));
                            }}
                          >
                            <SurfaceCard style={styles.sessionCard}>
                              <View style={styles.sessionHeader}>
                                <View style={styles.sessionInfo}>
                                  <ThemedText type="defaultSemiBold" style={styles.sessionCoach}>
                                    {session.coachName}
                                  </ThemedText>
                                  <ThemedText style={[styles.sessionDate, { color: palette.muted }]}>
                                    {formatDate(session.completedAt)}
                                  </ThemedText>
                                </View>
                                <View style={styles.rating}>
                                  <ThemedText type="defaultSemiBold" style={styles.ratingValue}>
                                    {session.performanceRating.toFixed(1)}
                                  </ThemedText>
                                  <Ionicons name="star" size={14} color={palette.warning} />
                                </View>
                              </View>

                              {session.skillsWorkedOn && session.skillsWorkedOn.length > 0 && (
                                <View style={styles.skillsRow}>
                                  {session.skillsWorkedOn.slice(0, 3).map((skill, idx) => (
                                    <View key={idx} style={[styles.skillPill, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
                                      <ThemedText style={[styles.skillText, { color: palette.tint }]}>
                                        {skill}
                                      </ThemedText>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </SurfaceCard>
                          </Clickable>
                        </Animated.View>
                      ))}
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* Badges Tab */}
            {activeTab === 'badges' && (
              <Animated.View entering={FadeIn} style={styles.tabContent}>
                {/* Shared Badges Section */}
                {sharedBadges.length > 0 && (
                  <SurfaceCard style={styles.sharedBadgesCard}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.success, 0.07) }]}>
                        <Ionicons name="share" size={16} color={palette.success} />
                      </View>
                      <View style={styles.sectionHeaderContent}>
                        <ThemedText type="defaultSemiBold">Shared With You</ThemedText>
                        <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                          Badges coaches wanted you to see
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.sharedBadgesList}>
                      {sharedBadges.map((award, index) => (
                        <Animated.View
                          key={award.id}
                          entering={FadeInRight.delay(index * 50).springify()}
                          style={[styles.sharedBadge, { borderColor: palette.border }]}
                        >
                          <View style={[styles.badgeIcon, { backgroundColor: withAlpha(getBadgeColor(award.badgeCategory, palette), 0.09) }]}>
                            <Ionicons name={getBadgeIcon(award.badgeCategory)} size={20} color={getBadgeColor(award.badgeCategory, palette)} />
                          </View>
                          <View style={styles.badgeContent}>
                            <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                            <ThemedText style={[styles.badgeReason, { color: palette.muted }]}>
                              {award.reason}
                            </ThemedText>
                            {award.note && (
                              <ThemedText style={[styles.badgeNote, { color: palette.text }]} numberOfLines={2}>
                                &quot;{award.note}&quot;
                              </ThemedText>
                            )}
                            <ThemedText style={[styles.badgeDate, { color: palette.muted }]}>
                              {formatDate(award.awardedAt)}
                            </ThemedText>
                          </View>
                        </Animated.View>
                      ))}
                    </View>
                  </SurfaceCard>
                )}

                {/* All Badges */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                      Badge Log
                    </ThemedText>
                    <View style={[styles.countBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                      <ThemedText style={[styles.countBadgeText, { color: palette.tint }]}>
                        {awards.length}
                      </ThemedText>
                    </View>
                  </View>

                  {coachOnlyCount > 0 && (
                    <View style={[styles.infoStrip, { backgroundColor: withAlpha(palette.icon, 0.03) }]}>
                      <Ionicons name="shield" size={14} color={palette.icon} />
                      <ThemedText style={[styles.infoStripText, { color: palette.muted }]}>
                        {coachOnlyCount} coach-only badge{coachOnlyCount > 1 ? 's are' : ' is'} hidden
                      </ThemedText>
                    </View>
                  )}

                  {awards.length === 0 ? (
                    <EmptyMetrics
                      icon="ribbon-outline"
                      title="No Badges Yet"
                      description="Badges will appear here when coaches award them"
                    />
                  ) : selectedChildId ? (
                    <>
                    <Clickable
                      onPress={() => router.push(Routes.childBadges(selectedChildId))}
                      style={[styles.viewAllLink, { borderColor: palette.border }]}
                    >
                      <Ionicons name="ribbon-outline" size={16} color={palette.tint} />
                      <ThemedText style={[styles.viewAllLinkText, { color: palette.tint }]}>
                        View all {awards.length} badge{awards.length !== 1 ? 's' : ''}
                      </ThemedText>
                      <Ionicons name="chevron-forward" size={14} color={palette.tint} />
                    </Clickable>
                    <View style={styles.badgeList}>
                      {awards.map((award, index) => (
                        <Animated.View
                          key={award.id}
                          entering={FadeInDown.delay(index * 50).springify()}
                        >
                          <SurfaceCard style={styles.badgeCard}>
                            <View style={styles.badgeCardHeader}>
                              <View style={[styles.badgeIcon, { backgroundColor: withAlpha(getBadgeColor(award.badgeCategory, palette), 0.09) }]}>
                                <Ionicons name={getBadgeIcon(award.badgeCategory)} size={20} color={getBadgeColor(award.badgeCategory, palette)} />
                              </View>
                              <View style={styles.badgeCardContent}>
                                <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                                <ThemedText style={[styles.badgeReason, { color: palette.muted }]}>
                                  {award.reason}
                                </ThemedText>
                              </View>
                              <ThemedText style={[styles.badgeDate, { color: palette.muted }]}>
                                {formatDate(award.awardedAt)}
                              </ThemedText>
                            </View>
                            <View style={styles.badgeCardFooter}>
                              <View style={[
                                styles.visibilityPill,
                                { backgroundColor: award.shared ? withAlpha(palette.success, 0.07) : withAlpha(palette.icon, 0.03) }
                              ]}>
                                <Ionicons
                                  name={award.shared ? 'share' : 'eye'}
                                  size={12}
                                  color={award.shared ? palette.success : palette.icon}
                                />
                                <ThemedText style={[
                                  styles.visibilityText,
                                  { color: award.shared ? palette.success : palette.icon }
                                ]}>
                                  {award.shared ? 'Shared with you' : 'Visible in app'}
                                </ThemedText>
                              </View>
                            </View>
                          </SurfaceCard>
                        </Animated.View>
                      ))}
                    </View>
                    </>
                  ) : null}
                </View>
              </Animated.View>
            )}

            {/* Goals Tab */}
            {activeTab === 'goals' && (
              <Animated.View entering={FadeIn} style={styles.tabContent}>
                <GoalsSummary
                  activeGoals={activeGoals.length}
                  completedGoals={completedGoals.length}
                />

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                      Active Goals
                    </ThemedText>
                    <View style={[styles.countBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                      <ThemedText style={[styles.countBadgeText, { color: palette.tint }]}>
                        {activeGoals.length}
                      </ThemedText>
                    </View>
                  </View>

                  {activeGoals.length === 0 ? (
                    <EmptyMetrics
                      icon="flag-outline"
                      title="No Active Goals"
                      description="Goals will appear here when set by coaches"
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
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions
/** Badge category → palette semantic color mapping. */
const BADGE_CATEGORY_COLORS: Record<string, (p: typeof Colors.light) => string> = {
  leadership: (p) => p.accent,
  consistency: (p) => p.info,
  technique: (p) => p.success,
  mindset: (p) => p.warning,
  teamwork: (p) => p.error,
  resilience: (p) => p.destructive,
};

function getBadgeColor(category: string | undefined, palette: typeof Colors.light): string {
  const getter = BADGE_CATEGORY_COLORS[category || ''];
  return getter ? getter(palette) : palette.tint;
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
  title: { ...Typography.display, letterSpacing: -0.6 },
  subtitle: { ...Typography.bodySmall, lineHeight: 20 },

  // Child Selector
  childSelector: {
    borderRadius: Radii.md,
    padding: Spacing.xxs,
  },
  childSelectorContent: {
    gap: Spacing.xs,
  },
  childTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.sm,
  },
  childTabActive: {},
  childAvatar: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: { ...Typography.caption },
  childName: { ...Typography.bodySmallSemiBold },
  childNameActive: {
    ...Typography.bodySemiBold,
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
  avatarText: { ...Typography.display },
  profileInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  profileName: { ...Typography.heading },
  profileBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  trendBadgeText: { ...Typography.caption },
  quickStats: {
    flexDirection: 'row',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  quickStatIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: Spacing.xxs,
  },
  quickStatValue: { ...Typography.heading },
  quickStatLabel: { ...Typography.micro, textTransform: 'uppercase',
    letterSpacing: 0.3 },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    padding: Spacing.xxs,
    gap: Spacing.xxs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
  },
  tabActive: {},
  tabLabel: { ...Typography.smallSemiBold },
  tabLabelActive: {
    ...Typography.bodySmallSemiBold,
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
  sectionTitle: { ...Typography.subheading },
  sectionCount: { ...Typography.caption },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  sectionHint: { ...Typography.caption },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  countBadgeText: { ...Typography.caption },

  // Sessions
  sessionsList: {
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
  sessionInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  sessionCoach: { ...Typography.body },
  sessionDate: { ...Typography.caption },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  ratingValue: { ...Typography.subheading },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  skillText: { ...Typography.caption },

  // Badges
  sharedBadgesCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sharedBadgesList: {
    gap: Spacing.sm,
  },
  sharedBadge: {
    flexDirection: 'row',
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  badgeReason: { ...Typography.caption },
  badgeNote: { ...Typography.caption, fontStyle: 'italic' },
  badgeDate: { ...Typography.caption },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
  },
  infoStripText: { ...Typography.caption },
  badgeList: {
    gap: Spacing.sm,
  },
  badgeCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  badgeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  badgeCardContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  badgeCardFooter: {
    flexDirection: 'row',
  },
  visibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  visibilityText: { ...Typography.caption },

  // View all link
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
  },
  viewAllLinkText: { ...Typography.smallSemiBold },

  // Goals
  goalsList: {
    gap: Spacing.sm,
  },
});
