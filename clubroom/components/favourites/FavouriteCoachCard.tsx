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
import { useRouter } from 'expo-router';
import { Routes } from '@/navigation/routes';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Radii, Spacing, Components, Typography } from '@/constants/theme';
import type { FavouriteCoach } from '@/constants/types';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { FavouriteButton } from './FavouriteButton';
import { Row } from '@/components/primitives';

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
  const router = useRouter();
  const coachName = favourite.coachId;

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

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 50).springify()}>
      <SurfaceCard
        accessibilityHint="View coach profile"
        accessibilityLabel={`${coachName}, favourited coach`}
        onPress={handlePress}
        style={styles.card}
      >
        <Row style={styles.content}>
          {/* Coach Avatar */}
          <Image
            source={{ uri: 'https://via.placeholder.com/64' }}
            style={styles.avatar}
            contentFit="cover"
          />

          {/* Coach Info */}
          <View style={styles.info}>
            <Row style={styles.nameRow}>
              <ThemedText type="subtitle" style={styles.name} numberOfLines={1}>
                {coachName}
              </ThemedText>
              <FavouriteButton
                isFavourite={favourite.isFavourite}
                onToggle={handleToggleFavourite}
                loading={toggleLoading}
                coachName={coachName}
                size={20}
              />
            </Row>

            {/* Price and Book Button */}
            <Row style={styles.actionRow}>
              <View />
              <Button
                onPress={handleBook}
                variant="primary"
                style={styles.bookButton}
              >
                Book Now
              </Button>
            </Row>
          </View>
        </Row>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  name: { ...Typography.heading, letterSpacing: -0.2,
    flex: 1 },
  metaRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  bookButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
});
