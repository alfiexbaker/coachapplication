import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii , Typography  , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SkillProgress } from '@/constants/types';

const CHART_HEIGHT = 180;

interface ProgressChartProps {
  skills: SkillProgress[];
  title?: string;
  showLegend?: boolean;
}

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

export function ProgressChart({ skills, title = 'Progress Over Time', showLegend = true }: ProgressChartProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Get all unique dates from all skills
  const allDates = new Set<string>();
  skills.forEach((skill) => {
    skill.history.forEach((h) => allDates.add(h.date));
  });
  const dates = Array.from(allDates).sort();

  if (dates.length === 0 || skills.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={32} color={palette.muted} />
        <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
          No progress data available
        </ThemedText>
      </View>
    );
  }

  // Calculate chart dimensions
  const yMin = 0;
  const yMax = 100;

  const getY = (level: number): number => {
    return CHART_HEIGHT - ((level - yMin) / (yMax - yMin)) * CHART_HEIGHT;
  };

  return (
    <View style={styles.container}>
      {title && (
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title}
        </ThemedText>
      )}

      <View style={styles.chartContainer}>
        {/* Y-Axis Labels */}
        <View style={styles.yAxis}>
          <ThemedText style={[styles.axisLabel, { color: palette.muted }]}>100</ThemedText>
          <ThemedText style={[styles.axisLabel, { color: palette.muted }]}>75</ThemedText>
          <ThemedText style={[styles.axisLabel, { color: palette.muted }]}>50</ThemedText>
          <ThemedText style={[styles.axisLabel, { color: palette.muted }]}>25</ThemedText>
          <ThemedText style={[styles.axisLabel, { color: palette.muted }]}>0</ThemedText>
        </View>

        {/* Chart Area */}
        <View style={styles.chartArea}>
          {/* Grid Lines */}
          <View style={styles.gridLines}>
            {[0, 25, 50, 75, 100].map((level) => (
              <View
                key={level}
                style={[
                  styles.gridLine,
                  {
                    top: getY(level),
                    backgroundColor: palette.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* Data Lines (simplified as bars since SVG not available) */}
          <View style={styles.barsContainer}>
            {skills.slice(0, 4).map((skill, skillIndex) => {
              const currentLevel = skill.currentLevel;
              const color = COLORS[skillIndex % COLORS.length];

              return (
                <View
                  key={skill.skillName}
                  style={[
                    styles.bar,
                    {
                      height: `${currentLevel}%`,
                      backgroundColor: withAlpha(color, 0.19),
                      borderColor: color,
                    },
                  ]}
                >
                  <View style={[styles.barFill, { backgroundColor: color, height: 4 }]} />
                </View>
              );
            })}
          </View>

          {/* Current Values */}
          <View style={styles.valuesRow}>
            {skills.slice(0, 4).map((skill, index) => {
              const color = COLORS[index % COLORS.length];
              return (
                <View key={skill.skillName} style={styles.valueItem}>
                  <ThemedText style={[styles.valueText, { color }]}>
                    {skill.currentLevel}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          {skills.slice(0, 4).map((skill, index) => {
            const color = COLORS[index % COLORS.length];
            return (
              <View key={skill.skillName} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <ThemedText style={[styles.legendText, { color: palette.text }]}>
                  {skill.skillName}
                </ThemedText>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// Simple sparkline for inline display
interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({ data, color, width = 60, height = 20 }: SparklineProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const lineColor = color || palette.tint;

  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  return (
    <View style={[styles.sparkline, { width, height }]}>
      {data.map((value, index) => {
        const barHeight = ((value - min) / range) * height;
        return (
          <View
            key={index}
            style={[
              styles.sparklineBar,
              {
                height: Math.max(barHeight, 2),
                backgroundColor: lineColor,
                opacity: 0.3 + (index / data.length) * 0.7,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  chartContainer: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxis: {
    width: 30,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: Spacing.xs,
  },
  axisLabel: { ...Typography.micro },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
  },
  bar: {
    width: '20%',
    borderRadius: Radii.sm,
    borderWidth: 2,
    justifyContent: 'flex-start',
  },
  barFill: {
    width: '100%',
    borderRadius: Radii.xs,
  },
  valuesRow: {
    position: 'absolute',
    bottom: -24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
  },
  valueItem: {
    width: '20%',
    alignItems: 'center',
  },
  valueText: { ...Typography.caption },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  legendText: { ...Typography.caption },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.micro,
  },
  sparklineBar: {
    flex: 1,
    borderRadius: Radii.xs,
  },
});
