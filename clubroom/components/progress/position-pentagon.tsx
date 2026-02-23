import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Polygon,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Center } from '@/components/primitives/center';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { POSITION_LABELS } from '@/constants/position-skills';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PentagonData } from '@/types/progress-types';

interface PositionPentagonProps {
  data: PentagonData;
  velocityHighlight?: { skill: string; delta: number; weeks: number } | null;
}

interface Point {
  x: number;
  y: number;
}

const GRID_RINGS = [20, 40, 60, 80, 100] as const;
const MORPH_STEPS = 12;
const MORPH_FRAME_MS = 105;
const MORPH_PAUSE_MS = 520;

function clampValue(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toPolygon(points: Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function getVertex(center: Point, radius: number, index: number): Point {
  const angle = -Math.PI / 2 + ((Math.PI * 2) / 5) * index;
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
}

function scalePoint(center: Point, edge: Point, value: number): Point {
  const ratio = Math.max(0, Math.min(100, value)) / 100;
  return {
    x: center.x + (edge.x - center.x) * ratio,
    y: center.y + (edge.y - center.y) * ratio,
  };
}

function interpolateValues(
  from: Record<string, number>,
  to: Record<string, number>,
  keys: string[],
  progress: number,
): Record<string, number> {
  return keys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = (from[key] ?? 0) + ((to[key] ?? 0) - (from[key] ?? 0)) * progress;
    return acc;
  }, {});
}

// Reorder attributes so short labels sit on the tight side vertices (indices 1 & 4)
// and longer labels go to top (0) / bottom (2, 3) where there's more horizontal room.
function optimiseLabelPlacement<T extends { label: string }>(attributes: T[]): T[] {
  if (attributes.length !== 5) return attributes;
  const sorted = [...attributes].sort((a, b) => a.label.length - b.label.length);
  // shortest two → side slots (indices 1, 4); remaining → top (0), bottom-right (2), bottom-left (3)
  return [sorted[2], sorted[0], sorted[3], sorted[4], sorted[1]];
}

