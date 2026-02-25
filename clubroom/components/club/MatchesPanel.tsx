import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row, Column } from '@/components/primitives';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { matchService } from '@/services/match-service';
import type { Match } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

export interface MatchesPanelProps {
  matches: Match[];
  isCoach: boolean;
  onCreateMatch?: () => void;
  onViewAll?: () => void;
}

export const MatchesPanel = memo(function MatchesPanel({
  matches,
  isCoach,
  onCreateMatch,
  onViewAll,
}: MatchesPanelProps) {
  const { colors: palette } = useTheme();

  const handleCreateMatch = useCallback(() => {
    if (onCreateMatch) {
      onCreateMatch();
    } else {
      router.push(Routes.MATCHES_CREATE);
    }
  }, [onCreateMatch]);

  const handleViewAll = useCallback(() => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push(Routes.MATCHES);
    }
  }, [onViewAll]);

  const handleMatchPress = useCallback((matchId: string) => {
    router.push(Routes.match(matchId));
  }, []);

  return (
    <SurfaceCard style={styles.card}>
      <Row style={styles.sectionHeader}>
        <Row style={styles.headerLeft}>
          <Ionicons name="trophy" size={20} color={palette.tint} />
          <ThemedText type="defaultSemiBold">Upcoming Matches</ThemedText>
        </Row>
        <Clickable
          style={styles.viewAllButton}
          onPress={handleViewAll}
          accessibilityLabel="View all fixtures"
        >
          <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>
            View All Fixtures
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={palette.tint} />
        </Clickable>
      </Row>

      {matches.length === 0 ? (
        <Column style={styles.emptyContainer} align="center">
          <View
            style={[styles.emptyIconCircle, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
          >
            <Ionicons name="trophy-outline" size={32} color={palette.muted} />
          </View>
          {isCoach ? (
            <>
              <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
                No upcoming matches
              </ThemedText>
              <ThemedText style={[styles.emptySubtitle, { color: palette.muted }]}>
                Schedule a match for your squad
              </ThemedText>
              <Clickable
                style={[styles.createMatchButton, { borderColor: palette.tint }]}
                onPress={handleCreateMatch}
                accessibilityLabel="Create match"
              >
                <Ionicons name="add-circle" size={18} color={palette.tint} />
                <ThemedText style={[styles.createMatchText, { color: palette.tint }]}>
                  Create Match
                </ThemedText>
              </Clickable>
            </>
          ) : (
            <>
              <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
                No upcoming matches
              </ThemedText>
              <ThemedText style={[styles.emptySubtitle, { color: palette.muted }]}>
                Matches will appear here when scheduled
              </ThemedText>
            </>
          )}
        </Column>
      ) : (
        <View style={styles.matchesList}>
          {matches.map((match) => {
            const matchDate = new Date(match.date);
            const dateLabel = matchDate.toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });
            const typeColor = matchService.getMatchTypeColor(match.matchType, palette);

            return (
              <Clickable
                key={match.id}
                style={[styles.matchCard, { borderLeftColor: typeColor }]}
                onPress={() => handleMatchPress(match.id)}
                accessibilityLabel={`Match vs ${match.opponent}`}
              >
                <View style={styles.matchCardContent}>
                  {/* Row 1: Type pill + Home/Away pill + date */}
                  <Row style={styles.matchTopRow}>
                    <Row style={styles.matchBadges}>
                      <View
                        style={[
                          styles.matchTypeBadge,
                          { backgroundColor: withAlpha(typeColor, 0.09) },
                        ]}
                      >
                        <ThemedText style={[styles.matchTypeText, { color: typeColor }]}>
                          {matchService.formatMatchType(match.matchType)}
                        </ThemedText>
                      </View>
                      <Row
                        align="center"
                        gap="xxs"
                        style={[
                          styles.homeAwayBadge,
                          { backgroundColor: withAlpha(palette.muted, 0.06) },
                        ]}
                      >
                        <Ionicons
                          name={match.isHome ? 'home' : 'airplane'}
                          size={10}
                          color={palette.muted}
                        />
                        <ThemedText style={[styles.homeAwayText, { color: palette.muted }]}>
                          {match.isHome ? 'Home' : 'Away'}
                        </ThemedText>
                      </Row>
                    </Row>
                    <ThemedText style={[styles.dateText, { color: palette.muted }]}>
                      {dateLabel}
                    </ThemedText>
                  </Row>

                  {/* Row 2: Bold opponent */}
                  <ThemedText type="defaultSemiBold" style={styles.opponentText} numberOfLines={1}>
                    vs {match.opponent}
                  </ThemedText>

                  {/* Row 3: Kickoff + venue */}
                  <ThemedText style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                    {match.kickoffTime} · {match.venue}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.muted} />
              </Clickable>
            );
          })}
        </View>
      )}

      {isCoach && matches.length > 0 && (
        <Clickable
          style={[styles.createMatchButton, { borderColor: palette.tint }]}
          onPress={handleCreateMatch}
          accessibilityLabel="Create match"
        >
          <Ionicons name="add-circle" size={18} color={palette.tint} />
          <ThemedText style={[styles.createMatchText, { color: palette.tint }]}>
            Create Match
          </ThemedText>
        </Clickable>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
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
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderRadius: Radii.sm,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  matchCardContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  matchTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  matchTypeBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  matchTypeText: { ...Typography.micro, textTransform: 'uppercase' },
  homeAwayBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  homeAwayText: { ...Typography.micro },
  dateText: { ...Typography.caption },
  opponentText: { ...Typography.bodySmall },
  metaText: { ...Typography.caption },
  emptyContainer: {
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: { ...Typography.bodySmallSemiBold },
  emptySubtitle: { ...Typography.caption, textAlign: 'center' },
  createMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  createMatchText: { ...Typography.bodySmallSemiBold },
});
