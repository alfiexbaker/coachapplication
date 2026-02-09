/**
 * Extracted sub-components for SkillRadar.
 *
 * Chart layout constants and helpers.
 * RadarRings — concentric ring guides.
 * RadarAxes — axis lines + skill labels.
 * RadarDots — current/previous data points.
 * RadarLegend — legend row.
 * RadarCallouts — improvement callout rows.
 */

import React, { memo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, Radii } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SkillDataPoint } from './skill-radar';

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CHART_SIZE = Math.min(SCREEN_WIDTH - Spacing.lg * 4, 260);
export const CENTER = CHART_SIZE / 2;
export const MAX_LEVEL = 10;
export const OUTER_RADIUS = CHART_SIZE / 2 - 40;
export const NUM_RINGS = 5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function polarToXY(index: number, total: number, normValue: number) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const r = normValue * OUTER_RADIUS;
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}

// ─── Improvement type ────────────────────────────────────────────────────────

export interface ImprovementItem {
  name: string;
  diff: number;
  label: string;
  positive: boolean;
}

// ─── RadarRings ──────────────────────────────────────────────────────────────

interface RadarRingsProps {
  palette: ThemeColors;
}

export const RadarRings = memo(function RadarRings({ palette }: RadarRingsProps) {
  return (
    <>
      {Array.from({ length: NUM_RINGS }).map((_, ringIdx) => {
        const level = ((ringIdx + 1) * MAX_LEVEL) / NUM_RINGS;
        const norm = level / MAX_LEVEL;
        const size = norm * OUTER_RADIUS * 2;
        return (
          <View
            key={`ring-${ringIdx}`}
            style={[
              styles.ring,
              { width: size, height: size, borderColor: palette.border },
            ]}
          />
        );
      })}
    </>
  );
});

// ─── RadarAxes ───────────────────────────────────────────────────────────────

interface RadarAxesProps {
  skills: SkillDataPoint[];
  palette: ThemeColors;
}

export const RadarAxes = memo(function RadarAxes({ skills, palette }: RadarAxesProps) {
  const numAxes = skills.length;

  return (
    <>
      {skills.map((skill, idx) => {
        const labelPoint = polarToXY(idx, numAxes, 1.25);
        const angle = (360 * idx) / numAxes - 90;

        return (
          <View key={`axis-${skill.name}`}>
            <View
              style={[
                styles.axisLine,
                {
                  backgroundColor: palette.border,
                  width: OUTER_RADIUS,
                  left: CENTER,
                  top: CENTER,
                  transform: [
                    { rotate: `${angle}deg` },
                    { translateX: OUTER_RADIUS / 2 },
                  ],
                },
              ]}
            />
            <View
              style={[
                styles.skillLabel,
                { left: labelPoint.x - 36, top: labelPoint.y - 10 },
              ]}
            >
              <ThemedText style={[styles.skillLabelText, { color: palette.text }]}>
                {skill.name}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </>
  );
});

// ─── RadarDots ───────────────────────────────────────────────────────────────

interface RadarDotsProps {
  currentPositions: { x: number; y: number }[];
  previousPositions: { x: number; y: number }[];
  palette: ThemeColors;
}

export const RadarDots = memo(function RadarDots({
  currentPositions,
  previousPositions,
  palette,
}: RadarDotsProps) {
  return (
    <>
      {previousPositions.map((pos, idx) => (
        <View
          key={`prev-${idx}`}
          style={[
            styles.previousDot,
            {
              left: pos.x - 5,
              top: pos.y - 5,
              borderColor: palette.muted,
              backgroundColor: palette.surface,
            },
          ]}
        />
      ))}

      {currentPositions.map((pos, idx) => (
        <View
          key={`curr-${idx}`}
          style={[
            styles.currentDot,
            {
              left: pos.x - 6,
              top: pos.y - 6,
              backgroundColor: palette.success,
              borderColor: palette.surface,
            },
          ]}
        />
      ))}

      <View style={[styles.centerDot, { backgroundColor: palette.border }]} />
    </>
  );
});

// ─── RadarRingLabels ─────────────────────────────────────────────────────────

interface RadarRingLabelsProps {
  palette: ThemeColors;
}

export const RadarRingLabels = memo(function RadarRingLabels({
  palette,
}: RadarRingLabelsProps) {
  return (
    <>
      {Array.from({ length: NUM_RINGS }).map((_, ringIdx) => {
        const level = ((ringIdx + 1) * MAX_LEVEL) / NUM_RINGS;
        const norm = level / MAX_LEVEL;
        const yPos = CENTER - norm * OUTER_RADIUS;
        return (
          <View key={`rlabel-${ringIdx}`} style={[styles.ringLabel, { top: yPos - 8 }]}>
            <ThemedText style={[styles.ringLabelText, { color: palette.muted }]}>
              {level}
            </ThemedText>
          </View>
        );
      })}
    </>
  );
});

// ─── RadarLegend ─────────────────────────────────────────────────────────────

interface RadarLegendProps {
  palette: ThemeColors;
}

export const RadarLegend = memo(function RadarLegend({ palette }: RadarLegendProps) {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDotFilled, { backgroundColor: palette.success }]} />
        <ThemedText style={[styles.legendText, { color: palette.text }]}>
          Current
        </ThemedText>
      </View>
      <View style={styles.legendItem}>
        <View
          style={[
            styles.legendDotOutline,
            { borderColor: palette.muted, backgroundColor: palette.surface },
          ]}
        />
        <ThemedText style={[styles.legendText, { color: palette.muted }]}>
          Previous
        </ThemedText>
      </View>
    </View>
  );
});

// ─── RadarCallouts ───────────────────────────────────────────────────────────

interface RadarCalloutsProps {
  improvements: ImprovementItem[];
  palette: ThemeColors;
}

export const RadarCallouts = memo(function RadarCallouts({
  improvements,
  palette,
}: RadarCalloutsProps) {
  if (improvements.length === 0) return null;

  return (
    <View style={[styles.callouts, { borderTopColor: palette.border }]}>
      {improvements.map((item) => (
        <View key={item.name} style={styles.calloutRow}>
          <Ionicons
            name={item.positive ? 'trending-up' : 'trending-down'}
            size={16}
            color={item.positive ? palette.success : palette.error}
          />
          <ThemedText
            style={[
              styles.calloutText,
              { color: item.positive ? palette.success : palette.error },
            ]}
          >
            {item.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  title: {
    ...Typography.heading,
  },
  chartContainer: {
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: Radii.pill,
    borderStyle: 'dashed',
  },
  axisLine: {
    position: 'absolute',
    height: 1,
    transformOrigin: 'left center',
  },
  skillLabel: {
    position: 'absolute',
    width: 72,
    alignItems: 'center',
  },
  skillLabelText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  previousDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  currentDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: Radii.pill,
    borderWidth: 2,
  },
  centerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
  },
  ringLabel: {
    position: 'absolute',
    left: CENTER + 4,
  },
  ringLabelText: { ...Typography.micro },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDotFilled: {
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
  },
  legendDotOutline: {
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
    borderWidth: 2,
  },
  legendText: {
    ...Typography.small,
  },
  callouts: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  calloutText: {
    ...Typography.smallSemiBold,
  },
});
