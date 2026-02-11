/**
 * ProgressProfileCard — Athlete profile summary with level badge, trend, and quick stats.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface ProgressProfileCardProps {
  athleteName: string;
  avatar: string;
  sessionCount: number;
  avgRating: string;
  badgeCount: number;
  activeGoalCount: number;
  level: { name: string; icon: keyof typeof Ionicons.glyphMap; color: string };
  trend: 'improving' | 'declining' | 'steady';
}

function ProgressProfileCardInner({
  athleteName,
  avatar,
  sessionCount,
  avgRating,
  badgeCount,
  activeGoalCount,
  level,
  trend,
}: ProgressProfileCardProps) {
  const { colors: palette } = useTheme();

  const trendText =
    trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Needs Focus' : 'Steady';
  const trendColor =
    trend === 'improving' ? palette.success : trend === 'declining' ? palette.error : palette.muted;
  const trendIcon =
    trend === 'improving' ? 'trending-up' : trend === 'declining' ? 'trending-down' : 'pulse';

  return (
    <SurfaceCard style={styles.card}>
      <Row style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
            {avatar || athleteName.charAt(0)}
          </ThemedText>
        </View>
        <View style={styles.info}>
          <ThemedText type="subtitle" style={styles.name}>
            {athleteName}
          </ThemedText>
          <Row style={styles.badgeRow}>
            <Row style={[styles.levelBadge, { backgroundColor: withAlpha(level.color, 0.12) }]}>
              <Ionicons name={level.icon} size={12} color={level.color} />
              <ThemedText style={[styles.levelText, { color: level.color }]}>
                {level.name}
              </ThemedText>
            </Row>
            <Row style={[styles.trendBadge, { backgroundColor: withAlpha(trendColor, 0.12) }]}>
              <Ionicons name={trendIcon} size={12} color={trendColor} />
              <ThemedText style={[styles.trendText, { color: trendColor }]}>{trendText}</ThemedText>
            </Row>
          </Row>
        </View>
      </Row>

      <Row style={[styles.stats, { borderTopColor: palette.border }]}>
        <QuickStat label="Sessions" value={String(sessionCount)} />
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <QuickStat label="Avg Rating" value={avgRating} icon="star" iconColor={palette.warning} />
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <QuickStat label="Badges" value={String(badgeCount)} />
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <QuickStat label="Goals" value={String(activeGoalCount)} />
      </Row>
    </SurfaceCard>
  );
}

function QuickStat({
  label,
  value,
  icon,
  iconColor,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.stat}>
      {icon ? (
        <Row style={styles.statValueRow}>
          <ThemedText type="defaultSemiBold" style={styles.statValue}>
            {value}
          </ThemedText>
          <Ionicons name={icon} size={14} color={iconColor} />
        </Row>
      ) : (
        <ThemedText type="defaultSemiBold" style={styles.statValue}>
          {value}
        </ThemedText>
      )}
      <ThemedText style={[styles.statLabel, { color: palette.muted }]}>{label}</ThemedText>
    </View>
  );
}

export const ProgressProfileCard = memo(ProgressProfileCardInner);

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.md },
  header: { alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.display },
  info: { flex: 1, gap: Spacing.xs },
  name: { ...Typography.heading },
  badgeRow: { gap: Spacing.xs },
  levelBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  levelText: { ...Typography.caption },
  trendBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  trendText: { ...Typography.caption },
  stats: { paddingTop: Spacing.md, borderTopWidth: 1 },
  stat: { flex: 1, alignItems: 'center', gap: Spacing.micro },
  statValueRow: { alignItems: 'center', gap: Spacing.xxs },
  statValue: { ...Typography.heading },
  statLabel: { ...Typography.micro, textTransform: 'uppercase', letterSpacing: 0.3 },
  divider: { width: 1, alignSelf: 'stretch', marginVertical: Spacing.xxs },
});
