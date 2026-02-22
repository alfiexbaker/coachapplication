import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface SkillHistoryPoint {
  date: string;
  level: number;
}

interface SkillTrendChartProps {
  data: SkillHistoryPoint[];
  color: string;
  width?: number;
  height?: number;
  label?: string;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

function buildLinePath(
  data: SkillHistoryPoint[],
  width: number,
  height: number,
  paddingX: number,
  paddingY: number,
): string {
  if (data.length < 2) return '';

  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;
  const minLevel = Math.min(...data.map((d) => d.level));
  const maxLevel = Math.max(...data.map((d) => d.level));
  const range = maxLevel - minLevel || 1;

  const points = data.map((point, index) => ({
    x: paddingX + (index / (data.length - 1)) * usableWidth,
    y: paddingY + usableHeight - ((point.level - minLevel) / range) * usableHeight,
  }));

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  return path;
}

/**
 * Full-width SVG line chart for skill history.
 * X=dates, Y=level. Corner-colored line with animated draw-in on mount.
 */
export const SkillTrendChart = memo(function SkillTrendChart({
  data,
  color,
  width = 280,
  height = 120,
  label,
}: SkillTrendChartProps) {
  const { colors } = useTheme();
  const paddingX = 32;
  const paddingY = 16;

  const linePath = useMemo(
    () => buildLinePath(data, width, height, paddingX, paddingY),
    [data, height, width],
  );

  // Y-axis labels
  const minLevel = data.length > 0 ? Math.min(...data.map((d) => d.level)) : 0;
  const maxLevel = data.length > 0 ? Math.max(...data.map((d) => d.level)) : 10;
  const midLevel = Math.round((minLevel + maxLevel) / 2);

  // X-axis date labels
  const dateLabels = useMemo(() => {
    if (data.length < 2) return [];
    const first = new Date(data[0].date);
    const last = new Date(data[data.length - 1].date);
    return [
      first.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      last.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    ];
  }, [data]);

  if (data.length < 2) {
    return (
      <View style={[styles.container, { width, height: 48 }]}>
        <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
          Need more data points for chart
        </ThemedText>
      </View>
    );
  }

  return (
    <Column gap="xxs">
      {label ? (
        <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
      ) : null}
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={`trendGrad-${label ?? 'default'}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.15} />
            <Stop offset="1" stopColor={color} stopOpacity={0.01} />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        <Line
          x1={paddingX}
          y1={paddingY}
          x2={width - paddingX}
          y2={paddingY}
          stroke={withAlpha(colors.border, 0.3)}
          strokeWidth={0.5}
        />
        <Line
          x1={paddingX}
          y1={height / 2}
          x2={width - paddingX}
          y2={height / 2}
          stroke={withAlpha(colors.border, 0.3)}
          strokeWidth={0.5}
          strokeDasharray="4,4"
        />
        <Line
          x1={paddingX}
          y1={height - paddingY}
          x2={width - paddingX}
          y2={height - paddingY}
          stroke={withAlpha(colors.border, 0.3)}
          strokeWidth={0.5}
        />

        {/* Y-axis labels */}
        <SvgText x={4} y={paddingY + 4} fontSize={9} fill={withAlpha(colors.text, 0.4)}>
          {maxLevel}
        </SvgText>
        <SvgText x={4} y={height / 2 + 3} fontSize={9} fill={withAlpha(colors.text, 0.4)}>
          {midLevel}
        </SvgText>
        <SvgText x={4} y={height - paddingY + 4} fontSize={9} fill={withAlpha(colors.text, 0.4)}>
          {minLevel}
        </SvgText>

        {/* X-axis labels */}
        {dateLabels.length >= 2 ? (
          <>
            <SvgText x={paddingX} y={height - 2} fontSize={9} fill={withAlpha(colors.text, 0.4)}>
              {dateLabels[0]}
            </SvgText>
            <SvgText x={width - paddingX} y={height - 2} fontSize={9} fill={withAlpha(colors.text, 0.4)} textAnchor="end">
              {dateLabels[1]}
            </SvgText>
          </>
        ) : null}

        {/* Data line */}
        <Path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((point, index) => {
          const usableWidth = width - paddingX * 2;
          const usableHeight = height - paddingY * 2;
          const range = (maxLevel - minLevel) || 1;
          const x = paddingX + (index / (data.length - 1)) * usableWidth;
          const y = paddingY + usableHeight - ((point.level - minLevel) / range) * usableHeight;

          return (
            <Circle
              key={`point-${index}`}
              cx={x}
              cy={y}
              r={3}
              fill={color}
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
          );
        })}
      </Svg>
    </Column>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...Typography.caption,
    fontWeight: '700',
  },
  emptyText: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
