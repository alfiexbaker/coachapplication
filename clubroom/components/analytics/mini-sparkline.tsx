/**
 * MiniSparkline — Small bar-chart sparkline for stat cards.
 */
import { View, StyleSheet } from 'react-native';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showDots?: boolean;
}

export function MiniSparkline({ data, color, width = 60, height = 24, showDots = false }: SparklineProps) {
  const { colors: palette } = useTheme();
  const lineColor = color || palette.tint;

  if (data.length < 2) return <View style={{ width, height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  return (
    <Row style={[styles.container, { width, height }]}>
      {data.map((value, index) => {
        const barHeight = ((value - min) / range) * height;
        const isLast = index === data.length - 1;
        return (
          <View
            key={index}
            style={[styles.bar, { height: Math.max(barHeight, 3), backgroundColor: lineColor, opacity: 0.25 + (index / data.length) * 0.75, borderRadius: Radii.xs }]}
          >
            {showDots && isLast && <View style={[styles.dot, { backgroundColor: lineColor }]} />}
          </View>
        );
      })}
    </Row>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-end', gap: Spacing.micro },
  bar: { flex: 1, minWidth: 4 },
  dot: { position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: Radii.xs },
});
