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

import React, { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Routes } from '@/navigation/routes';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Radii, Spacing, Components, Typography, withAlpha } from '@/constants/theme';
import type { FavouriteCoach } from '@/constants/types';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { FavouriteButton } from './FavouriteButton';
import { Row } from '@/components/primitives';
import { useTheme } from '@/hooks/useTheme';

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

export const FavouriteCoachCard = memo(function FavouriteCoachCard({
  favourite,
  onBook,
  onToggleFavourite,
  toggleLoading = false,
  index = 0,
}: FavouriteCoachCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const coachName = favourite.note?.trim() || favourite.coachId;
  const coachInitials = coachName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handlePress = useCallback(() => {
    // Navigate to coach profile
    router.push(Routes.coach(favourite.coachId));
  }, [router, favourite.coachId]);

  const handleBook = useCallback(() => {
    if (onBook) {
      onBook(favourite.coachId);
    } else {
      // Default: navigate to booking flow
      router.push(
        Routes.bookCoach(favourite.coachId, {
          source: 'favourites',
        }),
      );
    }
  }, [onBook, favourite.coachId, router]);

  const handleToggleFavourite = useCallback(() => {
    onToggleFavourite?.(favourite);
  }, [onToggleFavourite, favourite]);

  return (
    <Animated.View
      entering={FadeInDown.duration(300)
        .delay(index * 50)
        .springify()}
    >
      <SurfaceCard
        style={styles.card}
      >
        <Row style={styles.content}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: withAlpha(colors.tint, 0.08) }]}>
            <ThemedText style={[styles.avatarText, { color: colors.tint }]}>{coachInitials}</ThemedText>
          </View>

          {/* Coach Info */}
          <View style={styles.info}>
            <Row style={styles.nameRow}>
              <Clickable
                onPress={handlePress}
                accessibilityLabel={`View ${coachName} profile`}
                style={styles.nameLink}
              >
                <ThemedText type="subtitle" style={styles.name} numberOfLines={1}>
                  {coachName}
                </ThemedText>
              </Clickable>
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
              <Clickable
                onPress={handlePress}
                accessibilityLabel={`View ${coachName} profile`}
                style={[styles.profileButton, { borderColor: withAlpha(colors.tint, 0.16), backgroundColor: withAlpha(colors.tint, 0.04) }]}
              >
                <ThemedText style={[styles.profileButtonText, { color: colors.tint }]}>View Profile</ThemedText>
              </Clickable>
              <Button onPress={handleBook} variant="primary" style={styles.bookButton}>
                Book
              </Button>
            </Row>
          </View>
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
});

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
  avatarPlaceholder: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.bodySemiBold,
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
  name: { ...Typography.heading, letterSpacing: -0.2, flex: 1 },
  nameLink: {
    flex: 1,
  },
  metaRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  profileButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  profileButtonText: {
    ...Typography.caption,
  },
  bookButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
});
