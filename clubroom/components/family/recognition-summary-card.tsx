/**
 * RecognitionSummaryCard — "X recognitions this month" for parent dashboard.
 * Shows count + category breakdown dots.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BadgeAward, BadgeCategory } from '@/constants/types';

const CATEGORY_CONFIG: { key: BadgeCategory; label: string; colorKey: 'premium' | 'success' | 'warning' | 'tint' }[] = [
  { key: 'technical', label: 'Technical', colorKey: 'premium' },
  { key: 'physical', label: 'Physical', colorKey: 'success' },
  { key: 'psychological', label: 'Psychological', colorKey: 'warning' },
  { key: 'social', label: 'Social', colorKey: 'tint' },
];

interface RecognitionSummaryCardProps {
  awards: BadgeAward[];
  onPress?: () => void;
}

function RecognitionSummaryCardInner({ awards, onPress }: RecognitionSummaryCardProps) {
  const { colors: palette } = useTheme();

  // Filter to this month
  const now = new Date();
  const thisMonth = awards.filter((a) => {
    const d = new Date(a.awardedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  if (thisMonth.length === 0 && awards.length === 0) return null;

  const monthCount = thisMonth.length;
  const totalCount = awards.length;

  return (
    <SurfaceCard
      style={styles.card}
      onPress={onPress}
      accessibilityLabel={`${monthCount} recognitions this month, ${totalCount} total`}
    >
      <Row align="center" gap="md">
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.08) }]}>
          <Ionicons name="sparkles" size={24} color={palette.tint} />
        </View>
        <Column gap="micro" style={styles.textCol}>
          <ThemedText type="defaultSemiBold" style={Typography.subheading}>
            {monthCount > 0
              ? `${monthCount} recognition${monthCount === 1 ? '' : 's'} this month`
              : `${totalCount} recognition${totalCount === 1 ? '' : 's'} total`}
          </ThemedText>
          <Row gap="sm">
            {CATEGORY_CONFIG.map((cat) => {
              const count = awards.filter((a) => a.badgeCategory === cat.key).length;
              if (count === 0) return null;
              return (
                <Row key={cat.key} align="center" gap="xxs">
                  <View style={[styles.dot, { backgroundColor: palette[cat.colorKey] }]} />
                  <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                    {cat.label} {count}
                  </ThemedText>
                </Row>
              );
            })}
          </Row>
        </Column>
        <Ionicons name="chevron-forward" size={16} color={palette.muted} />
      </Row>
    </SurfaceCard>
  );
}

export const RecognitionSummaryCard = memo(RecognitionSummaryCardInner);

const styles = StyleSheet.create({
  card: { padding: Spacing.md },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: Radii.xs },
});
