import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { matchService } from '@/services/match-service';
import type { Match } from '@/constants/types';
import { getMatchSquadLabel } from '@/utils/match-display';

function getResultSummary(match: Match, colors: ReturnType<typeof useTheme>['colors']) {
  if (!match.result) return null;
  const ourScore = match.isHome ? match.result.home : match.result.away;
  const theirScore = match.isHome ? match.result.away : match.result.home;

  let outcome = 'Draw';
  let color = colors.warning;
  if (ourScore > theirScore) {
    outcome = 'Won';
    color = colors.success;
  } else if (ourScore < theirScore) {
    outcome = 'Lost';
    color = colors.error;
  }

  return {
    outcome,
    color,
    score: `${ourScore} - ${theirScore}`,
    detail: `vs ${match.opponent} (${match.isHome ? 'home' : 'away'})`,
  };
}

interface MatchHeaderCardProps {
  match: Match;
  isUpcoming: boolean;
}

export const MatchHeaderCard = memo(function MatchHeaderCard({
  match,
  isUpcoming,
}: MatchHeaderCardProps) {
  const { colors } = useTheme();
  const squadLabel = getMatchSquadLabel(match);
  const typeColor = matchService.getMatchTypeColor(match.matchType, colors);
  const statusColor = matchService.getStatusColor(match.status);
  const resultSummary = getResultSummary(match, colors);
  const matchDate = new Date(match.date);
  const dateLabel = matchDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <SurfaceCard
      style={styles.card}
      outlineGradient={isUpcoming ? [typeColor, withAlpha(typeColor, 0.38)] : undefined}
    >
      <Row gap="xs" style={{ flexWrap: 'wrap' }}>
        <View style={[styles.badge, { backgroundColor: withAlpha(typeColor, 0.09) }]}>
          <ThemedText style={[styles.badgeText, { color: typeColor, textTransform: 'uppercase' }]}>
            {matchService.formatMatchType(match.matchType)}
          </ThemedText>
        </View>
        <View style={[styles.badge, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
          <ThemedText style={[styles.badgeText, { color: statusColor }]}>
            {matchService.formatStatus(match.status)}
          </ThemedText>
        </View>
        <Row align="center" gap="xxs" style={[styles.badge, { backgroundColor: colors.surface }]}>
          <Ionicons name={match.isHome ? 'home' : 'airplane'} size={12} color={colors.muted} />
          <ThemedText style={[styles.badgeText, { color: colors.muted }]}>
            {match.isHome ? 'Home' : 'Away'}
          </ThemedText>
        </Row>
      </Row>

      <ThemedText type="title" style={{ marginTop: Spacing.xs }}>
        {match.title}
      </ThemedText>
      <Row gap="xs" align="center">
        <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>vs</ThemedText>
        <ThemedText type="defaultSemiBold" style={Typography.subheading}>
          {match.opponent}
        </ThemedText>
      </Row>

      {match.result && (
        <View style={styles.resultContainer}>
          <View style={[styles.resultBox, { backgroundColor: colors.surface }]}>
            {resultSummary && (
              <ThemedText
                style={[Typography.caption, { color: resultSummary.color, textTransform: 'uppercase' }]}
              >
                {resultSummary.outcome}
              </ThemedText>
            )}
            <ThemedText style={Typography.display}>{resultSummary?.score}</ThemedText>
            <ThemedText
              style={[Typography.caption, { color: colors.muted, marginTop: Spacing.xxs }]}
            >
              {resultSummary?.detail ?? 'Final Score'}
            </ThemedText>
            <ThemedText style={[Typography.micro, { color: colors.muted, marginTop: Spacing.micro }]}>
              Our score shown first
            </ThemedText>
            <Row gap="md" style={{ marginTop: Spacing.xs }}>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Home: {match.result.home}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Away: {match.result.away}
              </ThemedText>
            </Row>
          </View>
        </View>
      )}

      <View style={styles.details}>
        <Row gap="sm" align="flex-start">
          <Ionicons name="calendar" size={20} color={colors.tint} />
          <ThemedText style={[Typography.bodySmall, { flex: 1 }]}>{dateLabel}</ThemedText>
        </Row>
        <Row gap="sm" align="flex-start">
          <Ionicons name="time" size={20} color={colors.tint} />
          <ThemedText style={[Typography.bodySmall, { flex: 1 }]}>
            Kickoff: {match.kickoffTime}
            {match.meetTime && (
              <ThemedText style={{ color: colors.muted }}> (Meet: {match.meetTime})</ThemedText>
            )}
          </ThemedText>
        </Row>
        <Row gap="sm" align="flex-start">
          <Ionicons name="location" size={20} color={colors.tint} />
          <Column flex>
            <ThemedText style={Typography.bodySmall}>{match.venue}</ThemedText>
            {match.address && (
              <ThemedText
                style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}
              >
                {match.address}
              </ThemedText>
            )}
          </Column>
        </Row>
        {squadLabel && (
          <Row gap="sm" align="flex-start">
            <Ionicons name="people" size={20} color={colors.tint} />
            <ThemedText style={[Typography.bodySmall, { flex: 1 }]}>{squadLabel}</ThemedText>
          </Row>
        )}
      </View>

      {match.notes && (
        <Row
          gap="sm"
          align="flex-start"
          style={[styles.notesBox, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="chatbubble-outline" size={16} color={colors.muted} />
          <ThemedText style={[Typography.small, { flex: 1, fontStyle: 'italic' }]}>
            {match.notes}
          </ThemedText>
        </Row>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { margin: Spacing.md, gap: Spacing.sm },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  badgeText: { ...Typography.caption },
  resultContainer: { alignItems: 'center', marginVertical: Spacing.sm },
  resultBox: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  details: { gap: Spacing.sm, marginTop: Spacing.sm },
  notesBox: { padding: Spacing.sm, borderRadius: Radii.sm },
});
