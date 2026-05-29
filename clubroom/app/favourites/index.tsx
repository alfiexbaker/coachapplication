import { useState } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
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
import { DemoBanner } from '@/utils/demo-mode';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('FavouritesScreen');

export default function FavouritesScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { currentUser } = useAuth();

  const [favourites, setFavourites] = useState<FavouriteCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showDemoBanner, setShowDemoBanner] = useState(false);

  const userId = currentUser?.id ?? 'parent1';

  const loadFavourites = async () => {
    setError(null);
    try {
      const result = await favouriteService.getFavourites(userId);
      if (result.success) {
        setFavourites(result.data);
        const usingDemoSeed = await favouriteService.isUsingDemoSeed(userId);
        setShowDemoBanner(usingDemoSeed && result.data.length > 0);
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
  };

  useFocusEffect(() => {
    loadFavourites();
  });

  useFocusEffect(() => {
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
  });

  const handleRefresh = () => {
    setRefreshing(true);
    loadFavourites();
  };

  const handleToggleFavourite = async (favourite: FavouriteCoach) => {
    setTogglingId(favourite.id);
    setFavourites((prev) => prev.filter((f) => f.id !== favourite.id));

    await runAsyncTryCatchFinally(
      async () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const result = await favouriteService.removeFavourite(userId, favourite.coachId);
        if (!result.success && result.error.code !== 'NOT_FOUND') {
          logger.error('Failed to remove favourite:', result.error);
          setFavourites((prev) => [...prev, favourite]);
        }
      },
      async (error) => {
        logger.error('Failed to remove favourite:', error);
        setFavourites((prev) => [...prev, favourite]);
      },
      () => {
        setTogglingId(null);
      },
    );
  };

  const handleBook = (coachId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(
      Routes.bookCoach(coachId, {
        source: 'favourites',
      }),
    );
  };

  const handleDiscoverCoaches = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.BOOK_COACH);
  };

  const handleDismissDemoFavourites = async () => {
    const result = await favouriteService.dismissDemoFavourites();
    if (result.success) {
      setShowDemoBanner(false);
      setFavourites([]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Row align="center" justify="space-between" style={styles.header}>
        <Row align="center" gap="md" style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Saved Coaches
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
        contentInsetAdjustmentBehavior="automatic"
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
            {showDemoBanner ? (
              <View style={styles.demoBannerStack}>
                <DemoBanner message="These saved coaches are starter demo data. Remove any card to curate your real favourites." />
                <Clickable
                  onPress={handleDismissDemoFavourites}
                  style={[
                    styles.dismissDemoButton,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}
                >
                  <ThemedText style={[styles.dismissDemoText, { color: palette.text }]}>
                    Clear Demo Favourites
                  </ThemedText>
                </Clickable>
              </View>
            ) : null}
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
              title="No Saved Coaches Yet"
              message="Save coaches you may want to contact or rebook. Use the heart on map discovery and profile surfaces to keep your shortlist here."
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
    </View>
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
  listContainer: { gap: Spacing.xs },
  demoBannerStack: { gap: Spacing.xs, marginBottom: Spacing.sm },
  dismissDemoButton: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  dismissDemoText: { ...Typography.caption, fontWeight: '600' },
});
