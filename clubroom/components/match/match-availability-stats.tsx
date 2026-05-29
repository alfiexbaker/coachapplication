import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { SELECTED_STATUS_COLOR } from '@/hooks/use-match-detail';
import { matchService } from '@/services/match-service';
import type { Match } from '@/constants/types';

interface MatchAvailabilityStatsProps {
  match: Match;
  onSetLineup: () => void;
}

export const MatchAvailabilityStats = function MatchAvailabilityStats({
  match,
  onSetLineup,
}: MatchAvailabilityStatsProps) {
  const { colors } = useTheme();
  const availability = matchService.getAvailabilitySummary(match);

  const stats = [
    { label: 'Available', value: availability.available, color: colors.success },
    { label: 'Unavailable', value: availability.unavailable, color: colors.error },
    { label: 'Pending', value: availability.pending, color: colors.warning },
    ...(match.status === 'LINEUP_SET'
      ? [{ label: 'Selected', value: availability.selected, color: SELECTED_STATUS_COLOR }]
      : []),
  ];

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        Squad Availability
      </ThemedText>
      <Row justify="around">
        {stats.map((s) => (
          <View key={s.label} style={styles.statItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <ThemedText type="title" style={{ color: s.color }}>
              {s.value}
            </ThemedText>
            <ThemedText style={[styles.label, { color: colors.muted }]}>{s.label}</ThemedText>
          </View>
        ))}
      </Row>
      {match.status === 'SCHEDULED' && availability.available > 0 && (
        <Clickable style={[styles.button, { backgroundColor: colors.tint }]} onPress={onSetLineup}>
          <Row align="center" justify="center" gap="sm">
            <Ionicons name="people" size={20} color={colors.onPrimary} />
            <ThemedText style={[Typography.bodySemiBold, { color: colors.onPrimary }]}>
              Set Lineup
            </ThemedText>
          </Row>
        </Clickable>
      )}
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  title: { ...Typography.subheading, marginBottom: Spacing.sm },
  statItem: { alignItems: 'center', gap: Spacing.xxs },
  dot: { width: 8, height: 8, borderRadius: Radii.xs },
  label: { ...Typography.caption },
  button: { padding: Spacing.md, borderRadius: Radii.md, marginTop: Spacing.sm },
});
