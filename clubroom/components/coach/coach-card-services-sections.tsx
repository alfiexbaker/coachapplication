/**
 * Extracted sub-components for CoachCardServices.
 *
 * formatPrice — price string formatter.
 * SpecialtyTags — row of specialty tag pills.
 * FocusBadge — single focus tag.
 * InlinePrice — price with suffix for action rows.
 */

import { View, StyleSheet } from 'react-native';

import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';

// ============================================================================
// HELPERS
// ============================================================================

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

// ============================================================================
// SPECIALTY TAGS
// ============================================================================

export interface SpecialtyTagsProps {
  specialties: string[];
}

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

// ============================================================================
// FOCUS BADGE
// ============================================================================

export interface FocusBadgeProps {
  focus: string;
}

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

// ============================================================================
// INLINE PRICE
// ============================================================================

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

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
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
  inlinePriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.micro,
  },
  inlinePrice: { ...Typography.subheading, letterSpacing: -0.2 },
  inlinePriceSuffix: { ...Typography.caption },
});
