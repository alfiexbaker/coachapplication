import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { BadgeAward } from '@/constants/types';

export interface DevSessionInfoProps {
  athleteName: string;
  avatar: string | undefined;
  sessionDate: string;
  sessionBadges: BadgeAward[];
  colors: ThemeColors;
  onAwardBadge: () => void;
}

export const DevSessionInfo = memo(function DevSessionInfo({
  athleteName,
  avatar,
  sessionDate,
  sessionBadges,
  colors,
  onAwardBadge,
}: DevSessionInfoProps) {
  return (
    <SurfaceCard style={styles.card}>
      <Row gap="sm" align="center">
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <ThemedText style={[Typography.title, { color: colors.tint }]}>
            {avatar || athleteName.charAt(0)}
          </ThemedText>
        </View>
        <View style={{ flex: 1, gap: Spacing.micro }}>
          <ThemedText type="defaultSemiBold" style={Typography.subheading}>
            {athleteName}
          </ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted }]}>{sessionDate}</ThemedText>
        </View>
        <Clickable
          onPress={onAwardBadge}
          style={[styles.awardBtn, { backgroundColor: withAlpha(colors.tint, 0.09) }]}
        >
          <Ionicons name="ribbon" size={18} color={colors.tint} />
          <ThemedText style={[Typography.caption, { color: colors.tint }]}>Award Badge</ThemedText>
        </Clickable>
      </Row>
      {sessionBadges.length > 0 && (
        <Row gap="xs" style={{ flexWrap: 'wrap' }}>
          {sessionBadges.map((badge) => (
            <Row
              key={badge.id}
              style={[styles.badgeChip, { backgroundColor: withAlpha(colors.success, 0.09) }]}
            >
              <Ionicons name="ribbon" size={14} color={colors.success} />
              <ThemedText style={[Typography.caption, { color: colors.success }]}>
                {badge.badgeLabel}
              </ThemedText>
            </Row>
          ))}
        </Row>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  awardBtn: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  badgeChip: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
});
