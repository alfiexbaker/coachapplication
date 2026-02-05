import { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/* ---------- Types ---------- */

export interface SkillDataPoint {
  name: string;
  current: number;
  previous: number;
}

export interface SkillRadarProps {
  skills: SkillDataPoint[];
}

/* ---------- Layout constants ---------- */

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_SIZE = Math.min(SCREEN_WIDTH - Spacing.lg * 4, 260);
const CENTER = CHART_SIZE / 2;
const MAX_LEVEL = 10;
const OUTER_RADIUS = CHART_SIZE / 2 - 40;
const NUM_RINGS = 5; // rings at 2, 4, 6, 8, 10

/* ---------- Helpers ---------- */

/** Return {x,y} for a given axis index and normalised value 0-1. */
function polarToXY(index: number, total: number, normValue: number) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const r = normValue * OUTER_RADIUS;
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}

/* ---------- Component ---------- */

export function SkillRadar({ skills }: SkillRadarProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const numAxes = skills.length;

  // Pre-compute positions for current / previous polygons
  const currentPositions = useMemo(
    () =>
      skills.map((s, i) =>
        polarToXY(i, numAxes, Math.min(s.current, MAX_LEVEL) / MAX_LEVEL),
      ),
    [skills, numAxes],
  );

  const previousPositions = useMemo(
    () =>
      skills.map((s, i) =>
        polarToXY(i, numAxes, Math.min(s.previous, MAX_LEVEL) / MAX_LEVEL),
      ),
    [skills, numAxes],
  );

  // Improvement callouts
  const improvements = useMemo(
    () =>
      skills
        .filter((s) => s.current !== s.previous)
        .map((s) => {
          const diff = s.current - s.previous;
          const arrow = diff > 0 ? '\u2191' : '\u2193';
          const verb = diff > 0 ? 'improved' : 'dropped';
          return {
            name: s.name,
            diff,
            label: `${arrow} ${s.name} ${verb} ${Math.abs(diff)} level${Math.abs(diff) > 1 ? 's' : ''}`,
            positive: diff > 0,
          };
        }),
    [skills],
  );

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        Skill Radar
      </ThemedText>

      {/* Radar chart */}
      <View
        style={[styles.chartContainer, { width: CHART_SIZE, height: CHART_SIZE }]}
      >
        {/* Concentric ring guides */}
        {Array.from({ length: NUM_RINGS }).map((_, ringIdx) => {
          const level = ((ringIdx + 1) * MAX_LEVEL) / NUM_RINGS;
          const norm = level / MAX_LEVEL;
          const size = norm * OUTER_RADIUS * 2;
          return (
            <View
              key={`ring-${ringIdx}`}
              style={[
                styles.ring,
                {
                  width: size,
                  height: size,
                  borderColor: palette.border,
                },
              ]}
            />
          );
        })}

        {/* Axis lines + labels */}
        {skills.map((skill, idx) => {
          const endPoint = polarToXY(idx, numAxes, 1);
          const labelPoint = polarToXY(idx, numAxes, 1.25);
          const angle =
            (360 * idx) / numAxes - 90;

          return (
            <View key={`axis-${skill.name}`}>
              {/* Axis line */}
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

              {/* Skill label */}
              <View
                style={[
                  styles.skillLabel,
                  {
                    left: labelPoint.x - 36,
                    top: labelPoint.y - 10,
                  },
                ]}
              >
                <ThemedText
                  style={[styles.skillLabelText, { color: palette.text }]}
                >
                  {skill.name}
                </ThemedText>
              </View>
            </View>
          );
        })}

        {/* Previous period dots (dashed-style outline) */}
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

        {/* Current level dots (filled polygon) */}
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

        {/* Center dot */}
        <View style={[styles.centerDot, { backgroundColor: palette.border }]} />

        {/* Ring level labels */}
        {Array.from({ length: NUM_RINGS }).map((_, ringIdx) => {
          const level = ((ringIdx + 1) * MAX_LEVEL) / NUM_RINGS;
          const norm = level / MAX_LEVEL;
          const yPos = CENTER - norm * OUTER_RADIUS;
          return (
            <View
              key={`rlabel-${ringIdx}`}
              style={[styles.ringLabel, { top: yPos - 8 }]}
            >
              <ThemedText style={[styles.ringLabelText, { color: palette.muted }]}>
                {level}
              </ThemedText>
            </View>
          );
        })}
      </View>

      {/* Legend */}
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

      {/* Improvement callouts */}
      {improvements.length > 0 && (
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
      )}
    </SurfaceCard>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
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
    borderRadius: 3,
  },
  ringLabel: {
    position: 'absolute',
    left: CENTER + 4,
  },
  ringLabelText: {
    fontSize: 9,
    fontWeight: '500',
  },
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
    ...Typography.small,
    fontWeight: '600',
  },
});
