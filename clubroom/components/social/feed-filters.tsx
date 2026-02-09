import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Pressable,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { Club } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

// ─── Types ──────────────────────────────────────────────────────

export type FeedFilter =
  | 'all'
  | 'announcement'
  | 'photo'
  | 'event'
  | 'achievement'
  | 'session_announcement';

export interface FeedFiltersProps {
  activeFilter: FeedFilter;
  onFilterChange: (filter: FeedFilter) => void;
}

export interface ClubHubCardProps {
  clubs: Club[];
}

export interface EmptyFeedStateProps {
  hasClubs: boolean;
  filter: FeedFilter;
  isCoach: boolean;
}

// ─── Constants ──────────────────────────────────────────────────

const FEED_FILTERS: { key: FeedFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'session_announcement', label: 'Sessions', icon: 'fitness-outline' },
  { key: 'announcement', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'achievement', label: 'Achievements', icon: 'trophy-outline' },
  { key: 'photo', label: 'Photos', icon: 'images-outline' },
  { key: 'event', label: 'Events', icon: 'calendar-outline' },
];

// ─── Filter Tabs ────────────────────────────────────────────────

function FeedFiltersInner({ activeFilter, onFilterChange }: FeedFiltersProps) {
  const { colors: palette } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContainer}
    >
      {FEED_FILTERS.map((filter) => (
        <Pressable
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
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Club Hub Card ──────────────────────────────────────────────

function ClubHubCardInner({ clubs }: ClubHubCardProps) {
  const { colors: palette } = useTheme();

  if (clubs.length === 0) return null;

  return (
    <View style={styles.clubsRow}>
      {clubs.slice(0, 3).map((club) => (
        <Pressable
          key={club.id}
          style={[
            styles.clubPill,
            { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: withAlpha(palette.tint, 0.15) },
          ]}
          onPress={() =>
            router.push(Routes.club(club.id))
          }
        >
          <View style={[styles.clubPillIcon, { backgroundColor: palette.tint }]}>
            <ThemedText style={[styles.clubPillIconText, { color: palette.onPrimary }]}>
              {club.badge?.slice(0, 2) || club.name.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={styles.clubPillName} numberOfLines={1}>
            {club.name}
          </ThemedText>
        </Pressable>
      ))}
      {clubs.length > 3 && (
        <Pressable
          style={[
            styles.clubPill,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          onPress={() => router.push(Routes.CLUB_HUB)}
        >
          <ThemedText style={[styles.clubPillMore, { color: palette.muted }]}>
            +{clubs.length - 3} more
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

// ─── Empty Feed State ───────────────────────────────────────────

function EmptyFeedStateInner({ hasClubs, filter, isCoach }: EmptyFeedStateProps) {
  const { colors: palette } = useTheme();

  if (!hasClubs) {
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
        <View style={styles.emptyStateActions}>
          <Pressable
            style={[styles.emptyStateButton, { backgroundColor: palette.tint }]}
            onPress={() => router.push(Routes.CLUB_HUB)}
          >
            <Ionicons name="shield-outline" size={18} color={palette.onPrimary} />
            <ThemedText style={[styles.emptyButtonLabel, { color: palette.onPrimary }]}>
              Join Club
            </ThemedText>
          </Pressable>
          <Pressable
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
          </Pressable>
        </View>
      </View>
    );
  }

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
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Filter tabs
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
  // Club pills
  clubsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
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
  // Empty state
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
    flexDirection: 'row',
    gap: Spacing.sm,
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

// ─── Exports ────────────────────────────────────────────────────

export const FeedFilters = React.memo(FeedFiltersInner);
export const ClubHubCard = React.memo(ClubHubCardInner);
export const EmptyFeedState = React.memo(EmptyFeedStateInner);
export default FeedFilters;
