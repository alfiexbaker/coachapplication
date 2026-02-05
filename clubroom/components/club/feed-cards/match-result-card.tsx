import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface MatchResultData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  /** 'W' | 'D' | 'L' from the perspective of the club */
  result: 'W' | 'D' | 'L';
  date: string;
  playerOfTheMatch?: string;
  likeCount: number;
  commentCount: number;
}

export interface MatchResultCardProps {
  data: MatchResultData;
  onLike?: () => void;
  onComment?: () => void;
  onPress?: () => void;
}

const RESULT_COLORS: Record<MatchResultData['result'], string> = {
  W: '#1C8C5E',
  D: '#6B7280',
  L: '#C03E47',
};

const RESULT_LABELS: Record<MatchResultData['result'], string> = {
  W: 'Win',
  D: 'Draw',
  L: 'Loss',
};

export function MatchResultCard({ data, onLike, onComment, onPress }: MatchResultCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const resultColor = RESULT_COLORS[data.result];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      {/* Header row: type label + date */}
      <View style={styles.headerRow}>
        <View style={styles.typeRow}>
          <Ionicons name="football-outline" size={Components.icon.sm} color={palette.muted} />
          <ThemedText style={[styles.typeLabel, { color: palette.muted }]}>Match Result</ThemedText>
        </View>
        <ThemedText style={[styles.dateText, { color: palette.muted }]}>{formatDate(data.date)}</ThemedText>
      </View>

      {/* Score display */}
      <View style={styles.scoreContainer}>
        <View style={styles.teamColumn}>
          <ThemedText style={[styles.teamName, { color: palette.text }]} numberOfLines={1}>
            {data.homeTeam}
          </ThemedText>
        </View>

        <View style={styles.scoreCenter}>
          <ThemedText style={[styles.scoreText, { color: palette.text }]}>
            {data.homeScore} - {data.awayScore}
          </ThemedText>
          <View style={[styles.resultPill, { backgroundColor: resultColor }]}>
            <ThemedText style={styles.resultPillText}>{RESULT_LABELS[data.result]}</ThemedText>
          </View>
        </View>

        <View style={[styles.teamColumn, styles.teamColumnRight]}>
          <ThemedText style={[styles.teamName, { color: palette.text }]} numberOfLines={1}>
            {data.awayTeam}
          </ThemedText>
        </View>
      </View>

      {/* Player of the match */}
      {data.playerOfTheMatch ? (
        <View style={[styles.potmRow, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name="star" size={Components.icon.sm} color={palette.warning} />
          <ThemedText style={[styles.potmText, { color: palette.text }]}>
            Player of the Match: <ThemedText style={styles.potmName}>{data.playerOfTheMatch}</ThemedText>
          </ThemedText>
        </View>
      ) : null}

      {/* Footer: likes + comments */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerAction} onPress={onLike}>
          <Ionicons name="heart-outline" size={Components.icon.md} color={palette.muted} />
          <ThemedText style={[styles.footerCount, { color: palette.muted }]}>{data.likeCount}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerAction} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={Components.icon.md} color={palette.muted} />
          <ThemedText style={[styles.footerCount, { color: palette.muted }]}>{data.commentCount}</ThemedText>
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  typeLabel: {
    ...Typography.caption,
  },
  dateText: {
    ...Typography.caption,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  teamColumn: {
    flex: 1,
  },
  teamColumnRight: {
    alignItems: 'flex-end',
  },
  teamName: {
    ...Typography.bodySemiBold,
  },
  scoreCenter: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs / 2,
  },
  scoreText: {
    ...Typography.title,
    fontWeight: '700',
  },
  resultPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
  },
  resultPillText: {
    ...Typography.micro,
    color: '#FFFFFF',
  },
  potmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  potmText: {
    ...Typography.small,
  },
  potmName: {
    ...Typography.small,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  footerCount: {
    ...Typography.small,
  },
});
