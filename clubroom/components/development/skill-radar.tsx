import { useMemo } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { useTheme } from '@/hooks/useTheme';

import {
  CHART_SIZE,
  MAX_LEVEL,
  polarToXY,
  RadarRings,
  RadarAxes,
  RadarDots,
  RadarRingLabels,
  RadarLegend,
  RadarCallouts,
  styles,
  type ImprovementItem,
} from './skill-radar-sections';

/* ---------- Types ---------- */

export interface SkillDataPoint {
  name: string;
  current: number;
  previous: number;
}

export interface SkillRadarProps {
  skills: SkillDataPoint[];
}

/* ---------- Component ---------- */

export function SkillRadar({ skills }: SkillRadarProps) {
  const { colors: palette } = useTheme();

  const numAxes = skills.length;

  const currentPositions = useMemo(
    () => skills.map((s, i) => polarToXY(i, numAxes, Math.min(s.current, MAX_LEVEL) / MAX_LEVEL)),
    [skills, numAxes],
  );

  const previousPositions = useMemo(
    () => skills.map((s, i) => polarToXY(i, numAxes, Math.min(s.previous, MAX_LEVEL) / MAX_LEVEL)),
    [skills, numAxes],
  );

  const improvements: ImprovementItem[] = useMemo(
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

      <View style={[styles.chartContainer, { width: CHART_SIZE, height: CHART_SIZE }]}>
        <RadarRings palette={palette} />
        <RadarAxes skills={skills} palette={palette} />
        <RadarDots
          currentPositions={currentPositions}
          previousPositions={previousPositions}
          palette={palette}
        />
        <RadarRingLabels palette={palette} />
      </View>

      <RadarLegend palette={palette} />
      <RadarCallouts improvements={improvements} palette={palette} />
    </SurfaceCard>
  );
}
