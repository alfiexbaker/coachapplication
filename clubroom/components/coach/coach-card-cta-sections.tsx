/**
 * Extracted sub-components for CoachCardCTA.
 *
 * InlineFavouriteIcon — compact heart icon without background.
 * ActionRow — combines next-available text + book button.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { BookButton } from './coach-card-cta';
import { Row } from '@/components/primitives';

// ============================================================================
// INLINE FAVOURITE ICON
// ============================================================================

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
    <Clickable onPress={onPress} accessibilityLabel="Remove from favourites" disabled={loading}>
      <Ionicons
        name={isFavourite ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavourite ? palette.error : palette.muted}
      />
    </Clickable>
  );
}

// ============================================================================
// ACTION ROW
// ============================================================================

export interface ActionRowProps {
  nextAvailable?: string;
  coachName: string;
  onBookNow?: () => void;
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
    <Row style={styles.actionRow}>
      {nextAvailable ? (
        <Row style={styles.availabilityContainer}>
          <Ionicons name="calendar-outline" size={Components.icon.sm} color={palette.success} />
          <ThemedText style={[styles.availabilityText, { color: palette.success }]}>
            {nextAvailable}
          </ThemedText>
        </Row>
      ) : (
        <View />
      )}

      {showBookButton && onBookNow && (
        <BookButton coachName={coachName} onPress={onBookNow} variant="compact" />
      )}
    </Row>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  actionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availabilityContainer: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  availabilityText: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
