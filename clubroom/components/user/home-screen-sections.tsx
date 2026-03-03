/**
 * UserHomeScreen — Sections: StatsRow, StreakCard, QuickActions, NextSession, RecentBadges, MyClubs.
 */
import { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
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
import { formatTime } from '@/utils/format';
import type { BadgeAward, Club } from '@/constants/types';

const QUICK_ACTION_DEFS = [
  { id: 'find_coach', icon: 'search', label: 'Find Coach', route: Routes.DISCOVER_MAP, primary: true },
  {
    id: 'my_progress',
    icon: 'analytics',
    label: 'My Progress',
    route: Routes.DEVELOPMENT_MY_PROGRESS,
    primary: false,
  },
  { id: 'health', icon: 'medkit-outline', label: 'Health', route: Routes.HEALTH, primary: false },
  { id: 'bookings', icon: 'calendar', label: 'Bookings', route: Routes.BOOKINGS, primary: false },
] as const;

type QuickActionId = (typeof QUICK_ACTION_DEFS)[number]['id'];

const QuickActionTile = memo(function QuickActionTile({
  icon,
  label,
  primary,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  primary: boolean;
  onPress: () => void;
}) {
  const { colors: palette } = useTheme();
  const iconColor = primary ? palette.onPrimary : palette.tint;
  const iconBackgroundColor = primary
    ? withAlpha(palette.onPrimary, 0.2)
    : withAlpha(palette.tint, 0.09);
  return (
    <Clickable
      style={[
        styles.quickAction,
        {
          backgroundColor: primary ? palette.tint : palette.surface,
          borderColor: primary ? palette.tint : palette.border,
        },
      ]}
      onPress={onPress}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.quickActionIcon,
          {
            backgroundColor: iconBackgroundColor,
          },
        ]}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Column gap="micro" style={styles.quickActionCopy}>
        <ThemedText
          style={[styles.quickActionLabel, { color: primary ? palette.onPrimary : palette.text }]}
          numberOfLines={2}
        >
          {label}
        </ThemedText>
      </Column>
    </Clickable>
  );
});

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
      value: String(stats.sessions ?? 0),
      label: 'Sessions',
    },
    {
      icon: 'ribbon' as const,
      color: palette.warning,
      value: String(stats.badges ?? 0),
      label: 'Badges',
    },
    {
      icon: 'trophy' as const,
      color: palette.success,
      value: String(stats.level ?? 0),
      label: 'Level',
    },
  ];
  return (
    <Row
      style={[
        styles.statsRow,
        {
          backgroundColor: withAlpha(palette.tint, 0.03),
          borderColor: withAlpha(palette.tint, 0.12),
        },
      ]}
    >
      {items.map((item, i) => (
        <View key={item.label} style={styles.statItem}>
          <Row align="center" gap="xs" style={styles.statItemContent}>
            <View style={[styles.statIcon, { backgroundColor: withAlpha(item.color, 0.09) }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <View style={styles.statText}>
              <ThemedText type="defaultSemiBold" style={styles.statValue} numberOfLines={1}>
                {item.value}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]} numberOfLines={1}>
                {item.label}
              </ThemedText>
            </View>
          </Row>
          {i < items.length - 1 && (
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          )}
        </View>
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
      onPress={() => router.push(Routes.DEVELOPMENT_MY_PROGRESS)}
    >
      <Row align="center" gap="sm" style={styles.streakBody}>
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
          <ThemedText style={[styles.streakLabel, { color: palette.text }]} numberOfLines={2}>
            {streakInfo.streakLabel}
          </ThemedText>
        </View>
        <Row align="center" gap={4} style={styles.streakMeta}>
          <ThemedText
            style={[styles.streakProgressText, { color: palette.muted }]}
            numberOfLines={1}
          >
            {streakInfo.daysToNextMilestone > 0
              ? `${streakInfo.daysToNextMilestone} to badge`
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
  const handlePress = useCallback((route: Href) => {
    router.push(route);
  }, []);

  const actions = useMemo(
    () =>
      QUICK_ACTION_DEFS.map((action) => ({
        ...action,
        onPress: () => handlePress(action.route),
      })),
    [handlePress],
  );
  return (
    <Row wrap gap="sm">
      {actions.map((action) => (
        <QuickActionTile
          key={action.id as QuickActionId}
          icon={action.icon}
          label={action.label}
          primary={action.primary}
          onPress={action.onPress}
        />
      ))}
    </Row>
  );
});

// --- NextSession ---
interface Booking {
  id: string;
  coachName?: string;
  scheduledAt: string;
  location: string;
  status: string;
  isGroupSession?: boolean;
  serviceType?: string;
  service?: string;
  maxParticipants?: number;
}

function getSessionTypeLabel(booking: Booking): string {
  if (booking.serviceType?.trim()) return booking.serviceType;
  if (booking.service?.trim()) return booking.service;
  if (booking.isGroupSession || (booking.maxParticipants ?? 1) > 1) return 'Group session';
  return '1-to-1 session';
}

export const NextSessionCard = memo(function NextSessionCard({ booking }: { booking?: Booking }) {
  const { colors: palette } = useTheme();
  if (!booking) {
    return (
      <SurfaceCard style={styles.noSessionCard}>
        <Row align="center" gap="sm">
          <View style={[styles.noSessionIcon, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <Ionicons name="calendar-outline" size={22} color={palette.tint} />
          </View>
          <View style={styles.noSessionCopy}>
            <ThemedText type="defaultSemiBold" style={styles.noSessionTitle} numberOfLines={1}>
              No upcoming sessions
            </ThemedText>
            <ThemedText style={[styles.noSessionSubtitle, { color: palette.muted }]} numberOfLines={2}>
              Book your next session to keep training momentum.
            </ThemedText>
          </View>
        </Row>
        <Clickable
          style={[styles.bookButton, { backgroundColor: palette.tint }]}
          onPress={() => router.push(Routes.DISCOVER_MAP)}
        >
          <Row align="center" justify="center" gap="xs">
            <Ionicons name="search" size={14} color={palette.surface} />
            <ThemedText style={[styles.bookButtonText, { color: palette.surface }]}>
              Find a Coach
            </ThemedText>
          </Row>
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
        <Column flex>
          <ThemedText
            type="defaultSemiBold"
            style={{ ...Typography.caption, color: palette.tint, textTransform: 'uppercase' }}
          >
            Next Session
          </ThemedText>
          <ThemedText type="subtitle" style={styles.coachName} numberOfLines={1}>
            {booking.coachName}
          </ThemedText>
        </Column>
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
          <Ionicons name="time-outline" size={16} color={palette.muted} />
          <ThemedText style={{ color: palette.muted }} numberOfLines={1}>
            {formatTime(booking.scheduledAt)}
          </ThemedText>
        </Row>
        <Row align="center" gap="sm">
          <Ionicons
            name={booking.isGroupSession ? 'people-outline' : 'person-outline'}
            size={16}
            color={palette.muted}
          />
          <ThemedText style={{ color: palette.muted }} numberOfLines={1}>
            {getSessionTypeLabel(booking)}
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
          <Column flex>
            <ThemedText type="defaultSemiBold">{club.name}</ThemedText>
            <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
              {club.memberCount} members
            </ThemedText>
          </Column>
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </SurfaceCard>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  statsRow: {
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    paddingHorizontal: Spacing.xs,
  },
  statItemContent: {
    justifyContent: 'center',
  },
  statText: {
    minWidth: 0,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { ...Typography.bodySemiBold },
  statLabel: { ...Typography.caption },
  statDivider: {
    position: 'absolute',
    right: 0,
    top: Spacing.xs,
    bottom: Spacing.xs,
    width: 1,
  },
  streakCard: { padding: Spacing.md, borderRadius: Radii.lg, borderWidth: 1 },
  streakBody: {
    alignItems: 'center',
  },
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
  streakLabel: { ...Typography.smallSemiBold, lineHeight: Typography.caption.lineHeight },
  streakProgress: {
    /* layout moved to Row */
  },
  streakMeta: {
    minWidth: 88,
    justifyContent: 'flex-end',
  },
  streakProgressText: { ...Typography.caption, textAlign: 'right', flexShrink: 1 },
  quickActionsGrid: {
    /* layout moved to Row */
  },
  quickAction: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 88,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionCopy: {
    flex: 1,
    minWidth: 0,
  },
  quickActionLabel: { ...Typography.smallSemiBold, flexShrink: 1 },
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
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  noSessionCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.micro,
  },
  noSessionTitle: {
    ...Typography.subheading,
  },
  noSessionSubtitle: {
    ...Typography.small,
    lineHeight: Typography.caption.lineHeight,
  },
  noSessionIcon: {
    width: 42,
    height: 42,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButton: {
    minHeight: 40,
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    ...Typography.smallSemiBold,
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
