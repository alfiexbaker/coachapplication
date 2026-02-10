/**
 * Extracted sub-components for MatchCard.
 *
 * MatchAvailabilityRow — coach view: status pill + available/unavailable/pending dots.
 * MatchPlayerStatusRow — parent view: player status badges.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
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
    <Row align="center" justify="between" style={[styles.availabilityRow, { borderTopColor: palette.border }]}>
      <View style={[styles.statusPill, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
        <ThemedText style={[styles.statusText, { color: statusColor }]}>
          {matchService.formatStatus(match.status)}
        </ThemedText>
      </View>
      <Row align="center" gap="md">
        <Row align="center" gap="xxs">
          <View style={[styles.statDot, { backgroundColor: palette.success }]} />
          <ThemedText style={styles.statText}>{availability.available}</ThemedText>
        </Row>
        <Row align="center" gap="xxs">
          <View style={[styles.statDot, { backgroundColor: palette.error }]} />
          <ThemedText style={styles.statText}>{availability.unavailable}</ThemedText>
        </Row>
        <Row align="center" gap="xxs">
          <View style={[styles.statDot, { backgroundColor: palette.warning }]} />
          <ThemedText style={styles.statText}>{availability.pending}</ThemedText>
        </Row>
      </Row>
    </Row>
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
    <Row wrap gap="xs" style={styles.playerStatusRow}>
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
    </Row>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  availabilityRow: {
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
  statDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  statText: { ...Typography.smallSemiBold },
  playerStatusRow: {
    marginTop: Spacing.xs,
  },
  playerBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  playerBadgeText: { ...Typography.caption },
});