export const PositionPentagon = memo(function PositionPentagon({
  data,
  velocityHighlight = null,
}: PositionPentagonProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width <= 390;
  const pentagonSize = compact ? 280 : 320;
  const padding = compact ? 60 : 68;
  // Extra margin around the pentagon for labels that extend beyond vertices
  const labelMargin = compact ? 30 : 36;
  const svgW = pentagonSize + labelMargin * 2;
  const svgH = pentagonSize + labelMargin;
  const center = useMemo<Point>(
    () => ({ x: svgW / 2, y: pentagonSize / 2 + labelMargin * 0.3 }),
    [svgW, pentagonSize, labelMargin],
  );
  const radius = pentagonSize / 2 - padding;

  const orderedAttributes = useMemo(
    () => optimiseLabelPlacement(data.attributes),
    [data.attributes],
  );

  const baseVertices = useMemo(
    () => orderedAttributes.map((_, index) => getVertex(center, radius, index)),
    [center, orderedAttributes, radius],
  );
  const keyOrder = useMemo(() => orderedAttributes.map((attribute) => attribute.key), [orderedAttributes]);
  const gradientId = useMemo(
    () => `position-pentagon-${data.position.toLowerCase()}-${compact ? 'compact' : 'regular'}`,
    [compact, data.position],
  );

  const currentValues = useMemo(
    () =>
      orderedAttributes.reduce<Record<string, number>>((acc, attribute) => {
        acc[attribute.key] = clampValue(attribute.value);
        return acc;
      }, {}),
    [orderedAttributes],
  );

  const [displayValues, setDisplayValues] = useState<Record<string, number>>(currentValues);
  const [activeSnapshotIndex, setActiveSnapshotIndex] = useState(
    Math.max(0, data.sessionSnapshots.length - 1),
  );

  useEffect(() => {
    setDisplayValues(currentValues);
    setActiveSnapshotIndex(Math.max(0, data.sessionSnapshots.length - 1));
  }, [currentValues, data.sessionSnapshots.length]);

  useEffect(() => {
    if (data.sessionSnapshots.length < 2 || keyOrder.length === 0) {
      return;
    }

    let fromIndex = 0;
    let toIndex = 1;
    let step = 0;
    let frameTimer: ReturnType<typeof setInterval> | null = null;
    let pauseTimer: ReturnType<typeof setTimeout> | null = null;

    const transition = () => {
      const fromValues = data.sessionSnapshots[fromIndex]?.values ?? currentValues;
      const toValues = data.sessionSnapshots[toIndex]?.values ?? currentValues;
      step = 0;

      frameTimer = setInterval(() => {
        step += 1;
        const progress = Math.min(1, step / MORPH_STEPS);
        setDisplayValues(interpolateValues(fromValues, toValues, keyOrder, progress));

        if (progress >= 1) {
          if (frameTimer) {
            clearInterval(frameTimer);
            frameTimer = null;
          }
          setActiveSnapshotIndex(toIndex);
          fromIndex = toIndex;
          toIndex = (toIndex + 1) % data.sessionSnapshots.length;
          pauseTimer = setTimeout(transition, MORPH_PAUSE_MS);
        }
      }, MORPH_FRAME_MS);
    };

    pauseTimer = setTimeout(transition, 800);
    return () => {
      if (frameTimer) {
        clearInterval(frameTimer);
      }
      if (pauseTimer) {
        clearTimeout(pauseTimer);
      }
    };
  }, [currentValues, data.sessionSnapshots, keyOrder]);

  const currentPoints = useMemo(
    () =>
      orderedAttributes.map((attribute, index) =>
        scalePoint(center, baseVertices[index], displayValues[attribute.key] ?? 0),
      ),
    [baseVertices, center, orderedAttributes, displayValues],
  );

  const comparisonValues = useMemo(() => {
    if (!data.comparisonLabel || data.sessionSnapshots.length < 2) {
      return null;
    }

    return (
      data.sessionSnapshots.find((snapshot) => snapshot.label === data.comparisonLabel)?.values ??
      data.sessionSnapshots[0]?.values ??
      null
    );
  }, [data.comparisonLabel, data.sessionSnapshots]);

  const comparisonPoints = useMemo(() => {
    if (!comparisonValues) {
      return null;
    }
    return orderedAttributes.map((attribute, index) =>
      scalePoint(center, baseVertices[index], comparisonValues[attribute.key] ?? 0),
    );
  }, [baseVertices, center, comparisonValues, orderedAttributes]);

  const averageRating = useMemo(
    () =>
      orderedAttributes.length > 0
        ? orderedAttributes.reduce((total, attribute) => total + attribute.rating, 0) / orderedAttributes.length
        : 0,
    [orderedAttributes],
  );
  const improvingCount = useMemo(
    () => orderedAttributes.filter((attribute) => attribute.trend === 'improving').length,
    [orderedAttributes],
  );
  const sessionCount = useMemo(
    () => data.sessionSnapshots.filter((snapshot) => snapshot.id !== 'current').length,
    [data.sessionSnapshots],
  );

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: withAlpha(colors.border, 0.65),
          backgroundColor: withAlpha(colors.surface, 0.92),
        },
      ]}
    >
      <Column gap="xxs">
        <ThemedText style={styles.title}>
          {POSITION_LABELS[data.position]} Profile
        </ThemedText>

        <Row align="baseline" gap="xxs" style={styles.heroRow}>
          <ThemedText style={styles.heroNumber}>{averageRating.toFixed(1)}</ThemedText>
          <ThemedText style={[styles.heroUnit, { color: colors.muted }]}>/5 avg</ThemedText>
          <View style={[styles.heroDot, { backgroundColor: withAlpha(colors.muted, 0.4) }]} />
          <ThemedText style={[styles.heroMeta, { color: colors.muted }]}>
            {improvingCount} improving
          </ThemedText>
          <View style={[styles.heroDot, { backgroundColor: withAlpha(colors.muted, 0.4) }]} />
          <ThemedText style={[styles.heroMeta, { color: colors.muted }]}>
            {sessionCount} sessions
          </ThemedText>
        </Row>

        <Center>
          <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
            <Defs>
              <RadialGradient id={gradientId} cx="50%" cy="42%" r="72%">
                <Stop offset="0%" stopColor={withAlpha(colors.tint, 0.34)} />
                <Stop offset="55%" stopColor={withAlpha(colors.tint, 0.18)} />
                <Stop offset="100%" stopColor={withAlpha(colors.tint, 0.05)} />
              </RadialGradient>
            </Defs>

            <Circle
              cx={center.x}
              cy={center.y}
              r={radius * 0.2}
              fill={withAlpha(colors.tint, 0.09)}
            />

            {GRID_RINGS.map((ring) => (
              <Polygon
                key={`ring-${ring}`}
                points={toPolygon(
                  baseVertices.map((edge) => scalePoint(center, edge, ring)),
                )}
                fill="none"
                stroke={withAlpha(colors.text, ring === 100 ? 0.18 : 0.09)}
                strokeWidth={ring === 100 ? 1.2 : 1}
              />
            ))}

            {orderedAttributes.map((attribute, index) => (
              <Line
                key={`axis-${attribute.key}`}
                x1={center.x}
                y1={center.y}
                x2={baseVertices[index].x}
                y2={baseVertices[index].y}
                stroke={withAlpha(attribute.color, 0.3)}
                strokeWidth={1}
              />
            ))}

            {comparisonPoints ? (
              <Polygon
                points={toPolygon(comparisonPoints)}
                fill="none"
                stroke={withAlpha(colors.muted, 0.65)}
                strokeWidth={2}
                strokeDasharray="6,5"
              />
            ) : null}

            <Polygon
              points={toPolygon(currentPoints)}
              fill={`url(#${gradientId})`}
              stroke={withAlpha(colors.tint, 0.92)}
              strokeWidth={2.8}
            />

            {orderedAttributes.map((attribute, index) => {
              const point = currentPoints[index];
              const vertex = baseVertices[index];
              const labelOffset = compact ? 18 : 22;
              const dx = vertex.x - center.x;
              const dy = vertex.y - center.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const labelX = vertex.x + (dx / dist) * labelOffset;
              const labelY = vertex.y + (dy / dist) * labelOffset;

              // Smart text anchor: left-side labels anchor "end", right-side "start", top/bottom "middle"
              const relX = labelX - center.x;
              const anchor: 'start' | 'middle' | 'end' =
                relX < -8 ? 'end' : relX > 8 ? 'start' : 'middle';

              return (
                <G key={`dot-${attribute.key}`}>
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={7}
                    fill={withAlpha(attribute.color, 0.24)}
                  />
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={4.4}
                    fill={attribute.color}
                    stroke={withAlpha(colors.background, 0.9)}
                    strokeWidth={1.8}
                  />
                  <SvgText
                    x={labelX}
                    y={labelY}
                    fontSize={compact ? 10 : 11}
                    fontWeight="600"
                    fill={withAlpha(colors.text, 0.78)}
                    textAnchor={anchor}
                    alignmentBaseline="central"
                  >
                    {attribute.label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </Center>

        <Row align="center" justify="between">
          <Row align="center" gap="xxs">
            <View style={[styles.legendSwatch, { backgroundColor: withAlpha(colors.tint, 0.82) }]} />
            <ThemedText style={[styles.legendText, { color: colors.muted }]}>Current</ThemedText>
            {comparisonPoints ? (
              <>
                <View
                  style={[
                    styles.legendSwatch,
                    styles.legendDashed,
                    { borderColor: withAlpha(colors.muted, 0.7) },
                  ]}
                />
                <ThemedText style={[styles.legendText, { color: colors.muted }]}>4w ago</ThemedText>
              </>
            ) : null}
          </Row>
          {data.sessionSnapshots.length > 1 ? (
            <ThemedText style={[styles.legendText, { color: colors.muted }]}>
              {data.sessionSnapshots[activeSnapshotIndex]?.label ?? 'Now'}
            </ThemedText>
          ) : null}
        </Row>

        <Column gap="xxs">
          {data.attributes.map((attribute) => (
            <View
              key={attribute.key}
              style={[
                styles.skillRow,
                {
                  borderLeftColor: withAlpha(attribute.color, 0.65),
                  backgroundColor: withAlpha(colors.background, 0.5),
                },
              ]}
              accessibilityLabel={`${attribute.label}: ${attribute.rating} out of 5${attribute.trend === 'improving' ? ', improving' : ''}`}
            >
              <Row align="center" justify="between">
                <ThemedText style={styles.skillName} numberOfLines={1}>
                  {attribute.label}
                </ThemedText>
                <Row align="center" gap="xs">
                  <ThemedText style={styles.skillRating}>{attribute.rating}/5</ThemedText>
                  {attribute.trend === 'improving' ? (
                    <View
                      style={[
                        styles.trendDot,
                        { backgroundColor: withAlpha(colors.success, 0.82) },
                      ]}
                    />
                  ) : null}
                </Row>
              </Row>
            </View>
          ))}
        </Column>

        {velocityHighlight ? (
          <Row align="center" gap="xxs" style={styles.velocityRow}>
            <ThemedText style={[styles.velocityText, { color: colors.success }]}>
              Fastest: {velocityHighlight.skill} +{velocityHighlight.delta} in {velocityHighlight.weeks}w
            </ThemedText>
          </Row>
        ) : null}
      </Column>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    overflow: 'hidden',
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  heroRow: {
    flexWrap: 'wrap',
  },
  heroNumber: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  heroUnit: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  heroDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  heroMeta: {
    ...Typography.caption,
  },
  legendSwatch: {
    width: 14,
    height: 8,
    borderRadius: Radii.xs,
  },
  legendDashed: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  legendText: {
    ...Typography.caption,
  },
  skillRow: {
    borderLeftWidth: 3,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    minHeight: 40,
    justifyContent: 'center',
  },
  skillName: {
    ...Typography.bodySmall,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  skillRating: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  trendDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
  },
  velocityRow: {
    paddingTop: Spacing.xxs,
  },
  velocityText: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
