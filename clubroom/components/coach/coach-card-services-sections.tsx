/**
 * Extracted sub-components for CoachCardServices.
 *
 * SpecialtyTags — row of specialty tag pills.
 */

import { View, StyleSheet } from 'react-native';

import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export { FocusBadge } from './coach-card-focus-badge';
export type { FocusBadgeProps } from './coach-card-focus-badge';
export { InlinePrice } from './coach-card-inline-price';
export type { InlinePriceProps } from './coach-card-inline-price';

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
    <Row style={styles.tagsRow}>
      {specialties.map((tag) => (
        <View key={tag} style={[styles.tagPill, { backgroundColor: palette.surfaceSecondary }]}>
          <ThemedText style={[styles.tagText, { color: palette.muted }]}>{tag}</ThemedText>
        </View>
      ))}
    </Row>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  tagsRow: {
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
});
