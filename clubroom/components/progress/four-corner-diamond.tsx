import { useEffect, useState, startTransition } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
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
import { CORNER_COLORS } from '@/constants/four-corner-mapping';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { FourCornerKey } from '@/types/progress-types';
import type { FourCornerData } from '@/hooks/use-four-corners';
import { HapticPatterns } from '@/utils/haptics';
import { CornerDetailPanel } from './corner-detail-panel';
import { TrendArrow } from './trend-arrow';

interface FourCornerDiamondProps {
  data: FourCornerData;
  isParentView?: boolean;
  velocityHighlight?: {
    skill: string;
    delta: number;
    weeks: number;
  } | null;
  cornerTopPercent?: Record<FourCornerKey, number | null> | null;
}

interface Point {
  x: number;
  y: number;
}

const CORNER_ORDER: FourCornerKey[] = ['technical', 'physical', 'psychological', 'social'];
const GRID_RINGS = [20, 40, 60, 80, 100] as const;
const CHART_PADDING = 52;
const COMPACT_CHART_SIZE = 282;
const REGULAR_CHART_SIZE = 306;

const FALLBACK_CORNER_META: Record<
  FourCornerKey,
  { label: string; kidLabel: string; icon: string; color: string }
> = {
  technical: {
    label: 'Technical',
    kidLabel: 'Ball Skills',
    icon: 'football-outline',
    color: CORNER_COLORS.technical,
  },
  physical: {
    label: 'Physical',
    kidLabel: 'Fitness',
    icon: 'fitness-outline',
    color: CORNER_COLORS.physical,
  },
  psychological: {
    label: 'Psychological',
    kidLabel: 'Game IQ',
    icon: 'bulb-outline',
    color: CORNER_COLORS.psychological,
  },
  social: {
    label: 'Social',
    kidLabel: 'Teamwork',
    icon: 'people-outline',
    color: CORNER_COLORS.social,
  },
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getChartGeometry(size: number): {
  center: Point;
  edgePoints: Record<FourCornerKey, Point>;
} {
  const center = { x: size / 2, y: size / 2 };
  const radius = center.x - CHART_PADDING;
  return {
    center,
    edgePoints: {
      technical: { x: center.x, y: center.y - radius },
      physical: { x: center.x + radius, y: center.y },
      psychological: { x: center.x, y: center.y + radius },
      social: { x: center.x - radius, y: center.y },
    },
  };
}

function scalePoint(center: Point, edge: Point, value: number): Point {
  const ratio = Math.max(0, Math.min(100, value)) / 100;
  return {
    x: center.x + (edge.x - center.x) * ratio,
    y: center.y + (edge.y - center.y) * ratio,
  };
}

function toPolygon(points: Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function interpolateCornerValues(
  from: Record<FourCornerKey, number>,
  to: Record<FourCornerKey, number>,
  progress: number,
): Record<FourCornerKey, number> {
  return {
    technical: from.technical + (to.technical - from.technical) * progress,
    physical: from.physical + (to.physical - from.physical) * progress,
    psychological: from.psychological + (to.psychological - from.psychological) * progress,
    social: from.social + (to.social - from.social) * progress,
  };
}

function splitCornerRows(
  corners: FourCornerData['corners'],
): [FourCornerData['corners'][number], FourCornerData['corners'][number]][] {
  return [
    [corners[0], corners[1]],
    [corners[2], corners[3]],
  ];
}

export const FourCornerDiamond = function FourCornerDiamond({
  data,
  isParentView = false,
  velocityHighlight = null,
  cornerTopPercent = null,
}: FourCornerDiamondProps) {
  const { colors } = useTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const [selectedCorner, setSelectedCorner] = useState<FourCornerKey | null>(null);
  const chartSize = viewportWidth <= 375 ? COMPACT_CHART_SIZE : REGULAR_CHART_SIZE;
  const chartGeometry = getChartGeometry(chartSize);
  const areaGradientId = `four-corner-area-${isParentView ? 'parent' : 'athlete'}-${chartSize}`;
  const axisLabelLayout = {
    fontSize: chartSize <= COMPACT_CHART_SIZE ? 10 : 11,
    sideInset: chartSize <= COMPACT_CHART_SIZE ? 16 : 12,
    topOffset: chartSize <= COMPACT_CHART_SIZE ? 8 : 10,
    bottomOffset: chartSize <= COMPACT_CHART_SIZE ? 12 : 14,
  };

  const cornerMap = (() => {
    const initial: Record<FourCornerKey, FourCornerData['corners'][number]> = {
      technical: {
        key: 'technical',
        label: FALLBACK_CORNER_META.technical.label,
        icon: FALLBACK_CORNER_META.technical.icon,
        value: 0,
        skillCount: 0,
        color: FALLBACK_CORNER_META.technical.color,
      },
      physical: {
        key: 'physical',
        label: FALLBACK_CORNER_META.physical.label,
        icon: FALLBACK_CORNER_META.physical.icon,
        value: 0,
        skillCount: 0,
        color: FALLBACK_CORNER_META.physical.color,
      },
      psychological: {
        key: 'psychological',
        label: FALLBACK_CORNER_META.psychological.label,
        icon: FALLBACK_CORNER_META.psychological.icon,
        value: 0,
        skillCount: 0,
        color: FALLBACK_CORNER_META.psychological.color,
      },
      social: {
        key: 'social',
        label: FALLBACK_CORNER_META.social.label,
        icon: FALLBACK_CORNER_META.social.icon,
        value: 0,
        skillCount: 0,
        color: FALLBACK_CORNER_META.social.color,
      },
    };

    for (const corner of data.corners) {
      initial[corner.key] = corner;
    }
    return initial;
  })();

  const orderedCorners = CORNER_ORDER.map((key) => cornerMap[key]);
  const cornerRows = splitCornerRows(orderedCorners);

  const baseCornerValues = {
    technical: cornerMap.technical.value,
    physical: cornerMap.physical.value,
    psychological: cornerMap.psychological.value,
    social: cornerMap.social.value,
  };
  const snapshotsKey = data.sessionSnapshots
    .map(
      (snapshot) =>
        `${snapshot.id}:${snapshot.values.technical}:${snapshot.values.physical}:${snapshot.values.psychological}:${snapshot.values.social}`,
    )
    .join('|');
  const [displayCornerValues, setDisplayCornerValues] =
    useState<Record<FourCornerKey, number>>(baseCornerValues);
  const [activeSnapshotIndex, setActiveSnapshotIndex] = useState(() =>
    Math.max(0, data.sessionSnapshots.length - 1),
  );

  useEffect(() => {
    startTransition(() => {
      setDisplayCornerValues(baseCornerValues);
    });
    startTransition(() => {
      setActiveSnapshotIndex(Math.max(0, data.sessionSnapshots.length - 1));
    });
  }, [baseCornerValues, data.sessionSnapshots.length, snapshotsKey]);

  useEffect(() => {
    if (data.sessionSnapshots.length < 2) {
      return;
    }

    let fromIndex = 0;
    let toIndex = 1;
    let step = 0;
    const totalSteps = 12;
    const frameMs = 105;
    let frameTimer: ReturnType<typeof setInterval> | null = null;
    let pauseTimer: ReturnType<typeof setTimeout> | null = null;

    const runTransition = () => {
      const fromValues = data.sessionSnapshots[fromIndex]?.values ?? baseCornerValues;
      const toValues = data.sessionSnapshots[toIndex]?.values ?? baseCornerValues;
      step = 0;

      frameTimer = setInterval(() => {
        step += 1;
        const progress = Math.min(1, step / totalSteps);
        setDisplayCornerValues(interpolateCornerValues(fromValues, toValues, progress));

        if (progress >= 1) {
          if (frameTimer) {
            clearInterval(frameTimer);
            frameTimer = null;
          }
          setActiveSnapshotIndex(toIndex);
          fromIndex = toIndex;
          toIndex = (toIndex + 1) % data.sessionSnapshots.length;
          pauseTimer = setTimeout(runTransition, 520);
        }
      }, frameMs);
    };

    pauseTimer = setTimeout(runTransition, 800);

    return () => {
      if (frameTimer) {
        clearInterval(frameTimer);
      }
      if (pauseTimer) {
        clearTimeout(pauseTimer);
      }
    };
  }, [baseCornerValues, data.sessionSnapshots, snapshotsKey]);

  const currentPoints = CORNER_ORDER.map((key) =>
    scalePoint(chartGeometry.center, chartGeometry.edgePoints[key], displayCornerValues[key]),
  );

  const previousPoints = (() => {
    const previousCornerValues = data.previousCornerValues;
    if (!previousCornerValues) {
      return null;
    }
    return CORNER_ORDER.map((key) =>
      scalePoint(chartGeometry.center, chartGeometry.edgePoints[key], previousCornerValues[key]),
    );
  })();

  const selectedCornerData = selectedCorner ? cornerMap[selectedCorner] : null;
  const hasAnyCornerValue = CORNER_ORDER.some((key) => baseCornerValues[key] > 0);

  const handleCornerPress = (corner: FourCornerKey) => {
    setSelectedCorner((previous) => (previous === corner ? null : corner));
    void HapticPatterns.tap();
  };

  // Axis label positions: offset from the tip of each axis
  const axisLabels = (() => {
    const { center, edgePoints } = chartGeometry;
    const { sideInset, topOffset, bottomOffset } = axisLabelLayout;
    return [
      {
        key: 'technical' as FourCornerKey,
        x: center.x,
        y: edgePoints.technical.y - topOffset,
        anchor: 'middle' as const,
      },
      {
        key: 'physical' as FourCornerKey,
        x: edgePoints.physical.x - sideInset,
        y: edgePoints.physical.y + 4,
        anchor: 'end' as const,
      },
      {
        key: 'psychological' as FourCornerKey,
        x: center.x,
        y: edgePoints.psychological.y + bottomOffset,
        anchor: 'middle' as const,
      },
      {
        key: 'social' as FourCornerKey,
        x: edgePoints.social.x + sideInset,
        y: edgePoints.social.y + 4,
        anchor: 'start' as const,
      },
    ];
  })();

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: withAlpha(colors.border, 0.55),
          backgroundColor: withAlpha(colors.surface, 0.9),
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.heroGradient, { backgroundColor: withAlpha(colors.tint, 0.025) }]}
      />
      <Column gap="sm">
        <Column gap="micro">
          <ThemedText style={styles.title}>Four Corner Development</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
            {isParentView
              ? 'Technical, Physical, Psychological, Social'
              : 'Ball Skills, Fitness, Game IQ, Teamwork'}
          </ThemedText>
          {data.comparisonLabel ? (
            <ThemedText style={[styles.comparisonMeta, { color: colors.muted }]}>
              4 weeks ago ({data.comparisonLabel}) vs now
            </ThemedText>
          ) : null}
          {velocityHighlight ? (
            <ThemedText style={[styles.comparisonMeta, { color: colors.tint }]}>
              Fastest improving: {velocityHighlight.skill} +{velocityHighlight.delta} in{' '}
              {velocityHighlight.weeks}w
            </ThemedText>
          ) : null}
        </Column>

        <Center style={styles.chartWrap}>
          <Svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`}>
            <Defs>
              <RadialGradient id={areaGradientId} cx="50%" cy="40%" r="65%">
                <Stop offset="0%" stopColor={withAlpha(colors.tint, 0.35)} />
                <Stop offset="100%" stopColor={withAlpha(colors.tint, 0.08)} />
              </RadialGradient>
            </Defs>

            {GRID_RINGS.map((ring) => (
              <Polygon
                key={`grid-${ring}`}
                points={toPolygon(
                  CORNER_ORDER.map((key) =>
                    scalePoint(chartGeometry.center, chartGeometry.edgePoints[key], ring),
                  ),
                )}
                fill="none"
                stroke={withAlpha(colors.text, 0.12)}
                strokeWidth={1}
              />
            ))}

            {/* Colored radial axis lines — center to each corner tip */}
            {CORNER_ORDER.map((key) => (
              <Line
                key={`axis-${key}`}
                x1={chartGeometry.center.x}
                y1={chartGeometry.center.y}
                x2={chartGeometry.edgePoints[key].x}
                y2={chartGeometry.edgePoints[key].y}
                stroke={withAlpha(FALLBACK_CORNER_META[key].color, 0.2)}
                strokeWidth={1.2}
              />
            ))}

            <Polygon
              points={toPolygon(CORNER_ORDER.map((key) => chartGeometry.edgePoints[key]))}
              fill="none"
              stroke={withAlpha(colors.text, 0.22)}
              strokeWidth={2}
            />

            {previousPoints ? (
              <Polygon
                points={toPolygon(previousPoints)}
                fill="none"
                stroke={withAlpha(colors.muted, 0.65)}
                strokeWidth={2}
                strokeDasharray="6,5"
              />
            ) : null}

            <Polygon
              points={toPolygon(currentPoints)}
              fill={`url(#${areaGradientId})`}
              stroke={withAlpha(colors.tint, 0.98)}
              strokeWidth={3}
            />

            {CORNER_ORDER.map((key, index) => (
              <Circle
                key={`dot-${key}`}
                cx={currentPoints[index].x}
                cy={currentPoints[index].y}
                r={5}
                fill={cornerMap[key].color}
                stroke={colors.background}
                strokeWidth={2}
              />
            ))}

            {/* Axis labels at each tip */}
            {axisLabels.map((label) => (
              <SvgText
                key={`label-${label.key}`}
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
                fill={FALLBACK_CORNER_META[label.key].color}
                fontSize={axisLabelLayout.fontSize}
                fontWeight="600"
              >
                {isParentView
                  ? FALLBACK_CORNER_META[label.key].label
                  : FALLBACK_CORNER_META[label.key].kidLabel}
              </SvgText>
            ))}
          </Svg>
        </Center>

        {!hasAnyCornerValue ? (
          <ThemedText style={[styles.emptyStateText, { color: colors.muted }]}>
            No ratings yet. Complete more sessions to populate the chart.
          </ThemedText>
        ) : null}

        {previousPoints ? (
          <Row align="center" justify="center" gap="sm">
            <Row align="center" gap="xxs">
              <View
                style={[styles.legendSwatch, { backgroundColor: withAlpha(colors.tint, 0.9) }]}
              />
              <ThemedText style={[styles.legendText, { color: colors.muted }]}>Current</ThemedText>
            </Row>
            <Row align="center" gap="xxs">
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
            </Row>
          </Row>
        ) : null}

        {data.sessionSnapshots.length > 1 ? (
          <Row align="center" justify="between" gap="xs">
            <ThemedText style={[styles.sessionMorphMeta, { color: colors.muted }]}>
              Session morph: {data.sessionSnapshots[activeSnapshotIndex]?.label ?? 'Now'}
            </ThemedText>
            <Row align="center" gap="xxs">
              {data.sessionSnapshots.map((snapshot, index) => (
                <View
                  key={snapshot.id}
                  style={[
                    styles.sessionMorphDot,
                    {
                      backgroundColor:
                        index === activeSnapshotIndex
                          ? withAlpha(colors.tint, 0.9)
                          : withAlpha(colors.border, 0.4),
                    },
                  ]}
                />
              ))}
            </Row>
          </Row>
        ) : null}

        <Column gap="xs">
          {cornerRows.map((row) => (
            <Row key={row.map((corner) => corner.key).join(':')} align="stretch" gap="xs">
              {row.map((corner) => {
                const selected = selectedCorner === corner.key;
                return (
                  <Clickable
                    key={corner.key}
                    style={[
                      styles.cornerChip,
                      {
                        borderColor: selected
                          ? withAlpha(corner.color, 0.6)
                          : withAlpha(colors.border, 0.9),
                        backgroundColor: selected
                          ? withAlpha(corner.color, 0.12)
                          : withAlpha(colors.surface, 0.8),
                      },
                    ]}
                    onPress={() => handleCornerPress(corner.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${isParentView ? corner.label : (FALLBACK_CORNER_META[corner.key]?.kidLabel ?? corner.label)} corner details`}
                  >
                    <Row align="center" gap="xs" justify="between">
                      <Row align="center" gap="xxs" style={styles.chipLeft}>
                        <View style={[styles.cornerDot, { backgroundColor: corner.color }]} />
                        <Column gap="micro" style={styles.chipLabelCol}>
                          <ThemedText style={styles.cornerChipLabel} numberOfLines={1}>
                            {isParentView
                              ? corner.label
                              : (FALLBACK_CORNER_META[corner.key]?.kidLabel ?? corner.label)}
                          </ThemedText>
                          {cornerTopPercent?.[corner.key] ? (
                            <ThemedText style={[styles.cornerChipMeta, { color: colors.muted }]}>
                              Top {cornerTopPercent[corner.key]}%
                            </ThemedText>
                          ) : null}
                        </Column>
                      </Row>
                      <Row align="center" gap="xxs">
                        <ThemedText style={styles.cornerChipScore}>
                          {clampScore(corner.value)}
                        </ThemedText>
                        {data.deltas[corner.key] !== 0 ? (
                          <TrendArrow delta={data.deltas[corner.key]} compact />
                        ) : null}
                      </Row>
                    </Row>
                  </Clickable>
                );
              })}
            </Row>
          ))}
        </Column>

        {selectedCorner && selectedCornerData ? (
          <CornerDetailPanel
            corner={selectedCornerData}
            skills={data.skillsByCorner[selectedCorner]}
          />
        ) : null}
      </Column>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 0.75,
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
  comparisonMeta: {
    ...Typography.caption,
  },
  chartWrap: {
    paddingVertical: Spacing.xs,
  },
  emptyStateText: {
    ...Typography.caption,
    textAlign: 'center',
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
  cornerChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    justifyContent: 'center',
  },
  chipLeft: {
    flex: 1,
    minWidth: 0,
  },
  chipLabelCol: {
    flex: 1,
    minWidth: 0,
  },
  cornerDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  cornerChipLabel: {
    ...Typography.caption,
    fontWeight: '700',
  },
  cornerChipMeta: {
    ...Typography.micro,
  },
  cornerChipScore: {
    ...Typography.bodySmallSemiBold,
  },
  sessionMorphMeta: {
    ...Typography.caption,
  },
  sessionMorphDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
  },
});
