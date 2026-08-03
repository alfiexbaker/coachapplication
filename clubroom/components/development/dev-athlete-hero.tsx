import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Avatar } from '@/components/ui/primitives/Avatar';
import { Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { formatShortDateWithYear } from '@/utils/format';

export interface DevAthleteHeroProps {
  athleteName: string;
  avatarUri: string | undefined;
  sessionCount: number;
  lastSessionAt?: string;
  colors: ThemeColors;
}

export const DevAthleteHero = function DevAthleteHero({
  athleteName,
  avatarUri,
  sessionCount,
  lastSessionAt,
  colors,
}: DevAthleteHeroProps) {
  const sessionSummary =
    sessionCount === 0
      ? 'No completed sessions'
      : `${sessionCount} completed session${sessionCount === 1 ? '' : 's'}${
          lastSessionAt ? ` · Last session ${formatShortDateWithYear(lastSessionAt)}` : ''
        }`;

  return (
    <SurfaceCard style={styles.heroCard}>
      <Row gap="sm" align="center">
        <Avatar uri={avatarUri} name={athleteName} size="lg" />
        <View style={styles.heroInfo}>
          <ThemedText type="heading" numberOfLines={2}>
            {athleteName}
          </ThemedText>
          <ThemedText style={{ color: colors.muted, ...Typography.small }}>
            {sessionSummary}
          </ThemedText>
        </View>
      </Row>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    padding: Spacing.md,
  },
  heroInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
});
