import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ANALYTICS_ACCENT_COLOR } from '@/hooks/use-athlete-analytics';
import type { AthleteAnalytics } from '@/constants/types';

interface AnalyticsPerformanceCardProps {
  analytics: AthleteAnalytics;
}

export const AnalyticsPerformanceCard = memo(function AnalyticsPerformanceCard({ analytics }: AnalyticsPerformanceCardProps) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(200).springify()}>
      <SurfaceCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.item}>
            <ThemedText type="heading" style={[styles.value, { color: colors.tint }]}>{analytics.totalSessions}</ThemedText>
            <ThemedText style={[styles.label, { color: colors.muted }]}>Total sessions</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.item}>
            <ThemedText type="heading" style={[styles.value, { color: colors.success }]}>{analytics.consistencyScore}%</ThemedText>
            <ThemedText style={[styles.label, { color: colors.muted }]}>Consistency</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.item}>
            <ThemedText type="heading" style={[styles.value, { color: ANALYTICS_ACCENT_COLOR }]}>Top {100 - analytics.percentileRank}%</ThemedText>
            <ThemedText style={[styles.label, { color: colors.muted }]}>Rank</ThemedText>
          </View>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  item: { alignItems: 'center', flex: 1 },
  value: { ...Typography.heading },
  label: { ...Typography.caption, marginTop: Spacing.micro },
  divider: { width: 1, height: 32 },
});
