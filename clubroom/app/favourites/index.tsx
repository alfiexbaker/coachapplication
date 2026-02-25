import { useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { FavouriteCoachCard } from '@/components/favourites/FavouriteCoachCard';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import type { FavouriteCoach } from '@/constants/types';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { favouriteService } from '@/services/favourite-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { scaleFont } from '@/utils/scale';
import { ok } from '@/types/result';

const logger = createLogger('FavouritesScreen');

export default function FavouritesScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { currentUser } = useAuth();

  const [favourites, setFavourites] = useState<FavouriteCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const userId = currentUser?.id ?? 'parent1';

  const loadFavourites = useCallback(async () => {
    setError(null);
    try {
      const result = await favouriteService.getFavourites(userId);
      if (result.success) {
        setFavourites(result.data);
      } else {
        logger.error('Failed to load favourites:', result.error);
        setError('Failed to load favourites.');
      }
    } catch (loadError) {
      logger.error('Failed to load favourites:', loadError);
      setError('Failed to load favourites.');
    }
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadFavourites();
    }, [loadFavourites]),
  );

  useFocusEffect(
    useCallback(() => {
      const unsubscribeAdded = onTyped(ServiceEvents.FAVOURITE_ADDED, () => {
        void loadFavourites();
      });
      const unsubscribeRemoved = onTyped(ServiceEvents.FAVOURITE_REMOVED, () => {
        void loadFavourites();
      });
      return () => {
        unsubscribeAdded();
        unsubscribeRemoved();
      };
    }, [loadFavourites]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFavourites();
  }, [loadFavourites]);

  const handleToggleFavourite = useCallback(
    async (favourite: FavouriteCoach) => {
      setTogglingId(favourite.id);
      setFavourites((prev) => prev.filter((f) => f.id !== favourite.id));

      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const result = await favouriteService.removeFavourite(userId, favourite.coachId);
        if (!result.success && result.error.code !== 'NOT_FOUND') {
          logger.error('Failed to remove favourite:', result.error);
          setFavourites((prev) => [...prev, favourite]);
        }
      } catch (error) {
        logger.error('Failed to remove favourite:', error);
        setFavourites((prev) => [...prev, favourite]);
      } finally {
        setTogglingId(null);
      }
    },
    [userId],
  );

  const handleBook = useCallback((coachId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(Routes.bookSessionType(coachId));
  }, []);

  const handleDiscoverCoaches = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.BOOK_COACH);
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <Row align="center" justify="space-between" style={styles.header}>
        <Row align="center" gap="md" style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Favourites
          </ThemedText>
        </Row>
        {favourites.length > 0 && (
          <Clickable
            onPress={handleDiscoverCoaches}
            style={[
              styles.discoverButton,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Row align="center" gap="xxs">
              <Ionicons name="search" size={18} color={palette.text} />
              <ThemedText style={[styles.discoverText, { color: palette.text }]}>
                Discover
              </ThemedText>
            </Row>
          </Clickable>
        )}
      </Row>

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
        {favourites.length > 0 && (
          <Animated.View entering={FadeInDown.delay(50).springify()}>
            <Row
              align="center"
              justify="center"
              style={[
                styles.statsRow,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <Row align="center" gap="xs" style={styles.statItem}>
                <Ionicons name="heart" size={20} color={palette.error} />
                <ThemedText type="defaultSemiBold" style={styles.statValue}>
                  {favourites.length}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  Saved Coach{favourites.length !== 1 ? 'es' : ''}
                </ThemedText>
              </Row>
            </Row>
          </Animated.View>
        )}

        {loading ? (
          <LoadingState variant="list" />
        ) : error ? (
          <ErrorState message={error} onRetry={handleRefresh} />
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerLeft: {},
  headerTitle: {
    ...Typography.title,
    fontSize: scaleFont(Typography.title.fontSize),
  },
  discoverButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.xl,
    borderWidth: 1,
  },
  discoverText: {
    ...Typography.bodySmallSemiBold,
    fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  statsRow: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  statItem: {},
  statValue: {
    ...Typography.heading,
    fontSize: scaleFont(Typography.heading.fontSize),
  },
  statLabel: {
    ...Typography.bodySmall,
    fontSize: scaleFont(Typography.bodySmall.fontSize),
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
