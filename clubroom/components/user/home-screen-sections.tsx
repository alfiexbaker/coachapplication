/**
 * UserHomeScreen — Sections: StatsRow, StreakCard, QuickActions, NextSession, RecentBadges, MyClubs.
 */
import { memo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatDate } from '@/hooks/use-home-screen';
import type { BadgeAward, Club } from '@/constants/types';

// --- StatsRow ---
export const StatsRow = memo(function StatsRow({
  stats,
}: {
  stats: { sessions: number; badges: number; level: number };
}) {
  const { colors: palette } = useTheme();
  const items = [
    {
      icon: 'calendar' as const,
      color: palette.tint,
      value: String(stats.sessions),
      label: 'Sessions',
    },
    {
      icon: 'ribbon' as const,
      color: palette.warning,
      value: String(stats.badges),
      label: 'Badges',
    },
    { icon: 'trophy' as const, color: palette.success, value: `Lv.${stats.level}`, label: 'Level' },
  ];
  return (
    <Row
      align="center"
      justify="space-around"
      style={[
        styles.statsRow,
        {
          backgroundColor: withAlpha(palette.tint, 0.03),
          borderColor: withAlpha(palette.tint, 0.12),
        },
      ]}
    >
      {items.map((item, i) => (
        <Row key={item.label} align="center">
          {i > 0 && <View style={[styles.statDivider, { backgroundColor: palette.border }]} />}
          <Row align="center" gap="sm">
            <View style={[styles.statIcon, { backgroundColor: withAlpha(item.color, 0.09) }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>
                {item.value}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                {item.label}
              </ThemedText>
            </View>
          </Row>
        </Row>
      ))}
    </Row>
  );
});

// --- StreakCard ---
interface StreakInfo {
  currentStreak: number;
  nextMilestone: number;
  daysToNextMilestone: number;
  streakLabel: string;
}
export const StreakCard = memo(function StreakCard({ streakInfo }: { streakInfo: StreakInfo }) {
  const { colors: palette } = useTheme();
  return (
    <Clickable
      style={[
        styles.streakCard,
        {
          backgroundColor: withAlpha(palette.warning, 0.12),
          borderColor: withAlpha(palette.warning, 0.25),
        },
      ]}
      onPress={() => router.push(Routes.BADGES_INDEX)}
    >
      <Row align="center" gap="md">
        <View
          style={[
            styles.streakIconContainer,
            { backgroundColor: withAlpha(palette.warning, 0.19) },
          ]}
        >
          <Ionicons name="flame" size={28} color={palette.warning} />
        </View>
        <View style={styles.streakInfo}>
          <Row align="baseline" gap="xs">
            <ThemedText style={[styles.streakNumber, { color: palette.warning }]}>
              {streakInfo.currentStreak}
            </ThemedText>
            <ThemedText style={[styles.streakWeeks, { color: palette.warning }]}>
              week streak
            </ThemedText>
          </Row>
          <ThemedText style={[styles.streakLabel, { color: palette.text }]}>
            {streakInfo.streakLabel}
          </ThemedText>
        </View>
        <Row align="center" gap={4}>
          <ThemedText
            style={[styles.streakProgressText, { color: palette.muted }]}
            numberOfLines={1}
          >
            {streakInfo.daysToNextMilestone > 0
              ? `${streakInfo.daysToNextMilestone} to next badge`
              : 'Max streak!'}
          </ThemedText>
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </Row>
      </Row>
    </Clickable>
  );
});

// --- QuickActions ---
export const QuickActionsGrid = memo(function QuickActionsGrid() {
  const { colors: palette } = useTheme();
  const actions = [
    { icon: 'search', label: 'Find Coach', route: '/(tabs)/more', color: palette.tint },
    {
      icon: 'analytics',
      label: 'My Progress',
      route: '/development/my-progress',
      color: palette.success,
    },
    { icon: 'chatbubbles', label: 'Messages', route: '/(tabs)/messages', color: palette.accent },
    { icon: 'calendar', label: 'Bookings', route: '/(tabs)/bookings', color: palette.tint },
  ];
  return (
    <Row wrap gap="sm">
      {actions.map((action, index) => (
        <Clickable
          key={index}
          style={[
            styles.quickAction,
            {
              backgroundColor: withAlpha(action.color, 0.06),
              borderColor: withAlpha(action.color, 0.15),
            },
          ]}
          onPress={() => router.push(action.route as Href)}
        >
          <View
            style={[styles.quickActionIcon, { backgroundColor: withAlpha(action.color, 0.12) }]}
          >
            <Ionicons
              name={action.icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={action.color}
            />
          </View>
          <ThemedText style={[styles.quickActionLabel, { color: action.color }]} numberOfLines={1}>
            {action.label}
          </ThemedText>
        </Clickable>
      ))}
    </Row>
  );
});

// --- NextSession ---
interface Booking {
  id: string;
  coachName: string;
  scheduledAt: string;
  location: string;
  status: string;
}
export const NextSessionCard = memo(function NextSessionCard({ booking }: { booking?: Booking }) {
  const { colors: palette } = useTheme();
  if (!booking) {
    return (
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
          <ThemedText style={{ ...Typography.smallSemiBold, color: palette.surface }}>
            Find Coach
          </ThemedText>
        </Clickable>
      </SurfaceCard>
    );
  }
  return (
    <SurfaceCard style={styles.nextSession} onPress={() => router.push(Routes.booking(booking.id))}>
      <Row align="center" gap="sm">
        <View
          style={[styles.sessionIconCircle, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
        >
          <Ionicons name="time" size={20} color={palette.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText
            type="defaultSemiBold"
            style={{ ...Typography.caption, color: palette.tint, textTransform: 'uppercase' }}
          >
            Next Session
          </ThemedText>
          <ThemedText type="subtitle" style={styles.coachName} numberOfLines={1}>
            {booking.coachName}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
      </Row>
      <View style={styles.sessionDetails}>
        <Row align="center" gap="sm">
          <Ionicons name="calendar-outline" size={16} color={palette.muted} />
          <ThemedText style={{ color: palette.muted }} numberOfLines={1}>
            {formatDate(booking.scheduledAt)}
          </ThemedText>
        </Row>
        <Row align="center" gap="sm">
          <Ionicons name="location-outline" size={16} color={palette.muted} />
          <ThemedText style={{ color: palette.muted }} numberOfLines={1}>
            {booking.location}
          </ThemedText>
        </Row>
      </View>
    </SurfaceCard>
  );
});

// --- RecentBadges ---
export const RecentBadgesSection = memo(function RecentBadgesSection({
  badges,
}: {
  badges: BadgeAward[];
}) {
  const { colors: palette } = useTheme();
  if (badges.length === 0) return null;
  return (
    <View style={styles.section}>
      <Row justify="space-between" align="center">
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Recent Badges
        </ThemedText>
        <Clickable onPress={() => router.push(Routes.BADGES_INDEX)}>
          <ThemedText style={{ ...Typography.small, color: palette.tint }}>View All</ThemedText>
        </Clickable>
      </Row>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.badgesScroll}
      >
        {badges.map((badge) => (
          <View
            key={badge.id}
            style={[styles.badgeCard, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
          >
            <View style={[styles.badgeIconCircle, { backgroundColor: palette.tint }]}>
              <Ionicons name="ribbon" size={18} color={palette.surface} />
            </View>
            <ThemedText style={styles.badgeLabel} numberOfLines={1}>
              {badge.badgeLabel}
            </ThemedText>
            {badge.badgeCategory && (
              <Chip dense style={{ marginTop: Spacing.xxs }}>
                {badge.badgeCategory}
              </Chip>
            )}
          </View>
        ))}
        <Clickable
          style={[styles.viewAllBadges, { borderColor: palette.border }]}
          onPress={() => router.push(Routes.BADGES_INDEX)}
        >
          <Ionicons name="arrow-forward" size={18} color={palette.tint} />
          <ThemedText style={{ color: palette.tint, ...Typography.caption }}>See All</ThemedText>
        </Clickable>
      </ScrollView>
    </View>
  );
});

// --- MyClubs ---
export const MyClubsSection = memo(function MyClubsSection({ clubs }: { clubs: Club[] }) {
  const { colors: palette } = useTheme();
  if (clubs.length === 0) return null;
  return (
    <View style={styles.section}>
      <Row justify="space-between" align="center">
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          My Clubs
        </ThemedText>
        <Clickable onPress={() => router.push(Routes.CLUB_HUB)}>
          <ThemedText style={{ ...Typography.small, color: palette.tint }}>View All</ThemedText>
        </Clickable>
      </Row>
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
  );
});

const styles = StyleSheet.create({
  statsRow: { padding: Spacing.md, borderRadius: Radii.lg, borderWidth: 1 },
  statItem: {
    /* layout moved to Row */
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
  statDivider: { width: 1, height: 32, marginHorizontal: Spacing.sm },
  streakCard: { padding: Spacing.md, borderRadius: Radii.lg, borderWidth: 1 },
  streakContent: {
    /* layout moved to Row */
  },
  streakIconContainer: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakInfo: { flex: 1, gap: Spacing.micro },
  streakHeader: {
    /* layout moved to Row */
  },
  streakNumber: { ...Typography.display },
  streakWeeks: { ...Typography.bodySmallSemiBold },
  streakLabel: { ...Typography.smallSemiBold },
  streakProgress: {
    /* layout moved to Row */
  },
  streakProgressText: { ...Typography.caption },
  quickActionsGrid: {
    /* layout moved to Row */
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
  nextSession: { padding: Spacing.md, gap: Spacing.md },
  sessionHeader: {
    /* layout moved to Row */
  },
  sessionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachName: { ...Typography.subheading },
  sessionDetails: { gap: Spacing.xs, marginLeft: 44 + Spacing.sm },
  sessionDetail: {
    /* layout moved to Row */
  },
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
  section: { gap: Spacing.sm },
  sectionHeader: {
    /* layout moved to Row */
  },
  sectionTitle: { ...Typography.subheading },
  badgesScroll: { gap: Spacing.sm },
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
  badgeLabel: { ...Typography.caption, textAlign: 'center', maxWidth: 80 },
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
  clubCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  clubBadge: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeText: { ...Typography.subheading },
});
