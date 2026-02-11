/**
 * CoachCardServices Component
 *
 * Displays coach's specialties/focuses and pricing information.
 * Used by CoachCard variants to show services consistently.
 */

import { StyleSheet, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';

import {
  formatPrice,
  SpecialtyTags,
  FocusBadge,
  InlinePrice,
} from './coach-card-services-sections';
import { Row } from '@/components/primitives';

// Re-export extracted components for backward compat
export {
  formatPrice,
  SpecialtyTags,
  FocusBadge,
  InlinePrice,
} from './coach-card-services-sections';
export type {
  SpecialtyTagsProps,
  FocusBadgeProps,
  InlinePriceProps,
} from './coach-card-services-sections';

// ============================================================================
// Types
// ============================================================================

export interface CoachCardServicesProps {
  specialties?: string[];
  footballFocuses?: string[];
  pricePerHour?: number;
  priceMin?: number;
  priceMax?: number;
  variant?: 'tags' | 'compact' | 'inline';
}

export interface PriceDisplayProps {
  pricePerHour?: number;
  priceMin?: number;
  priceMax?: number;
  showLabel?: boolean;
  labelText?: string;
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// PriceDisplay
// ============================================================================

export function PriceDisplay({
  pricePerHour,
  priceMin,
  priceMax,
  showLabel = true,
  labelText = 'per session',
  size = 'md',
}: PriceDisplayProps) {
  const { colors: palette } = useTheme();

  const priceStr = formatPrice(pricePerHour, priceMin, priceMax);

  if (!priceStr) {
    return null;
  }

  const priceStyle =
    size === 'lg' ? styles.priceLarge : size === 'sm' ? styles.priceSmall : styles.priceMedium;

  return (
    <View style={styles.priceColumn}>
      <ThemedText type="defaultSemiBold" style={priceStyle}>
        {priceStr}
      </ThemedText>
      {showLabel && (
        <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>{labelText}</ThemedText>
      )}
    </View>
  );
}

// ============================================================================
// CoachCardServices
// ============================================================================

export function CoachCardServices({
  specialties,
  footballFocuses,
  pricePerHour,
  priceMin,
  priceMax,
  variant = 'tags',
}: CoachCardServicesProps) {
  const tags = specialties || footballFocuses || [];
  const primaryFocus = tags[0];

  if (variant === 'compact' && primaryFocus) {
    return (
      <Row style={styles.compactContainer}>
        <FocusBadge focus={primaryFocus} />
        <PriceDisplay pricePerHour={pricePerHour} priceMin={priceMin} priceMax={priceMax} />
      </Row>
    );
  }

  if (variant === 'inline') {
    return (
      <Row style={styles.inlineContainer}>
        {primaryFocus && <FocusBadge focus={primaryFocus} />}
        <InlinePrice pricePerHour={pricePerHour} priceMin={priceMin} priceMax={priceMax} />
      </Row>
    );
  }

  // Full tags variant
  return (
    <View style={styles.fullContainer}>
      {tags.length > 0 && <SpecialtyTags specialties={tags} />}
      <PriceDisplay pricePerHour={pricePerHour} priceMin={priceMin} priceMax={priceMax} />
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  compactContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  inlineContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fullContainer: {
    gap: Spacing.sm,
  },
  priceColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  priceLarge: { ...Typography.heading, letterSpacing: -0.3 },
  priceMedium: { ...Typography.subheading, letterSpacing: -0.2 },
  priceSmall: { ...Typography.bodySmallSemiBold, letterSpacing: -0.1 },
  priceLabel: { ...Typography.caption, marginTop: 1 },
});

export default CoachCardServices;
