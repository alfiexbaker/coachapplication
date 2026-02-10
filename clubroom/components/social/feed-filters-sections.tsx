/**
 * Extracted sub-components for FeedFilters.
 *
 * FEED_FILTERS — filter definitions.
 * FilterTabsContent — horizontal filter tabs.
 * ClubPillRow — club pill row with overflow.
 * EmptyFeedNoClubs — empty state when user has no clubs.
 * EmptyFeedFiltered — empty state when filter yields no posts.
 */

import { memo, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { router, type Href } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Club } from '@/constants/types';
import type { FeedFilter } from './feed-filters';

// ─── Constants ───────────────────────────────────────────────────────────────

export const FEED_FILTERS: { key: FeedFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'session_announcement', label: 'Sessions', icon: 'fitness-outline' },
  { key: 'announcement', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'achievement', label: 'Achievements', icon: 'trophy-outline' },
  { key: 'photo', label: 'Photos', icon: 'images-outline' },
  { key: 'event', label: 'Events', icon: 'calendar-outline' },
];

// ─── FilterTabsContent ───────────────────────────────────────────────────────

interface FilterTabsContentProps {
  activeFilter: FeedFilter;
  onFilterChange: (filter: FeedFilter) => void;
  palette: ThemeColors;
}

export const FilterTabsContent = memo(function FilterTabsContent({
  activeFilter,
  onFilterChange,
  palette,
}: FilterTabsContentProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContainer}
    >
      {FEED_FILTERS.map((filter) => (
        <Clickable
          key={filter.key}
          style={[
            styles.filterTab,
            activeFilter === filter.key && {
              backgroundColor: withAlpha(palette.tint, 0.09),
              borderColor: palette.tint,
            },
            { borderColor: palette.border },
          ]}
          onPress={() => onFilterChange(filter.key)}
        >
          <ThemedText
            style={[
              styles.filterLabel,
              { color: activeFilter === filter.key ? palette.tint : palette.muted },
            ]}
          >
            {filter.label}
          </ThemedText>
        </Clickable>
      ))}
    </ScrollView>
  );
});

// ─── ClubPillRow ─────────────────────────────────────────────────────────────

interface ClubPillRowProps {
  clubs: Club[];
  palette: ThemeColors;
}

export const ClubPillRow = memo(function ClubPillRow({
  clubs,
  palette,
}: ClubPillRowProps) {
  if (clubs.length === 0) return null;

  return (
    <Row wrap gap="xs">
      {clubs.slice(0, 3).map((club) => (
        <Clickable
          key={club.id}
          style={[
            styles.clubPill,
            { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: withAlpha(palette.tint, 0.15) },
          ]}
          onPress={() => router.push(Routes.club(club.id))}
        >
          <View style={[styles.clubPillIcon, { backgroundColor: palette.tint }]}>
            <ThemedText style={[styles.clubPillIconText, { color: palette.onPrimary }]}>
              {club.badge?.slice(0, 2) || club.name.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={styles.clubPillName} numberOfLines={1}>
            {club.name}
          </ThemedText>
        </Clickable>
      ))}
      {clubs.length > 3 && (
        <Clickable
          style={[
            styles.clubPill,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          onPress={() => router.push(Routes.CLUB_HUB)}
        >
          <ThemedText style={[styles.clubPillMore, { color: palette.muted }]}>
            +{clubs.length - 3} more
          </ThemedText>
        </Clickable>
      )}
    </Row>
  );
});

// ─── EmptyFeedNoClubs ────────────────────────────────────────────────────────

interface EmptyFeedNoClubsProps {
  isCoach: boolean;
  palette: ThemeColors;
}

export const EmptyFeedNoClubs = memo(function EmptyFeedNoClubs({
  isCoach,
  palette,
}: EmptyFeedNoClubsProps) {
  return (
    <View style={styles.emptyStateContainer}>
      <View style={[styles.emptyStateIcon, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
        <Ionicons name="newspaper-outline" size={32} color={palette.tint} />
      </View>
      <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
        Your feed is empty
      </ThemedText>
      <ThemedText style={[styles.emptyDescription, { color: palette.muted }]}>
        {isCoach
          ? 'Join a club or create your own to share updates'
          : 'Join a club or follow coaches to see updates here'}
      </ThemedText>
      <Row gap="sm" style={styles.emptyStateActions}>
        <Clickable
          style={[styles.emptyStateButton, { backgroundColor: palette.tint }]}
          onPress={() => router.push(Routes.CLUB_HUB)}
        >
          <Ionicons name="shield-outline" size={18} color={palette.onPrimary} />
          <ThemedText style={[styles.emptyButtonLabel, { color: palette.onPrimary }]}>
            Join Club
          </ThemedText>
        </Clickable>
        <Clickable
          style={[styles.emptyStateButtonOutline, { borderColor: palette.border }]}
          onPress={() =>
            router.push(isCoach ? '/club/create' : ('/(tabs)/more' as Href))
          }
        >
          <Ionicons
            name={isCoach ? 'add-circle-outline' : 'search-outline'}
            size={18}
            color={palette.text}
          />
          <ThemedText style={styles.emptyButtonLabel}>
            {isCoach ? 'Create Club' : 'Find Coach'}
          </ThemedText>
        </Clickable>
      </Row>
    </View>
  );
});

// ─── EmptyFeedFiltered ───────────────────────────────────────────────────────

interface EmptyFeedFilteredProps {
  filter: FeedFilter;
  palette: ThemeColors;
}

export const EmptyFeedFiltered = memo(function EmptyFeedFiltered({
  filter,
  palette,
}: EmptyFeedFilteredProps) {
  return (
    <View style={styles.emptyStateContainer}>
      <View style={[styles.emptyStateIcon, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
        <Ionicons name="document-text-outline" size={28} color={palette.muted} />
      </View>
      <ThemedText style={[styles.emptyNoPostsText, { color: palette.muted }]}>
        {filter === 'all' ? 'No posts yet' : `No ${filter}s yet`}
      </ThemedText>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  filterScroll: {
    marginTop: Spacing.md,
  },
  filterContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterLabel: {
    ...Typography.small,
    fontWeight: '500',
  },
  // clubsRow replaced by Row primitive
  clubPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: 10,
    paddingRight: Spacing.xs + Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  clubPillIcon: {
    width: 22,
    height: 22,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubPillIconText: {
    ...Typography.micro,
    fontSize: 9,
    letterSpacing: 0,
    textTransform: 'none',
  },
  clubPillName: {
    ...Typography.smallSemiBold,
  },
  clubPillMore: {
    ...Typography.small,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.subheading,
    textAlign: 'center',
  },
  emptyDescription: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateActions: {
    marginTop: Spacing.sm,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  emptyStateButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  emptyButtonLabel: {
    ...Typography.bodySemiBold,
  },
  emptyNoPostsText: {
    ...Typography.body,
    textAlign: 'center',
  },
});
