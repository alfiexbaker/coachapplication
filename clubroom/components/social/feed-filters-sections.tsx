/**
 * Extracted sub-components for FeedFilters.
 *
 * FEED_FILTERS — filter definitions.
 * FilterTabsContent — horizontal filter tabs.
 * ClubPillRow — club pill row with overflow.
 * EmptyFeedNoClubs — empty state when user has no clubs.
 * EmptyFeedFiltered — empty state when filter yields no posts.
 */

import { memo } from 'react';
import { ScrollView, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Club } from '@/constants/types';
import type { FeedFilter } from './feed-filters';
import { styles } from './feed-filters-styles';

// ─── Constants ───────────────────────────────────────────────────────────────

export const FEED_FILTERS: { key: FeedFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'session_announcement', label: 'Sessions', icon: 'fitness-outline' },
  { key: 'announcement', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'achievement', label: 'Achievements', icon: 'trophy-outline' },
  { key: 'photo', label: 'Photos', icon: 'images-outline' },
  { key: 'video', label: 'Videos', icon: 'videocam-outline' },
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

export const ClubPillRow = memo(function ClubPillRow({ clubs, palette }: ClubPillRowProps) {
  if (clubs.length === 0) return null;

  return (
    <Row wrap gap="xs">
      {clubs.slice(0, 3).map((club) => (
        <Clickable
          key={club.id}
          style={[
            styles.clubPill,
            {
              backgroundColor: withAlpha(palette.tint, 0.06),
              borderColor: withAlpha(palette.tint, 0.15),
            },
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
          onPress={() => router.push(Routes.MY_CLUBS)}
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
        No updates yet
      </ThemedText>
      <ThemedText style={[styles.emptyDescription, { color: palette.muted }]}>
        {isCoach
          ? 'Join or create a club to publish matchday, session, and club updates.'
          : 'Join a club or book with a coach to keep club notices and session updates in one place.'}
      </ThemedText>
      <Row gap="sm" style={styles.emptyStateActions}>
        <Clickable
          style={[styles.emptyStateButton, { backgroundColor: palette.tint }]}
          onPress={() => router.push(Routes.MY_CLUBS)}
        >
          <Ionicons name="shield-outline" size={18} color={palette.onPrimary} />
          <ThemedText style={[styles.emptyButtonLabel, { color: palette.onPrimary }]}>
            Join Club
          </ThemedText>
        </Clickable>
        <Clickable
          style={[styles.emptyStateButtonOutline, { borderColor: palette.border }]}
          onPress={() => router.push(isCoach ? '/club/create' : Routes.DISCOVER_MAP)}
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
  const filterLabel =
    filter === 'session_announcement'
      ? 'session updates'
      : (FEED_FILTERS.find((candidate) => candidate.key === filter)?.label.toLowerCase() ??
        'updates');

  return (
    <View style={styles.emptyStateContainer}>
      <View style={[styles.emptyStateIcon, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
        <Ionicons name="document-text-outline" size={28} color={palette.muted} />
      </View>
      <ThemedText style={[styles.emptyNoPostsText, { color: palette.muted }]}>
        {filter === 'all' ? 'No updates yet' : `No ${filterLabel} yet`}
      </ThemedText>
    </View>
  );
});

export { styles };
