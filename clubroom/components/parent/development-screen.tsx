import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getChildrenForParent, getSessionsForAthlete, formatDate } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import type { BadgeAward } from '@/constants/types';
import { badgeService } from '@/services/badge-service';

const logger = createLogger('ParentDevelopmentScreen');

export function ParentDevelopmentScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const children = getChildrenForParent(currentUser.id);
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id);
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [coachOnlyCount, setCoachOnlyCount] = useState(0);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
        {/* Sticky Header with Child Selector */}
        <View style={[styles.stickyHeader, { backgroundColor: palette.background }]}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Development
            </ThemedText>
          </View>

          {children.length === 0 ? (
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              Add children to track their progress
            </ThemedText>
          ) : children.length === 1 ? (
            <View style={styles.singleChild}>
              <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
                Tracking {children[0].name}'s progress
              </ThemedText>
            </View>
          ) : (
            <View style={styles.childTabs}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsContent}>
                {children.map((child) => {
                  const isSelected = child.id === selectedChildId;
                  return (
                    <Pressable
                      key={child.id}
                      onPress={() => {
                        setSelectedChildId(child.id);
                        logger.press('ChildTab', { childId: child.id, childName: child.name });
                      }}
                      style={({ pressed }) => [
                        styles.childTab,
                        {
                          borderBottomColor: isSelected ? palette.tint : 'transparent',
                          opacity: pressed ? 0.6 : 1,
                        },
                      ]}>
                      <ThemedText
                        style={[
                          styles.tabText,
                          {
                            color: isSelected ? palette.tint : palette.muted,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}>
                        {child.name}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Content */}
        {sharedBadges.length > 0 ? (
          <SurfaceCard style={styles.sharedCard}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="defaultSemiBold">Shared badges</ThemedText>
              <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                Sent by coaches for supporters
              </ThemedText>
            </View>
            <View style={styles.sharedBadgeRow}>
              {sharedBadges.map((award) => (
                <View key={award.id} style={[styles.sharedBadge, { borderColor: palette.border }]}>
                  <View style={styles.sharedBadgeHeader}>
                    <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                    <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                      {formatDate(award.awardedAt)}
                    </ThemedText>
                  </View>
                  <ThemedText style={{ color: palette.muted, fontSize: 12 }}>{award.reason}</ThemedText>
                  {award.note ? (
                    <ThemedText style={{ color: palette.foreground, fontSize: 12 }} numberOfLines={2}>
                      {award.note}
                    </ThemedText>
                  ) : null}
                </View>
              ))}
            </View>
          </SurfaceCard>
        ) : null}

        {awards.length > 0 ? (
          <SurfaceCard style={styles.badgeLogCard}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="defaultSemiBold">Badge log</ThemedText>
              <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>Parent-visible history</ThemedText>
            </View>
            {coachOnlyCount > 0 ? (
              <View style={[styles.infoStrip, { backgroundColor: `${palette.icon}08` }]}>
                <Ionicons name="shield" size={14} color={palette.icon} />
                <ThemedText style={[styles.sectionHint, { color: palette.muted }]}> 
                  {coachOnlyCount} coach-only badge{coachOnlyCount > 1 ? 's are' : ' is'} hidden from parents
                </ThemedText>
              </View>
            ) : null}
            <View style={styles.badgeLogList}>
              {awards.map((award) => (
                <View key={award.id} style={[styles.badgeLogItem, { borderColor: palette.border }]}>
                  <View style={styles.badgeLogHeader}>
                    <View style={styles.badgeTitleRow}>
                      <Ionicons name="ribbon" size={16} color={palette.tint} />
                      <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                    </View>
                    <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                      {formatDate(award.awardedAt)}
                    </ThemedText>
                  </View>
                  <View style={styles.badgeMetaRow}>
                    <View style={[styles.badgePill, { backgroundColor: `${palette.tint}12` }]}>
                      <Ionicons name="book" size={12} color={palette.tint} />
                      <ThemedText style={[styles.pillText, { color: palette.tint }]}>{award.reason}</ThemedText>
                    </View>
                    <View
                      style={[
                        styles.badgePill,
                        {
                          backgroundColor: award.shared ? `${palette.success}12` : `${palette.icon}08`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={award.shared ? 'send' : 'lock-closed'}
                        size={12}
                        color={award.shared ? palette.success : palette.icon}
                      />
                      <ThemedText
                        style={[
                          styles.pillText,
                          { color: award.shared ? palette.success : palette.icon },
                        ]}
                      >
                        {award.shared ? 'Shared with supporters' : 'Visible in app'}
                      </ThemedText>
                    </View>
                  </View>
                  {award.note ? (
                    <ThemedText style={{ color: palette.foreground, lineHeight: 18 }} numberOfLines={3}>
                      {award.note}
                    </ThemedText>
                  ) : null}
                  {award.sessionId ? (
                    <View style={styles.badgeMetaRow}>
                      <Ionicons name="link" size={12} color={palette.icon} />
                      <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                        Linked to a session
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </SurfaceCard>
        ) : null}

        {children.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No children added
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              Add children to track their development
            </ThemedText>
          </View>
        ) : selectedChild ? (
          <View style={styles.progressContent}>
            {/* Stats Card */}
            <SurfaceCard style={styles.statsCard}>
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <ThemedText type="defaultSemiBold" style={styles.statValue}>
                    {sessions.length}
                  </ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                    Sessions
                  </ThemedText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <ThemedText type="defaultSemiBold" style={styles.statValue}>
                    {sessions.length > 0 ? (sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length).toFixed(1) : '0.0'}
                  </ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                    Avg Rating
                  </ThemedText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <View style={[styles.trendBadge, { backgroundColor: trendColor + '15' }]}>
                    <Ionicons name={trendIcon} size={16} color={trendColor} />
                  </View>
                  <ThemedText style={[styles.statLabel, { color: trendColor }]}>
                    {trendText}
                  </ThemedText>
                </View>
              </View>
            </SurfaceCard>

            {/* Sessions List */}
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Recent Sessions
              </ThemedText>

              {sessions.length === 0 ? (
                <SurfaceCard style={styles.emptyCard}>
                  <Ionicons name="calendar-outline" size={32} color={palette.icon} style={{ opacity: 0.3 }} />
                  <ThemedText type="defaultSemiBold" style={styles.emptyCardTitle}>
                    No sessions yet
                  </ThemedText>
                  <ThemedText style={[styles.emptyCardText, { color: palette.muted }]}>
                    Sessions will appear here once completed
                  </ThemedText>
                </SurfaceCard>
              ) : (
                <View style={styles.sessionsList}>
                  {sortedSessions.slice(0, 10).map((session) => (
                    <Clickable
                      key={session.id}
                      onPress={() => {
                        logger.press('SessionCard', { sessionId: session.id });
                        router.push(`/bookings/${session.bookingId}`);
                      }}>
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
                            <Ionicons name="star" size={16} color="#f59e0b" />
                          </View>
                        </View>

                        {session.skillsWorkedOn && session.skillsWorkedOn.length > 0 && (
                          <View style={styles.skills}>
                            {session.skillsWorkedOn.slice(0, 3).map((skill, index) => (
                              <View
                                key={index}
                                style={[styles.skillPill, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                                <ThemedText style={[styles.skillText, { color: palette.secondary }]}>
                                  {skill}
                                </ThemedText>
                              </View>
                            ))}
                          </View>
                        )}
                      </SurfaceCard>
                    </Clickable>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: Spacing['2xl'],
  },
  sharedCard: {
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  sectionHint: {
    fontSize: 12,
  },
  sharedBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  sharedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radii.card,
    gap: 4,
  },
  sharedBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeLogCard: {
    gap: Spacing.sm,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.md,
  },
  badgeLogList: {
    gap: Spacing.xs,
  },
  badgeLogItem: {
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  badgeLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badgeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stickyHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
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
  singleChild: {
    marginTop: 2,
  },
  childTabs: {
    marginTop: Spacing.sm,
    marginHorizontal: -Spacing.lg,
  },
  tabsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  childTab: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
  emptyState: {
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  progressContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  statsCard: {
    padding: Spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#00000010',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendBadge: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyCard: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyCardTitle: {
    marginTop: Spacing.xs,
    fontSize: 16,
  },
  emptyCardText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  sessionsList: {
    gap: Spacing.md,
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
    fontSize: 16,
    letterSpacing: -0.2,
  },
  sessionDate: {
    fontSize: 13,
    fontWeight: '500',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
