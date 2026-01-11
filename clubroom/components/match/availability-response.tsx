import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Match, MatchPlayer } from '@/constants/types';
import { matchService } from '@/services/match-service';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const hasResponded = player.status === 'AVAILABLE' || player.status === 'UNAVAILABLE';
  const isSelected = player.status === 'SELECTED' || player.status === 'RESERVE';

  const matchDate = new Date(match.date);
  const dateLabel = matchDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleResponse = async (status: 'AVAILABLE' | 'UNAVAILABLE') => {
    if (status === 'UNAVAILABLE' && !showNoteInput) {
      setShowNoteInput(true);
      return;
    }

    try {
      await onRespond(status, note || undefined);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit response. Please try again.');
    }
  };

  if (isSelected) {
    // Player has been selected - show celebration
    const isReserve = player.status === 'RESERVE';
    return (
      <SurfaceCard
        style={styles.card}
        outlineGradient={isReserve ? ['#F59E0B', '#FCD34D'] : ['#16A34A', '#4ADE80']}
      >
        <View style={styles.selectionHeader}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isReserve ? '#F59E0B' : '#16A34A' }
            ]}
          >
            <Ionicons
              name={isReserve ? 'hourglass' : 'football'}
              size={28}
              color="#fff"
            />
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

        <View style={[styles.matchInfo, { backgroundColor: palette.surface }]}>
          <View style={styles.matchInfoRow}>
            <Ionicons name="calendar" size={18} color={palette.tint} />
            <ThemedText style={styles.matchInfoText}>{dateLabel}</ThemedText>
          </View>
          <View style={styles.matchInfoRow}>
            <Ionicons name="time" size={18} color={palette.tint} />
            <ThemedText style={styles.matchInfoText}>
              Kickoff: {match.kickoffTime}
              {match.meetTime && ` (Meet: ${match.meetTime})`}
            </ThemedText>
          </View>
          <View style={styles.matchInfoRow}>
            <Ionicons name="location" size={18} color={palette.tint} />
            <ThemedText style={styles.matchInfoText}>{match.venue}</ThemedText>
          </View>
          {player.position && (
            <View style={styles.matchInfoRow}>
              <Ionicons name="person" size={18} color={palette.tint} />
              <ThemedText style={styles.matchInfoText}>Position: {player.position}</ThemedText>
            </View>
          )}
          {player.jerseyNumber && (
            <View style={styles.matchInfoRow}>
              <Ionicons name="shirt" size={18} color={palette.tint} />
              <ThemedText style={styles.matchInfoText}>Number: {player.jerseyNumber}</ThemedText>
            </View>
          )}
        </View>
      </SurfaceCard>
    );
  }

  if (hasResponded) {
    // Already responded - show current status
    const isAvailable = player.status === 'AVAILABLE';
    return (
      <SurfaceCard style={styles.card}>
        <View style={styles.responseHeader}>
          <View
            style={[
              styles.statusIcon,
              { backgroundColor: isAvailable ? `${palette.success}15` : `${palette.error}15` }
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
        </View>

        {player.parentNote && (
          <View style={[styles.noteDisplay, { backgroundColor: palette.surface }]}>
            <ThemedText style={[styles.noteLabel, { color: palette.muted }]}>Your note:</ThemedText>
            <ThemedText style={styles.noteContent}>"{player.parentNote}"</ThemedText>
          </View>
        )}

        <ThemedText style={[styles.waitingText, { color: palette.muted }]}>
          {isAvailable
            ? 'Waiting for coach to finalize the lineup...'
            : 'The coach has been notified.'}
        </ThemedText>

        {/* Option to change response */}
        <TouchableOpacity
          style={[styles.changeButton, { borderColor: palette.border }]}
          onPress={() => {
            Alert.alert(
              'Change Response',
              `Are you sure you want to change your response?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: isAvailable ? 'Mark Unavailable' : 'Mark Available',
                  onPress: () => handleResponse(isAvailable ? 'UNAVAILABLE' : 'AVAILABLE'),
                },
              ]
            );
          }}
        >
          <ThemedText style={[styles.changeButtonText, { color: palette.muted }]}>
            Change Response
          </ThemedText>
        </TouchableOpacity>
      </SurfaceCard>
    );
  }

  // Awaiting response
  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.inviteHeader}>
        <Ionicons name="football" size={32} color={palette.tint} />
        <ThemedText type="title" style={styles.inviteTitle}>Match Invitation</ThemedText>
      </View>

      <ThemedText style={[styles.inviteMessage, { color: palette.text }]}>
        {player.athleteName} has been invited to play in the match against{' '}
        <ThemedText type="defaultSemiBold">{match.opponent}</ThemedText>.
      </ThemedText>

      <View style={[styles.matchInfo, { backgroundColor: palette.surface }]}>
        <View style={styles.matchInfoRow}>
          <Ionicons name="calendar" size={18} color={palette.tint} />
          <ThemedText style={styles.matchInfoText}>{dateLabel}</ThemedText>
        </View>
        <View style={styles.matchInfoRow}>
          <Ionicons name="time" size={18} color={palette.tint} />
          <ThemedText style={styles.matchInfoText}>
            Kickoff: {match.kickoffTime}
            {match.meetTime && ` (Meet: ${match.meetTime})`}
          </ThemedText>
        </View>
        <View style={styles.matchInfoRow}>
          <Ionicons name="location" size={18} color={palette.tint} />
          <ThemedText style={styles.matchInfoText}>{match.venue}</ThemedText>
        </View>
        {match.address && (
          <ThemedText style={[styles.addressText, { color: palette.muted }]}>
            {match.address}
          </ThemedText>
        )}
      </View>

      {match.notes && (
        <View style={[styles.coachNote, { backgroundColor: `${palette.tint}08` }]}>
          <Ionicons name="chatbubble-outline" size={16} color={palette.tint} />
          <ThemedText style={styles.coachNoteText}>{match.notes}</ThemedText>
        </View>
      )}

      {showNoteInput && (
        <View style={styles.noteInputContainer}>
          <ThemedText style={[styles.noteInputLabel, { color: palette.muted }]}>
            Add a note (optional):
          </ThemedText>
          <TextInput
            style={[
              styles.noteInput,
              { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }
            ]}
            placeholder="e.g., Family commitment, doctor's appointment..."
            placeholderTextColor={palette.muted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
          />
        </View>
      )}

      <View style={styles.responseButtons}>
        <TouchableOpacity
          style={[styles.responseButton, styles.availableButton, { backgroundColor: palette.success }]}
          onPress={() => handleResponse('AVAILABLE')}
          disabled={isLoading}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <ThemedText style={styles.responseButtonText}>Available</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.responseButton,
            styles.unavailableButton,
            { backgroundColor: showNoteInput ? palette.error : palette.surface, borderColor: palette.error }
          ]}
          onPress={() => handleResponse('UNAVAILABLE')}
          disabled={isLoading}
        >
          <Ionicons
            name="close-circle"
            size={22}
            color={showNoteInput ? '#fff' : palette.error}
          />
          <ThemedText
            style={[
              styles.responseButtonText,
              { color: showNoteInput ? '#fff' : palette.error }
            ]}
          >
            {showNoteInput ? 'Confirm Unavailable' : 'Unavailable'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {showNoteInput && (
        <TouchableOpacity
          style={styles.cancelNoteButton}
          onPress={() => {
            setShowNoteInput(false);
            setNote('');
          }}
        >
          <ThemedText style={[styles.cancelNoteText, { color: palette.muted }]}>
            Cancel
          </ThemedText>
        </TouchableOpacity>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  inviteHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inviteTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  inviteMessage: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  matchInfo: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  matchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  matchInfoText: {
    fontSize: 14,
    flex: 1,
  },
  addressText: {
    fontSize: 13,
    marginLeft: 26,
  },
  coachNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  coachNoteText: {
    fontSize: 13,
    flex: 1,
    fontStyle: 'italic',
  },
  noteInputContainer: {
    gap: Spacing.xs,
  },
  noteInputLabel: {
    fontSize: 13,
  },
  noteInput: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  responseButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  responseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  availableButton: {},
  unavailableButton: {
    borderWidth: 1,
  },
  responseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelNoteButton: {
    alignItems: 'center',
    padding: Spacing.sm,
  },
  cancelNoteText: {
    fontSize: 14,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseInfo: {
    flex: 1,
  },
  responseSubtext: {
    fontSize: 13,
  },
  noteDisplay: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    gap: 4,
  },
  noteLabel: {
    fontSize: 12,
  },
  noteContent: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  waitingText: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  changeButton: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  changeButtonText: {
    fontSize: 13,
  },
  selectionHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionTitle: {
    fontSize: 22,
    textAlign: 'center',
  },
  selectionMessage: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
});
