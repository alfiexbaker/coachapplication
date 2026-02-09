import { useState, useMemo } from 'react';
import { StyleSheet, View, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Match, MatchPlayer } from '@/constants/types';
import { matchService } from '@/services/match-service';

interface LineupSelectorProps {
  match: Match;
  onSetLineup: (lineup: {
    athleteId: string;
    position?: string;
    jerseyNumber?: number;
    isReserve?: boolean;
  }[]) => Promise<void>;
  isLoading?: boolean;
}

interface SelectedPlayer extends MatchPlayer {
  position?: string;
  jerseyNumber?: number;
  isReserve?: boolean;
}

export function LineupSelector({ match, onSetLineup, isLoading }: LineupSelectorProps) {
  const { colors: palette } = useTheme();

  const availablePlayers = useMemo(() =>
    match.selectedPlayers.filter(p => p.status === 'AVAILABLE'),
    [match.selectedPlayers]
  );

  const unavailablePlayers = useMemo(() =>
    match.selectedPlayers.filter(p => p.status === 'UNAVAILABLE'),
    [match.selectedPlayers]
  );

  const pendingPlayers = useMemo(() =>
    match.selectedPlayers.filter(p => p.status === 'INVITED'),
    [match.selectedPlayers]
  );

  const [selectedForLineup, setSelectedForLineup] = useState<SelectedPlayer[]>([]);
  const [reserves, setReserves] = useState<SelectedPlayer[]>([]);

  const togglePlayerSelection = (player: MatchPlayer) => {
    const isSelected = selectedForLineup.some(p => p.athleteId === player.athleteId);
    const isReserve = reserves.some(p => p.athleteId === player.athleteId);

    if (isSelected) {
      // Move to reserves
      setSelectedForLineup(prev => prev.filter(p => p.athleteId !== player.athleteId));
      setReserves(prev => [...prev, { ...player, isReserve: true }]);
    } else if (isReserve) {
      // Remove from reserves
      setReserves(prev => prev.filter(p => p.athleteId !== player.athleteId));
    } else {
      // Check if we've hit max players
      if (selectedForLineup.length >= match.maxPlayers) {
        Alert.alert(
          'Squad Full',
          `Maximum ${match.maxPlayers} players allowed. Remove a player first or add to reserves.`
        );
        return;
      }
      // Add to selected
      setSelectedForLineup(prev => [...prev, { ...player, isReserve: false }]);
    }
  };

  const handleSubmitLineup = async () => {
    if (selectedForLineup.length === 0) {
      Alert.alert('No Players Selected', 'Please select at least one player for the lineup.');
      return;
    }

    const lineup = [
      ...selectedForLineup.map(p => ({
        athleteId: p.athleteId,
        position: p.position,
        jerseyNumber: p.jerseyNumber,
        isReserve: false,
      })),
      ...reserves.map(p => ({
        athleteId: p.athleteId,
        position: p.position,
        jerseyNumber: p.jerseyNumber,
        isReserve: true,
      })),
    ];

    await onSetLineup(lineup);
  };

  const getPlayerStatus = (player: MatchPlayer): 'selected' | 'reserve' | 'available' => {
    if (selectedForLineup.some(p => p.athleteId === player.athleteId)) return 'selected';
    if (reserves.some(p => p.athleteId === player.athleteId)) return 'reserve';
    return 'available';
  };

  const renderPlayerRow = (player: MatchPlayer) => {
    const selectionStatus = getPlayerStatus(player);
    const isSelected = selectionStatus === 'selected';
    const isReserve = selectionStatus === 'reserve';
    const statusColor = matchService.getPlayerStatusColor(player.status);

    return (
      <Pressable
        key={player.athleteId}
        style={[
          styles.playerRow,
          { borderColor: palette.border },
          isSelected ? { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: palette.tint } : undefined,
          isReserve ? { backgroundColor: withAlpha(palette.warning, 0.06), borderColor: palette.warning } : undefined,
        ]}
        onPress={() => togglePlayerSelection(player)}
      >
        <View style={styles.playerInfo}>
          <View
            style={[
              styles.playerAvatar,
              { backgroundColor: withAlpha(statusColor, 0.09) },
            ]}
          >
            <ThemedText style={[styles.avatarText, { color: statusColor }]}>
              {player.athleteName.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.playerDetails}>
            <ThemedText type="defaultSemiBold">{player.athleteName}</ThemedText>
            {player.position && (
              <ThemedText style={[styles.positionText, { color: palette.muted }]}>
                {player.position}
              </ThemedText>
            )}
          </View>
        </View>

        <View style={styles.selectionIndicator}>
          {isSelected && (
            <View style={[styles.checkCircle, { backgroundColor: palette.tint }]}>
              <Ionicons name="checkmark" size={14} color={palette.onPrimary} />
            </View>
          )}
          {isReserve && (
            <View style={[styles.checkCircle, { backgroundColor: palette.warning }]}>
              <ThemedText style={[styles.reserveText, { color: palette.onPrimary }]}>R</ThemedText>
            </View>
          )}
          {!isSelected && !isReserve && (
            <View style={[styles.emptyCircle, { borderColor: palette.border }]} />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Summary stats */}
      <View style={[styles.summaryRow, { backgroundColor: palette.surface }]}>
        <View style={styles.summaryItem}>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>Available</ThemedText>
          <ThemedText type="title" style={{ color: palette.success }}>
            {availablePlayers.length}
          </ThemedText>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
        <View style={styles.summaryItem}>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>Selected</ThemedText>
          <ThemedText type="title" style={{ color: palette.tint }}>
            {selectedForLineup.length}/{match.maxPlayers}
          </ThemedText>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
        <View style={styles.summaryItem}>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>Reserves</ThemedText>
          <ThemedText type="title" style={{ color: palette.warning }}>
            {reserves.length}
          </ThemedText>
        </View>
      </View>

      <ScrollView style={styles.playerList} showsVerticalScrollIndicator={false}>
        {/* Available players */}
        {availablePlayers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: palette.success }]} />
              <ThemedText type="defaultSemiBold">Available ({availablePlayers.length})</ThemedText>
            </View>
            {availablePlayers.map(renderPlayerRow)}
          </View>
        )}

        {/* Pending responses */}
        {pendingPlayers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: palette.warning }]} />
              <ThemedText type="defaultSemiBold">Awaiting Response ({pendingPlayers.length})</ThemedText>
            </View>
            {pendingPlayers.map((player) => (
              <View
                key={player.athleteId}
                style={[styles.playerRow, styles.disabledRow, { borderColor: palette.border }]}
              >
                <View style={styles.playerInfo}>
                  <View style={[styles.playerAvatar, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                    <ThemedText style={[styles.avatarText, { color: palette.warning }]}>
                      {player.athleteName.slice(0, 2).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={styles.playerDetails}>
                    <ThemedText style={{ opacity: 0.6 }}>{player.athleteName}</ThemedText>
                    <ThemedText style={[styles.positionText, { color: palette.muted }]}>
                      Waiting for response
                    </ThemedText>
                  </View>
                </View>
                <Ionicons name="hourglass-outline" size={18} color={palette.warning} />
              </View>
            ))}
          </View>
        )}

        {/* Unavailable players */}
        {unavailablePlayers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: palette.error }]} />
              <ThemedText type="defaultSemiBold">Unavailable ({unavailablePlayers.length})</ThemedText>
            </View>
            {unavailablePlayers.map((player) => (
              <View
                key={player.athleteId}
                style={[styles.playerRow, styles.disabledRow, { borderColor: palette.border }]}
              >
                <View style={styles.playerInfo}>
                  <View style={[styles.playerAvatar, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
                    <ThemedText style={[styles.avatarText, { color: palette.error }]}>
                      {player.athleteName.slice(0, 2).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={styles.playerDetails}>
                    <ThemedText style={{ opacity: 0.6 }}>{player.athleteName}</ThemedText>
                    {player.parentNote && (
                      <ThemedText style={[styles.noteText, { color: palette.muted }]} numberOfLines={1}>
                        &quot;{player.parentNote}&quot;
                      </ThemedText>
                    )}
                  </View>
                </View>
                <Ionicons name="close-circle" size={18} color={palette.error} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Submit button */}
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Pressable
          style={[
            styles.submitButton,
            { backgroundColor: palette.tint },
            (isLoading || selectedForLineup.length === 0) ? styles.disabledButton : undefined,
          ]}
          onPress={handleSubmitLineup}
          disabled={isLoading || selectedForLineup.length === 0}
        >
          {isLoading ? (
            <ThemedText style={[styles.submitText, { color: palette.onPrimary }]}>Setting Lineup...</ThemedText>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={palette.onPrimary} />
              <ThemedText style={[styles.submitText, { color: palette.onPrimary }]}>
                Confirm Lineup ({selectedForLineup.length} players, {reserves.length} reserves)
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: { ...Typography.caption, marginBottom: Spacing.micro },
  summaryDivider: {
    width: 1,
    height: '100%',
  },
  playerList: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  disabledRow: {
    opacity: 0.6,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.bodySmallSemiBold },
  playerDetails: {
    flex: 1,
  },
  positionText: { ...Typography.caption },
  noteText: { ...Typography.caption, fontStyle: 'italic' },
  selectionIndicator: {
    width: 28,
    alignItems: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reserveText: { ...Typography.caption },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    borderWidth: 2,
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitText: { ...Typography.bodySemiBold },
});
