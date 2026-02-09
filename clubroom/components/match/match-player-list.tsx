import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { matchService } from '@/services/match-service';
import type { Match } from '@/constants/types';

interface MatchPlayerListProps {
  match: Match;
}

export const MatchPlayerList = memo(function MatchPlayerList({ match }: MatchPlayerListProps) {
  const { colors } = useTheme();

  if (match.selectedPlayers.length === 0) return null;

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        {match.status === 'LINEUP_SET' ? 'Match Day Squad' : 'Invited Players'}
      </ThemedText>
      <View>
        {match.selectedPlayers.map((player) => {
          const statusCol = matchService.getPlayerStatusColor(player.status);
          return (
            <View key={player.athleteId} style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: withAlpha(statusCol, 0.09) }]}>
                <ThemedText style={[Typography.bodySmallSemiBold, { color: statusCol }]}>
                  {player.athleteName.slice(0, 2).toUpperCase()}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{player.athleteName}</ThemedText>
                {player.position && (
                  <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                    {player.position}{player.jerseyNumber && ` #${player.jerseyNumber}`}
                  </ThemedText>
                )}
              </View>
              <View style={[styles.pill, { backgroundColor: withAlpha(statusCol, 0.09) }]}>
                <ThemedText style={[Typography.caption, { color: statusCol }]}>
                  {matchService.formatPlayerStatus(player.status)}
                </ThemedText>
              </View>
            </View>
          );
        })}
      </View>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  title: { ...Typography.subheading, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
});
