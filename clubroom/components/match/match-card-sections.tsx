/**
 * Extracted sub-components for MatchCard.
 *
 * MatchAvailabilityRow — coach view: status pill + available/unavailable/pending dots.
 * MatchPlayerStatusRow — parent view: player status badges.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { matchService } from '@/services/match-service';
import type { Match } from '@/constants/types';

// ============================================================================
// AVAILABILITY ROW (Coach view)
// ============================================================================

interface MatchAvailabilityRowProps {
  match: Match;
}

export const MatchAvailabilityRow = React.memo(function MatchAvailabilityRow({
  match,
}: MatchAvailabilityRowProps) {
  const { colors: palette } = useTheme();
  const statusColor = matchService.getStatusColor(match.status);
  const availability = matchService.getAvailabilitySummary(match);

  return (
    <View style={[styles.availabilityRow, { borderTopColor: palette.border }]}>
      <View style={[styles.statusPill, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
        <ThemedText style={[styles.statusText, { color: statusColor }]}>
          {matchService.formatStatus(match.status)}
        </ThemedText>
      </View>
      <View style={styles.availabilityStats}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: palette.success }]} />
          <ThemedText style={styles.statText}>{availability.available}</ThemedText>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: palette.error }]} />
          <ThemedText style={styles.statText}>{availability.unavailable}</ThemedText>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: palette.warning }]} />
          <ThemedText style={styles.statText}>{availability.pending}</ThemedText>
        </View>
      </View>
    </View>
  );
});

// ============================================================================
// PLAYER STATUS ROW (Parent view)
// ============================================================================

interface MatchPlayerStatusRowProps {
  match: Match;
}

export const MatchPlayerStatusRow = React.memo(function MatchPlayerStatusRow({
  match,
}: MatchPlayerStatusRowProps) {
  if (match.selectedPlayers.length === 0) return null;

  return (
    <View style={styles.playerStatusRow}>
      {match.selectedPlayers.map((player) => (
        <View
          key={player.athleteId}
          style={[
            styles.playerBadge,
            { backgroundColor: withAlpha(matchService.getPlayerStatusColor(player.status), 0.09) },
          ]}
        >
          <ThemedText
            style={[
              styles.playerBadgeText,
              { color: matchService.getPlayerStatusColor(player.status) },
            ]}
          >
            {player.athleteName}: {matchService.formatPlayerStatus(player.status)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusText: { ...Typography.caption },
  availabilityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  statText: { ...Typography.smallSemiBold },
  playerStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  playerBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  playerBadgeText: { ...Typography.caption },
});
