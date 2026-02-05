import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
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
      router.push({
        pathname: '/matches/[id]',
        params: { id: match.id },
      });
    }
  };

  const getResultDisplay = () => {
    if (!match.result) return null;
    const { home, away } = match.result;
    const isWin = match.isHome ? home > away : away > home;
    const isDraw = home === away;
    const resultColor = isWin ? palette.success : isDraw ? palette.warning : palette.error;

    return (
      <View style={[styles.resultBadge, { backgroundColor: `${resultColor}15` }]}>
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
      outlineGradient={isUpcoming ? [typeColor, `${typeColor}60`] : undefined}
    >
      {/* Header row with type badge */}
      <View style={styles.headerRow}>
        <View style={[styles.typeBadge, { backgroundColor: `${typeColor}15` }]}>
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
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}15` }]}>
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
                { backgroundColor: `${matchService.getPlayerStatusColor(player.status)}15` }
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
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  homeAwayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  homeAwayText: {
    fontSize: 11,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    marginLeft: 'auto',
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  titleSection: {
    gap: 2,
  },
  title: {
    fontSize: 16,
  },
  opponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  vsText: {
    fontSize: 12,
  },
  opponent: {
    fontSize: 14,
    fontWeight: '500',
  },
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
  scheduleText: {
    fontSize: 13,
  },
  meetTime: {
    fontSize: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  locationText: {
    fontSize: 13,
    flex: 1,
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  clubText: {
    fontSize: 12,
  },
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
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  availabilityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
  },
  playerStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  playerBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  playerBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
