import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Match } from '@/constants/types';
import { matchService } from '@/services/match-service';
import { getMatchClubLabel } from '@/utils/match-display';

import { MatchAvailabilityRow, MatchPlayerStatusRow } from './match-card-sections';

interface MatchCardProps {
  match: Match;
  isCoach?: boolean;
  showClub?: boolean;
  onPress?: () => void;
}

export function MatchCard({ match, isCoach = false, showClub = false, onPress }: MatchCardProps) {
  const { colors: palette } = useTheme();
  const clubLabel = getMatchClubLabel(match);

  const matchDate = new Date(match.date);
  const dateLabel = matchDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const typeColor = matchService.getMatchTypeColor(match.matchType);
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
      <Row align="center" gap="xs" style={[styles.resultBadge, { backgroundColor: withAlpha(resultColor, 0.09) }]}>
        <ThemedText style={[styles.resultText, { color: resultColor }]}>
          {match.isHome ? `${home} - ${away}` : `${away} - ${home}`}
        </ThemedText>
        <ThemedText style={[styles.resultLabel, { color: resultColor }]}>
          {isWin ? 'W' : isDraw ? 'D' : 'L'}
        </ThemedText>
      </Row>
    );
  };

  return (
    <SurfaceCard
      style={styles.card}
      onPress={handlePress}
      outlineGradient={isUpcoming ? [typeColor, withAlpha(typeColor, 0.38)] : undefined}
    >
      {/* Header row with type badge */}
      <Row align="center" gap="xs">
        <View style={[styles.typeBadge, { backgroundColor: withAlpha(typeColor, 0.09) }]}>
          <ThemedText style={[styles.typeText, { color: typeColor }]}>
            {matchService.formatMatchType(match.matchType)}
          </ThemedText>
        </View>
        <Row align="center" gap="xxs" style={[styles.homeAwayBadge, { backgroundColor: palette.surface }]}>
          <Ionicons
            name={match.isHome ? 'home' : 'airplane'}
            size={12}
            color={palette.muted}
          />
          <ThemedText style={[styles.homeAwayText, { color: palette.muted }]}>
            {match.isHome ? 'Home' : 'Away'}
          </ThemedText>
        </Row>
        {match.result && getResultDisplay()}
      </Row>

      {/* Match title and opponent */}
      <View style={styles.titleSection}>
        <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
          {match.title}
        </ThemedText>
        <Row align="center" gap="xs">
          <ThemedText style={[styles.vsText, { color: palette.muted }]}>vs</ThemedText>
          <ThemedText style={styles.opponent}>{match.opponent}</ThemedText>
        </Row>
      </View>

      {/* Date and time */}
      <Row gap="lg" style={styles.scheduleRow}>
        <Row align="center" gap="xs">
          <Ionicons name="calendar-outline" size={16} color={palette.tint} />
          <ThemedText style={styles.scheduleText}>{dateLabel}</ThemedText>
        </Row>
        <Row align="center" gap="xs">
          <Ionicons name="time-outline" size={16} color={palette.tint} />
          <ThemedText style={styles.scheduleText}>
            KO {match.kickoffTime}
            {match.meetTime && (
              <ThemedText style={[styles.meetTime, { color: palette.muted }]}>
                {' '}(Meet {match.meetTime})
              </ThemedText>
            )}
          </ThemedText>
        </Row>
      </Row>

      {/* Location */}
      <Row align="center" gap="xs">
        <Ionicons name="location-outline" size={16} color={palette.muted} />
        <ThemedText style={[styles.locationText, { color: palette.muted }]} numberOfLines={1}>
          {match.venue}
        </ThemedText>
      </Row>

      {/* Club name if showing */}
      {showClub && (
        <Row align="center" gap="xs">
          <Ionicons name="shield-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.clubText, { color: palette.muted }]}>
            {clubLabel}
          </ThemedText>
        </Row>
      )}

      {/* Status and availability (coach view) */}
      {isCoach && isUpcoming && <MatchAvailabilityRow match={match} />}

      {/* Player status (parent view) */}
      {!isCoach && <MatchPlayerStatusRow match={match} />}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  typeText: { ...Typography.caption, textTransform: 'uppercase' },
  homeAwayBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  homeAwayText: { ...Typography.caption },
  resultBadge: {
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
  vsText: { ...Typography.caption },
  opponent: { ...Typography.bodySmallSemiBold },
  scheduleRow: {
    marginTop: Spacing.xs,
  },
  scheduleText: { ...Typography.small },
  meetTime: { ...Typography.caption },
  locationText: { ...Typography.small, flex: 1 },
  clubText: { ...Typography.caption },
});
