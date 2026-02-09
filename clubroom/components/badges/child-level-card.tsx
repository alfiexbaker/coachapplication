import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ChildLevelCardProps {
  currentLevel: { level: number; name: string };
  totalPoints: number;
  nextLevel: { name: string } | null;
  progressPercent: number;
  pointsToNext: number;
}

export const ChildLevelCard = memo(function ChildLevelCard({
  currentLevel, totalPoints, nextLevel, progressPercent, pointsToNext,
}: ChildLevelCardProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center">
        <View style={[styles.levelBadge, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
          <Ionicons name="trophy" size={24} color={colors.tint} />
        </View>
        <View style={styles.levelInfo}>
          <ThemedText type="heading">Level {currentLevel.level}: {currentLevel.name}</ThemedText>
          <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>{totalPoints} points earned</ThemedText>
        </View>
      </Row>

      {nextLevel && (
        <View style={styles.progressSection}>
          <Row align="center" justify="space-between">
            <ThemedText style={[Typography.small, { color: colors.muted }]}>Progress to {nextLevel.name}</ThemedText>
            <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>{pointsToNext} pts to go</ThemedText>
          </Row>
          <View style={[styles.progressBar, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.tint, width: `${progressPercent}%` }]} />
          </View>
        </View>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.md },
  levelBadge: { width: 56, height: 56, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  levelInfo: { flex: 1, gap: Spacing.xxs },
  progressSection: { gap: Spacing.xs },
  progressBar: { height: 8, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.xs },
});
