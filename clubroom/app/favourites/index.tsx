/**
 * Favourites Screen
 *
 * Displays the user's favourited coaches with quick re-booking functionality.
 * Features:
 * - List of favourite coaches
 * - Quick book button for each coach
 * - Pull to refresh
 * - Empty state with discover CTA
 * - Optimistic UI updates for favourite toggling
 */

import { useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { EmptyState } from '@/components/ui/empty-state';
import { FavouriteCoachCard } from '@/components/favourites/FavouriteCoachCard';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import type { FavouriteCoach } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { favouriteService } from '@/services/favourite-service';
import { scaleFont } from '@/utils/scale';

const logger = createLogger('FavouritesScreen');

/**
 * Favourites screen showing saved coaches with quick re-booking.
 */
export default function FavouritesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // State
  const [favourites, setFavourites] = useState<FavouriteCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Get current user ID
  const userId = currentUser?.id ?? 'parent1';

  // Load favourites
  const loadFavourites = useCallback(async () => {
    try {
      const userFavourites = await favouriteService.getFavourites(userId);
      setFavourites(userFavourites);
    } catch (error) {
      logger.error('Failed to load favourites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      loadFavourites();
    }, [loadFavourites])
  );

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFavourites();
  }, [loadFavourites]);

  // Handle toggle favourite (remove)
  const handleToggleFavourite = useCallback(
    async (favourite: FavouriteCoach) => {
      // Optimistic UI update
      setTogglingId(favourite.id);
      setFavourites((prev) => prev.filter((f) => f.id !== favourite.id));

      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await favouriteService.removeFavourite(userId, favourite.coachId);
      } catch (error) {
        // Revert on error
        logger.error('Failed to remove favourite:', error);
        setFavourites((prev) => [...prev, favourite]);
      } finally {
        setTogglingId(null);
      }
    },
    [userId]
  );

  // Handle book coach
  const handleBook = useCallback((coachId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(Routes.bookSessionType(coachId));
  }, []);

  // Navigate to discover coaches
  const handleDiscoverCoaches = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.BOOK_COACH);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Favourites
          </ThemedText>
        </View>
        {favourites.length > 0 && (
          <Clickable
            onPress={handleDiscoverCoaches}
            style={[styles.discoverButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <Ionicons name="search" size={18} color={palette.text} />
            <ThemedText style={[styles.discoverText, { color: palette.text }]}>
              Discover
            </ThemedText>
          </Clickable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.tint}
            colors={[palette.tint]}
          />
        }
      >
        {/* Stats Summary */}
        {favourites.length > 0 && (
          <Animated.View entering={FadeInDown.delay(50).springify()}>
            <View style={[styles.statsRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.statItem}>
                <Ionicons name="heart" size={20} color="#EF4444" />
                <ThemedText type="defaultSemiBold" style={styles.statValue}>
                  {favourites.length}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  Saved Coach{favourites.length !== 1 ? 'es' : ''}
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Favourites List */}
        {loading ? (
          <View style={styles.loadingPlaceholder}>
            <ThemedText style={{ color: palette.muted }}>Loading favourites...</ThemedText>
          </View>
        ) : favourites.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyContainer}>
            <EmptyState
              icon="heart-outline"
              title="No Favourites Yet"
              message="Save coaches you love for quick access and easy re-booking. Tap the heart icon on any coach profile to add them here."
              actionLabel="Discover Coaches"
              onPressAction={handleDiscoverCoaches}
            />
          </Animated.View>
        ) : (
          <View style={styles.listContainer}>
            {favourites.map((favourite, index) => (
              <FavouriteCoachCard
                key={favourite.id}
                favourite={favourite}
                onBook={handleBook}
                onToggleFavourite={handleToggleFavourite}
                toggleLoading={togglingId === favourite.id}
                index={index}
              />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerTitle: {
    ...Typography.display, fontSize: scaleFont(Typography.display.fontSize),
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.xl,
    borderWidth: 1,
    gap: Spacing.xxs,
  },
  discoverText: {
    ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    ...Typography.heading, fontSize: scaleFont(Typography.heading.fontSize),
  },
  statLabel: {
    ...Typography.bodySmall, fontSize: scaleFont(Typography.bodySmall.fontSize),
  },
  loadingPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
  },
  listContainer: {
    gap: Spacing.xs,
  },
});
