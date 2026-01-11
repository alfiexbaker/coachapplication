import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Image, ScrollView, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ParentProgressSummary } from '@/components/progress';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getChildrenForParent, getSessionsForAthlete, formatDate } from '@/constants/mock-data';
import { badgeService } from '@/services/badge-service';
import { progressService, AthleteProgress } from '@/services/progress-service';
import type { User, BadgeAward } from '@/constants/types';

type HubSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  stat?: string | number;
  color?: string;
  unseenCount?: number;
};

type ChildStats = {
  sessions: number;
  badges: number;
  avgRating: number;
  unseenBadges: number;
};

export default function ChildrenHubScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [children, setChildren] = useState<User[]>([]);
  const [childStats, setChildStats] = useState<Record<string, ChildStats>>({});
  const [recentBadges, setRecentBadges] = useState<BadgeAward[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);

    const childrenData = getChildrenForParent(currentUser.id);
    setChildren(childrenData);

    // Load stats for each child
    const stats: Record<string, ChildStats> = {};
    const allRecentBadges: BadgeAward[] = [];

    for (const child of childrenData) {
      const sessions = getSessionsForAthlete(child.id);
      const awards = await badgeService.listAwardsForAthlete(child.id);
      const unseenCount = await badgeService.getUnseenBadgeCount(child.id);
      const avgRating = sessions.length > 0
        ? sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length
        : 0;

      // Get visible badges
      const visibleAwards = awards.filter(a => a.visibility !== 'coach_only');

      stats[child.id] = {
        sessions: sessions.length,
        badges: visibleAwards.length,
        avgRating,
        unseenBadges: unseenCount,
      };

      // Collect recent badges (last 7 days) for all children
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentAwards = visibleAwards.filter(
        a => new Date(a.awardedAt).getTime() > weekAgo
      );
      allRecentBadges.push(...recentAwards);
    }

    // Sort by date and take top 5
    allRecentBadges.sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());
    setRecentBadges(allRecentBadges.slice(0, 5));

    setChildStats(stats);
    setLoading(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Handle marking badge as seen when viewing
  const handleViewBadge = async (badge: BadgeAward) => {
    if (!badge.seenByParent) {
      await badgeService.markSeenByParent(badge.id);
      loadData(); // Refresh to update counts
    }
    // Navigate to child's badge detail
    router.push({
      pathname: '/children/badges/[childId]',
      params: { childId: badge.athleteId, highlightBadge: badge.id },
    });
  };

  // Calculate aggregate stats
  const totalSessions = Object.values(childStats).reduce((sum, s) => sum + s.sessions, 0);
  const totalBadges = Object.values(childStats).reduce((sum, s) => sum + s.badges, 0);
  const totalUnseenBadges = Object.values(childStats).reduce((sum, s) => sum + s.unseenBadges, 0);

  // Navigate to first child's progress, or show list if multiple
  const progressRoute = children.length === 1
    ? `/development/child-progress/${children[0].id}`
    : '/(tabs)/children';

  const hubSections: HubSection[] = [
    {
      id: 'progress',
      title: 'Progress',
      subtitle: 'View skill ratings and feedback',
      icon: 'trending-up-outline',
      route: progressRoute,
      stat: `${totalSessions} sessions`,
      color: palette.tint,
    },
    {
      id: 'badges',
      title: 'Badges',
      subtitle: 'Achievements and milestones',
      icon: 'ribbon-outline',
      route: '/badges',
      stat: `${totalBadges} earned`,
      color: '#F59E0B',
      unseenCount: totalUnseenBadges,
    },
    {
      id: 'goals',
      title: 'Goals',
      subtitle: 'Current objectives and targets',
      icon: 'flag-outline',
      route: '/bookings/objectives',
      stat: 'Active',
      color: palette.success,
    },
  ];

  // Quick stats for the header area
  const quickStats = [
    { label: 'Children', value: children.length },
    { label: 'Sessions', value: totalSessions },
    { label: 'New Badges', value: totalUnseenBadges, highlight: totalUnseenBadges > 0 },
  ];

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  if (!currentUser) return null;

  return (
    <PageContainer
      header={<PageHeader title="Children" subtitle="Track your children's progress and goals" />}
      gap={Spacing.md}
    >
      {/* Quick Stats Row */}
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <View style={styles.statsRow}>
          {quickStats.map((stat) => (
            <SurfaceCard
              key={stat.label}
              style={[
                styles.statCard,
                { borderColor: stat.highlight ? '#F59E0B' : palette.border },
                stat.highlight && { backgroundColor: '#F59E0B10' },
              ]}
            >
              <ThemedText type="heading" style={[styles.statValue, stat.highlight && { color: '#F59E0B' }]}>
                {stat.value}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: stat.highlight ? '#F59E0B' : palette.muted }]}>
                {stat.label}
              </ThemedText>
            </SurfaceCard>
          ))}
        </View>
      </Animated.View>

      {/* Recent Badges Section */}
      {recentBadges.length > 0 && (
        <Animated.View entering={FadeInDown.delay(75).springify()}>
          <SurfaceCard style={styles.recentBadgesCard}>
            <View style={styles.recentBadgesHeader}>
              <View style={styles.recentBadgesTitleRow}>
                <Ionicons name="ribbon" size={18} color="#F59E0B" />
                <ThemedText type="defaultSemiBold">Recent Badges</ThemedText>
              </View>
              <ThemedText style={[styles.recentBadgesHint, { color: palette.muted }]}>
                Tap to view details
              </ThemedText>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
              {recentBadges.map((badge) => (
                <Clickable key={badge.id} onPress={() => handleViewBadge(badge)}>
                  <View style={[
                    styles.badgeCard,
                    { borderColor: badge.seenByParent ? palette.border : '#F59E0B' },
                    !badge.seenByParent && { backgroundColor: '#F59E0B08' },
                  ]}>
                    {!badge.seenByParent && (
                      <View style={styles.newBadgeIndicator}>
                        <ThemedText style={styles.newBadgeText}>NEW</ThemedText>
                      </View>
                    )}
                    <View style={[styles.badgeIconCircle, { backgroundColor: '#F59E0B15' }]}>
                      <Ionicons name="ribbon" size={20} color="#F59E0B" />
                    </View>
                    <ThemedText type="defaultSemiBold" style={styles.badgeLabel} numberOfLines={1}>
                      {badge.badgeLabel}
                    </ThemedText>
                    <ThemedText style={[styles.badgeAthlete, { color: palette.muted }]} numberOfLines={1}>
                      {badge.athleteName}
                    </ThemedText>
                    <View style={styles.badgeCoachRow}>
                      <Ionicons name="person" size={10} color={palette.icon} />
                      <ThemedText style={[styles.badgeCoach, { color: palette.muted }]} numberOfLines={1}>
                        Coach {badge.coachName?.split(' ')[0]}
                      </ThemedText>
                    </View>
                  </View>
                </Clickable>
              ))}
            </ScrollView>
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Children Cards */}
      {children.length > 0 ? (
        <View style={styles.childrenContainer}>
          <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
            Select Child
          </ThemedText>
          <View style={styles.childrenGrid}>
            {children.map((child, index) => {
              const stats = childStats[child.id] || { sessions: 0, badges: 0, avgRating: 0, unseenBadges: 0 };
              return (
                <Animated.View
                  key={child.id}
                  entering={FadeInDown.delay(100 + index * 50).springify()}
                >
                  <Clickable
                    onPress={() => router.push({
                      pathname: '/development/child-progress/[childId]',
                      params: { childId: child.id },
                    })}
                  >
                    <SurfaceCard style={styles.childCard}>
                      <View style={styles.childHeader}>
                        <View style={[styles.childAvatar, { backgroundColor: `${palette.tint}10` }]}>
                          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                            {getInitials(child.name || child.username)}
                          </ThemedText>
                          {stats.unseenBadges > 0 && (
                            <View style={styles.unseenBadgeIndicator}>
                              <ThemedText style={styles.unseenBadgeCount}>
                                {stats.unseenBadges > 9 ? '9+' : stats.unseenBadges}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <View style={styles.childInfo}>
                          <View style={styles.childNameRow}>
                            <ThemedText type="defaultSemiBold" style={styles.childName}>
                              {child.name || child.username}
                            </ThemedText>
                            {stats.unseenBadges > 0 && (
                              <View style={[styles.newPill, { backgroundColor: '#F59E0B' }]}>
                                <ThemedText style={styles.newPillText}>
                                  {stats.unseenBadges} new
                                </ThemedText>
                              </View>
                            )}
                          </View>
                          <ThemedText style={[styles.childMeta, { color: palette.muted }]}>
                            {stats.sessions} sessions
                          </ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                      </View>

                      <View style={[styles.childStats, { borderTopColor: palette.border }]}>
                        <View style={styles.childStat}>
                          <Ionicons name="calendar" size={14} color={palette.tint} />
                          <ThemedText style={[styles.childStatText, { color: palette.muted }]}>
                            {stats.sessions} sessions
                          </ThemedText>
                        </View>
                        <Clickable
                          onPress={() => router.push({
                            pathname: '/children/badges/[childId]',
                            params: { childId: child.id },
                          })}
                        >
                          <View style={[
                            styles.childStat,
                            stats.unseenBadges > 0 && styles.childStatHighlight,
                            stats.unseenBadges > 0 && { backgroundColor: '#F59E0B15' },
                          ]}>
                            <Ionicons name="ribbon" size={14} color="#F59E0B" />
                            <ThemedText style={[styles.childStatText, { color: stats.unseenBadges > 0 ? '#F59E0B' : palette.muted }]}>
                              {stats.badges} badges
                            </ThemedText>
                          </View>
                        </Clickable>
                        {stats.avgRating > 0 && (
                          <View style={styles.childStat}>
                            <Ionicons name="star" size={14} color="#F59E0B" />
                            <ThemedText style={[styles.childStatText, { color: palette.muted }]}>
                              {stats.avgRating.toFixed(1)} avg
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </SurfaceCard>
                  </Clickable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      ) : (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <EmptyState
            icon="people-outline"
            title="No Children Added"
            message="Add children to your account to track their development and progress"
          />
        </Animated.View>
      )}

      {/* Hub Sections */}
      <View style={styles.sectionsContainer}>
        <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
          Quick Access
        </ThemedText>
        {hubSections.map((section, index) => (
          <Animated.View
            key={section.id}
            entering={FadeInDown.delay(200 + index * 50).springify()}
          >
            <Clickable onPress={() => router.push(section.route as any)}>
              <SurfaceCard style={[
                styles.sectionCard,
                section.unseenCount && section.unseenCount > 0 && { borderColor: section.color, borderWidth: 1 },
              ]}>
                <View style={styles.sectionRow}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: `${section.color || palette.tint}15` },
                    ]}
                  >
                    <Ionicons
                      name={section.icon}
                      size={24}
                      color={section.color || palette.tint}
                    />
                    {section.unseenCount && section.unseenCount > 0 && (
                      <View style={[styles.iconBadge, { backgroundColor: section.color }]}>
                        <ThemedText style={styles.iconBadgeText}>
                          {section.unseenCount > 9 ? '9+' : section.unseenCount}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <View style={styles.sectionContent}>
                    <View style={styles.sectionTitleRow}>
                      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                        {section.title}
                      </ThemedText>
                      {section.unseenCount && section.unseenCount > 0 ? (
                        <View style={[styles.newChip, { backgroundColor: section.color }]}>
                          <ThemedText style={styles.newChipText}>
                            {section.unseenCount} new
                          </ThemedText>
                        </View>
                      ) : section.stat ? (
                        <Chip dense>{section.stat}</Chip>
                      ) : null}
                    </View>
                    <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                      {section.subtitle}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                </View>
              </SurfaceCard>
            </Clickable>
          </Animated.View>
        ))}
      </View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <View style={styles.quickActions}>
          <Clickable
            style={[styles.actionButton, { backgroundColor: palette.tint }]}
            onPress={() => router.push('/(tabs)/more')}
          >
            <Ionicons name="search-outline" size={20} color="#FFFFFF" />
            <ThemedText style={styles.actionButtonText}>Find Coaches</ThemedText>
          </Clickable>
          <Clickable
            style={[styles.actionButtonSecondary, { borderColor: palette.border }]}
            onPress={() => router.push('/(tabs)/bookings')}
          >
            <Ionicons name="calendar-outline" size={20} color={palette.tint} />
            <ThemedText style={[styles.actionButtonTextSecondary, { color: palette.tint }]}>
              View Bookings
            </ThemedText>
          </Clickable>
        </View>
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  childrenContainer: {
    gap: Spacing.xs,
  },
  childrenGrid: {
    gap: Spacing.sm,
  },
  childCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  childInfo: {
    flex: 1,
    gap: 2,
  },
  childName: {
    fontSize: 16,
  },
  childMeta: {
    fontSize: 13,
  },
  childStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  childStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  childStatText: {
    fontSize: 12,
  },
  sectionsContainer: {
    gap: Spacing.xs,
  },
  sectionCard: {
    padding: Spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContent: {
    flex: 1,
    gap: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
  actionButtonTextSecondary: {
    fontWeight: '700',
    fontSize: 15,
  },
  // Recent badges section
  recentBadgesCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  recentBadgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentBadgesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  recentBadgesHint: {
    fontSize: 12,
  },
  badgeScroll: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  badgeCard: {
    width: 120,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    position: 'relative',
  },
  newBadgeIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  badgeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  badgeAthlete: {
    fontSize: 11,
    textAlign: 'center',
  },
  badgeCoachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgeCoach: {
    fontSize: 10,
  },
  // Child card enhancements
  childNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  newPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  unseenBadgeIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F59E0B',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unseenBadgeCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  childStatHighlight: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  // Hub section badges
  iconBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  iconBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  newChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.rounded,
  },
  newChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
