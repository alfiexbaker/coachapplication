import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PlayerCardData } from '@/types/progress-types';
import { getSkillLabel } from './skill-level-helpers';
import { StreakVisual } from './streak-visual';

interface PlayerCardBackProps {
  data: PlayerCardData;
  tierAccent: string;
  compact?: boolean;
}

const STREAK_MILESTONES = [4, 8, 12, 26, 52] as const;

function formatMemberSince(memberSince: string): string {
  const parsed = new Date(memberSince);
  if (Number.isNaN(parsed.getTime())) {
    return memberSince;
  }

  return parsed.toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });
}

function nextStreakMilestone(currentWeeks: number): number {
  return STREAK_MILESTONES.find((milestone) => milestone > currentWeeks) ?? STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
}

export const PlayerCardBack = memo(function PlayerCardBack({
  data,
  tierAccent,
  compact = false,
}: PlayerCardBackProps) {
  const { colors } = useTheme();
  const improvedLabel = data.mostImproved
    ? `${data.mostImproved.name} +${data.mostImproved.changePercent}%`
    : null;
  const bestSkillLabel = data.bestSkill
    ? `${data.bestSkill.name} — ${getSkillLabel(data.bestSkill.level)}`
    : null;
  const memberSince = useMemo(() => formatMemberSince(data.memberSince), [data.memberSince]);
  const nextMilestone = useMemo(
    () => nextStreakMilestone(data.streakWeeks),
    [data.streakWeeks],
  );
  const textColor = colors.onPrimary;
  const softText = withAlpha(textColor, 0.86);
  const statBackground = withAlpha(textColor, 0.18);
  const infoBackground = withAlpha(textColor, 0.1);
  const statRows: { id: string; icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[][] = [
    [
      { id: 'sessions', icon: 'calendar-outline', label: 'Sessions', value: String(data.totalSessions) },
      { id: 'badges', icon: 'ribbon-outline', label: 'Badges', value: String(data.totalBadges) },
    ],
    [
      { id: 'streak', icon: 'flame-outline', label: 'Streak', value: `${data.streakWeeks}w` },
      { id: 'member', icon: 'time-outline', label: 'Member', value: memberSince },
    ],
  ];

  return (
    <View style={styles.face}>
      {data.latestPhotoUri ? (
        <Image source={{ uri: data.latestPhotoUri }} style={StyleSheet.absoluteFill} blurRadius={20} />
      ) : null}

      <View style={[styles.overlay, { backgroundColor: withAlpha(tierAccent, compact ? 0.72 : 0.68) }]} />

      <Column flex style={[styles.content, compact ? styles.contentCompact : undefined]} gap="sm">
        <Column gap="micro">
          <ThemedText style={[styles.nameText, compact ? styles.nameTextCompact : undefined, { color: textColor }]} numberOfLines={1}>
            {data.name.toUpperCase()}
          </ThemedText>
          <ThemedText style={[styles.memberText, { color: softText }]}>
            Member since {memberSince}
          </ThemedText>
        </Column>

        <Column gap="xxs">
          {statRows.map((row, rowIndex) => (
            <Row key={`stats-${rowIndex}`} align="center" gap="xxs">
              {row.map((tile) => (
                <Column
                  key={tile.id}
                  gap="micro"
                  style={[
                    styles.statTile,
                    compact ? styles.statTileCompact : undefined,
                    { backgroundColor: statBackground },
                  ]}
                >
                  <Row align="center" gap="xxs">
                    <Ionicons name={tile.icon} size={compact ? 12 : 13} color={softText} />
                    <ThemedText style={[styles.tileLabel, { color: softText }]}>{tile.label}</ThemedText>
                  </Row>
                  <ThemedText style={[styles.tileValue, compact ? styles.tileValueCompact : undefined, { color: textColor }]} numberOfLines={1}>
                    {tile.value}
                  </ThemedText>
                </Column>
              ))}
            </Row>
          ))}
        </Column>

        {improvedLabel || bestSkillLabel ? (
          <Column
            gap="xxs"
            style={[
              styles.infoCard,
              compact ? styles.infoCardCompact : undefined,
              { backgroundColor: infoBackground },
            ]}
          >
            {improvedLabel ? (
              <>
                <Row align="center" gap="xxs">
                  <Ionicons name="trending-up-outline" size={14} color={softText} />
                  <ThemedText style={[styles.infoLabel, { color: softText }]}>Most improved</ThemedText>
                </Row>
                <ThemedText style={[styles.infoValue, { color: textColor }]} numberOfLines={1}>
                  {improvedLabel}
                </ThemedText>
              </>
            ) : null}
            {bestSkillLabel ? (
              <>
                <Row align="center" gap="xxs">
                  <Ionicons name="star-outline" size={14} color={softText} />
                  <ThemedText style={[styles.infoLabel, { color: softText }]}>Best skill</ThemedText>
                </Row>
                <ThemedText style={[styles.infoValue, { color: textColor }]} numberOfLines={1}>
                  {bestSkillLabel}
                </ThemedText>
              </>
            ) : null}
          </Column>
        ) : null}

        <View style={[styles.streakPanel, { backgroundColor: withAlpha(tierAccent, 0.2) }]}>
          <StreakVisual currentWeeks={data.streakWeeks} nextMilestone={nextMilestone} />
        </View>

        <Row align="center" justify="between" gap="xxs">
          <Row align="center" gap="xxs" style={styles.cornerRow}>
            <Ionicons name="football-outline" size={13} color={softText} />
            <ThemedText style={[styles.cornerText, { color: textColor }]}>T {data.corners.technical}</ThemedText>
          </Row>
          <Row align="center" gap="xxs" style={styles.cornerRow}>
            <Ionicons name="fitness-outline" size={13} color={softText} />
            <ThemedText style={[styles.cornerText, { color: textColor }]}>P {data.corners.physical}</ThemedText>
          </Row>
          <Row align="center" gap="xxs" style={styles.cornerRow}>
            <Ionicons name="bulb-outline" size={13} color={softText} />
            <ThemedText style={[styles.cornerText, { color: textColor }]}>
              Psy {data.corners.psychological}
            </ThemedText>
          </Row>
          <Row align="center" gap="xxs" style={styles.cornerRow}>
            <Ionicons name="people-outline" size={13} color={softText} />
            <ThemedText style={[styles.cornerText, { color: textColor }]}>S {data.corners.social}</ThemedText>
          </Row>
        </Row>

        <ThemedText style={[styles.watermark, { color: softText }]}>CLUBROOM</ThemedText>
      </Column>
    </View>
  );
});

const styles = StyleSheet.create({
  face: {
    flex: 1,
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    width: '100%',
  },
  contentCompact: {
    paddingHorizontal: Spacing.sm,
  },
  nameText: {
    ...Typography.heading,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nameTextCompact: {
    ...Typography.bodySmallSemiBold,
  },
  memberText: {
    ...Typography.caption,
  },
  statTile: {
    flex: 1,
    borderRadius: Radii.md,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  statTileCompact: {
    paddingVertical: Spacing.micro,
  },
  tileLabel: {
    ...Typography.micro,
  },
  tileValue: {
    ...Typography.bodySmallSemiBold,
  },
  tileValueCompact: {
    ...Typography.caption,
  },
  infoCard: {
    borderRadius: Radii.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  infoCardCompact: {
    paddingHorizontal: Spacing.xs,
  },
  infoLabel: {
    ...Typography.micro,
  },
  infoValue: {
    ...Typography.caption,
  },
  streakPanel: {
    borderRadius: Radii.md,
    padding: Spacing.xs,
  },
  cornerRow: {
    flex: 1,
    justifyContent: 'center',
  },
  cornerText: {
    ...Typography.micro,
  },
  watermark: {
    ...Typography.caption,
    textAlign: 'center',
    letterSpacing: 1.6,
    marginTop: 'auto',
  },
});
