/**
 * BadgeLevelCard — Displays current progression level, points, and stats.
 *
 * Shows trophy icon, level name, progress bar to next level,
 * and key stats (total badges, shared count, last badge date).
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ProgressionLevel } from '@/constants/progression';

interface BadgeLevelCardProps {
  currentLevel: ProgressionLevel;
  nextLevel: ProgressionLevel | null;
  totalPoints: number;
  progressPercent: number;
  pointsToNext: number;
  totalBadges: number;
  sharedCount: number;
  lastBadgeDate: string | null;
}

export const BadgeLevelCard = memo(function BadgeLevelCard({
  currentLevel,
  nextLevel,
  totalPoints,
  progressPercent,
  pointsToNext,
  totalBadges,
  sharedCount,
  lastBadgeDate,
}: BadgeLevelCardProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center">
        <View style={[styles.levelBadge, { backgroundColor: withAlpha(palette.text, 0.07) }]}>
          <Ionicons name="trophy" size={24} color={palette.tint} />
        </View>
        <Column gap="xxs" flex>
          <ThemedText type="subtitle" style={styles.levelName}>
            {currentLevel.name}
          </ThemedText>
          <ThemedText style={[styles.levelPoints, { color: palette.muted }]}>
            {totalBadges} milestone{totalBadges !== 1 ? 's' : ''} earned
          </ThemedText>
        </Column>
      </Row>

      {nextLevel && (
        <Column gap="xs">
          <Row justify="between" align="center">
            <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
              Progress to {nextLevel.name}
            </ThemedText>
            <ThemedText style={[styles.progressValue, { color: palette.tint }]}>
              {progressPercent}%
            </ThemedText>
          </Row>
          <View style={[styles.progressBar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: palette.tint, width: `${progressPercent}%` },
              ]}
            />
          </View>
        </Column>
      )}

      <Row gap="sm" align="center" style={styles.statsRow}>
        <Column gap="xxs" align="center" flex>
          <ThemedText type="defaultSemiBold" style={styles.statValue}>
            {totalBadges}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Milestones</ThemedText>
        </Column>
        <View style={[styles.statDivider, { backgroundColor: withAlpha(palette.text, 0.06) }]} />
        <Column gap="xxs" align="center" flex>
          <ThemedText type="defaultSemiBold" style={styles.statValue}>
            {sharedCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Shared</ThemedText>
        </Column>
        <View style={[styles.statDivider, { backgroundColor: withAlpha(palette.text, 0.06) }]} />
        <Column gap="xxs" align="center" flex>
          <View style={[styles.toneBadge, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
            <Ionicons name="sparkles" size={14} color={palette.tint} />
          </View>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Latest</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.statValue} numberOfLines={1}>
            {lastBadgeDate ?? 'Not yet'}
          </ThemedText>
        </Column>
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelName: {
    ...Typography.heading,
  },
  levelPoints: {
    ...Typography.bodySmall,
  },
  progressLabel: {
    ...Typography.small,
  },
  progressValue: {
    ...Typography.smallSemiBold,
  },
  progressBar: {
    height: 8,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  statsRow: {
    paddingTop: Spacing.xs,
  },
  statValue: {
    ...Typography.heading,
  },
  statLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  toneBadge: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
