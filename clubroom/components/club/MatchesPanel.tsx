import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { matchService } from '@/services/match-service';
import type { Match } from '@/constants/types';

export interface MatchesPanelProps {
  matches: Match[];
  isCoach: boolean;
  onCreateMatch?: () => void;
  onViewAll?: () => void;
}

export function MatchesPanel({ matches, isCoach, onCreateMatch, onViewAll }: MatchesPanelProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const handleCreateMatch = () => {
    if (onCreateMatch) {
      onCreateMatch();
    } else {
      router.push('/matches/create');
    }
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push('/matches');
    }
  };

  if (matches.length === 0) {
    return null;
  }

  return (
    <SurfaceCard style={styles.matchesCard}>
      <View style={styles.matchesSectionHeader}>
        <View style={styles.matchesHeaderLeft}>
          <Ionicons name="trophy" size={20} color={palette.tint} />
          <ThemedText type="defaultSemiBold">Upcoming Matches</ThemedText>
        </View>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={handleViewAll}
        >
          <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>View All</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={palette.tint} />
        </TouchableOpacity>
      </View>

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
            <TouchableOpacity
              key={match.id}
              style={[styles.matchItem, { borderColor: palette.border }]}
              onPress={() => router.push({
                pathname: '/matches/[id]',
                params: { id: match.id },
              })}
            >
              <View style={styles.matchItemLeft}>
                <View style={[styles.matchTypeBadge, { backgroundColor: `${typeColor}15` }]}>
                  <ThemedText style={[styles.matchTypeText, { color: typeColor }]}>
                    {matchService.formatMatchType(match.matchType)}
                  </ThemedText>
                </View>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }} numberOfLines={1}>
                  vs {match.opponent}
                </ThemedText>
                <ThemedText style={[styles.matchMeta, { color: palette.muted }]}>
                  {dateLabel} · {match.kickoffTime} · {match.isHome ? 'Home' : 'Away'}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </TouchableOpacity>
          );
        })}
      </View>

      {isCoach && (
        <TouchableOpacity
          style={[styles.createMatchButton, { borderColor: palette.tint }]}
          onPress={handleCreateMatch}
        >
          <Ionicons name="add-circle" size={18} color={palette.tint} />
          <ThemedText style={[styles.createMatchText, { color: palette.tint }]}>
            Create Match
          </ThemedText>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '500',
  },
  matchesList: {
    gap: Spacing.sm,
  },
  matchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  matchItemLeft: {
    flex: 1,
    gap: 4,
  },
  matchTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    marginBottom: 2,
  },
  matchTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  matchMeta: {
    fontSize: 12,
  },
  createMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  createMatchText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
