/**
 * Extracted sub-components for LineupSelector.
 *
 * LineupSummaryRow — available/selected/reserves stats.
 * SelectablePlayerRow — player row with tap-to-select/reserve.
 * DisabledPlayerRow — pending/unavailable player row.
 * SubmitLineupButton — confirm lineup footer button.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { MatchPlayer } from '@/constants/types';
import { matchService } from '@/services/match-service';
import { getMatchPlayerAthleteName } from '@/utils/match-display';

// ─── LineupSummaryRow ────────────────────────────────────────────────────────

interface LineupSummaryRowProps {
  availableCount: number;
  selectedCount: number;
  maxPlayers: number;
  reserveCount: number;
  palette: ThemeColors;
}

export const LineupSummaryRow = memo(function LineupSummaryRow({
  availableCount,
  selectedCount,
  maxPlayers,
  reserveCount,
  palette,
}: LineupSummaryRowProps) {
  return (
    <Row style={[styles.summaryRow, { backgroundColor: palette.surface }]}>
      <View style={styles.summaryItem}>
        <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>Available</ThemedText>
        <ThemedText type="title" style={{ color: palette.success }}>
          {availableCount}
        </ThemedText>
      </View>
      <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
      <View style={styles.summaryItem}>
        <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>Selected</ThemedText>
        <ThemedText type="title" style={{ color: palette.tint }}>
          {selectedCount}/{maxPlayers}
        </ThemedText>
      </View>
      <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
      <View style={styles.summaryItem}>
        <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>Reserves</ThemedText>
        <ThemedText type="title" style={{ color: palette.warning }}>
          {reserveCount}
        </ThemedText>
      </View>
    </Row>
  );
});

// ─── SelectablePlayerRow ─────────────────────────────────────────────────────

interface SelectablePlayerRowProps {
  player: MatchPlayer;
  selectionStatus: 'selected' | 'reserve' | 'available';
  onPress: () => void;
  palette: ThemeColors;
}

export const SelectablePlayerRow = memo(function SelectablePlayerRow({
  player,
  selectionStatus,
  onPress,
  palette,
}: SelectablePlayerRowProps) {
  const athleteName = getMatchPlayerAthleteName(player);
  const isSelected = selectionStatus === 'selected';
  const isReserve = selectionStatus === 'reserve';
  const statusColor = matchService.getPlayerStatusColor(player.status);

  return (
    <Clickable
      style={[
        styles.playerRow,
        { borderColor: palette.border },
        isSelected ? { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: palette.tint } : undefined,
        isReserve ? { backgroundColor: withAlpha(palette.warning, 0.06), borderColor: palette.warning } : undefined,
      ]}
      onPress={onPress}
    >
      <Row align="center" justify="between" flex>
        <Row align="center" gap="sm" flex>
          <View style={[styles.playerAvatar, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
            <ThemedText style={[styles.avatarText, { color: statusColor }]}>
              {athleteName.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.playerDetails}>
            <ThemedText type="defaultSemiBold">{athleteName}</ThemedText>
            {player.position && (
              <ThemedText style={[styles.positionText, { color: palette.muted }]}>
                {player.position}
              </ThemedText>
            )}
          </View>
        </Row>

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
      </Row>
    </Clickable>
  );
});

// ─── DisabledPlayerRow ───────────────────────────────────────────────────────

interface DisabledPlayerRowProps {
  player: MatchPlayer;
  variant: 'pending' | 'unavailable';
  palette: ThemeColors;
}

export const DisabledPlayerRow = memo(function DisabledPlayerRow({
  player,
  variant,
  palette,
}: DisabledPlayerRowProps) {
  const athleteName = getMatchPlayerAthleteName(player);
  const color = variant === 'pending' ? palette.warning : palette.error;
  const icon = variant === 'pending' ? 'hourglass-outline' : 'close-circle';
  const subtitle = variant === 'pending' ? 'Waiting for response' : player.parentNote;

  return (
    <Row align="center" justify="between" style={[styles.playerRow, styles.disabledRow, { borderColor: palette.border }]}>
      <Row align="center" gap="sm" flex>
        <View style={[styles.playerAvatar, { backgroundColor: withAlpha(color, 0.09) }]}>
          <ThemedText style={[styles.avatarText, { color }]}>
            {athleteName.slice(0, 2).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.playerDetails}>
          <ThemedText style={{ opacity: 0.6 }}>{athleteName}</ThemedText>
          {subtitle && (
            <ThemedText style={[styles.positionText, { color: palette.muted }]} numberOfLines={1}>
              {variant === 'unavailable' ? `"${subtitle}"` : subtitle}
            </ThemedText>
          )}
        </View>
      </Row>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={color} />
    </Row>
  );
});

// ─── SubmitLineupButton ──────────────────────────────────────────────────────

interface SubmitLineupButtonProps {
  selectedCount: number;
  reserveCount: number;
  isLoading: boolean;
  onSubmit: () => void;
  palette: ThemeColors;
}

export const SubmitLineupButton = memo(function SubmitLineupButton({
  selectedCount,
  reserveCount,
  isLoading,
  onSubmit,
  palette,
}: SubmitLineupButtonProps) {
  const isDisabled = isLoading || selectedCount === 0;

  return (
    <View style={[styles.footer, { borderTopColor: palette.border }]}>
      <Clickable
        style={[
          styles.submitButton,
          { backgroundColor: palette.tint },
          isDisabled ? styles.disabledButton : undefined,
        ]}
        onPress={onSubmit}
        disabled={isDisabled}
      >
        {isLoading ? (
          <ThemedText style={[styles.submitText, { color: palette.onPrimary }]}>Setting Lineup...</ThemedText>
        ) : (
          <Row align="center" justify="center" gap="sm">
            <Ionicons name="checkmark-circle" size={20} color={palette.onPrimary} />
            <ThemedText style={[styles.submitText, { color: palette.onPrimary }]}>
              Confirm Lineup ({selectedCount} players, {reserveCount} reserves)
            </ThemedText>
          </Row>
        )}
      </Clickable>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  summaryRow: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { ...Typography.caption, marginBottom: Spacing.micro },
  summaryDivider: { width: 1, height: '100%' },
  playerRow: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  disabledRow: { opacity: 0.6 },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.bodySmallSemiBold },
  playerDetails: { flex: 1 },
  positionText: { ...Typography.caption },
  selectionIndicator: { width: 28, alignItems: 'center' },
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
  footer: { padding: Spacing.md, borderTopWidth: 1 },
  submitButton: {
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  disabledButton: { opacity: 0.5 },
  submitText: { ...Typography.bodySemiBold },
});
