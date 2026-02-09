import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { TierNames } from '@/constants/progression';
import type { AllBadgeWithProgress, BadgeType } from '@/services/badge-service';
import { useTheme } from '@/hooks/useTheme';

interface BadgeCardProps {
  badge: AllBadgeWithProgress;
  onPress?: () => void;
  compact?: boolean;
}

const BADGE_TYPE_ICONS: Record<BadgeType, keyof typeof Ionicons.glyphMap> = {
  skill: 'ribbon',
  milestone: 'trophy',
  streak: 'flame',
  event: 'star',
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  leadership: 'people',
  consistency: 'refresh',
  technique: 'football',
  mindset: 'bulb',
  teamwork: 'hand-left',
  resilience: 'fitness',
};

export function BadgeCard({ badge, onPress, compact = false }: BadgeCardProps) {
  const { colors: palette } = useTheme();

  // Decorative: metallic tier colors (gold/silver/bronze)
  const getTierColor = (tier?: 1 | 2 | 3) => {
    switch (tier) {
      case 3:
        return '#FFD700'; // Decorative: gold tier
      case 2:
        return '#C0C0C0'; // Decorative: silver tier
      case 1:
        return '#CD7F32'; // Decorative: bronze tier
      default:
        return palette.tint;
    }
  };

  const tierColor = getTierColor(badge.tier);
  const isLocked = !badge.isUnlocked;
  const badgeIcon = BADGE_TYPE_ICONS[badge.badgeType];
  const categoryIcon = badge.category ? CATEGORY_ICONS[badge.category] : undefined;

  // Format earned date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (compact) {
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
                { backgroundColor: isLocked ? withAlpha(palette.muted, 0.09) : withAlpha(tierColor, 0.12) },
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
  }

  return (
    <SurfaceCard
      style={[
        styles.card,
        isLocked ? styles.lockedCard : undefined,
        { borderColor: isLocked ? palette.border : withAlpha(tierColor, 0.25) },
      ]}
      onPress={onPress}
      tactile={!!onPress}
    >
      {/* Badge Icon */}
      <View style={styles.iconRow}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isLocked ? withAlpha(palette.muted, 0.09) : withAlpha(tierColor, 0.12),
            },
          ]}
        >
          <Ionicons
            name={badgeIcon}
            size={28}
            color={isLocked ? palette.muted : tierColor}
            style={isLocked ? styles.lockedIcon : undefined}
          />
          {isLocked && (
            <View style={[styles.lockOverlay, { backgroundColor: palette.background }]}>
              <Ionicons name="lock-closed" size={12} color={palette.muted} />
            </View>
          )}
        </View>
        {badge.tier && (
          <View
            style={[
              styles.tierPill,
              { backgroundColor: isLocked ? withAlpha(palette.muted, 0.09) : withAlpha(tierColor, 0.12) },
            ]}
          >
            <ThemedText
              style={[styles.tierText, { color: isLocked ? palette.muted : tierColor }]}
            >
              {TierNames[badge.tier]}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Badge Info */}
      <View style={styles.infoSection}>
        <ThemedText
          type="defaultSemiBold"
          style={[styles.label, isLocked ? { color: palette.muted } : undefined]}
          numberOfLines={2}
        >
          {badge.label}
        </ThemedText>
        {badge.description && (
          <ThemedText
            style={[styles.description, { color: palette.muted }]}
            numberOfLines={2}
          >
            {badge.description}
          </ThemedText>
        )}
      </View>

      {/* Progress Bar (for locked badges with progress) */}
      {isLocked && badge.progress > 0 && badge.progress < 100 && (
        <View style={styles.progressSection}>
          <View style={[styles.progressBar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: palette.tint,
                  width: `${badge.progress}%`,
                },
              ]}
            />
          </View>
          <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
            {badge.progressLabel}
          </ThemedText>
        </View>
      )}

      {/* Locked state with requirement */}
      {isLocked && badge.progress === 0 && (
        <View style={styles.requirementSection}>
          <Ionicons name="lock-closed" size={12} color={palette.muted} />
          <ThemedText style={[styles.requirementText, { color: palette.muted }]}>
            {badge.progressLabel}
          </ThemedText>
        </View>
      )}

      {/* Unlocked state with earned date */}
      {!isLocked && (
        <View style={styles.earnedSection}>
          <View style={styles.earnedRow}>
            <Ionicons name="checkmark-circle" size={14} color={palette.success} />
            <ThemedText style={[styles.earnedText, { color: palette.success }]}>
              Earned
            </ThemedText>
          </View>
          {badge.earnedAt && (
            <ThemedText style={[styles.dateText, { color: palette.muted }]}>
              {formatDate(badge.earnedAt)}
            </ThemedText>
          )}
        </View>
      )}

      {/* Points value */}
      <View style={styles.pointsSection}>
        {categoryIcon && (
          <View style={[styles.categoryPill, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <Ionicons name={categoryIcon} size={12} color={palette.tint} />
          </View>
        )}
        <ThemedText style={[styles.pointsText, { color: palette.tint }]}>
          +{badge.pointValue} pts
        </ThemedText>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.xs,
    minHeight: 160,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  lockedCard: {
    opacity: 0.6,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  compactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockedIcon: {
    opacity: 0.5,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: Radii.sm,
    padding: Spacing.micro,
  },
  tierPill: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  tierPillSmall: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
  tierText: { ...Typography.caption, textTransform: 'uppercase',
    letterSpacing: 0.5 },
  tierTextSmall: { ...Typography.micro, textTransform: 'uppercase' },
  infoSection: {
    gap: Spacing.xxs,
    flex: 1,
  },
  label: { ...Typography.body, lineHeight: 20 },
  compactLabel: { ...Typography.bodySmall },
  compactContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  description: { ...Typography.caption, lineHeight: 16 },
  progressSection: {
    gap: Spacing.xxs,
  },
  progressBar: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  progressLabel: { ...Typography.caption },
  requirementSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  requirementText: { ...Typography.caption },
  earnedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  earnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  earnedText: { ...Typography.caption },
  dateText: { ...Typography.caption },
  pointsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: 'auto',
  },
  categoryPill: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsText: { ...Typography.caption },
});
