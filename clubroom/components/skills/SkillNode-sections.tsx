/**
 * Extracted sub-components for SkillNode.
 *
 * NODE_SIZES, ICON_SIZES — size constants.
 * getBackgroundColor, getBorderColor, getIconColor — state-dependent color helpers.
 * SkillNodeGlow — animated glow overlay.
 * ProgressRing — circular progress indicator.
 * NodeIcon — lock or skill icon.
 * LevelBadge — corner level indicator.
 * NodeLabel — name + progress text.
 */

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SkillNode as SkillNodeType } from '@/constants/types';

// ─── Constants ───────────────────────────────────────────────────────────────

export const NODE_SIZES = {
  small: 44,
  medium: 56,
  large: 68,
};

export const ICON_SIZES = {
  small: 20,
  medium: 24,
  large: 28,
};

// ─── Color Helpers ───────────────────────────────────────────────────────────

export function getBackgroundColor(
  node: SkillNodeType,
  themeColor: string,
  canUnlock: boolean,
  palette: ThemeColors
): string {
  if (node.isUnlocked) return themeColor;
  if (canUnlock) return withAlpha(themeColor, 0.25);
  if (!node.isUnlocked && node.progress > 0) return withAlpha(themeColor, 0.12);
  return palette.surface;
}

export function getBorderColor(
  node: SkillNodeType,
  themeColor: string,
  canUnlock: boolean,
  palette: ThemeColors
): string {
  if (node.isUnlocked) return themeColor;
  if (canUnlock || (!node.isUnlocked && node.progress > 0)) return withAlpha(themeColor, 0.38);
  return palette.border;
}

export function getIconColor(
  node: SkillNodeType,
  themeColor: string,
  canUnlock: boolean,
  palette: ThemeColors
): string {
  if (node.isUnlocked) return palette.onPrimary;
  if (canUnlock || (!node.isUnlocked && node.progress > 0)) return themeColor;
  return palette.muted;
}

// ─── SkillNodeGlow ───────────────────────────────────────────────────────────

interface SkillNodeGlowProps {
  nodeSize: number;
  themeColor: string;
  animatedStyle: object;
}

export const SkillNodeGlow = memo(function SkillNodeGlow({
  nodeSize,
  themeColor,
  animatedStyle,
}: SkillNodeGlowProps) {
  return (
    <Animated.View
      style={[
        styles.glow,
        {
          width: nodeSize + 16,
          height: nodeSize + 16,
          borderRadius: (nodeSize + 16) / 2,
          backgroundColor: themeColor,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
});

// ─── ProgressRing ────────────────────────────────────────────────────────────

interface ProgressRingProps {
  nodeSize: number;
  progressPercent: number;
  themeColor: string;
}

export const ProgressRing = memo(function ProgressRing({
  nodeSize,
  progressPercent,
  themeColor,
}: ProgressRingProps) {
  return (
    <View
      style={[
        styles.progressRing,
        {
          width: nodeSize - 4,
          height: nodeSize - 4,
          borderRadius: (nodeSize - 4) / 2,
          borderColor: themeColor,
          borderLeftColor: 'transparent',
          borderBottomColor: progressPercent > 50 ? themeColor : 'transparent',
          borderRightColor: progressPercent > 75 ? themeColor : 'transparent',
          transform: [{ rotate: `${(progressPercent / 100) * 360}deg` }],
        },
      ]}
    />
  );
});

// ─── NodeIcon ────────────────────────────────────────────────────────────────

interface NodeIconProps {
  node: SkillNodeType;
  iconSize: number;
  isLocked: boolean;
  iconColor: string;
  palette: ThemeColors;
}

export const NodeIcon = memo(function NodeIcon({
  node,
  iconSize,
  isLocked,
  iconColor,
  palette,
}: NodeIconProps) {
  if (isLocked) {
    return <Ionicons name="lock-closed" size={iconSize - 4} color={palette.muted} />;
  }

  return (
    <Ionicons
      name={node.icon as keyof typeof Ionicons.glyphMap}
      size={iconSize}
      color={iconColor}
    />
  );
});

// ─── LevelBadge ──────────────────────────────────────────────────────────────

interface LevelBadgeProps {
  level: number;
  isUnlocked: boolean;
  themeColor: string;
  palette: ThemeColors;
}

export const LevelBadge = memo(function LevelBadge({
  level,
  isUnlocked,
  themeColor,
  palette,
}: LevelBadgeProps) {
  return (
    <View
      style={[
        styles.levelBadge,
        {
          backgroundColor: isUnlocked ? palette.surface : palette.surfaceSecondary,
          borderColor: isUnlocked ? themeColor : palette.border,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.levelText,
          { color: isUnlocked ? themeColor : palette.muted },
        ]}
      >
        {level}
      </ThemedText>
    </View>
  );
});

// ─── NodeLabel ───────────────────────────────────────────────────────────────

interface NodeLabelProps {
  name: string;
  isUnlocked: boolean;
  isInProgress: boolean;
  progressPercent: number;
  themeColor: string;
  palette: ThemeColors;
}

export const NodeLabel = memo(function NodeLabel({
  name,
  isUnlocked,
  isInProgress,
  progressPercent,
  themeColor,
  palette,
}: NodeLabelProps) {
  return (
    <View style={styles.labelContainer}>
      <ThemedText
        style={[
          styles.label,
          { color: isUnlocked ? palette.foreground : palette.muted },
        ]}
        numberOfLines={2}
      >
        {name}
      </ThemedText>
      {isInProgress && (
        <ThemedText style={[styles.progressText, { color: themeColor }]}>
          {progressPercent}%
        </ThemedText>
      )}
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  nodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    opacity: 0.3,
  },
  progressRing: {
    position: 'absolute',
    borderWidth: 3,
  },
  levelBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  levelText: { ...Typography.micro },
  labelContainer: {
    alignItems: 'center',
    maxWidth: 80,
  },
  label: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 14,
  },
  progressText: { ...Typography.micro },
});
