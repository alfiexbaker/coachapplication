import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { SkillProgress } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { COLORS, Sparkline, ChartLegend } from './progress-chart-sections';
export type { SparklineProps, ChartLegendProps } from './progress-chart-sections';

import { COLORS, ChartLegend } from './progress-chart-sections';
import { Row } from '@/components/primitives';

const CHART_HEIGHT = 180;

interface ProgressChartProps {
  skills: SkillProgress[];
  title?: string;
  showLegend?: boolean;
}

export function ProgressChart({ skills, title = 'Progress Over Time', showLegend = true }: ProgressChartProps) {
  const { colors: palette } = useTheme();

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

      <Row style={styles.chartContainer}>
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
          <View style={styles.gridLines}>
            {[0, 25, 50, 75, 100].map((level) => (
              <View
                key={level}
                style={[
                  styles.gridLine,
                  { top: getY(level), backgroundColor: palette.border },
                ]}
              />
            ))}
          </View>

          <Row style={styles.barsContainer}>
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
          </Row>

          <Row style={styles.valuesRow}>
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
          </Row>
        </View>
      </Row>

      {showLegend && <ChartLegend skills={skills} palette={palette} />}
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
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
  },
  valueItem: {
    width: '20%',
    alignItems: 'center',
  },
  valueText: { ...Typography.caption },
});
