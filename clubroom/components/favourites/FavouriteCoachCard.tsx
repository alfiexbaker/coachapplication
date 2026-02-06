/**
 * FavouriteCoachCard Component
 *
 * Displays a favourited coach with quick actions for booking.
 * Features:
 * - Coach avatar, name, rating, and price
 * - Quick book button
 * - Remove from favourites action
 * - Animated entry
 */

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Routes } from '@/navigation/routes';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors, Radii, Spacing, Components , Typography } from '@/constants/theme';
import type { FavouriteCoach } from '@/constants/types';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FavouriteButton } from './FavouriteButton';

export interface FavouriteCoachCardProps {
  /** The favourite coach data */
  favourite: FavouriteCoach;
  /** Callback when book button is pressed */
  onBook?: (coachId: string) => void;
  /** Callback when favourite is toggled (for removal) */
  onToggleFavourite?: (favourite: FavouriteCoach) => void;
  /** Whether the toggle is in loading state */
  toggleLoading?: boolean;
  /** Animation index for staggered entry */
  index?: number;
}

export function FavouriteCoachCard({
  favourite,
  onBook,
  onToggleFavourite,
  toggleLoading = false,
  index = 0,
}: FavouriteCoachCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();

  const handlePress = useCallback(() => {
    // Navigate to coach profile
    router.push(Routes.bookCoachWith(favourite.coachId));
  }, [router, favourite.coachId]);

  const handleBook = useCallback(() => {
    if (onBook) {
      onBook(favourite.coachId);
    } else {
      // Default: navigate to booking flow
      router.push(Routes.bookSessionType(favourite.coachId));
    }
  }, [onBook, favourite.coachId, router]);

  const handleToggleFavourite = useCallback(() => {
    onToggleFavourite?.(favourite);
  }, [onToggleFavourite, favourite]);

  const formatPrice = () => {
    if (favourite.coachPriceMin && favourite.coachPriceMax) {
      if (favourite.coachPriceMin === favourite.coachPriceMax) {
        return `$${favourite.coachPriceMin}`;
      }
      return `$${favourite.coachPriceMin}-$${favourite.coachPriceMax}`;
    }
    return null;
  };

  const priceDisplay = formatPrice();

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 50).springify()}>
      <SurfaceCard
        accessibilityHint="View coach profile"
        accessibilityLabel={`${favourite.coachName}, favourited coach`}
        onPress={handlePress}
        style={styles.card}
      >
        <View style={styles.content}>
          {/* Coach Avatar */}
          <Image
            source={{ uri: favourite.coachAvatar || 'https://via.placeholder.com/64' }}
            style={styles.avatar}
            contentFit="cover"
          />

          {/* Coach Info */}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <ThemedText type="subtitle" style={styles.name} numberOfLines={1}>
                {favourite.coachName}
              </ThemedText>
              <FavouriteButton
                isFavourite={favourite.isFavourite}
                onToggle={handleToggleFavourite}
                loading={toggleLoading}
                coachName={favourite.coachName}
                size={20}
              />
            </View>

            {/* Rating and Location */}
            <View style={styles.metaRow}>
              {favourite.coachRating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color={palette.premium} />
                  <ThemedText style={[styles.metaText, { color: palette.text }]}>
                    {favourite.coachRating.toFixed(1)}
                  </ThemedText>
                </View>
              )}
              {favourite.coachCity && (
                <>
                  {favourite.coachRating && <Divider vertical style={{ height: 12, opacity: 0.5 }} />}
                  <View style={styles.locationContainer}>
                    <Ionicons name="location-outline" size={14} color={palette.muted} />
                    <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                      {favourite.coachCity}
                    </ThemedText>
                  </View>
                </>
              )}
            </View>

            {/* Price and Book Button */}
            <View style={styles.actionRow}>
              {priceDisplay && (
                <View style={styles.priceContainer}>
                  <ThemedText type="defaultSemiBold" style={styles.price}>
                    {priceDisplay}
                  </ThemedText>
                  <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>
                    /session
                  </ThemedText>
                </View>
              )}
              <Button
                onPress={handleBook}
                variant="primary"
                style={styles.bookButton}
              >
                Book Now
              </Button>
            </View>
          </View>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Radii.md,
  },
  info: {
    flex: 1,
    gap: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  name: { ...Typography.heading, letterSpacing: -0.2,
    flex: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  metaText: { ...Typography.smallSemiBold },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.micro,
  },
  price: { ...Typography.subheading, letterSpacing: -0.2 },
  priceLabel: { ...Typography.caption },
  bookButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
});
