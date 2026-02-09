import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { SELECTED_STATUS_COLOR } from '@/hooks/use-match-detail';
import { matchService } from '@/services/match-service';
import type { Match } from '@/constants/types';

interface MatchAvailabilityStatsProps {
  match: Match;
  onSetLineup: () => void;
}

export const MatchAvailabilityStats = memo(function MatchAvailabilityStats({ match, onSetLineup }: MatchAvailabilityStatsProps) {
  const { colors } = useTheme();
  const availability = matchService.getAvailabilitySummary(match);

  const stats = [
    { label: 'Available', value: availability.available, color: colors.success },
    { label: 'Unavailable', value: availability.unavailable, color: colors.error },
    { label: 'Pending', value: availability.pending, color: colors.warning },
    ...(match.status === 'LINEUP_SET' ? [{ label: 'Selected', value: availability.selected, color: SELECTED_STATUS_COLOR }] : []),
  ];

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold" style={styles.title}>Squad Availability</ThemedText>
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <ThemedText type="title" style={{ color: s.color }}>{s.value}</ThemedText>
            <ThemedText style={[styles.label, { color: colors.muted }]}>{s.label}</ThemedText>
          </View>
        ))}
      </View>
      {match.status === 'SCHEDULED' && availability.available > 0 && (
        <Clickable style={[styles.button, { backgroundColor: colors.tint }]} onPress={onSetLineup}>
          <Ionicons name="people" size={20} color={colors.onPrimary} />
          <ThemedText style={[Typography.bodySemiBold, { color: colors.onPrimary }]}>Set Lineup</ThemedText>
        </Clickable>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  title: { ...Typography.subheading, marginBottom: Spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: Spacing.xxs },
  dot: { width: 8, height: 8, borderRadius: Radii.xs },
  label: { ...Typography.caption },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.md, marginTop: Spacing.sm },
});
