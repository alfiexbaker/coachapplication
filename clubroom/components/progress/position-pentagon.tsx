import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { POSITION_LABELS } from '@/constants/position-skills';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PentagonData } from '@/types/progress-types';

interface PositionPentagonProps {
  data: PentagonData;
  isParentView?: boolean;
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

function projectPoint(center: Point, edge: Point, factor: number): Point {
  return {
    x: center.x + (edge.x - center.x) * factor,
    y: center.y + (edge.y - center.y) * factor,
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

export const PositionPentagon = memo(function PositionPentagon({
  data,
  isParentView = false,
  velocityHighlight = null,
}: PositionPentagonProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width <= 390;
  const size = compact ? 248 : 292;
  const padding = compact ? 44 : 52;
  const center = useMemo<Point>(() => ({ x: size / 2, y: size / 2 }), [size]);
  const radius = size / 2 - padding;
  const baseVertices = useMemo(
    () => data.attributes.map((_, index) => getVertex(center, radius, index)),
    [center, data.attributes, radius],
  );
  const keyOrder = useMemo(() => data.attributes.map((attribute) => attribute.key), [data.attributes]);
  const gradientId = useMemo(
    () => `position-pentagon-${data.position.toLowerCase()}-${compact ? 'compact' : 'regular'}`,
    [compact, data.position],
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const currentValues = useMemo(
    () =>
      data.attributes.reduce<Record<string, number>>((acc, attribute) => {
        acc[attribute.key] = clampValue(attribute.value);
        return acc;
      }, {}),
    [data.attributes],
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
      data.attributes.map((attribute, index) =>
        scalePoint(center, baseVertices[index], displayValues[attribute.key] ?? 0),
      ),
    [baseVertices, center, data.attributes, displayValues],
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
    return data.attributes.map((attribute, index) =>
      scalePoint(center, baseVertices[index], comparisonValues[attribute.key] ?? 0),
    );
  }, [baseVertices, center, comparisonValues, data.attributes]);

  const orderedAttributes = data.attributes;
  const orderedByStrength = useMemo(
    () =>
      [...data.attributes].sort((left, right) => {
        if (right.rating !== left.rating) {
          return right.rating - left.rating;
        }
        return right.value - left.value;
      }),
    [data.attributes],
  );
  const averageRating = useMemo(
    () =>
      data.attributes.length > 0
        ? data.attributes.reduce((total, attribute) => total + attribute.rating, 0) / data.attributes.length
        : 0,
    [data.attributes],
  );
  const improvingCount = useMemo(
    () => data.attributes.filter((attribute) => attribute.trend === 'improving').length,
    [data.attributes],
  );
  const sessionCount = useMemo(
    () => data.sessionSnapshots.filter((snapshot) => snapshot.id !== 'current').length,
    [data.sessionSnapshots],
  );
  const topAttribute = orderedByStrength[0] ?? null;
  const [showAllAttributes, setShowAllAttributes] = useState(false);
  const selectedAttribute = selectedKey
    ? data.attributes.find((attribute) => attribute.key === selectedKey) ?? null
    : null;

  useEffect(() => {
    const fallbackKey = topAttribute?.key ?? data.attributes[0]?.key ?? null;
    if (!fallbackKey) {
      if (selectedKey !== null) {
        setSelectedKey(null);
      }
      return;
    }
    const selectedStillExists = selectedKey
      ? data.attributes.some((attribute) => attribute.key === selectedKey)
      : false;
    if (!selectedStillExists && selectedKey !== fallbackKey) {
      setSelectedKey(fallbackKey);
    }
  }, [data.attributes, selectedKey, topAttribute]);

  useEffect(() => {
    setShowAllAttributes(false);
  }, [data.position]);

  const visibleAttributes = showAllAttributes ? orderedAttributes : orderedAttributes.slice(0, 3);

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: withAlpha(colors.border, 0.5),
          backgroundColor: withAlpha(colors.surface, 0.66),
        },
      ]}
    >
      <BlurView
        tint="systemThinMaterial"
        intensity={30}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          withAlpha(colors.tint, 0.08),
          withAlpha(colors.tint, 0.025),
          'transparent',
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.heroGradient}
      />

