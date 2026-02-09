/**
 * Extracted sub-components for SkillTreeView.
 *
 * TreeHeader — icon + name + description + stats badge.
 * TreeProgressBar — progress bar with percentage label.
 * TreeLegend — unlocked/available/locked legend.
 * ConnectionData interface for tree visualization.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ConnectionData {
  from: { x: number; y: number };
  to: { x: number; y: number };
  isUnlocked: boolean;
  key: string;
}

// ─── TreeHeader ─────────────────────────────────────────────────────────────

interface TreeHeaderProps {
  name: string;
  description: string;
  icon: string;
  themeColor: string;
  unlockedCount: number;
  totalNodes: number;
  palette: ThemeColors;
}

export const TreeHeader = memo(function TreeHeader({
  name,
  description,
  icon,
  themeColor,
  unlockedCount,
  totalNodes,
  palette,
}: TreeHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(themeColor, 0.09) }]}>
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={themeColor}
          />
        </View>
        <View>
          <ThemedText type="defaultSemiBold" style={styles.treeName}>
            {name}
          </ThemedText>
          <ThemedText style={[styles.treeDesc, { color: palette.muted }]}>
            {description}
          </ThemedText>
        </View>
      </View>
      <View style={styles.statsContainer}>
        <View style={[styles.statBadge, { backgroundColor: withAlpha(themeColor, 0.09) }]}>
          <ThemedText style={[styles.statValue, { color: themeColor }]}>
            {unlockedCount}/{totalNodes}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
            Skills
          </ThemedText>
        </View>
      </View>
    </View>
  );
});

// ─── TreeProgressBar ────────────────────────────────────────────────────────

interface TreeProgressBarProps {
  progressPercent: number;
  themeColor: string;
  palette: ThemeColors;
}

export const TreeProgressBar = memo(function TreeProgressBar({
  progressPercent,
  themeColor,
  palette,
}: TreeProgressBarProps) {
  return (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBg, { backgroundColor: palette.border }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: themeColor, width: `${progressPercent}%` },
          ]}
        />
      </View>
      <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
        {progressPercent}% Complete
      </ThemedText>
    </View>
  );
});

// ─── ResetButton ────────────────────────────────────────────────────────────

interface ResetButtonProps {
  onReset: () => void;
  palette: ThemeColors;
}

export const ResetButton = memo(function ResetButton({ onReset, palette }: ResetButtonProps) {
  return (
    <View style={styles.resetButton}>
      <SurfaceCard style={styles.resetButtonInner} onPress={onReset}>
        <Ionicons name="refresh" size={16} color={palette.icon} />
      </SurfaceCard>
    </View>
  );
});

// ─── ZoomHint ───────────────────────────────────────────────────────────────

interface ZoomHintProps {
  palette: ThemeColors;
}

export const ZoomHint = memo(function ZoomHint({ palette }: ZoomHintProps) {
  return (
    <View style={[styles.zoomHint, { backgroundColor: withAlpha(palette.surface, 0.56) }]}>
      <Ionicons name="expand-outline" size={14} color={palette.muted} />
      <ThemedText style={[styles.zoomText, { color: palette.muted }]}>
        Pinch to zoom
      </ThemedText>
    </View>
  );
});

// ─── TreeLegend ─────────────────────────────────────────────────────────────

interface TreeLegendProps {
  themeColor: string;
  palette: ThemeColors;
}

export const TreeLegend = memo(function TreeLegend({ themeColor, palette }: TreeLegendProps) {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: themeColor }]} />
        <ThemedText style={[styles.legendText, { color: palette.muted }]}>Unlocked</ThemedText>
      </View>
      <View style={styles.legendItem}>
        <View
          style={[
            styles.legendDot,
            {
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderColor: withAlpha(themeColor, 0.38),
            },
          ]}
        />
        <ThemedText style={[styles.legendText, { color: palette.muted }]}>Available</ThemedText>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: palette.border }]} />
        <ThemedText style={[styles.legendText, { color: palette.muted }]}>Locked</ThemedText>
      </View>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeName: { ...Typography.subheading },
  treeDesc: { ...Typography.caption, lineHeight: 16 },
  statsContainer: { alignItems: 'flex-end' },
  statBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  statValue: { ...Typography.bodySmallSemiBold },
  statLabel: { ...Typography.micro },
  progressContainer: { gap: Spacing.xxs },
  progressBg: { height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.xs },
  progressLabel: { ...Typography.caption, textAlign: 'right' },
  resetButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
  resetButtonInner: {
    width: 32,
    height: 32,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
  },
  zoomHint: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  zoomText: { ...Typography.micro },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: Radii.sm,
  },
  legendText: { ...Typography.caption },
});
