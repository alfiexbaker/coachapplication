import { StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

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

// Decorative: match result indicator colors (win/draw/loss)
const RESULT_COLORS: Record<MatchResultData['result'], string> = {
  W: '#1C8C5E', // Decorative: win (green)
  D: '#6B7280', // Decorative: draw (neutral gray)
  L: '#C03E47', // Decorative: loss (red)
};

const RESULT_LABELS: Record<MatchResultData['result'], string> = {
  W: 'Win',
  D: 'Draw',
  L: 'Loss',
};

export function MatchResultCard({ data, onLike, onComment, onPress }: MatchResultCardProps) {
  const { colors: palette } = useTheme();

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
      <Row style={styles.headerRow}>
        <Row style={styles.typeRow}>
          <Ionicons name="football-outline" size={Components.icon.sm} color={palette.muted} />
          <ThemedText style={[styles.typeLabel, { color: palette.muted }]}>Match Result</ThemedText>
        </Row>
        <ThemedText style={[styles.dateText, { color: palette.muted }]}>{formatDate(data.date)}</ThemedText>
      </Row>

      {/* Score display */}
      <Row style={styles.scoreContainer}>
        <Row style={styles.teamColumn}>
          <ThemedText style={[styles.teamName, { color: palette.text }]} numberOfLines={1}>
            {data.homeTeam}
          </ThemedText>
        </Row>

        <Row style={styles.scoreCenter}>
          <ThemedText style={[styles.scoreText, { color: palette.text }]}>
            {data.homeScore} - {data.awayScore}
          </ThemedText>
          <Row style={[styles.resultPill, { backgroundColor: resultColor }]}>
            <ThemedText style={[styles.resultPillText, { color: palette.onPrimary }]}>{RESULT_LABELS[data.result]}</ThemedText>
          </Row>
        </Row>

        <Row style={[styles.teamColumn, styles.teamColumnRight]}>
          <ThemedText style={[styles.teamName, { color: palette.text }]} numberOfLines={1}>
            {data.awayTeam}
          </ThemedText>
        </Row>
      </Row>

      {/* Player of the match */}
      {data.playerOfTheMatch ? (
        <Row style={[styles.potmRow, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name="star" size={Components.icon.sm} color={palette.warning} />
          <ThemedText style={[styles.potmText, { color: palette.text }]}>
            Player of the Match: <ThemedText style={styles.potmName}>{data.playerOfTheMatch}</ThemedText>
          </ThemedText>
        </Row>
      ) : null}

      {/* Footer: likes + comments */}
      <Row style={styles.footer}>
        <Clickable style={styles.footerAction} onPress={onLike}>
          <Ionicons name="heart-outline" size={Components.icon.md} color={palette.muted} />
          <ThemedText style={[styles.footerCount, { color: palette.muted }]}>{data.likeCount}</ThemedText>
        </Clickable>
        <Clickable style={styles.footerAction} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={Components.icon.md} color={palette.muted} />
          <ThemedText style={[styles.footerCount, { color: palette.muted }]}>{data.commentCount}</ThemedText>
        </Clickable>
      </Row>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeRow: {
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
    // color applied inline via palette.onPrimary
  },
  potmRow: {
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
    ...Typography.smallSemiBold,
  },
  footer: {
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
