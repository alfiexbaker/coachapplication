import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getChildrenForParent, getSessionsForAthlete, formatDate } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, SkillProgress, Goal } from '@/constants/types';
import { badgeService } from '@/services/badge-service';
import { videoService, type LocalVideo } from '@/services/video-service';
import { SkillRadar } from '@/components/analytics/skill-radar';
import { SkillsSummary, SkillCategoryGroup } from '@/components/analytics/skill-progress-bar';
import { StatsRow, EmptyMetrics, MetricsSummary } from '@/components/analytics/enhanced-stats';
import { GoalProgress, GoalsSummary } from '@/components/analytics/goal-progress';

const logger = createLogger('ParentDevelopmentScreen');

type TabType = 'progress' | 'badges' | 'goals' | 'videos';

export function ParentDevelopmentScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const children = getChildrenForParent(currentUser.id);
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id);
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [coachOnlyCount, setCoachOnlyCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('progress');
  const [childVideos, setChildVideos] = useState<LocalVideo[]>([]);

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const sessions = selectedChild ? getSessionsForAthlete(selectedChild.id) : [];

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
  const trendColor = trend === 'improving' ? Colors.light.success : trend === 'declining' ? Colors.light.error : palette.muted;

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  // Generate mock skills
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
        athleteId: selectedChild.id,
        title: 'Master 1v1 Dribbling',
        description: 'Improve close control and beat defenders consistently',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        progress: 65,
        milestones: [
          { id: 'm1', title: 'Complete 10 dribbling drills', isCompleted: true },
          { id: 'm2', title: 'Beat defender in 5 sessions', isCompleted: true },
          { id: 'm3', title: 'Use both feet consistently', isCompleted: false },
        ],
        status: 'ACTIVE',
        createdBy: 'COACH',
        createdById: 'coach-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'goal-2',
        athleteId: selectedChild.id,
        title: 'Improve Passing Accuracy',
        progress: 40,
        milestones: [
          { id: 'm4', title: 'Complete passing course', isCompleted: true },
          { id: 'm5', title: 'Achieve 80% accuracy', isCompleted: false },
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
    if (!selectedChildId || !currentUser) return;

    // Load badges
    badgeService
      .listAwardsForAthlete(selectedChildId)
      .then((childAwards) => {
        const supporterVisible = childAwards.filter((award) => award.visibility !== 'coach_only');
        setAwards(supporterVisible);
        setCoachOnlyCount(childAwards.length - supporterVisible.length);
      });

    // Load videos shared with parent
    videoService
      .getVideosByAthlete(selectedChildId, currentUser.id)
      .then((videos) => {
        setChildVideos(videos);
      });
  }, [selectedChildId, currentUser]);

  const sharedBadges = useMemo(() => awards.filter((award) => award.shared), [awards]);
  const activeGoals = goals.filter(g => g.status === 'ACTIVE');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');

  // Stats
  const avgRating = sessions.length > 0
    ? (sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length).toFixed(1)
    : '0.0';

  const tabs: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'progress', label: 'Progress', icon: 'stats-chart' },
    { key: 'badges', label: 'Badges', icon: 'ribbon' },
    { key: 'goals', label: 'Goals', icon: 'flag' },
    { key: 'videos', label: 'Videos', icon: 'videocam' },
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
              Tracking {children[0].name}'s progress
            </ThemedText>
          ) : children.length > 1 ? (
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              Track your children's progress
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
                      setSelectedChildId(child.id);
                      logger.press('ChildTab', { childId: child.id, childName: child.name });
                    }}
                    style={[
                      styles.childTab,
                      isSelected && [styles.childTabActive, { backgroundColor: palette.tint }],
                    ]}
                  >
                    <View style={[
                      styles.childAvatar,
                      { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : palette.border }
                    ]}>
                      <ThemedText style={[
                        styles.childAvatarText,
                        { color: isSelected ? '#fff' : palette.tint }
                      ]}>
                        {child.name.charAt(0)}
                      </ThemedText>
                    </View>
                    <ThemedText style={[
                      styles.childName,
                      { color: isSelected ? '#fff' : palette.text },
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
                <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
                  <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                    {selectedChild.name.charAt(0)}
                  </ThemedText>
                </View>
                <View style={styles.profileInfo}>
                  <ThemedText type="subtitle" style={styles.profileName}>
                    {selectedChild.name}
                  </ThemedText>
                  <View style={styles.profileBadges}>
                    <View style={[styles.trendBadge, { backgroundColor: trendColor + '20' }]}>
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
                  <View style={[styles.quickStatIcon, { backgroundColor: `${palette.tint}12` }]}>
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
                  <View style={[styles.quickStatIcon, { backgroundColor: '#F59E0B15' }]}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
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
                  <View style={[styles.quickStatIcon, { backgroundColor: `${palette.success}12` }]}>
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
                              router.push(`/bookings/${session.bookingId}`);
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
                                  <Ionicons name="star" size={14} color="#F59E0B" />
                                </View>
                              </View>

                              {session.skillsWorkedOn && session.skillsWorkedOn.length > 0 && (
                                <View style={styles.skillsRow}>
                                  {session.skillsWorkedOn.slice(0, 3).map((skill, idx) => (
                                    <View key={idx} style={[styles.skillPill, { backgroundColor: palette.tint + '12' }]}>
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
                      <View style={[styles.sectionIcon, { backgroundColor: `${palette.success}12` }]}>
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
                          <View style={[styles.badgeIcon, { backgroundColor: getBadgeColor(award.badgeCategory) + '15' }]}>
                            <Ionicons name={getBadgeIcon(award.badgeCategory)} size={20} color={getBadgeColor(award.badgeCategory)} />
                          </View>
                          <View style={styles.badgeContent}>
                            <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                            <ThemedText style={[styles.badgeReason, { color: palette.muted }]}>
                              {award.reason}
                            </ThemedText>
                            {award.note && (
                              <ThemedText style={[styles.badgeNote, { color: palette.text }]} numberOfLines={2}>
                                "{award.note}"
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
                    <View style={[styles.countBadge, { backgroundColor: palette.tint + '15' }]}>
                      <ThemedText style={[styles.countBadgeText, { color: palette.tint }]}>
                        {awards.length}
                      </ThemedText>
                    </View>
                  </View>

                  {coachOnlyCount > 0 && (
                    <View style={[styles.infoStrip, { backgroundColor: `${palette.icon}08` }]}>
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
                  ) : (
                    <View style={styles.badgeList}>
                      {awards.map((award, index) => (
                        <Animated.View
                          key={award.id}
                          entering={FadeInDown.delay(index * 50).springify()}
                        >
                          <SurfaceCard style={styles.badgeCard}>
                            <View style={styles.badgeCardHeader}>
                              <View style={[styles.badgeIcon, { backgroundColor: getBadgeColor(award.badgeCategory) + '15' }]}>
                                <Ionicons name={getBadgeIcon(award.badgeCategory)} size={20} color={getBadgeColor(award.badgeCategory)} />
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
                                { backgroundColor: award.shared ? `${palette.success}12` : `${palette.icon}08` }
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
                  )}
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
                    <View style={[styles.countBadge, { backgroundColor: palette.tint + '15' }]}>
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

            {/* Videos Tab */}
            {activeTab === 'videos' && (
              <Animated.View entering={FadeIn} style={styles.tabContent}>
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                      Training Videos
                    </ThemedText>
                    <View style={[styles.countBadge, { backgroundColor: palette.tint + '15' }]}>
                      <ThemedText style={[styles.countBadgeText, { color: palette.tint }]}>
                        {childVideos.length}
                      </ThemedText>
                    </View>
                  </View>

                  {childVideos.length === 0 ? (
                    <EmptyMetrics
                      icon="videocam-outline"
                      title="No Videos Yet"
                      description="Videos shared by coaches will appear here"
                    />
                  ) : (
                    <View style={styles.videosList}>
                      {childVideos.map((video, index) => (
                        <Animated.View
                          key={video.id}
                          entering={FadeInDown.delay(index * 50).springify()}
                        >
                          <SurfaceCard style={styles.videoCard}>
                            <View style={styles.videoHeader}>
                              <View style={[styles.videoThumbnail, { backgroundColor: `${palette.tint}15` }]}>
                                <Ionicons name="videocam" size={24} color={palette.tint} />
                              </View>
                              <View style={styles.videoInfo}>
                                <ThemedText type="defaultSemiBold" style={styles.videoTitle}>
                                  {video.title}
                                </ThemedText>
                                <ThemedText style={[styles.videoMeta, { color: palette.muted }]}>
                                  {video.duration
                                    ? `${Math.floor(video.duration / 60)}:${String(Math.floor(video.duration % 60)).padStart(2, '0')}`
                                    : 'Video'}{' '}
                                  - {formatDate(video.createdAt)}
                                </ThemedText>
                                {video.description && (
                                  <ThemedText style={[styles.videoDescription, { color: palette.text }]} numberOfLines={2}>
                                    {video.description}
                                  </ThemedText>
                                )}
                              </View>
                            </View>
                            {video.coachName && (
                              <View style={styles.videoFooter}>
                                <Ionicons name="person-circle-outline" size={14} color={palette.muted} />
                                <ThemedText style={[styles.coachName, { color: palette.muted }]}>
                                  From {video.coachName}
                                </ThemedText>
                              </View>
                            )}
                            {video.tags.length > 0 && (
                              <View style={styles.videoTags}>
                                {video.tags.slice(0, 3).map((tag) => (
                                  <View key={tag} style={[styles.videoTag, { backgroundColor: `${palette.tint}10` }]}>
                                    <ThemedText style={[styles.videoTagText, { color: palette.tint }]}>
                                      {tag}
                                    </ThemedText>
                                  </View>
                                ))}
                              </View>
                            )}
                          </SurfaceCard>
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

  // Child Selector
  childSelector: {
    borderRadius: Radii.md,
    padding: 4,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  childName: {
    fontSize: 14,
    fontWeight: '500',
  },
  childNameActive: {
    fontWeight: '700',
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
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  trendBadgeText: {
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
    gap: Spacing.xs,
  },
  quickStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 4,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderContent: {
    flex: 1,
    gap: 2,
  },
  sectionHint: {
    fontSize: 12,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

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
    gap: 2,
  },
  sessionCoach: {
    fontSize: 15,
  },
  sessionDate: {
    fontSize: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 16,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  skillText: {
    fontSize: 11,
    fontWeight: '600',
  },

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
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContent: {
    flex: 1,
    gap: 4,
  },
  badgeReason: {
    fontSize: 12,
  },
  badgeNote: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  badgeDate: {
    fontSize: 11,
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.md,
  },
  infoStripText: {
    fontSize: 12,
  },
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
    gap: 4,
  },
  badgeCardFooter: {
    flexDirection: 'row',
  },
  visibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  visibilityText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Goals
  goalsList: {
    gap: Spacing.sm,
  },

  // Videos
  videosList: {
    gap: Spacing.sm,
  },
  videoCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  videoHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  videoThumbnail: {
    width: 56,
    height: 56,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    flex: 1,
    gap: 4,
  },
  videoTitle: {
    fontSize: 15,
  },
  videoMeta: {
    fontSize: 12,
  },
  videoDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  videoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  coachName: {
    fontSize: 12,
  },
  videoTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.xs,
  },
  videoTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  videoTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
