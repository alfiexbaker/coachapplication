import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Match } from '@/constants/types';
import { matchService } from '@/services/match-service';

interface MatchCardProps {
  match: Match;
  isCoach?: boolean;
  showClub?: boolean;
  onPress?: () => void;
}

export function MatchCard({ match, isCoach = false, showClub = false, onPress }: MatchCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const matchDate = new Date(match.date);
  const dateLabel = matchDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const typeColor = matchService.getMatchTypeColor(match.matchType);
  const statusColor = matchService.getStatusColor(match.status);
  const availability = matchService.getAvailabilitySummary(match);

  const isUpcoming = match.status === 'SCHEDULED' || match.status === 'LINEUP_SET';

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(Routes.match(match.id));
    }
  };

  const getResultDisplay = () => {
    if (!match.result) return null;
    const { home, away } = match.result;
    const isWin = match.isHome ? home > away : away > home;
    const isDraw = home === away;
    const resultColor = isWin ? palette.success : isDraw ? palette.warning : palette.error;

    return (
      <View style={[styles.resultBadge, { backgroundColor: withAlpha(resultColor, 0.09) }]}>
        <ThemedText style={[styles.resultText, { color: resultColor }]}>
          {match.isHome ? `${home} - ${away}` : `${away} - ${home}`}
        </ThemedText>
        <ThemedText style={[styles.resultLabel, { color: resultColor }]}>
          {isWin ? 'W' : isDraw ? 'D' : 'L'}
        </ThemedText>
      </View>
    );
  };

  return (
    <SurfaceCard
      style={styles.card}
      onPress={handlePress}
      outlineGradient={isUpcoming ? [typeColor, withAlpha(typeColor, 0.38)] : undefined}
    >
      {/* Header row with type badge */}
      <View style={styles.headerRow}>
        <View style={[styles.typeBadge, { backgroundColor: withAlpha(typeColor, 0.09) }]}>
          <ThemedText style={[styles.typeText, { color: typeColor }]}>
            {matchService.formatMatchType(match.matchType)}
          </ThemedText>
        </View>
        <View style={[styles.homeAwayBadge, { backgroundColor: palette.surface }]}>
          <Ionicons
            name={match.isHome ? 'home' : 'airplane'}
            size={12}
            color={palette.muted}
          />
          <ThemedText style={[styles.homeAwayText, { color: palette.muted }]}>
            {match.isHome ? 'Home' : 'Away'}
          </ThemedText>
        </View>
        {match.result && getResultDisplay()}
      </View>

      {/* Match title and opponent */}
      <View style={styles.titleSection}>
        <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
          {match.title}
        </ThemedText>
        <View style={styles.opponentRow}>
          <ThemedText style={[styles.vsText, { color: palette.muted }]}>vs</ThemedText>
          <ThemedText style={styles.opponent}>{match.opponent}</ThemedText>
        </View>
      </View>

      {/* Date and time */}
      <View style={styles.scheduleRow}>
        <View style={styles.scheduleItem}>
          <Ionicons name="calendar-outline" size={16} color={palette.tint} />
          <ThemedText style={styles.scheduleText}>{dateLabel}</ThemedText>
        </View>
        <View style={styles.scheduleItem}>
          <Ionicons name="time-outline" size={16} color={palette.tint} />
          <ThemedText style={styles.scheduleText}>
            KO {match.kickoffTime}
            {match.meetTime && (
              <ThemedText style={[styles.meetTime, { color: palette.muted }]}>
                {' '}(Meet {match.meetTime})
              </ThemedText>
            )}
          </ThemedText>
        </View>
      </View>

      {/* Location */}
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={16} color={palette.muted} />
        <ThemedText style={[styles.locationText, { color: palette.muted }]} numberOfLines={1}>
          {match.venue}
        </ThemedText>
      </View>

      {/* Club name if showing */}
      {showClub && (
        <View style={styles.clubRow}>
          <Ionicons name="shield-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.clubText, { color: palette.muted }]}>
            {match.clubName}
          </ThemedText>
        </View>
      )}

      {/* Status and availability (coach view) */}
      {isCoach && isUpcoming && (
        <View style={styles.availabilityRow}>
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
      )}

      {/* Player status (parent view) */}
      {!isCoach && match.selectedPlayers.length > 0 && (
        <View style={styles.playerStatusRow}>
          {match.selectedPlayers.map((player) => (
            <View
              key={player.athleteId}
              style={[
                styles.playerBadge,
                { backgroundColor: withAlpha(matchService.getPlayerStatusColor(player.status), 0.09) }
              ]}
            >
              <ThemedText
                style={[
                  styles.playerBadgeText,
                  { color: matchService.getPlayerStatusColor(player.status) }
                ]}
              >
                {player.athleteName}: {matchService.formatPlayerStatus(player.status)}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  typeText: { ...Typography.caption, textTransform: 'uppercase' },
  homeAwayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  homeAwayText: { ...Typography.caption },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    marginLeft: 'auto',
  },
  resultText: { ...Typography.bodySmallSemiBold },
  resultLabel: { ...Typography.caption },
  titleSection: {
    gap: Spacing.micro,
  },
  title: { ...Typography.subheading },
  opponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  vsText: { ...Typography.caption },
  opponent: { ...Typography.bodySmallSemiBold },
  scheduleRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scheduleText: { ...Typography.small },
  meetTime: { ...Typography.caption },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  locationText: { ...Typography.small, flex: 1 },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  clubText: { ...Typography.caption },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
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
