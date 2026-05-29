import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/useTheme';
import { withAlpha } from '@/constants/theme';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showGradient?: boolean;
}

function buildSparklinePath(
  data: number[],
  width: number,
  height: number,
  padding: number,
): { linePath: string; areaPath: string } {
  if (data.length < 2) {
    const midY = height / 2;
    return {
      linePath: `M ${padding} ${midY} L ${width - padding} ${midY}`,
      areaPath: `M ${padding} ${midY} L ${width - padding} ${midY} L ${width - padding} ${height} L ${padding} ${height} Z`,
    };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const points = data.map((value, index) => ({
    x: padding + (index / (data.length - 1)) * usableWidth,
    y: padding + usableHeight - ((value - min) / range) * usableHeight,
  }));

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    linePath += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x} ${height} L ${points[0].x} ${height} Z`;

  return { linePath, areaPath };
}

function detectTrend(data: number[]): 'up' | 'down' | 'flat' {
  if (data.length < 2) return 'flat';
  const last = data[data.length - 1];
  const first = data[0];
  const delta = last - first;
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

/**
 * 48×16px SVG micro-chart from number[].
 * Gradient fill, trend-colored.
 */
export const Sparkline = function Sparkline({
  data,
  width = 48,
  height = 16,
  color,
  showGradient = true,
}: SparklineProps) {
  const { colors } = useTheme();

  const trend = detectTrend(data);
  const lineColor = color ?? (trend === 'up' ? colors.success : trend === 'down' ? colors.error : colors.muted);

  const { linePath, areaPath } = buildSparklinePath(data, width, height, 1);

  if (data.length === 0) {
    return <View style={{ width, height }} />;
  }

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {showGradient ? (
        <Defs>
          <LinearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity={0.25} />
            <Stop offset="1" stopColor={lineColor} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
      ) : null}
      {showGradient ? (
        <Path d={areaPath} fill="url(#sparkGrad)" />
      ) : null}
      <Path
        d={linePath}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
