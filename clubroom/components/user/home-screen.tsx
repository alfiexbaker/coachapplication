import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getBookingsForAthlete, formatDate } from '@/constants/mock-data';
import { badgeService } from '@/services/badge-service';
import { socialFeedService } from '@/services/social-feed-service';
import { progressService } from '@/services/progress-service';
import type { BadgeAward, Club } from '@/constants/types';

export function UserHomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [recentBadges, setRecentBadges] = useState<BadgeAward[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [stats, setStats] = useState({ sessions: 0, badges: 0, level: 1 });

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      // Load recent badges
      const badges = await badgeService.listAwardsForAthlete(currentUser.id);
      setRecentBadges(badges.slice(0, 3));

      // Load clubs
      const userClubs = socialFeedService.getUserClubs(currentUser.id);
      setClubs(userClubs);

      // Load progress stats
      const progress = await progressService.getAthleteProgress(currentUser.id, 'athlete');
      setStats({
        sessions: progress.totalSessions,
        badges: progress.totalBadges,
        level: progress.currentLevel.level,
      });
    } catch (error) {
      console.error('Failed to load home data:', error);
    }
  }, [currentUser?.id]);

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
    { icon: 'calendar', label: 'Bookings', route: '/(tabs)/bookings', color: '#8B5CF6' },
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

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: `${palette.tint}08`, borderColor: `${palette.tint}20` }]}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="calendar" size={18} color={palette.tint} />
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>{stats.sessions}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Sessions</ThemedText>
            </View>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="ribbon" size={18} color="#F59E0B" />
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>{stats.badges}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Badges</ThemedText>
            </View>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${palette.success}15` }]}>
              <Ionicons name="trophy" size={18} color={palette.success} />
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>Lv.{stats.level}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Level</ThemedText>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickAction, { backgroundColor: `${action.color}10`, borderColor: `${action.color}25` }]}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                <Ionicons name={action.icon as any} size={20} color={action.color} />
              </View>
              <ThemedText style={[styles.quickActionLabel, { color: action.color }]}>{action.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Next Session Card */}
        {nextSession ? (
          <SurfaceCard
            style={styles.nextSession}
            onPress={() => router.push({ pathname: '/(tabs)/bookings/[id]', params: { id: nextSession.id } })}
          >
            <View style={styles.sessionHeader}>
              <View style={[styles.sessionIconCircle, { backgroundColor: `${palette.tint}15` }]}>
                <Ionicons name="time" size={20} color={palette.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold" style={{ color: palette.tint, fontSize: 12, textTransform: 'uppercase' }}>
                  Next Session
                </ThemedText>
                <ThemedText type="subtitle" style={styles.coachName}>
                  {nextSession.coachName}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </View>
            <View style={styles.sessionDetails}>
              <View style={styles.sessionDetail}>
                <Ionicons name="calendar-outline" size={16} color={palette.muted} />
                <ThemedText style={{ color: palette.muted }}>
                  {formatDate(nextSession.scheduledAt)}
                </ThemedText>
              </View>
              <View style={styles.sessionDetail}>
                <Ionicons name="location-outline" size={16} color={palette.muted} />
                <ThemedText style={{ color: palette.muted }}>
                  {nextSession.location}
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        ) : (
          <SurfaceCard style={styles.noSessionCard}>
            <View style={[styles.noSessionIcon, { backgroundColor: `${palette.tint}10` }]}>
              <Ionicons name="calendar-outline" size={28} color={palette.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">No Upcoming Sessions</ThemedText>
              <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                Book a session to start training
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.bookButton, { backgroundColor: palette.tint }]}
              onPress={() => router.push('/(tabs)/more')}
            >
              <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Find Coach</ThemedText>
            </TouchableOpacity>
          </SurfaceCard>
        )}

        {/* Recent Badges */}
        {recentBadges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Recent Badges</ThemedText>
              <TouchableOpacity onPress={() => router.push('/badges')}>
                <ThemedText style={{ color: palette.tint, fontSize: 13 }}>View All</ThemedText>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesScroll}
            >
              {recentBadges.map((badge) => (
                <View key={badge.id} style={[styles.badgeCard, { backgroundColor: `${palette.tint}10` }]}>
                  <View style={[styles.badgeIconCircle, { backgroundColor: palette.tint }]}>
                    <Ionicons name="ribbon" size={18} color="#fff" />
                  </View>
                  <ThemedText style={styles.badgeLabel} numberOfLines={1}>{badge.badgeLabel}</ThemedText>
                  {badge.badgeCategory && (
                    <Chip dense style={{ marginTop: 4 }}>{badge.badgeCategory}</Chip>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={[styles.viewAllBadges, { borderColor: palette.border }]}
                onPress={() => router.push('/badges')}
              >
                <Ionicons name="arrow-forward" size={18} color={palette.tint} />
                <ThemedText style={{ color: palette.tint, fontSize: 12, fontWeight: '600' }}>See All</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* My Clubs */}
        {clubs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>My Clubs</ThemedText>
              <TouchableOpacity onPress={() => router.push('/(tabs)/club-hub')}>
                <ThemedText style={{ color: palette.tint, fontSize: 13 }}>View All</ThemedText>
              </TouchableOpacity>
            </View>
            {clubs.slice(0, 2).map((club) => (
              <SurfaceCard
                key={club.id}
                style={styles.clubCard}
                onPress={() => router.push({ pathname: '/club/[id]', params: { id: club.id } })}
              >
                <View style={[styles.clubBadge, { backgroundColor: `${palette.tint}15` }]}>
                  <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]}>
                    {club.badge || club.name.slice(0, 2).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{club.name}</ThemedText>
                  <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                    {club.memberCount} members
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.muted} />
              </SurfaceCard>
            ))}
          </View>
        )}

        {/* View Progress CTA */}
        <SurfaceCard
          style={[styles.progressCTA, { backgroundColor: `${palette.success}08`, borderColor: `${palette.success}25` }]}
          onPress={() => router.push('/development/my-progress')}
        >
          <View style={[styles.progressCTAIcon, { backgroundColor: `${palette.success}15` }]}>
            <Ionicons name="analytics" size={24} color={palette.success} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold">View My Progress</ThemedText>
            <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
              Track your skills, goals, and achievements
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.success} />
        </SurfaceCard>
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
  },
  statLabel: {
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
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
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachName: {
    fontSize: 16,
    fontWeight: '700',
  },
  sessionDetails: {
    gap: Spacing.xs,
    marginLeft: 56, // Align with content after icon
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
    borderRadius: 26,
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
  sectionTitle: {
    fontSize: 16,
  },
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
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 80,
  },
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
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Progress CTA
  progressCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  progressCTAIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
