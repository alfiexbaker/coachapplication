import { StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type QuickStat = {
  label: string;
  value: number;
  highlight?: boolean;
};

interface ChildrenStatsRowProps {
  childCount: number;
  totalSessions: number;
  totalUnseenBadges: number;
}

export const ChildrenStatsRow = function ChildrenStatsRow({
  childCount,
  totalSessions,
  totalUnseenBadges,
}: ChildrenStatsRowProps) {
  const { colors: palette } = useTheme();

  const quickStats: QuickStat[] = [
    { label: 'Children', value: childCount },
    { label: 'Sessions', value: totalSessions },
    { label: 'New Badges', value: totalUnseenBadges, highlight: totalUnseenBadges > 0 },
  ];

  return (
    <Animated.View entering={FadeInDown.delay(50).springify()}>
      <Row gap="sm">
        {quickStats.map((stat) => (
          <SurfaceCard
            key={stat.label}
            style={[
              styles.statCard,
              { borderColor: stat.highlight ? palette.warning : palette.border },
              stat.highlight && { backgroundColor: withAlpha(palette.warning, 0.06) },
            ]}
          >
            <ThemedText
              type="heading"
              style={[styles.statValue, stat.highlight && { color: palette.warning }]}
            >
              {stat.value}
            </ThemedText>
            <ThemedText
              style={[
                styles.statLabel,
                { color: stat.highlight ? palette.warning : palette.muted },
              ]}
            >
              {stat.label}
            </ThemedText>
          </SurfaceCard>
        ))}
      </Row>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  statValue: {
    ...Typography.display,
  },
  statLabel: {
    ...Typography.caption,
  },
});
