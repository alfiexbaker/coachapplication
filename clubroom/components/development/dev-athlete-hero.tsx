import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { StatCard } from '@/components/primitives/stat-card';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Session } from '@/constants/types';
import type { LevelBadge } from '@/hooks/use-athlete-development';
import { formatShortDateWithYear } from '@/utils/format';

type TrendType = 'improving' | 'declining' | 'steady';

export interface DevAthleteHeroProps {
  athleteName: string;
  avatar: string | undefined;
  sessions: Session[];
  sortedSessions: Session[];
  trend: TrendType;
  level: LevelBadge;
  colors: ThemeColors;
}

export const DevAthleteHero = memo(function DevAthleteHero({
  athleteName,
  avatar,
  sessions,
  sortedSessions,
  trend,
  level,
  colors,
}: DevAthleteHeroProps) {
  const trendIcon =
    trend === 'improving' ? 'trending-up' : trend === 'declining' ? 'trending-down' : 'pulse';
  const trendText =
    trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Needs Focus' : 'Steady';
  const trendColor =
    trend === 'improving' ? colors.success : trend === 'declining' ? colors.error : colors.muted;

  const avgRating =
    sessions.length > 0
      ? (sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length).toFixed(1)
      : '-';

  const lastSessionDate =
    sessions.length > 0
      ? formatShortDateWithYear(sortedSessions[0].completedAt).split(' ')[0]
      : '-';

  return (
    <SurfaceCard style={styles.heroCard}>
      <Row gap="sm" align="flex-start">
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
            {avatar || athleteName.charAt(0)}
          </ThemedText>
        </View>
        <View style={styles.heroInfo}>
          <ThemedText type="heading" numberOfLines={2}>
            {athleteName}
          </ThemedText>
          <ThemedText style={{ color: colors.muted, ...Typography.small }}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} completed
          </ThemedText>
        </View>
      </Row>

      <View style={styles.metaRow}>
        <Row gap="xs" wrap style={styles.badgeGroup}>
          <View style={[styles.badge, { backgroundColor: withAlpha(trendColor, 0.09) }]}>
            <Row gap="xs" align="center">
              <Ionicons name={trendIcon} size={14} color={trendColor} />
              <ThemedText style={[styles.badgeText, { color: trendColor }]}>{trendText}</ThemedText>
            </Row>
          </View>
          <View style={[styles.badge, { backgroundColor: withAlpha(level.color, 0.09) }]}>
            <Row gap="xs" align="center">
              <Ionicons name={level.icon} size={14} color={level.color} />
              <ThemedText style={[styles.badgeText, { color: level.color }]}>
                {level.name}
              </ThemedText>
            </Row>
          </View>
        </Row>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Row align="center" justify="space-around">
        <StatCard value={sessions.length} label="Total Sessions" variant="compact" />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatCard
          value={avgRating}
          label="Avg Rating"
          variant="compact"
          icon={<Ionicons name="star" size={16} color={colors.tint} />}
        />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatCard value={lastSessionDate} label="Last Session" variant="compact" />
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  heroCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.title,
  },
  heroInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.sm,
  },
  badgeText: {
    ...Typography.micro,
    textTransform: 'none',
  },
  metaRow: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  badgeGroup: {
    minHeight: Components.buttonCompact.height,
  },
  divider: {
    height: 1,
    opacity: 0.5,
  },
  statDivider: {
    width: 1,
    height: Components.avatar.md,
    opacity: 0.5,
  },
});
