import { useState } from 'react';
import { StyleSheet, View, TextInput, Alert } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Match, MatchPlayer } from '@/constants/types';
import { SelectedCard, RespondedCard, MatchInfoCard } from './availability-response-sections';
import { getMatchPlayerAthleteName } from '@/utils/match-display';

interface AvailabilityResponseProps {
  match: Match;
  player: MatchPlayer;
  onRespond: (status: 'AVAILABLE' | 'UNAVAILABLE', note?: string) => Promise<void>;
  isLoading?: boolean;
}

export function AvailabilityResponse({
  match,
  player,
  onRespond,
  isLoading,
}: AvailabilityResponseProps) {
  const { colors: palette } = useTheme();
  const athleteName = getMatchPlayerAthleteName(player);

  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const hasResponded = player.status === 'AVAILABLE' || player.status === 'UNAVAILABLE';
  const isSelected = player.status === 'SELECTED' || player.status === 'RESERVE';

  const handleResponse = async (status: 'AVAILABLE' | 'UNAVAILABLE') => {
    if (status === 'UNAVAILABLE' && !showNoteInput) {
      setShowNoteInput(true);
      return;
    }

    try {
      await onRespond(status, note || undefined);
    } catch {
      Alert.alert('Error', 'Failed to submit response. Please try again.');
    }
  };

  if (isSelected) {
    return <SelectedCard match={match} player={player} palette={palette} />;
  }

  if (hasResponded) {
    return (
      <RespondedCard
        match={match}
        player={player}
        onChangeResponse={handleResponse}
        palette={palette}
      />
    );
  }

  // Awaiting response
  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.inviteHeader}>
        <Ionicons name="football" size={32} color={palette.tint} />
        <ThemedText type="title" style={styles.inviteTitle}>
          Match Invitation
        </ThemedText>
      </View>

      <ThemedText style={[styles.inviteMessage, { color: palette.text }]}>
        {athleteName} has been invited to play in the match against{' '}
        <ThemedText type="defaultSemiBold">{match.opponent}</ThemedText>.
      </ThemedText>

      <MatchInfoCard match={match} palette={palette} />

      {match.notes && (
        <Row
          align="flex-start"
          gap="sm"
          style={[styles.coachNote, { backgroundColor: withAlpha(palette.tint, 0.03) }]}
        >
          <Ionicons name="chatbubble-outline" size={16} color={palette.tint} />
          <ThemedText style={styles.coachNoteText}>{match.notes}</ThemedText>
        </Row>
      )}

      {showNoteInput && (
        <View style={styles.noteInputContainer}>
          <ThemedText style={[styles.noteInputLabel, { color: palette.muted }]}>
            Add a note (optional):
          </ThemedText>
          <TextInput
            style={[
              styles.noteInput,
              {
                backgroundColor: palette.surface,
                color: palette.text,
                borderColor: palette.border,
              },
            ]}
            placeholder="e.g., Family commitment, doctor's appointment..."
            placeholderTextColor={palette.muted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}

            maxLength={500}
          />
        </View>
      )}

      <Row gap="sm">
        <Clickable
          style={[styles.responseButton, { backgroundColor: palette.success }]}
          onPress={() => handleResponse('AVAILABLE')}
          disabled={isLoading}
        >
          <Row align="center" justify="center" gap="xs" flex>
            <Ionicons name="checkmark-circle" size={22} color={palette.onSuccess} />
            <ThemedText style={[styles.responseButtonText, { color: palette.onSuccess }]}>
              Available
            </ThemedText>
          </Row>
        </Clickable>

        <Clickable
          style={[
            styles.responseButton,
            {
              backgroundColor: showNoteInput ? palette.error : palette.surface,
              borderColor: palette.error,
              borderWidth: 1,
            },
          ]}
          onPress={() => handleResponse('UNAVAILABLE')}
          disabled={isLoading}
        >
          <Row align="center" justify="center" gap="xs" flex>
            <Ionicons
              name="close-circle"
              size={22}
              color={showNoteInput ? palette.onError : palette.error}
            />
            <ThemedText
              style={[
                styles.responseButtonText,
                { color: showNoteInput ? palette.onError : palette.error },
              ]}
            >
              {showNoteInput ? 'Confirm Unavailable' : 'Unavailable'}
            </ThemedText>
          </Row>
        </Clickable>
      </Row>

      {showNoteInput && (
        <Clickable
          style={styles.cancelNoteButton}
          onPress={() => {
            setShowNoteInput(false);
            setNote('');
          }}
        >
          <ThemedText style={[styles.cancelNoteText, { color: palette.muted }]}>Cancel</ThemedText>
        </Clickable>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  inviteHeader: { alignItems: 'center', gap: Spacing.sm },
  inviteTitle: { ...Typography.title, textAlign: 'center' },
  inviteMessage: { ...Typography.body, textAlign: 'center' },
  coachNote: { padding: Spacing.sm, borderRadius: Radii.sm },
  coachNoteText: { ...Typography.small, flex: 1, fontStyle: 'italic' },
  noteInputContainer: { gap: Spacing.xs },
  noteInputLabel: { ...Typography.small },
  noteInput: {
    ...Typography.bodySmall,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  responseButton: { flex: 1, padding: Spacing.md, borderRadius: Radii.md },
  responseButtonText: { ...Typography.bodySemiBold },
  cancelNoteButton: { alignItems: 'center', padding: Spacing.sm },
  cancelNoteText: { ...Typography.bodySmall },
});
