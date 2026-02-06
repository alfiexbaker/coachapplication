import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo, useEffect } from 'react';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { sessionHistory, athleteSkillLevels, getChildrenForParent, getSessionsForAthlete } from '@/constants/mock-data';
import { badgeService } from '@/services/badge-service';
import { hasChildren } from '@/utils/user-helpers';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

export default function StatisticsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // Parent-specific: child selection
  const children = useMemo(() => {
    if (currentUser && hasChildren(currentUser)) {
      return getChildrenForParent(currentUser.id);
    }
    return [];
  }, [currentUser]);

  const [selectedChildId, setSelectedChildId] = useState<string>(
    children.length > 0 ? children[0].id : ''
  );
  const [badgeCount, setBadgeCount] = useState(0);

  // Compute targetId for badge fetching
  const targetId = hasChildren(currentUser) ? selectedChildId : currentUser?.id;

  // Load badge count
  useEffect(() => {
    const fetchBadges = async () => {
      if (targetId) {
        const badges = await badgeService.listAwardsForAthlete(targetId);
        setBadgeCount(badges.filter(b => b.visibility !== 'coach_only').length);
      }
    };
    fetchBadges();
  }, [currentUser, selectedChildId, targetId]);

  // Get sessions filtered by selected child for parents
  // Map to a common shape so both sources share the same fields
  const sessions = useMemo(() => {
    if (hasChildren(currentUser) && selectedChildId) {
      return getSessionsForAthlete(selectedChildId).map((s) => ({
        id: s.id,
        coachName: s.coachName,
        athleteName: s.athleteName,
        focus: s.skillsWorkedOn[0] || 'General Training',
        durationMinutes: 60,
        rating: s.performanceRating,
        coachFeedback: s.notes,
        completedAt: s.completedAt,
      }));
    }
    // For USER, show their own sessions
    return sessionHistory;
  }, [currentUser, selectedChildId]);

  // Calculate stats
  const totalSessions = sessions.length;
  const totalHours = sessions.reduce((sum, session) => sum + (session.durationMinutes ?? 60), 0) / 60;
  // Calculate unique coaches (available for future stats display)
  void new Set(sessions.map((s) => s.coachName)).size;

  const stats = [
    {
      id: 'sessions',
      icon: 'calendar' as const,
      label: 'Total Sessions',
      value: totalSessions.toString(),
      color: '#10B981',
    },
    {
      id: 'hours',
      icon: 'time' as const,
      label: 'Training Hours',
      value: Math.round(totalHours).toString(),
      color: '#3B82F6',
    },
    {
      id: 'badges',
      icon: 'ribbon' as const,
      label: 'Badges Earned',
      value: badgeCount.toString(),
      color: '#8B5CF6',
    },
    {
      id: 'streak',
      icon: 'flame' as const,
      label: 'Week Streak',
      value: '3',
      color: '#F59E0B',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Child Selector for Parents */}
        {hasChildren(currentUser) && children.length > 0 && (
          <View style={styles.childSelector}>
            <ThemedText style={[styles.childLabel, { color: palette.muted }]}>
              ATHLETE
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.childTabs}>
                {children.map((child) => {
                  const isSelected = child.id === selectedChildId;
                  return (
                    <Pressable
                      key={child.id}
                      onPress={() => setSelectedChildId(child.id)}
                      style={[
                        styles.childTab,
                        {
                          backgroundColor: isSelected ? palette.tint : palette.surface,
                          borderColor: isSelected ? palette.tint : palette.border,
                        },
                      ]}>
                      <ThemedText
                        style={[
                          styles.childTabText,
                          {
                            color: isSelected ? palette.onPrimary : palette.text,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}>
                        {child.name}
                      </ThemedText>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color={palette.onPrimary} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <SurfaceCard key={stat.id} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: withAlpha(stat.color, 0.12) }]}>
                <Ionicons name={stat.icon} size={24} color={stat.color} />
              </View>
              <ThemedText type="title" style={styles.statValue}>
                {stat.value}
              </ThemedText>
              <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
            </SurfaceCard>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Sessions
          </ThemedText>
          <SurfaceCard style={styles.activityCard}>
            {sessions.slice(0, 5).map((session, index) => (
              <View key={session.id}>
                <View style={styles.activityItem}>
                  <View style={styles.activityContent}>
                    <View style={styles.sessionRow}>
                      <View style={[styles.activityDot, { backgroundColor: palette.tint }]} />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.activityTitle}>{session.focus ?? 'Training'}</ThemedText>
                        <ThemedText style={styles.activitySubtext}>
                          {session.coachName} · {session.durationMinutes ?? 60}m
                        </ThemedText>
                      </View>
                      <View style={styles.ratingRow}>
                        {[...Array(5)].map((_, i) => (
                          <Ionicons
                            key={i}
                            name={i < (session.rating || 0) ? 'star' : 'star-outline'}
                            size={14}
                            color={palette.warning}
                          />
                        ))}
                      </View>
                    </View>
                    {session.coachFeedback && (
                      <View style={[styles.feedbackBox, { backgroundColor: palette.surface }]}>
                        <ThemedText style={styles.feedbackText}>{session.coachFeedback}</ThemedText>
                      </View>
                    )}
                  </View>
                </View>
                {index < 4 && <View style={[styles.divider, { backgroundColor: palette.border }]} />}
              </View>
            ))}
          </SurfaceCard>
        </View>

        {/* Skills Progress */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Skills
          </ThemedText>
          <SurfaceCard style={styles.skillsCard}>
            {athleteSkillLevels
              .sort((a, b) => b.level - a.level)
              .slice(0, 6)
              .map((item, index) => (
                <View key={item.skill} style={styles.skillItem}>
                  <View style={styles.skillHeader}>
                    <ThemedText style={styles.skillName}>{item.skill}</ThemedText>
                    <ThemedText style={styles.skillLevel}>{item.level}</ThemedText>
                  </View>
                  <View style={[styles.skillBar, { backgroundColor: palette.border }]}>
                    <View
                      style={[
                        styles.skillFill,
                        { backgroundColor: palette.tint, width: `${item.level}%` },
                      ]}
                    />
                  </View>
                  {index < 5 && <View style={[styles.divider, { backgroundColor: palette.border }]} />}
                </View>
              ))}
          </SurfaceCard>
        </View>

        {/* Quick Links to Related Screens */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Explore More
          </ThemedText>
          <View style={styles.quickLinksGrid}>
            <Pressable
              style={[styles.quickLink, { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: withAlpha(palette.tint, 0.19) }]}
              onPress={() => {
                if (hasChildren(currentUser) && selectedChildId) {
                  router.push(Routes.developmentChildProgress(selectedChildId));
                } else {
                  router.push(Routes.DEVELOPMENT_MY_PROGRESS);
                }
              }}
            >
              <Ionicons name="analytics-outline" size={24} color={palette.tint} />
              <ThemedText style={[styles.quickLinkText, { color: palette.tint }]}>Full Progress</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.quickLink, { backgroundColor: '#8B5CF610', borderColor: '#8B5CF630' }]}
              onPress={() => {
                if (hasChildren(currentUser) && selectedChildId) {
                  router.push(Routes.childBadges(selectedChildId));
                } else {
                  router.push(Routes.BADGES);
                }
              }}
            >
              <Ionicons name="ribbon-outline" size={24} color="#8B5CF6" />
              <ThemedText style={[styles.quickLinkText, { color: '#8B5CF6' }]}>View Badges</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.quickLink, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B30' }]}
              onPress={() => router.push(Routes.BOOKINGS)}
            >
              <Ionicons name="calendar-outline" size={24} color="#F59E0B" />
              <ThemedText style={[styles.quickLinkText, { color: '#F59E0B' }]}>Book Session</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.quickLink, { backgroundColor: '#10B98110', borderColor: '#10B98130' }]}
              onPress={() => router.push(Routes.MESSAGES)}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#10B981" />
              <ThemedText style={[styles.quickLinkText, { color: '#10B981' }]}>Messages</ThemedText>
            </Pressable>
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
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  childSelector: {
    gap: Spacing.xs,
  },
  childLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  childTabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  childTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  childTabText: {
    ...Typography.body,
    letterSpacing: -0.2,
  },
  header: {
    gap: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySmall,
    opacity: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    ...Typography.display,
  },
  statLabel: {
    ...Typography.caption,
    opacity: 0.6,
    textAlign: 'center',
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    paddingLeft: Spacing.xs,
  },
  activityCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  activityItem: {
    paddingVertical: Spacing.xs,
  },
  activityContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
    marginTop: Spacing.xxs,
  },
  activityTitle: {
    ...Typography.bodySemiBold,
  },
  activitySubtext: {
    ...Typography.small,
    opacity: 0.6,
    marginTop: Spacing.micro,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
  },
  feedbackBox: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginLeft: Spacing.lg,
  },
  feedbackText: {
    ...Typography.small,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  skillsCard: {
    padding: Spacing.lg,
  },
  skillItem: {
    gap: Spacing.xs,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillName: {
    ...Typography.bodySemiBold,
  },
  skillLevel: {
    ...Typography.bodySmallSemiBold,
  },
  skillBar: {
    height: 8,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  skillFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  chartPlaceholder: {
    padding: Spacing.xl * 2,
    alignItems: 'center',
    gap: Spacing.md,
  },
  placeholderText: {
    ...Typography.bodySmall,
    opacity: 0.5,
    textAlign: 'center',
  },
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickLink: {
    flex: 1,
    minWidth: '47%',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  quickLinkText: {
    ...Typography.smallSemiBold,
  },
});
