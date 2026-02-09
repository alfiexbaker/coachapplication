/**
 * CoachCardCTA Component
 *
 * Displays action buttons for coach cards: book button, favourite toggle,
 * and contact actions.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { useTheme } from '@/hooks/useTheme';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CoachCardCTAProps {
  /** Coach's name (for accessibility labels) */
  coachName: string;
  /** Callback when book button is pressed */
  onBookNow?: () => void;
  /** Whether to show the book button */
  showBookButton?: boolean;
  /** Book button label */
  bookButtonLabel?: string;
  /** Button variant */
  buttonVariant?: 'primary' | 'compact';
}

export interface FavouriteButtonProps {
  /** Whether the coach is favourited */
  isFavourite: boolean;
  /** Callback when pressed */
  onPress: () => void;
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg';
}

export interface BookButtonProps {
  /** Coach's name (for accessibility) */
  coachName: string;
  /** Callback when pressed */
  onPress: () => void;
  /** Button label */
  label?: string;
  /** Button variant */
  variant?: 'primary' | 'compact';
}

type Palette = ReturnType<typeof useTheme>['colors'];

// -----------------------------------------------------------------------------
// FavouriteButton Component
// -----------------------------------------------------------------------------

export function FavouriteButton({
  isFavourite,
  onPress,
  loading = false,
  size = 'md',
}: FavouriteButtonProps) {
  const { colors: palette } = useTheme();

  const iconSize = size === 'lg'
    ? Components.icon.lg
    : size === 'sm'
    ? Components.icon.md
    : 20;

  const buttonSize = size === 'lg' ? 36 : size === 'sm' ? 28 : 32;

  return (
    <Clickable
      onPress={onPress}
      accessibilityLabel="Toggle favourite"
      disabled={loading}
    >
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

// -----------------------------------------------------------------------------
// Inline FavouriteIcon (without background for compact use)
// -----------------------------------------------------------------------------

export interface InlineFavouriteIconProps {
  isFavourite: boolean;
  onPress: () => void;
  loading?: boolean;
  size?: number;
}

export function InlineFavouriteIcon({
  isFavourite,
  onPress,
  loading = false,
  size = 20,
}: InlineFavouriteIconProps) {
  const { colors: palette } = useTheme();

  return (
    <Clickable
      onPress={onPress}
      accessibilityLabel="Remove from favourites"
      disabled={loading}
    >
      <Ionicons
        name={isFavourite ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavourite ? palette.error : palette.muted}
      />
    </Clickable>
  );
}

// -----------------------------------------------------------------------------
// BookButton Component (Pressable variant for discovery)
// -----------------------------------------------------------------------------

export function BookButton({
  coachName,
  onPress,
  label = 'Book Now',
  variant = 'primary',
}: BookButtonProps) {
  const { colors: palette } = useTheme();

  if (variant === 'compact') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Book ${coachName}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.bookButtonCompact,
          {
            backgroundColor: pressed ? palette.tintPressed : palette.tint,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <ThemedText
          style={[styles.bookButtonText, { color: palette.onPrimary }]}
        >
          {label}
        </ThemedText>
      </Pressable>
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

// -----------------------------------------------------------------------------
// ActionRow Component (combines availability + book button)
// -----------------------------------------------------------------------------

export interface ActionRowProps {
  /** Next available time slot */
  nextAvailable?: string;
  /** Coach name for accessibility */
  coachName: string;
  /** Book button callback */
  onBookNow?: () => void;
  /** Whether to show the book button */
  showBookButton?: boolean;
}

export function ActionRow({
  nextAvailable,
  coachName,
  onBookNow,
  showBookButton = true,
}: ActionRowProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.actionRow}>
      {nextAvailable ? (
        <View style={styles.availabilityContainer}>
          <Ionicons
            name="calendar-outline"
            size={Components.icon.sm}
            color={palette.success}
          />
          <ThemedText style={[styles.availabilityText, { color: palette.success }]}>
            {nextAvailable}
          </ThemedText>
        </View>
      ) : (
        <View />
      )}

      {showBookButton && onBookNow && (
        <BookButton
          coachName={coachName}
          onPress={onBookNow}
          variant="compact"
        />
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Full CoachCardCTA Component
// -----------------------------------------------------------------------------

export function CoachCardCTA({
  coachName,
  onBookNow,
  showBookButton = true,
  bookButtonLabel = 'Book Now',
  buttonVariant = 'primary',
}: CoachCardCTAProps) {
  const { colors: palette } = useTheme();

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

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  availabilityText: {
    ...Typography.caption,
    fontWeight: '600',
  },
});

export default CoachCardCTA;
