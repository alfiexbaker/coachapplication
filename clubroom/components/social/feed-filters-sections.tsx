import { FlatList, View, type ListRenderItemInfo } from 'react-native';
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
import { FEED_FILTERS } from './feed-filters-helpers';

// ─── FilterTabsContent ───────────────────────────────────────────────────────

interface FilterTabsContentProps {
  activeFilter: FeedFilter;
  onFilterChange: (filter: FeedFilter) => void;
  palette: ThemeColors;
}

export const FilterTabsContent = function FilterTabsContent({
  activeFilter,
  onFilterChange,
  palette,
}: FilterTabsContentProps) {
  const filterItems = getFeedFilterTabItems(activeFilter, onFilterChange, palette);

  return (
    <FlatList
      horizontal
      data={filterItems}
      keyExtractor={keyFeedFilterTabItem}
      renderItem={renderFeedFilterTabItem}
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContainer}
    />
  );
};

interface FeedFilterTabItem {
  key: FeedFilter;
  label: string;
  isActive: boolean;
  palette: ThemeColors;
  onPress: () => void;
}

function getFeedFilterTabItems(
  activeFilter: FeedFilter,
  onFilterChange: (filter: FeedFilter) => void,
  palette: ThemeColors,
): FeedFilterTabItem[] {
  return FEED_FILTERS.map((filter) => ({
    key: filter.key,
    label: filter.label,
    isActive: activeFilter === filter.key,
    palette,
    onPress: () => onFilterChange(filter.key),
  }));
}

function keyFeedFilterTabItem(item: FeedFilterTabItem) {
  return item.key;
}

function renderFeedFilterTabItem({ item }: ListRenderItemInfo<FeedFilterTabItem>) {
  return (
    <Clickable
      style={[
        styles.filterTab,
        item.isActive && {
          backgroundColor: withAlpha(item.palette.tint, 0.09),
          borderColor: item.palette.tint,
        },
        { borderColor: item.palette.border },
      ]}
      onPress={item.onPress}
    >
      <ThemedText
        style={[
          styles.filterLabel,
          { color: item.isActive ? item.palette.tint : item.palette.muted },
        ]}
      >
        {item.label}
      </ThemedText>
    </Clickable>
  );
}

// ─── ClubPillRow ─────────────────────────────────────────────────────────────

interface ClubPillRowProps {
  clubs: Club[];
  palette: ThemeColors;
}

export const ClubPillRow = function ClubPillRow({ clubs, palette }: ClubPillRowProps) {
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
};

// ─── EmptyFeedNoClubs ────────────────────────────────────────────────────────

interface EmptyFeedNoClubsProps {
  isCoach: boolean;
  palette: ThemeColors;
}

export const EmptyFeedNoClubs = function EmptyFeedNoClubs({
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
          ? 'Join or create a club, or follow other coaches, to keep football updates in one place.'
          : 'Join a club, follow a coach, or book a session to keep football updates in one place.'}
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
          onPress={() => router.push(isCoach ? Routes.CLUB_CREATE : Routes.DISCOVER_MAP)}
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
};

// ─── EmptyFeedFiltered ───────────────────────────────────────────────────────

interface EmptyFeedFilteredProps {
  filter: FeedFilter;
  palette: ThemeColors;
}

export const EmptyFeedFiltered = function EmptyFeedFiltered({
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
};
