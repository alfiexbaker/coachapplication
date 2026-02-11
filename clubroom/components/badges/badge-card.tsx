import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { TierNames } from '@/constants/progression';
import type { AllBadgeWithProgress } from '@/services/badge-service';
import { useTheme } from '@/hooks/useTheme';

import {
  BADGE_TYPE_ICONS,
  CATEGORY_ICONS,
  getTierColor,
  formatBadgeDate,
  CompactBadgeCardInner,
} from './badge-card-sections';
import { Row } from '@/components/primitives';

interface BadgeCardProps {
  badge: AllBadgeWithProgress;
  onPress?: () => void;
  compact?: boolean;
}

export function BadgeCard({ badge, onPress, compact = false }: BadgeCardProps) {
  const { colors: palette } = useTheme();

  if (compact) {
    return <CompactBadgeCardInner badge={badge} onPress={onPress} palette={palette} />;
  }

  const tierColor = getTierColor(badge.tier, palette.tint);
  const isLocked = !badge.isUnlocked;
  const badgeIcon = BADGE_TYPE_ICONS[badge.badgeType];
  const categoryIcon = badge.category ? CATEGORY_ICONS[badge.category] : undefined;

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
      <Row style={styles.iconRow}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isLocked
                ? withAlpha(palette.muted, 0.09)
                : withAlpha(tierColor, 0.12),
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
              {
                backgroundColor: isLocked
                  ? withAlpha(palette.muted, 0.09)
                  : withAlpha(tierColor, 0.12),
              },
            ]}
          >
            <ThemedText style={[styles.tierText, { color: isLocked ? palette.muted : tierColor }]}>
              {TierNames[badge.tier]}
            </ThemedText>
          </View>
        )}
      </Row>

      <View style={styles.infoSection}>
        <ThemedText
          type="defaultSemiBold"
          style={[styles.label, isLocked ? { color: palette.muted } : undefined]}
          numberOfLines={2}
        >
          {badge.label}
        </ThemedText>
        {badge.description && (
          <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
            {badge.description}
          </ThemedText>
        )}
      </View>

      {isLocked && badge.progress > 0 && badge.progress < 100 && (
        <View style={styles.progressSection}>
          <View style={[styles.progressBar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: palette.tint, width: `${badge.progress}%` },
              ]}
            />
          </View>
          <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
            {badge.progressLabel}
          </ThemedText>
        </View>
      )}

      {isLocked && badge.progress === 0 && (
        <Row style={styles.requirementSection}>
          <Ionicons name="lock-closed" size={12} color={palette.muted} />
          <ThemedText style={[styles.requirementText, { color: palette.muted }]}>
            {badge.progressLabel}
          </ThemedText>
        </Row>
      )}

      {!isLocked && (
        <Row style={styles.earnedSection}>
          <Row style={styles.earnedRow}>
            <Ionicons name="checkmark-circle" size={14} color={palette.success} />
            <ThemedText style={[styles.earnedText, { color: palette.success }]}>Earned</ThemedText>
          </Row>
          {badge.earnedAt && (
            <ThemedText style={[styles.dateText, { color: palette.muted }]}>
              {formatBadgeDate(badge.earnedAt)}
            </ThemedText>
          )}
        </Row>
      )}

      <Row style={styles.pointsSection}>
        {categoryIcon && (
          <View style={[styles.categoryPill, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <Ionicons name={categoryIcon} size={12} color={palette.tint} />
          </View>
        )}
        <ThemedText style={[styles.pointsText, { color: palette.tint }]}>
          +{badge.pointValue} pts
        </ThemedText>
      </Row>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.sm, gap: Spacing.xs, minHeight: 160 },
  lockedCard: { opacity: 0.6 },
  iconRow: {
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
  lockedIcon: { opacity: 0.5 },
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
  tierText: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoSection: { gap: Spacing.xxs, flex: 1 },
  label: { ...Typography.body, lineHeight: 20 },
  description: { ...Typography.caption, lineHeight: 16 },
  progressSection: { gap: Spacing.xxs },
  progressBar: { height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.xs },
  progressLabel: { ...Typography.caption },
  requirementSection: { alignItems: 'center', gap: Spacing.xxs },
  requirementText: { ...Typography.caption },
  earnedSection: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  earnedRow: { alignItems: 'center', gap: Spacing.xxs },
  earnedText: { ...Typography.caption },
  dateText: { ...Typography.caption },
  pointsSection: {
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
