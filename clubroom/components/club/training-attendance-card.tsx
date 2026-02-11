import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export const TrainingAttendanceCard = memo(function TrainingAttendanceCard() {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="sm" align="center">
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        <ThemedText type="defaultSemiBold">Attendance Record</ThemedText>
      </Row>
      <Row justify="space-around" align="center">
        <StatItem value="12" label="Attended" color={colors.success} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <StatItem value="2" label="Missed" color={colors.warning} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <StatItem value="86%" label="Rate" color={colors.tint} />
      </Row>
    </SurfaceCard>
  );
});

function StatItem({ value, label, color }: { value: string; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <ThemedText type="heading" style={{ color }}>
        {value}
      </ThemedText>
      <ThemedText style={[Typography.caption, { color: colors.muted }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: Spacing.lg, gap: Spacing.md },
  stat: { alignItems: 'center', gap: Spacing.xxs },
  divider: { width: 1, height: 40 },
});