      <Column gap="sm">
        <Column gap="micro">
          <ThemedText style={styles.title}>
            {POSITION_LABELS[data.position]} Skill Pentagon
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
            {isParentView ? 'Five position-specific skills' : 'Shape of this role right now'}
          </ThemedText>
          <Row gap="xxs" wrap>
            <View
              style={[
                styles.metricChip,
                {
                  borderColor: withAlpha(colors.border, 0.72),
                  backgroundColor: withAlpha(colors.background, 0.58),
                },
              ]}
            >
              <ThemedText style={[styles.metricLabel, { color: colors.muted }]}>Avg</ThemedText>
              <ThemedText style={styles.metricValue}>{averageRating.toFixed(1)}/5</ThemedText>
            </View>
            <View
              style={[
                styles.metricChip,
                {
                  borderColor: withAlpha(colors.border, 0.72),
                  backgroundColor: withAlpha(colors.background, 0.58),
                },
              ]}
            >
              <ThemedText style={[styles.metricLabel, { color: colors.muted }]}>Improving</ThemedText>
              <ThemedText style={styles.metricValue}>{improvingCount}/5</ThemedText>
            </View>
            <View
              style={[
                styles.metricChip,
                {
                  borderColor: withAlpha(colors.border, 0.72),
                  backgroundColor: withAlpha(colors.background, 0.58),
                },
              ]}
            >
              <ThemedText style={[styles.metricLabel, { color: colors.muted }]}>Sessions</ThemedText>
              <ThemedText style={styles.metricValue}>{sessionCount}</ThemedText>
            </View>
          </Row>
          {topAttribute ? (
            <ThemedText style={[styles.comparisonMeta, { color: colors.muted }]}>
              Top skill: {topAttribute.label} ({topAttribute.rating}/5)
            </ThemedText>
          ) : null}
          {data.comparisonLabel ? (
            <ThemedText style={[styles.comparisonMeta, { color: colors.muted }]}>
              Comparison: 4w ago ({data.comparisonLabel}) vs now
            </ThemedText>
          ) : null}
          {velocityHighlight ? (
            <ThemedText style={[styles.comparisonMeta, { color: colors.muted }]}>
              Fastest improving: {velocityHighlight.skill} +{velocityHighlight.delta} in{' '}
              {velocityHighlight.weeks}w
            </ThemedText>
          ) : null}
        </Column>

        <Center style={styles.chartWrap}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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

