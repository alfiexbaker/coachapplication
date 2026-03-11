/**
 * CoachCardCTA Component
 *
 * Displays action buttons for coach cards: book button, favourite toggle,
 * and contact actions.
 */

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radii, Components } from '@/constants/theme';
import { Clickable } from '@/components/primitives/clickable';
import { useTheme } from '@/hooks/useTheme';
import { BookButton } from './coach-card-book-button';
export { BookButton } from './coach-card-book-button';
export type { BookButtonProps } from './coach-card-book-button';

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
    <Clickable onPress={onPress} accessibilityLabel="Save coach" disabled={loading}>
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
});

export default CoachCardCTA;
