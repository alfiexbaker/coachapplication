import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { AthleteProgress } from '@/services/progress-service';

interface ProgressLevelBannerProps {
  progress: AthleteProgress;
  colors: ThemeColors;
}

export const ProgressLevelBanner = memo(function ProgressLevelBanner({ progress, colors }: ProgressLevelBannerProps) {
  return (
    <Row gap="md" align="center" style={[styles.banner, { backgroundColor: withAlpha(colors.tint, 0.06) }]}>
      <View style={[styles.circle, { borderColor: colors.tint }]}>
        <ThemedText style={[Typography.title, { color: colors.tint }]}>{progress.currentLevel.level}</ThemedText>
      </View>
      <View style={styles.info}>
        <ThemedText type="defaultSemiBold" style={Typography.bodySmall}>
          Level {progress.currentLevel.level}: {progress.currentLevel.name}
        </ThemedText>
        <Row gap="xs" align="center">
          <View style={[styles.bar, { backgroundColor: withAlpha(colors.tint, 0.19) }]}>
            <View style={[styles.fill, { width: `${progress.progressToNextLevel}%`, backgroundColor: colors.tint }]} />
          </View>
          <ThemedText style={[Typography.caption, { color: colors.muted, minWidth: 32 }]}>{progress.progressToNextLevel}%</ThemedText>
        </Row>
      </View>
      <View style={styles.points}>
        <ThemedText type="heading" style={[Typography.title, { color: colors.tint }]}>{progress.totalPoints}</ThemedText>
        <ThemedText style={[Typography.micro, { color: colors.muted, textTransform: 'uppercase' }]}>points</ThemedText>
      </View>
    </Row>
  );
});

const styles = StyleSheet.create({
  banner: { padding: Spacing.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radii.lg },
  circle: { width: 48, height: 48, borderRadius: Radii.xl, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: Spacing.xxs },
  bar: { flex: 1, height: 4, borderRadius: Radii.xs, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radii.xs },
  points: { alignItems: 'center' },
});