            {data.attributes.map((attribute, index) => (
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

            {data.attributes.map((attribute, index) => {
              const point = currentPoints[index];
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
                </G>
              );
            })}

            {data.attributes.map((attribute, index) => {
              const marker = projectPoint(center, baseVertices[index], 1.08);
              return (
                <G key={`axis-number-${attribute.key}`}>
                  <Circle
                    cx={marker.x}
                    cy={marker.y}
                    r={8}
                    fill={withAlpha(colors.background, 0.9)}
                    stroke={withAlpha(colors.border, 0.7)}
                    strokeWidth={1.2}
                  />
                  <SvgText
                    x={marker.x}
                    y={marker.y + 3}
                    textAnchor="middle"
                    fill={withAlpha(colors.text, 0.78)}
                    fontSize={9}
                    fontWeight="700"
                  >
                    {String(index + 1)}
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
                <ThemedText style={[styles.legendText, { color: colors.muted }]}>
                  {data.comparisonLabel ? `4w ago (${data.comparisonLabel})` : '4w ago'}
                </ThemedText>
              </>
            ) : null}
          </Row>
          {data.sessionSnapshots.length > 1 ? (
            <ThemedText style={[styles.sessionMorphMeta, { color: colors.muted }]}>
              Now: {data.sessionSnapshots[activeSnapshotIndex]?.label ?? 'Now'}
            </ThemedText>
          ) : null}
        </Row>

        <Column gap="xs">
          {visibleAttributes.map((attribute, index) => {
            const selected = selectedKey === attribute.key;
            return (
              <Clickable
                key={attribute.key}
                style={[
                  styles.attributeRow,
                  {
                    borderColor: selected
                      ? withAlpha(colors.tint, 0.42)
                      : withAlpha(colors.border, 0.75),
                    backgroundColor: selected
                      ? withAlpha(colors.surface, 0.72)
                      : withAlpha(colors.background, 0.58),
                    borderLeftColor: withAlpha(attribute.color, selected ? 0.8 : 0.55),
                  },
                ]}
                onPress={() =>
                  setSelectedKey((previous) =>
                    previous === attribute.key ? null : attribute.key,
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={`${attribute.label} details`}
              >
                <Row align="center" justify="between" gap="xs">
                  <Row align="center" gap="xxs" style={styles.attributeLeft}>
                    <View
                      style={[
                        styles.indexChip,
                        {
                          borderColor: withAlpha(colors.border, 0.7),
                          backgroundColor: withAlpha(colors.background, 0.76),
                        },
                      ]}
                    >
                      <ThemedText style={[styles.indexChipText, { color: colors.text }]}>
                        {String(index + 1)}
                      </ThemedText>
                    </View>
                    <View style={[styles.iconChip, { backgroundColor: withAlpha(colors.border, 0.34) }]}>
                      <Ionicons
                        name={(attribute.icon as keyof typeof Ionicons.glyphMap) ?? 'ellipse-outline'}
                        size={13}
                        color={withAlpha(colors.text, 0.76)}
                      />
                    </View>
                    <ThemedText style={styles.attributeLabel} numberOfLines={1}>
                      {attribute.label}
                    </ThemedText>
                  </Row>
                  <Row align="center" gap="xs" style={styles.attributeRight}>
                    <View
                      style={[
                        styles.pointsPill,
                        {
                          borderColor: withAlpha(attribute.color, 0.4),
                          backgroundColor: withAlpha(colors.background, 0.7),
                        },
                      ]}
                    >
                      <ThemedText style={[styles.pointsPillText, { color: colors.text }]}>
                        {attribute.rating}/5
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.trendDot,
                        {
                          backgroundColor:
                            attribute.trend === 'improving'
                              ? withAlpha(colors.success, 0.82)
                              : withAlpha(colors.border, 0.72),
                          borderColor: withAlpha(colors.background, 0.84),
                        },
                      ]}
                    />
                  </Row>
                </Row>
                <Row align="center" gap="xxs" style={styles.segmentRow}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <View
                      key={`${attribute.key}_segment_${index}`}
                      style={[
                        styles.segment,
                        {
                          backgroundColor:
                            index < attribute.rating
                              ? withAlpha(attribute.color, 0.78)
                              : withAlpha(colors.border, 0.4),
                        },
                      ]}
                    />
                  ))}
                </Row>
                <ThemedText style={[styles.attributeMeta, { color: colors.muted }]} numberOfLines={1}>
                  {attribute.ratingLabel}
                </ThemedText>
              </Clickable>
            );
          })}
          {orderedAttributes.length > 3 ? (
            <Clickable
              style={[
                styles.expandButton,
                {
                  borderColor: withAlpha(colors.border, 0.72),
                  backgroundColor: withAlpha(colors.background, 0.56),
                },
              ]}
              onPress={() => setShowAllAttributes((previous) => !previous)}
              accessibilityRole="button"
              accessibilityLabel={showAllAttributes ? 'Show fewer skill rows' : 'Show all skill rows'}
            >
              <Row align="center" justify="center" gap="xxs">
                <ThemedText style={[styles.expandButtonText, { color: colors.text }]}>
                  {showAllAttributes ? 'Show top 3 skills' : `Show all ${orderedAttributes.length} skills`}
                </ThemedText>
                <Ionicons
                  name={showAllAttributes ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.muted}
                />
              </Row>
            </Clickable>
          ) : null}
        </Column>

        {selectedAttribute ? (
          <View
            style={[
              styles.detailPanel,
              {
                borderColor: withAlpha(colors.border, 0.8),
                backgroundColor: withAlpha(colors.background, 0.75),
              },
            ]}
          >
            <Row align="center" justify="between">
              <ThemedText style={styles.detailTitle}>{selectedAttribute.label}</ThemedText>
              <Row align="center" gap="xxs">
                <View
                  style={[
                    styles.trendDot,
                    {
                      backgroundColor:
                        selectedAttribute.trend === 'improving'
                          ? withAlpha(colors.success, 0.82)
                          : withAlpha(colors.border, 0.72),
                      borderColor: withAlpha(colors.background, 0.84),
                    },
                  ]}
                />
                <ThemedText style={[styles.detailMeta, { color: colors.muted }]}>
                  {selectedAttribute.trend === 'improving' ? 'Improving' : 'Consistent'}
                </ThemedText>
              </Row>
            </Row>
            <ThemedText style={[styles.detailMeta, { color: colors.muted }]}>
              Current: {selectedAttribute.ratingLabel} ({selectedAttribute.rating}/5)
            </ThemedText>
            <ThemedText style={[styles.detailMeta, { color: colors.muted }]}>
              Change vs 4w: {data.deltas[selectedAttribute.key] ?? 0}
            </ThemedText>
          </View>
        ) : null}
      </Column>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: 'hidden',
    gap: Spacing.sm,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.caption,
  },
  metricChip: {
    minHeight: 40,
    minWidth: 88,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    justifyContent: 'center',
    gap: 2,
  },
  metricLabel: {
    ...Typography.micro,
    letterSpacing: 0.2,
  },
  metricValue: {
    ...Typography.bodySmallSemiBold,
  },
  comparisonMeta: {
    ...Typography.caption,
  },
  chartWrap: {
    paddingTop: Spacing.xxs,
    paddingBottom: Spacing.micro,
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
  sessionMorphMeta: {
    ...Typography.caption,
  },
  attributeRow: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: Radii.md,
    minHeight: 68,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    gap: Spacing.xxs,
    justifyContent: 'center',
  },
  attributeLeft: {
    flex: 1,
    minWidth: 0,
  },
  indexChip: {
    width: 20,
    height: 20,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexChipText: {
    ...Typography.micro,
    fontWeight: '700',
  },
  attributeRight: {
    flexShrink: 1,
  },
  iconChip: {
    width: 22,
    height: 22,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attributeLabel: {
    ...Typography.caption,
    fontWeight: '700',
    flexShrink: 1,
  },
  attributeMeta: {
    ...Typography.micro,
    letterSpacing: 0.1,
  },
  pointsPill: {
    minWidth: 42,
    minHeight: 22,
    borderWidth: 1,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  pointsPillText: {
    ...Typography.micro,
    fontWeight: '700',
  },
  trendDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  segmentRow: {
    width: '100%',
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: Radii.pill,
  },
  expandButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  expandButtonText: {
    ...Typography.bodySmallSemiBold,
  },
  detailPanel: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: Spacing.xxs,
  },
  detailTitle: {
    ...Typography.bodySmallSemiBold,
  },
  detailMeta: {
    ...Typography.caption,
  },
});
