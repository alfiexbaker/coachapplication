/**
 * CoachCardCTA Component
 *
 * Displays action buttons for coach cards: book button, favourite toggle,
 * and contact actions.
 */

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { InlineFavouriteIcon, ActionRow } from './coach-card-cta-sections';
export type { InlineFavouriteIconProps, ActionRowProps } from './coach-card-cta-sections';

// ============================================================================
// Types
// ============================================================================

export interface CoachCardCTAProps {
  coachName: string;
  onBookNow?: () => void;
  showBookButton?: boolean;
  bookButtonLabel?: string;
  buttonVariant?: 'primary' | 'compact';
}

export interface FavouriteButtonProps {
  isFavourite: boolean;
  onPress: () => void;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface BookButtonProps {
  coachName: string;
  onPress: () => void;
  label?: string;
  variant?: 'primary' | 'compact';
}

// ============================================================================
// FavouriteButton
// ============================================================================

export function FavouriteButton({
  isFavourite,
  onPress,
  loading = false,
  size = 'md',
}: FavouriteButtonProps) {
  const { colors: palette } = useTheme();

  const iconSize = size === 'lg' ? Components.icon.lg : size === 'sm' ? Components.icon.md : 20;

  const buttonSize = size === 'lg' ? 36 : size === 'sm' ? 28 : 32;

  return (
    <Clickable onPress={onPress} accessibilityLabel="Toggle favourite" disabled={loading}>
      <View
        style={[
          styles.favouriteButton,
          { backgroundColor: palette.surfaceSecondary, width: buttonSize, height: buttonSize },
        ]}
      >
        <Ionicons
          name={isFavourite ? 'heart' : 'heart-outline'}
          size={iconSize}
          color={isFavourite ? palette.error : palette.muted}
        />
      </View>
    </Clickable>
  );
}

// ============================================================================
// BookButton
// ============================================================================

export function BookButton({
  coachName,
  onPress,
  label = 'Book Now',
  variant = 'primary',
}: BookButtonProps) {
  const { colors: palette } = useTheme();

  if (variant === 'compact') {
    return (
      <Clickable
        accessibilityLabel={`Book ${coachName}`}
        onPress={onPress}
        style={[styles.bookButtonCompact, { backgroundColor: palette.tint }]}
      >
        <ThemedText style={[styles.bookButtonText, { color: palette.onPrimary }]}>
          {label}
        </ThemedText>
      </Clickable>
    );
  }

  return (
    <Button
      onPress={onPress}
      variant="primary"
      style={styles.bookButtonPrimary}
      accessibilityLabel={`Book ${coachName}`}
    >
      {label}
    </Button>
  );
}

// ============================================================================
// CoachCardCTA
// ============================================================================

export function CoachCardCTA({
  coachName,
  onBookNow,
  showBookButton = true,
  bookButtonLabel = 'Book Now',
  buttonVariant = 'primary',
}: CoachCardCTAProps) {
  if (!showBookButton || !onBookNow) {
    return null;
  }

  return (
    <BookButton
      coachName={coachName}
      onPress={onBookNow}
      label={bookButtonLabel}
      variant={buttonVariant}
    />
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  favouriteButton: {
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonCompact: {
    height: Components.buttonCompact.height,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonPrimary: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  bookButtonText: {
    ...Typography.bodySemiBold,
  },
});

export default CoachCardCTA;
