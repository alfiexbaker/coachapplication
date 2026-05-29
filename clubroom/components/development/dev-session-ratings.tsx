import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

export interface DevSessionRatingsProps {
  rating: number;
  effortRating: number;
  onRatingChange: (r: number) => void;
  onEffortChange: (r: number) => void;
  colors: ThemeColors;
}

const PERFORMANCE_LABELS = ['Needs Work', 'Fair', 'Good', 'Great', 'Excellent'];
const EFFORT_LABELS = [
  'Low effort',
  'Could try harder',
  'Good effort',
  'High effort',
  'Maximum effort',
];

export const DevSessionRatings = function DevSessionRatings({
  rating,
  effortRating,
  onRatingChange,
  onEffortChange,
  colors,
}: DevSessionRatingsProps) {
  return (
    <Column gap="md">
      <Column gap="sm">
        <ThemedText type="subtitle" style={Typography.subheading}>
          Overall Performance
        </ThemedText>
        <SurfaceCard style={styles.card}>
          <Row gap="xs" justify="center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Clickable key={star} onPress={() => onRatingChange(star)} style={styles.starBtn}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= rating ? colors.rating : colors.muted}
                />
              </Clickable>
            ))}
          </Row>
          <ThemedText
            style={[Typography.bodySmallSemiBold, { color: colors.muted, textAlign: 'center' }]}
          >
            {PERFORMANCE_LABELS[rating - 1]}
          </ThemedText>
        </SurfaceCard>
      </Column>

      <Column gap="sm">
        <ThemedText type="subtitle" style={Typography.subheading}>
          Effort Level
        </ThemedText>
        <SurfaceCard style={styles.card}>
          <Row gap="xs" justify="center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Clickable key={star} onPress={() => onEffortChange(star)} style={styles.starBtn}>
                <Ionicons
                  name={star <= effortRating ? 'flash' : 'flash-outline'}
                  size={32}
                  color={star <= effortRating ? colors.tint : colors.muted}
                />
              </Clickable>
            ))}
          </Row>
          <ThemedText
            style={[Typography.bodySmallSemiBold, { color: colors.muted, textAlign: 'center' }]}
          >
            {EFFORT_LABELS[effortRating - 1]}
          </ThemedText>
        </SurfaceCard>
      </Column>
    </Column>
  );
};

const styles = StyleSheet.create({
  card: { padding: Spacing.md, alignItems: 'center', gap: Spacing.sm },
  starBtn: { padding: Spacing.xxs },
});
