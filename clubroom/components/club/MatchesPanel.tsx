import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { matchService } from '@/services/match-service';
import type { Match } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export interface MatchesPanelProps {
  matches: Match[];
  isCoach: boolean;
  onCreateMatch?: () => void;
  onViewAll?: () => void;
}

export function MatchesPanel({ matches, isCoach, onCreateMatch, onViewAll }: MatchesPanelProps) {
  const { colors: palette } = useTheme();

  const handleCreateMatch = () => {
    if (onCreateMatch) {
      onCreateMatch();
    } else {
      router.push(Routes.MATCHES_CREATE);
    }
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push(Routes.MATCHES);
    }
  };

  if (matches.length === 0) {
    return null;
  }

  return (
    <SurfaceCard style={styles.matchesCard}>
      <Row style={styles.matchesSectionHeader}>
        <Row style={styles.matchesHeaderLeft}>
          <Ionicons name="trophy" size={20} color={palette.tint} />
          <ThemedText type="defaultSemiBold">Upcoming Matches</ThemedText>
        </Row>
        <Clickable
          style={styles.viewAllButton}
          onPress={handleViewAll}
        >
          <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>View All</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={palette.tint} />
        </Clickable>
      </Row>

      <View style={styles.matchesList}>
        {matches.map((match) => {
          const matchDate = new Date(match.date);
          const dateLabel = matchDate.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          });
          const typeColor = matchService.getMatchTypeColor(match.matchType);

          return (
            <Clickable
              key={match.id}
              style={[styles.matchItem, { borderColor: palette.border }]}
              onPress={() => router.push(Routes.match(match.id))}
            >
              <View style={styles.matchItemLeft}>
                <View style={[styles.matchTypeBadge, { backgroundColor: withAlpha(typeColor, 0.09) }]}>
                  <ThemedText style={[styles.matchTypeText, { color: typeColor }]}>
                    {matchService.formatMatchType(match.matchType)}
                  </ThemedText>
                </View>
                <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }} numberOfLines={1}>
                  vs {match.opponent}
                </ThemedText>
                <ThemedText style={[styles.matchMeta, { color: palette.muted }]}>
                  {dateLabel} · {match.kickoffTime} · {match.isHome ? 'Home' : 'Away'}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </Clickable>
          );
        })}
      </View>

      {isCoach && (
        <Clickable
          style={[styles.createMatchButton, { borderColor: palette.tint }]}
          onPress={handleCreateMatch}
        >
          <Ionicons name="add-circle" size={18} color={palette.tint} />
          <ThemedText style={[styles.createMatchText, { color: palette.tint }]}>
            Create Match
          </ThemedText>
        </Clickable>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  matchesCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  matchesSectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchesHeaderLeft: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  viewAllButton: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  viewAllText: { ...Typography.smallSemiBold },
  matchesList: {
    gap: Spacing.sm,
  },
  matchItem: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  matchItemLeft: {
    flex: 1,
    gap: Spacing.xxs,
  },
  matchTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    marginBottom: Spacing.micro,
  },
  matchTypeText: { ...Typography.micro, textTransform: 'uppercase' },
  matchMeta: { ...Typography.caption },
  createMatchButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  createMatchText: { ...Typography.bodySmallSemiBold },
});
