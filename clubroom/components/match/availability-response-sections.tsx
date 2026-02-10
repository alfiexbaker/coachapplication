/**
 * Extracted sub-components for AvailabilityResponse.
 *
 * SelectedCard — celebration view when player is selected/reserve.
 * RespondedCard — already responded status with change option.
 * MatchInfoCard — shared match info section (date, time, venue).
 */

import React, { memo } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Match, MatchPlayer } from '@/constants/types';

// ─── MatchInfoCard ──────────────────────────────────────────────────────────

interface MatchInfoCardProps {
  match: Match;
  player?: MatchPlayer;
  palette: ThemeColors;
}

export const MatchInfoCard = memo(function MatchInfoCard({ match, player, palette }: MatchInfoCardProps) {
  const matchDate = new Date(match.date);
  const dateLabel = matchDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={[styles.matchInfo, { backgroundColor: palette.surface }]}>
      <Row align="center" gap="sm">
        <Ionicons name="calendar" size={18} color={palette.tint} />
        <ThemedText style={styles.matchInfoText}>{dateLabel}</ThemedText>
      </Row>
      <Row align="center" gap="sm">
        <Ionicons name="time" size={18} color={palette.tint} />
        <ThemedText style={styles.matchInfoText}>
          Kickoff: {match.kickoffTime}
          {match.meetTime && ` (Meet: ${match.meetTime})`}
        </ThemedText>
      </Row>
      <Row align="center" gap="sm">
        <Ionicons name="location" size={18} color={palette.tint} />
        <ThemedText style={styles.matchInfoText}>{match.venue}</ThemedText>
      </Row>
      {match.address && (
        <ThemedText style={[styles.addressText, { color: palette.muted }]}>
          {match.address}
        </ThemedText>
      )}
      {player?.position && (
        <Row align="center" gap="sm">
          <Ionicons name="person" size={18} color={palette.tint} />
          <ThemedText style={styles.matchInfoText}>Position: {player.position}</ThemedText>
        </Row>
      )}
      {player?.jerseyNumber && (
        <Row align="center" gap="sm">
          <Ionicons name="shirt" size={18} color={palette.tint} />
          <ThemedText style={styles.matchInfoText}>Number: {player.jerseyNumber}</ThemedText>
        </Row>
      )}
    </View>
  );
});

// ─── SelectedCard ───────────────────────────────────────────────────────────

interface SelectedCardProps {
  match: Match;
  player: MatchPlayer;
  palette: ThemeColors;
}

export const SelectedCard = memo(function SelectedCard({ match, player, palette }: SelectedCardProps) {
  const isReserve = player.status === 'RESERVE';

  return (
    <SurfaceCard
      style={styles.card}
      outlineGradient={
        isReserve
          ? [palette.warning, withAlpha(palette.warning, 0.67)]
          : [palette.success, withAlpha(palette.success, 0.67)]
      }
    >
      <View style={styles.selectionHeader}>
        <View style={[styles.iconCircle, { backgroundColor: isReserve ? palette.warning : palette.success }]}>
          <Ionicons name={isReserve ? 'hourglass' : 'football'} size={28} color={palette.onPrimary} />
        </View>
        <ThemedText type="title" style={styles.selectionTitle}>
          {isReserve ? "You're on the Bench!" : "You're in the Lineup!"}
        </ThemedText>
      </View>

      <ThemedText style={[styles.selectionMessage, { color: palette.text }]}>
        {isReserve
          ? `${player.athleteName} has been selected as a reserve for the match against ${match.opponent}.`
          : `${player.athleteName} has been selected to play against ${match.opponent}!`}
      </ThemedText>

      <MatchInfoCard match={match} player={player} palette={palette} />
    </SurfaceCard>
  );
});

// ─── RespondedCard ──────────────────────────────────────────────────────────

interface RespondedCardProps {
  match: Match;
  player: MatchPlayer;
  onChangeResponse: (status: 'AVAILABLE' | 'UNAVAILABLE') => void;
  palette: ThemeColors;
}

export const RespondedCard = memo(function RespondedCard({
  match,
  player,
  onChangeResponse,
  palette,
}: RespondedCardProps) {
  const isAvailable = player.status === 'AVAILABLE';

  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" gap="md">
        <View
          style={[
            styles.statusIcon,
            { backgroundColor: isAvailable ? withAlpha(palette.success, 0.09) : withAlpha(palette.error, 0.09) },
          ]}
        >
          <Ionicons
            name={isAvailable ? 'checkmark-circle' : 'close-circle'}
            size={24}
            color={isAvailable ? palette.success : palette.error}
          />
        </View>
        <View style={styles.responseInfo}>
          <ThemedText type="defaultSemiBold">
            {isAvailable ? 'Marked as Available' : 'Marked as Unavailable'}
          </ThemedText>
          <ThemedText style={[styles.responseSubtext, { color: palette.muted }]}>
            {player.responseAt
              ? `Responded ${new Date(player.responseAt).toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Response recorded'}
          </ThemedText>
        </View>
      </Row>

      {player.parentNote && (
        <View style={[styles.noteDisplay, { backgroundColor: palette.surface }]}>
          <ThemedText style={[styles.noteLabel, { color: palette.muted }]}>Your note:</ThemedText>
          <ThemedText style={styles.noteContent}>&quot;{player.parentNote}&quot;</ThemedText>
        </View>
      )}

      <ThemedText style={[styles.waitingText, { color: palette.muted }]}>
        {isAvailable
          ? 'Waiting for coach to finalize the lineup...'
          : 'The coach has been notified.'}
      </ThemedText>

      <Clickable
        style={[styles.changeButton, { borderColor: palette.border }]}
        onPress={() => {
          Alert.alert(
            'Change Response',
            'Are you sure you want to change your response?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: isAvailable ? 'Mark Unavailable' : 'Mark Available',
                onPress: () => onChangeResponse(isAvailable ? 'UNAVAILABLE' : 'AVAILABLE'),
              },
            ]
          );
        }}
      >
        <ThemedText style={[styles.changeButtonText, { color: palette.muted }]}>
          Change Response
        </ThemedText>
      </Clickable>
    </SurfaceCard>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  matchInfo: { padding: Spacing.md, borderRadius: Radii.md, gap: Spacing.sm },
  matchInfoText: { ...Typography.bodySmall, flex: 1 },
  addressText: { ...Typography.small, marginLeft: 26 },
  selectionHeader: { alignItems: 'center', gap: Spacing.sm },
  iconCircle: { width: 56, height: 56, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  selectionTitle: { ...Typography.title, textAlign: 'center' },
  selectionMessage: { ...Typography.body, textAlign: 'center', lineHeight: 22 },
  statusIcon: { width: 48, height: 48, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  responseInfo: { flex: 1 },
  responseSubtext: { ...Typography.small },
  noteDisplay: { padding: Spacing.sm, borderRadius: Radii.sm, gap: Spacing.xxs },
  noteLabel: { ...Typography.caption },
  noteContent: { ...Typography.bodySmall, fontStyle: 'italic' },
  waitingText: { ...Typography.small, textAlign: 'center', fontStyle: 'italic' },
  changeButton: { alignSelf: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.pill, borderWidth: 1 },
  changeButtonText: { ...Typography.small },
});
