import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ChildSwitcher } from '@/components/ChildSwitcher';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { hasChildren } from '@/utils/user-helpers';
import { getBookingsForAthlete, formatDate } from '@/constants/mock-data';
import { badgeService } from '@/services/badge-service';
import { socialFeedService } from '@/services/social-feed-service';
import { progressService } from '@/services/progress-service';
import type { BadgeAward, Club } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

const logger = createLogger('UserHomeScreen');

export function UserHomeScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentBadges, setRecentBadges] = useState<BadgeAward[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [stats, setStats] = useState({ sessions: 0, badges: 0, level: 1 });
  const [streakInfo, setStreakInfo] = useState<{
    currentStreak: number;
    nextMilestone: number;
    daysToNextMilestone: number;
    streakLabel: string;
  } | null>(null);

  // Default to first child if user has children (no "All" for badges)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(() => {
    if (hasChildren(currentUser) && currentUser?.children?.[0]) {
      return currentUser.children[0].childId;
    }
    return null;
  });

  // Get the athlete ID to use for data loading
  const athleteId = selectedChildId || currentUser?.id;

  const loadData = useCallback(async () => {
    if (!athleteId) return;

    setError(null);
    try {
      // Load recent badges for selected child/athlete
      const badges = await badgeService.listAwardsForAthlete(athleteId);
      setRecentBadges(badges.slice(0, 3));

      // Load clubs
      const userClubs = socialFeedService.getUserClubs(currentUser?.id || '');
      setClubs(userClubs);

      // Load progress stats for selected child/athlete
      const progress = await progressService.getAthleteProgress(athleteId, 'athlete');
      setStats({
        sessions: progress.totalSessions,
        badges: progress.totalBadges,
        level: progress.currentLevel.level,
      });

      // Load streak info for selected child/athlete
      const streak = await badgeService.getStreakInfo(athleteId);
      setStreakInfo(streak);
    } catch (err) {
      logger.error('Failed to load home data', err);
      setError('Failed to load data. Pull down to refresh.');
    } finally {
      setLoading(false);
    }
  }, [athleteId, currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (!currentUser) return null;

  const upcomingBookings = getBookingsForAthlete(currentUser.id)
    .filter((b) => new Date(b.scheduledAt) > new Date() && b.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const nextSession = upcomingBookings[0];

  // Quick action items
  const quickActions = [
    { icon: 'search', label: 'Find Coach', route: '/(tabs)/more', color: palette.tint },
    { icon: 'analytics', label: 'My Progress', route: '/development/my-progress', color: palette.success },
    { icon: 'chatbubbles', label: 'Messages', route: '/(tabs)/messages', color: palette.accent },
    { icon: 'calendar', label: 'Bookings', route: '/(tabs)/bookings', color: palette.tint },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.tint}
            colors={[palette.tint]}
          />
        }
      >
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Hey, {currentUser.name?.split(' ')[0] || 'Athlete'}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Your training journey
          </ThemedText>
        </View>

        {/* Child Switcher - no "All" option to avoid messy badge aggregation */}
        {hasChildren(currentUser) && currentUser.children && (
          <ChildSwitcher
            childrenList={currentUser.children}
            selectedId={selectedChildId}
            onSelect={setSelectedChildId}
            showAll={false}
          />
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.tint} />
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={[styles.errorContainer, { backgroundColor: withAlpha(palette.error, 0.06), borderColor: palette.error }]}>
            <Ionicons name="alert-circle" size={20} color={palette.error} />
            <ThemedText style={[styles.errorText, { color: palette.error }]}>{error}</ThemedText>
          </View>
        )}

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: withAlpha(palette.tint, 0.03), borderColor: withAlpha(palette.tint, 0.12) }]}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name="calendar" size={18} color={palette.tint} />
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>{stats.sessions}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Sessions</ThemedText>
            </View>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
              <Ionicons name="ribbon" size={18} color={palette.warning} />
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>{stats.badges}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Badges</ThemedText>
            </View>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <Ionicons name="trophy" size={18} color={palette.success} />
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>Lv.{stats.level}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Level</ThemedText>
            </View>
          </View>
        </View>

        {/* Streak Card - WOW Factor */}
        {streakInfo && (
          <Clickable
            style={[styles.streakCard, { backgroundColor: withAlpha(palette.warning, 0.12), borderColor: withAlpha(palette.warning, 0.25) }]}
            onPress={() => router.push(Routes.BADGES_INDEX)}
          >
            <View style={styles.streakContent}>
              <View style={[styles.streakIconContainer, { backgroundColor: withAlpha(palette.warning, 0.19) }]}>
                <Ionicons name="flame" size={28} color={palette.warning} />
              </View>
              <View style={styles.streakInfo}>
                <View style={styles.streakHeader}>
                  <ThemedText style={[styles.streakNumber, { color: palette.warning }]}>{streakInfo.currentStreak}</ThemedText>
                  <ThemedText style={[styles.streakWeeks, { color: palette.warning }]}>week streak</ThemedText>
                </View>
                <ThemedText style={[styles.streakLabel, { color: palette.text }]}>
                  {streakInfo.streakLabel}
                </ThemedText>
              </View>
              <View style={styles.streakProgress}>
                <ThemedText style={[styles.streakProgressText, { color: palette.muted }]} numberOfLines={1}>
                  {streakInfo.daysToNextMilestone > 0
                    ? `${streakInfo.daysToNextMilestone} to next badge`
                    : 'Max streak!'}
                </ThemedText>
                <Ionicons name="chevron-forward" size={18} color={palette.muted} />
              </View>
            </View>
          </Clickable>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <Clickable
              key={index}
              style={[styles.quickAction, { backgroundColor: withAlpha(action.color, 0.06), borderColor: withAlpha(action.color, 0.15) }]}
              onPress={() => router.push(action.route as Href)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: withAlpha(action.color, 0.12) }]}>
                <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={20} color={action.color} />
              </View>
              <ThemedText style={[styles.quickActionLabel, { color: action.color }]} numberOfLines={1}>{action.label}</ThemedText>
            </Clickable>
          ))}
        </View>

        {/* Next Session Card */}
        {nextSession ? (
          <SurfaceCard
            style={styles.nextSession}
            onPress={() => router.push(Routes.booking(nextSession.id))}
          >
            <View style={styles.sessionHeader}>
              <View style={[styles.sessionIconCircle, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <Ionicons name="time" size={20} color={palette.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold" style={{ ...Typography.caption, color: palette.tint, textTransform: 'uppercase' }}>
                  Next Session
                </ThemedText>
                <ThemedText type="subtitle" style={styles.coachName} numberOfLines={1}>
                  {nextSession.coachName}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </View>
            <View style={styles.sessionDetails}>
              <View style={styles.sessionDetail}>
                <Ionicons name="calendar-outline" size={16} color={palette.muted} />
                <ThemedText style={{ color: palette.muted }} numberOfLines={1}>
                  {formatDate(nextSession.scheduledAt)}
                </ThemedText>
              </View>
              <View style={styles.sessionDetail}>
                <Ionicons name="location-outline" size={16} color={palette.muted} />
                <ThemedText style={{ color: palette.muted }} numberOfLines={1}>
                  {nextSession.location}
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        ) : (
          <SurfaceCard style={styles.noSessionCard}>
            <View style={[styles.noSessionIcon, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
              <Ionicons name="calendar-outline" size={28} color={palette.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">No Upcoming Sessions</ThemedText>
              <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                Book a session to start training
              </ThemedText>
            </View>
            <Clickable
              style={[styles.bookButton, { backgroundColor: palette.tint }]}
              onPress={() => router.push(Routes.MORE)}
            >
              <ThemedText style={{ ...Typography.smallSemiBold, color: palette.surface }}>Find Coach</ThemedText>
            </Clickable>
          </SurfaceCard>
        )}

        {/* Recent Badges */}
        {recentBadges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Recent Badges</ThemedText>
              <Clickable onPress={() => router.push(Routes.BADGES_INDEX)}>
                <ThemedText style={{ ...Typography.small, color: palette.tint }}>View All</ThemedText>
              </Clickable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesScroll}
            >
              {recentBadges.map((badge) => (
                <View key={badge.id} style={[styles.badgeCard, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                  <View style={[styles.badgeIconCircle, { backgroundColor: palette.tint }]}>
                    <Ionicons name="ribbon" size={18} color={palette.surface} />
                  </View>
                  <ThemedText style={styles.badgeLabel} numberOfLines={1}>{badge.badgeLabel}</ThemedText>
                  {badge.badgeCategory && (
                    <Chip dense style={{ marginTop: Spacing.xxs }}>{badge.badgeCategory}</Chip>
                  )}
                </View>
              ))}
              <Clickable
                style={[styles.viewAllBadges, { borderColor: palette.border }]}
                onPress={() => router.push(Routes.BADGES_INDEX)}
              >
                <Ionicons name="arrow-forward" size={18} color={palette.tint} />
                <ThemedText style={ { color: palette.tint, ...Typography.caption }}>See All</ThemedText>
              </Clickable>
            </ScrollView>
          </View>
        )}

        {/* My Clubs */}
        {clubs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>My Clubs</ThemedText>
              <Clickable onPress={() => router.push(Routes.CLUB_HUB)}>
                <ThemedText style={{ ...Typography.small, color: palette.tint }}>View All</ThemedText>
              </Clickable>
            </View>
            {clubs.slice(0, 2).map((club) => (
              <SurfaceCard
                key={club.id}
                style={styles.clubCard}
                onPress={() => router.push(Routes.club(club.id))}
              >
                <View style={[styles.clubBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                  <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]}>
                    {club.badge || club.name.slice(0, 2).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{club.name}</ThemedText>
                  <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                    {club.memberCount} members
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.muted} />
              </SurfaceCard>
            ))}
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
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  header: {
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  title: { ...Typography.display, letterSpacing: -0.6 },
  subtitle: { ...Typography.bodySmall, lineHeight: 20,
    fontWeight: '500' },
  loadingContainer: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  errorText: { ...Typography.bodySmall, flex: 1 },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { ...Typography.subheading },
  statLabel: { ...Typography.caption },
  statDivider: {
    width: 1,
    height: 32,
  },
  // Streak card
  streakCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  streakIconContainer: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  streakNumber: { ...Typography.display },
  streakWeeks: { ...Typography.bodySmallSemiBold },
  streakLabel: { ...Typography.smallSemiBold },
  streakProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  streakProgressText: { ...Typography.caption },
  // Quick actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickAction: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { ...Typography.smallSemiBold },
  // Session card
  nextSession: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sessionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachName: { ...Typography.subheading },
  sessionDetails: {
    gap: Spacing.xs,
    marginLeft: 44 + Spacing.sm, // Align with content after icon (avatar + gap)
  },
  sessionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  // No session card
  noSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  noSessionIcon: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  // Sections
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { ...Typography.subheading },
  // Badges
  badgesScroll: {
    gap: Spacing.sm,
  },
  badgeCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    minWidth: 100,
    gap: Spacing.xs,
  },
  badgeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: { ...Typography.caption, textAlign: 'center',
    maxWidth: 80 },
  viewAllBadges: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    minWidth: 70,
    gap: Spacing.xs,
  },
  // Clubs
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  clubBadge: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeText: { ...Typography.subheading },
});
