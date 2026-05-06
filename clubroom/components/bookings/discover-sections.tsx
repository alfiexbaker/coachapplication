/**
 * Discover Sections — Individual memoized section components for the bookings discover feed.
 *
 * Each section hides itself when it has no data (empty = hidden, not "no data" message).
 */

import { memo, useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { SessionOfferingCard } from '@/components/sessions/session-offering-card';
import { CoachCardCompact } from './coach-card-compact';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { AccessibleListCell } from '@/components/ui/list-accessibility';
import type {
  SessionOffering,
  CoachProfile,
  GroupSession,
} from '@/constants/types';

// ─── Section Header ───────────────────────────────────────────────

interface SectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  count?: number;
  onViewAll?: () => void;
}

const SectionHeader = memo(function SectionHeader({
  icon,
  title,
  count,
  onViewAll,
}: SectionHeaderProps) {
  const { colors: palette } = useTheme();

  return (
    <Row align="center" gap="xs" style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={palette.tint} />
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {count != null && count > 0 && (
        <View style={[styles.countBadge, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
          <ThemedText style={[styles.countText, { color: palette.tint }]}>{count}</ThemedText>
        </View>
      )}
      {onViewAll && (
        <Clickable
          onPress={onViewAll}
          accessibilityLabel={`View all ${title}`}
          style={styles.viewAllButton}
        >
          <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>View all</ThemedText>
          <Ionicons name="chevron-forward" size={14} color={palette.tint} />
        </Clickable>
      )}
    </Row>
  );
});

// ─── This Week Section ────────────────────────────────────────────

interface ThisWeekSectionProps {
  offerings: SessionOffering[];
  onOfferingPress: (offering: SessionOffering) => void;
}

export const ThisWeekSection = memo(function ThisWeekSection({
  offerings,
  onOfferingPress,
}: ThisWeekSectionProps) {
  if (offerings.length === 0) return null;

  return (
    <Column gap="xs" style={styles.section}>
      <SectionHeader icon="calendar-outline" title="This Week" count={offerings.length} />
      {offerings.slice(0, 4).map((offering) => (
        <SessionOfferingCard
          key={offering.id}
          offering={offering}
          onPress={() => onOfferingPress(offering)}
          showCoach
        />
      ))}
    </Column>
  );
});

// ─── Your Coaches Section ─────────────────────────────────────────

interface YourCoachesSectionProps {
  coaches: CoachProfile[];
  onCoachPress: (coachId: string) => void;
  onFindCoachPress: () => void;
}

export const YourCoachesSection = memo(function YourCoachesSection({
  coaches,
  onCoachPress,
  onFindCoachPress,
}: YourCoachesSectionProps) {
  const { colors: palette } = useTheme();

  const renderCoach = useCallback(
    ({ item }: { item: CoachProfile }) => (
      <CoachCardCompact coach={item} onPress={onCoachPress} />
    ),
    [onCoachPress],
  );

  if (coaches.length === 0) return null;

  return (
    <Column gap="xs" style={styles.sectionNoPad}>
      <View style={styles.sectionHeaderPad}>
        <SectionHeader icon="people-outline" title="Your Coaches" />
      </View>
      <FlatList
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
        data={coaches}
        renderItem={renderCoach}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        ListFooterComponent={
          <SurfaceCard
            style={styles.findMoreCard}
            onPress={onFindCoachPress}
            accessibilityLabel="Find more coaches"
          >
            <Column align="center" gap="xs">
              <View
                style={[styles.findMoreIcon, { backgroundColor: withAlpha(palette.tint, 0.1) }]}
              >
                <Ionicons name="add" size={24} color={palette.tint} />
              </View>
              <ThemedText style={[styles.findMoreText, { color: palette.tint }]}>Map</ThemedText>
            </Column>
          </SurfaceCard>
        }
      />
    </Column>
  );
});

// ─── Club Training Section ────────────────────────────────────────

interface ClubTrainingSectionProps {
  sessions: GroupSession[];
  onSessionPress: (sessionId: string) => void;
}

export const ClubTrainingSection = memo(function ClubTrainingSection({
  sessions,
  onSessionPress,
}: ClubTrainingSectionProps) {
  const { colors: palette } = useTheme();

  if (sessions.length === 0) return null;

  const formatSchedule = (session: GroupSession): string => {
    if (session.isRecurring && session.recurringPattern) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `Every ${days[session.recurringPattern.dayOfWeek]} · ${session.recurringPattern.startTime}`;
    }
    if (session.schedule.length > 0) {
      const next = session.schedule[0];
      const date = new Date(next.date);
      return `${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${next.startTime}`;
    }
    return '';
  };

  return (
    <Column gap="xs" style={styles.section}>
      <SectionHeader icon="shield-outline" title="Club Training" count={sessions.length} />
      {sessions.slice(0, 3).map((session) => (
        <SurfaceCard
          key={session.id}
          style={styles.clubCard}
          onPress={() => onSessionPress(session.id)}
          accessibilityLabel={`${session.title} club training`}
        >
          <Row align="center" gap="sm">
            <View
              style={[styles.clubIcon, { backgroundColor: withAlpha(palette.tint, 0.12) }]}
            >
              <Ionicons name="shield" size={18} color={palette.tint} />
            </View>
            <Column gap="micro" style={styles.clubContent}>
              <ThemedText style={styles.clubTitle} numberOfLines={1}>
                {session.title}
              </ThemedText>
              <Row align="center" gap="xxs">
                <Ionicons name="calendar-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.clubMeta, { color: palette.muted }]} numberOfLines={1}>
                  {formatSchedule(session)}
                </ThemedText>
              </Row>
              <Row align="center" gap="xxs">
                <Ionicons name="location-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.clubMeta, { color: palette.muted }]} numberOfLines={1}>
                  {session.venueName || session.location}
                </ThemedText>
              </Row>
            </Column>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </Row>
        </SurfaceCard>
      ))}
    </Column>
  );
});

// ─── Open Sessions Section ────────────────────────────────────────

interface OpenSessionsSectionProps {
  offerings: SessionOffering[];
  onOfferingPress: (offering: SessionOffering) => void;
}

export const OpenSessionsSection = memo(function OpenSessionsSection({
  offerings,
  onOfferingPress,
}: OpenSessionsSectionProps) {
  if (offerings.length === 0) return null;

  const handleViewAll = useCallback(() => {
    router.push(Routes.DISCOVER_SESSIONS);
  }, []);

  return (
    <Column gap="xs" style={styles.section}>
      <SectionHeader
        icon="globe-outline"
        title="Open Sessions"
        count={offerings.length}
        onViewAll={offerings.length > 3 ? handleViewAll : undefined}
      />
      {offerings.slice(0, 3).map((offering) => (
        <SessionOfferingCard
          key={offering.id}
          offering={offering}
          onPress={() => onOfferingPress(offering)}
          showCoach
        />
      ))}
    </Column>
  );
});

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.md,
  },
  sectionNoPad: {
    // horizontal list manages its own padding
  },
  sectionHeaderPad: {
    paddingHorizontal: Spacing.md,
  },
  sectionHeader: {
    minHeight: 32,
  },
  sectionTitle: {
    ...Typography.subheading,
    flex: 1,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  countText: {
    ...Typography.micro,
    fontWeight: '700',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
  },
  viewAllText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  horizontalList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  // Coach "Find more" card
  findMoreCard: {
    width: 100,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findMoreIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findMoreText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  // Club training card
  clubCard: {
    padding: Spacing.sm,
  },
  clubIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubContent: {
    flex: 1,
    minWidth: 0,
  },
  clubTitle: {
    ...Typography.subheading,
    flexShrink: 1,
  },
  clubMeta: {
    ...Typography.caption,
    flex: 1,
  },
});
