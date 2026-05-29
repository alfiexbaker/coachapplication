/**
 * Extracted sub-components for BadgeCard.
 *
 * CompactBadgeCardInner — compact row variant (accepts palette).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { TierNames } from '@/constants/progression';
import type { AllBadgeWithProgress } from '@/services/badge-service';
import type { ThemeColors } from '@/hooks/useTheme';
import { BADGE_TYPE_ICONS, getTierColor } from './badge-card-helpers';

// ─── CompactBadgeCardInner ───────────────────────────────────────────────────

interface CompactBadgeCardInnerProps {
  badge: AllBadgeWithProgress;
  onPress?: () => void;
  palette: ThemeColors;
}

export const CompactBadgeCardInner = function CompactBadgeCardInner({
  badge,
  onPress,
  palette,
}: CompactBadgeCardInnerProps) {
  const tierColor = getTierColor(badge.tier, palette.tint);
  const isLocked = !badge.isUnlocked;
  const badgeIcon = BADGE_TYPE_ICONS[badge.badgeType];

  return (
    <SurfaceCard
      style={[
        styles.compactCard,
        isLocked ? styles.lockedCard : undefined,
        { borderColor: isLocked ? palette.border : withAlpha(tierColor, 0.25) },
      ]}
      onPress={onPress}
      tactile={!!onPress}
    >
      <View
        style={[
          styles.compactIconContainer,
          {
            backgroundColor: isLocked ? withAlpha(palette.muted, 0.09) : withAlpha(tierColor, 0.12),
          },
        ]}
      >
        <Ionicons
          name={badgeIcon}
          size={20}
          color={isLocked ? palette.muted : tierColor}
          style={isLocked ? styles.lockedIcon : undefined}
        />
        {isLocked && (
          <View style={[styles.lockOverlay, { backgroundColor: palette.background }]}>
            <Ionicons name="lock-closed" size={10} color={palette.muted} />
          </View>
        )}
      </View>
      <View style={styles.compactContent}>
        <ThemedText
          type="defaultSemiBold"
          style={[styles.compactLabel, isLocked ? { color: palette.muted } : undefined]}
          numberOfLines={1}
        >
          {badge.label}
        </ThemedText>
        {badge.tier && (
          <View
            style={[
              styles.tierPillSmall,
              {
                backgroundColor: isLocked
                  ? withAlpha(palette.muted, 0.09)
                  : withAlpha(tierColor, 0.12),
              },
            ]}
          >
            <ThemedText
              style={[styles.tierTextSmall, { color: isLocked ? palette.muted : tierColor }]}
            >
              {TierNames[badge.tier]}
            </ThemedText>
          </View>
        )}
      </View>
      {!isLocked && badge.earnedAt && (
        <Ionicons name="checkmark-circle" size={16} color={palette.success} />
      )}
    </SurfaceCard>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  compactCard: {
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  lockedCard: { opacity: 0.6 },
  compactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockedIcon: { opacity: 0.5 },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: Radii.sm,
    padding: Spacing.micro,
  },
  compactContent: { flex: 1, gap: Spacing.xxs },
  compactLabel: { ...Typography.bodySmall },
  tierPillSmall: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
  tierTextSmall: { ...Typography.micro, textTransform: 'uppercase' },
});
