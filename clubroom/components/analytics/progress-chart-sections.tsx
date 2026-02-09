import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SkillProgress } from '@/constants/types';

// Decorative: categorical chart colors (not themeable)
export const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'] as const;

/* ---------- Sparkline ---------- */

export interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export const Sparkline = memo(function Sparkline({ data, color, width = 60, height = 20 }: SparklineProps) {
  const { colors: palette } = useTheme();
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
});

/* ---------- ChartLegend ---------- */

export interface ChartLegendProps {
  skills: SkillProgress[];
  palette: ThemeColors;
}

export const ChartLegend = memo(function ChartLegend({ skills, palette }: ChartLegendProps) {
  return (
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
  );
});

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.micro,
  },
  sparklineBar: {
    flex: 1,
    borderRadius: Radii.xs,
  },
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
});
