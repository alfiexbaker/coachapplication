/**
 * CoachCardServices Component
 *
 * Displays coach's specialties/focuses and pricing information.
 * Used by CoachCard variants to show services consistently.
 */

import { StyleSheet, View } from 'react-native';

import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme, ThemeColors } from '@/hooks/useTheme';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CoachCardServicesProps {
  /** List of specialties or football focuses */
  specialties?: string[];
  /** Alternative: football-specific focuses */
  footballFocuses?: string[];
  /** Price per hour */
  pricePerHour?: number;
  /** Minimum price (for range display) */
  priceMin?: number;
  /** Maximum price (for range display) */
  priceMax?: number;
  /** Layout variant */
  variant?: 'tags' | 'compact' | 'inline';
}

export interface SpecialtyTagsProps {
  specialties: string[];
}

export interface PriceDisplayProps {
  pricePerHour?: number;
  priceMin?: number;
  priceMax?: number;
  showLabel?: boolean;
  labelText?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface FocusBadgeProps {
  focus: string;
}

type Palette = ThemeColors;

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

export function formatPrice(
  pricePerHour?: number,
  priceMin?: number,
  priceMax?: number
): string | null {
  if (pricePerHour) return `£${pricePerHour}`;
  if (priceMin && priceMax) {
    return priceMin === priceMax
      ? `£${priceMin}`
      : `£${priceMin}-£${priceMax}`;
  }
  return null;
}

// -----------------------------------------------------------------------------
// SpecialtyTags Component
// -----------------------------------------------------------------------------

export function SpecialtyTags({ specialties }: SpecialtyTagsProps) {
  const { colors: palette } = useTheme();

  if (!specialties || specialties.length === 0) {
    return null;
  }

  return (
    <View style={styles.tagsRow}>
      {specialties.map((tag) => (
        <View
          key={tag}
          style={[styles.tagPill, { backgroundColor: palette.surfaceSecondary }]}
        >
          <ThemedText style={[styles.tagText, { color: palette.muted }]}>
            {tag}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

// -----------------------------------------------------------------------------
// FocusBadge Component (single badge for compact display)
// -----------------------------------------------------------------------------

export function FocusBadge({ focus }: FocusBadgeProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.focusBadge, { backgroundColor: palette.surfaceSecondary }]}>
      <ThemedText style={[styles.focusText, { color: palette.muted }]}>
        {focus}
      </ThemedText>
    </View>
  );
}

// -----------------------------------------------------------------------------
// PriceDisplay Component
// -----------------------------------------------------------------------------

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

  const priceStyle = size === 'lg'
    ? styles.priceLarge
    : size === 'sm'
    ? styles.priceSmall
    : styles.priceMedium;

  return (
    <View style={styles.priceColumn}>
      <ThemedText type="defaultSemiBold" style={priceStyle}>
        {priceStr}
      </ThemedText>
      {showLabel && (
        <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>
          {labelText}
        </ThemedText>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------
// InlinePrice Component (for action rows)
// -----------------------------------------------------------------------------

export interface InlinePriceProps {
  pricePerHour?: number;
  priceMin?: number;
  priceMax?: number;
  suffix?: string;
}

export function InlinePrice({
  pricePerHour,
  priceMin,
  priceMax,
  suffix = '/session',
}: InlinePriceProps) {
  const { colors: palette } = useTheme();

  const priceStr = formatPrice(pricePerHour, priceMin, priceMax);

  if (!priceStr) {
    return null;
  }

  return (
    <View style={styles.inlinePriceContainer}>
      <ThemedText type="defaultSemiBold" style={styles.inlinePrice}>
        {priceStr}
      </ThemedText>
      <ThemedText style={[styles.inlinePriceSuffix, { color: palette.muted }]}>
        {suffix}
      </ThemedText>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Full CoachCardServices Component
// -----------------------------------------------------------------------------

export function CoachCardServices({
  specialties,
  footballFocuses,
  pricePerHour,
  priceMin,
  priceMax,
  variant = 'tags',
}: CoachCardServicesProps) {
  const { colors: palette } = useTheme();

  const tags = specialties || footballFocuses || [];
  const primaryFocus = tags[0];

  if (variant === 'compact' && primaryFocus) {
    return (
      <View style={styles.compactContainer}>
        <FocusBadge focus={primaryFocus} />
        <PriceDisplay
          pricePerHour={pricePerHour}
          priceMin={priceMin}
          priceMax={priceMax}
        />
      </View>
    );
  }

  if (variant === 'inline') {
    return (
      <View style={styles.inlineContainer}>
        {primaryFocus && <FocusBadge focus={primaryFocus} />}
        <InlinePrice
          pricePerHour={pricePerHour}
          priceMin={priceMin}
          priceMax={priceMax}
        />
      </View>
    );
  }

  // Full tags variant
  return (
    <View style={styles.fullContainer}>
      {tags.length > 0 && <SpecialtyTags specialties={tags} />}
      <PriceDisplay
        pricePerHour={pricePerHour}
        priceMin={priceMin}
        priceMax={priceMax}
      />
    </View>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fullContainer: {
    gap: Spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tagPill: {
    paddingHorizontal: Components.pill.paddingHorizontal,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.pill,
  },
  tagText: {
    ...Typography.caption,
  },
  focusBadge: {
    paddingHorizontal: Spacing.sm - 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  focusText: { ...Typography.caption },
  priceColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  priceLarge: { ...Typography.heading, letterSpacing: -0.3 },
  priceMedium: { ...Typography.subheading, letterSpacing: -0.2 },
  priceSmall: { ...Typography.bodySmallSemiBold, letterSpacing: -0.1 },
  priceLabel: { ...Typography.caption, marginTop: 1 },
  inlinePriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.micro,
  },
  inlinePrice: { ...Typography.subheading, letterSpacing: -0.2 },
  inlinePriceSuffix: { ...Typography.caption },
});

export default CoachCardServices;
