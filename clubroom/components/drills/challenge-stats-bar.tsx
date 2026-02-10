import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface ChallengeStatsBarProps {
  activeCount: number;
  completedCount: number;
  badgesCount: number;
}

function ChallengeStatsBarInner({ activeCount, completedCount, badgesCount }: ChallengeStatsBarProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row style={styles.row}>
        <View style={styles.item}>
          <ThemedText type="title" style={{ color: palette.tint }}>{activeCount}</ThemedText>
          <ThemedText style={[styles.label, { color: palette.muted }]}>Active</ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <View style={styles.item}>
          <ThemedText type="title" style={{ color: palette.success }}>{completedCount}</ThemedText>
          <ThemedText style={[styles.label, { color: palette.muted }]}>Completed</ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <View style={styles.item}>
          <Row style={styles.badgeRow}>
            <Ionicons name="trophy" size={16} color={palette.warning} />
            <ThemedText type="title">{badgesCount}</ThemedText>
          </Row>
          <ThemedText style={[styles.label, { color: palette.muted }]}>Badges</ThemedText>
        </View>
      </Row>
    </SurfaceCard>
  );
}

export const ChallengeStatsBar = memo(ChallengeStatsBarInner);

const styles = StyleSheet.create({
  card: { padding: Spacing.lg },
  row: { alignItems: 'center', justifyContent: 'space-between' },
  item: { alignItems: 'center', flex: 1 },
  label: { ...Typography.caption, marginTop: Spacing.micro },
  divider: { width: 1, height: 32 },
  badgeRow: { alignItems: 'center', gap: Spacing.xxs },
});
