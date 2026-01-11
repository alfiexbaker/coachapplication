/**
 * FavouritesList Component
 *
 * Displays a list of favourited coaches with loading, empty, and error states.
 * Features:
 * - Pull to refresh
 * - Empty state with discover CTA
 * - Optimistic UI updates
 * - Staggered animations
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import type { FavouriteCoach } from '@/constants/types';
import { EmptyState } from '@/components/ui/empty-state';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FavouriteCoachCard } from './FavouriteCoachCard';

export interface FavouritesListProps {
  /** List of favourite coaches */
  favourites: FavouriteCoach[];
  /** Whether the list is loading */
  loading?: boolean;
  /** Callback to refresh the list */
  onRefresh?: () => Promise<void>;
  /** Callback when a coach is booked */
  onBook?: (coachId: string) => void;
  /** Callback when a favourite is toggled */
  onToggleFavourite?: (favourite: FavouriteCoach) => void;
  /** ID of favourite currently being toggled (for loading state) */
  togglingFavouriteId?: string | null;
}

export function FavouritesList({
  favourites,
  loading = false,
  onRefresh,
  onBook,
  onToggleFavourite,
  togglingFavouriteId,
}: FavouritesListProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleDiscoverCoaches = useCallback(() => {
    router.push('/book-coach');
  }, [router]);

  const renderItem = useCallback(
    ({ item, index }: { item: FavouriteCoach; index: number }) => (
      <FavouriteCoachCard
        favourite={item}
        onBook={onBook}
        onToggleFavourite={onToggleFavourite}
        toggleLoading={togglingFavouriteId === item.id}
        index={index}
      />
    ),
    [onBook, onToggleFavourite, togglingFavouriteId]
  );

  const keyExtractor = useCallback((item: FavouriteCoach) => item.id, []);

  if (!loading && favourites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="heart-outline"
          title="No Favourites Yet"
          message="Save coaches you love for quick access and easy re-booking."
          actionLabel="Discover Coaches"
          onPressAction={handleDiscoverCoaches}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={favourites}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.tint}
            colors={[palette.tint]}
          />
        ) : undefined
      }
      ListEmptyComponent={
        loading ? null : (
          <EmptyState
            icon="heart-outline"
            title="No Favourites Yet"
            message="Save coaches you love for quick access and easy re-booking."
            actionLabel="Discover Coaches"
            onPressAction={handleDiscoverCoaches}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
