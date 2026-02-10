/**
 * DevProfileCard — Child profile summary with trend and quick stats.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface DevProfileCardProps {
  childName: string;
  sessionCount: number;
  avgRating: string;
  badgeCount: number;
  trend: 'improving' | 'declining' | 'steady';
}

function DevProfileCardInner({ childName, sessionCount, avgRating, badgeCount, trend }: DevProfileCardProps) {
  const { colors: palette } = useTheme();

  const trendIcon = trend === 'improving' ? 'trending-up' : trend === 'declining' ? 'trending-down' : 'remove';
  const trendText = trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Needs Focus' : 'Steady';
  const trendColor = trend === 'improving' ? palette.success : trend === 'declining' ? palette.error : palette.muted;

  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" gap="md">
        <Row align="center" justify="center" style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
            {childName.charAt(0)}
          </ThemedText>
        </Row>
        <View style={styles.info}>
          <ThemedText type="subtitle" style={styles.name}>{childName}</ThemedText>
          <Row gap="xs">
            <Row align="center" gap="xxs" style={[styles.trendBadge, { backgroundColor: withAlpha(trendColor, 0.12) }]}>
              <Ionicons name={trendIcon} size={12} color={trendColor} />
              <ThemedText style={[styles.trendText, { color: trendColor }]}>{trendText}</ThemedText>
            </Row>
          </Row>
        </View>
      </Row>

      <Row style={[styles.stats, { borderTopColor: palette.border }]}>
        <QuickStat icon="calendar" value={String(sessionCount)} label="Sessions" iconBg={withAlpha(palette.tint, 0.07)} iconColor={palette.tint} />
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <QuickStat icon="star" value={avgRating} label="Avg Rating" iconBg={withAlpha(palette.warning, 0.09)} iconColor={palette.warning} />
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <QuickStat icon="ribbon" value={String(badgeCount)} label="Badges" iconBg={withAlpha(palette.success, 0.07)} iconColor={palette.success} />
      </Row>
    </SurfaceCard>
  );
}

function QuickStat({ icon, value, label, iconBg, iconColor }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  iconBg: string;
  iconColor: string;
}) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.stat}>
      <Row align="center" justify="center" style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </Row>
      <ThemedText type="defaultSemiBold" style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: palette.muted }]}>{label}</ThemedText>
    </View>
  );
}

export const DevProfileCard = memo(DevProfileCardInner);

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.md },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
  },
  avatarText: { ...Typography.display },
  info: { flex: 1, gap: Spacing.xs },
  name: { ...Typography.heading },
  trendBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  trendText: { ...Typography.caption },
  stats: { paddingTop: Spacing.md, borderTopWidth: 1 },
  stat: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  statIcon: { width: 32, height: 32, borderRadius: Radii.lg },
  divider: { width: 1, alignSelf: 'stretch', marginVertical: Spacing.xxs },
  statValue: { ...Typography.heading },
  statLabel: { ...Typography.micro, textTransform: 'uppercase', letterSpacing: 0.3 },
});
