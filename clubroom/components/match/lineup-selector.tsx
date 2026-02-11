import { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Match, MatchPlayer } from '@/constants/types';
import {
  LineupSummaryRow,
  SelectablePlayerRow,
  DisabledPlayerRow,
  SubmitLineupButton,
} from './lineup-selector-sections';

interface LineupSelectorProps {
  match: Match;
  onSetLineup: (
    lineup: {
      athleteId: string;
      position?: string;
      jerseyNumber?: number;
      isReserve?: boolean;
    }[],
  ) => Promise<void>;
  isLoading?: boolean;
}

interface SelectedPlayer extends MatchPlayer {
  position?: string;
  jerseyNumber?: number;
  isReserve?: boolean;
}

export function LineupSelector({ match, onSetLineup, isLoading }: LineupSelectorProps) {
  const { colors: palette } = useTheme();

  const availablePlayers = useMemo(
    () => match.selectedPlayers.filter((p) => p.status === 'AVAILABLE'),
    [match.selectedPlayers],
  );

  const unavailablePlayers = useMemo(
    () => match.selectedPlayers.filter((p) => p.status === 'UNAVAILABLE'),
    [match.selectedPlayers],
  );

  const pendingPlayers = useMemo(
    () => match.selectedPlayers.filter((p) => p.status === 'INVITED'),
    [match.selectedPlayers],
  );

  const [selectedForLineup, setSelectedForLineup] = useState<SelectedPlayer[]>([]);
  const [reserves, setReserves] = useState<SelectedPlayer[]>([]);

  const togglePlayerSelection = useCallback(
    (player: MatchPlayer) => {
      const isSelected = selectedForLineup.some((p) => p.athleteId === player.athleteId);
      const isReserve = reserves.some((p) => p.athleteId === player.athleteId);

      if (isSelected) {
        setSelectedForLineup((prev) => prev.filter((p) => p.athleteId !== player.athleteId));
        setReserves((prev) => [...prev, { ...player, isReserve: true }]);
      } else if (isReserve) {
        setReserves((prev) => prev.filter((p) => p.athleteId !== player.athleteId));
      } else {
        if (selectedForLineup.length >= match.maxPlayers) {
          Alert.alert(
            'Squad Full',
            `Maximum ${match.maxPlayers} players allowed. Remove a player first or add to reserves.`,
          );
          return;
        }
        setSelectedForLineup((prev) => [...prev, { ...player, isReserve: false }]);
      }
    },
    [selectedForLineup, reserves, match.maxPlayers],
  );

  const handleSubmitLineup = useCallback(async () => {
    if (selectedForLineup.length === 0) {
      Alert.alert('No Players Selected', 'Please select at least one player for the lineup.');
      return;
    }

    const lineup = [
      ...selectedForLineup.map((p) => ({
        athleteId: p.athleteId,
        position: p.position,
        jerseyNumber: p.jerseyNumber,
        isReserve: false,
      })),
      ...reserves.map((p) => ({
        athleteId: p.athleteId,
        position: p.position,
        jerseyNumber: p.jerseyNumber,
        isReserve: true,
      })),
    ];

    await onSetLineup(lineup);
  }, [selectedForLineup, reserves, onSetLineup]);

  const getPlayerStatus = useCallback(
    (player: MatchPlayer): 'selected' | 'reserve' | 'available' => {
      if (selectedForLineup.some((p) => p.athleteId === player.athleteId)) return 'selected';
      if (reserves.some((p) => p.athleteId === player.athleteId)) return 'reserve';
      return 'available';
    },
    [selectedForLineup, reserves],
  );

  return (
    <View style={styles.container}>
      <LineupSummaryRow
        availableCount={availablePlayers.length}
        selectedCount={selectedForLineup.length}
        maxPlayers={match.maxPlayers}
        reserveCount={reserves.length}
        palette={palette}
      />

      <ScrollView style={styles.playerList} showsVerticalScrollIndicator={false}>
        {availablePlayers.length > 0 && (
          <View style={styles.section}>
            <Row align="center" gap="xs" style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: palette.success }]} />
              <ThemedText type="defaultSemiBold">Available ({availablePlayers.length})</ThemedText>
            </Row>
            {availablePlayers.map((player) => (
              <SelectablePlayerRow
                key={player.athleteId}
                player={player}
                selectionStatus={getPlayerStatus(player)}
                onPress={() => togglePlayerSelection(player)}
                palette={palette}
              />
            ))}
          </View>
        )}

        {pendingPlayers.length > 0 && (
          <View style={styles.section}>
            <Row align="center" gap="xs" style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: palette.warning }]} />
              <ThemedText type="defaultSemiBold">
                Awaiting Response ({pendingPlayers.length})
              </ThemedText>
            </Row>
            {pendingPlayers.map((player) => (
              <DisabledPlayerRow
                key={player.athleteId}
                player={player}
                variant="pending"
                palette={palette}
              />
            ))}
          </View>
        )}

        {unavailablePlayers.length > 0 && (
          <View style={styles.section}>
            <Row align="center" gap="xs" style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: palette.error }]} />
              <ThemedText type="defaultSemiBold">
                Unavailable ({unavailablePlayers.length})
              </ThemedText>
            </Row>
            {unavailablePlayers.map((player) => (
              <DisabledPlayerRow
                key={player.athleteId}
                player={player}
                variant="unavailable"
                palette={palette}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <SubmitLineupButton
        selectedCount={selectedForLineup.length}
        reserveCount={reserves.length}
        isLoading={isLoading ?? false}
        onSubmit={handleSubmitLineup}
        palette={palette}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  playerList: { flex: 1 },
  section: { marginBottom: Spacing.md },
  sectionHeader: {
    marginBottom: Spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
});
