import React, { memo } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SkillDataPoint } from './skill-radar';

import { CENTER, MAX_LEVEL, NUM_RINGS, OUTER_RADIUS } from './skill-radar-constants';
import { polarToXY } from './skill-radar-helpers';
import { styles } from './skill-radar-styles';

interface RadarRingsProps {
  palette: ThemeColors;
}

export const RadarRings = memo(function RadarRings({ palette }: RadarRingsProps) {
  return (
    <>
      {Array.from({ length: NUM_RINGS }).map((_, ringIdx) => {
        const level = ((ringIdx + 1) * MAX_LEVEL) / NUM_RINGS;
        const norm = level / MAX_LEVEL;
        const size = norm * OUTER_RADIUS * 2;
        return (
          <View
            key={`ring-${ringIdx}`}
            style={[styles.ring, { width: size, height: size, borderColor: palette.border }]}
          />
        );
      })}
    </>
  );
});

interface RadarAxesProps {
  skills: SkillDataPoint[];
  palette: ThemeColors;
}

export const RadarAxes = memo(function RadarAxes({ skills, palette }: RadarAxesProps) {
  const numAxes = skills.length;

  return (
    <>
      {skills.map((skill, idx) => {
        const labelPoint = polarToXY(idx, numAxes, 1.25);
        const angle = (360 * idx) / numAxes - 90;

        return (
          <View key={`axis-${skill.name}`}>
            <View
              style={[
                styles.axisLine,
                {
                  backgroundColor: palette.border,
                  width: OUTER_RADIUS,
                  left: CENTER,
                  top: CENTER,
                  transform: [{ rotate: `${angle}deg` }, { translateX: OUTER_RADIUS / 2 }],
                },
              ]}
            />
            <View style={[styles.skillLabel, { left: labelPoint.x - 36, top: labelPoint.y - 10 }]}>
              <ThemedText style={[styles.skillLabelText, { color: palette.text }]}>
                {skill.name}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </>
  );
});

interface RadarDotsProps {
  currentPositions: { x: number; y: number }[];
  previousPositions: { x: number; y: number }[];
  palette: ThemeColors;
}

export const RadarDots = memo(function RadarDots({
  currentPositions,
  previousPositions,
  palette,
}: RadarDotsProps) {
  return (
    <>
      {previousPositions.map((pos, idx) => (
        <View
          key={`prev-${idx}`}
          style={[
            styles.previousDot,
            {
              left: pos.x - 5,
              top: pos.y - 5,
              borderColor: palette.muted,
              backgroundColor: palette.surface,
            },
          ]}
        />
      ))}

      {currentPositions.map((pos, idx) => (
        <View
          key={`curr-${idx}`}
          style={[
            styles.currentDot,
            {
              left: pos.x - 6,
              top: pos.y - 6,
              backgroundColor: palette.success,
              borderColor: palette.surface,
            },
          ]}
        />
      ))}

      <View style={[styles.centerDot, { backgroundColor: palette.border }]} />
    </>
  );
});

interface RadarRingLabelsProps {
  palette: ThemeColors;
}

export const RadarRingLabels = memo(function RadarRingLabels({ palette }: RadarRingLabelsProps) {
  return (
    <>
      {Array.from({ length: NUM_RINGS }).map((_, ringIdx) => {
        const level = ((ringIdx + 1) * MAX_LEVEL) / NUM_RINGS;
        const norm = level / MAX_LEVEL;
        const yPos = CENTER - norm * OUTER_RADIUS;
        return (
          <View key={`rlabel-${ringIdx}`} style={[styles.ringLabel, { top: yPos - 8 }]}>
            <ThemedText style={[styles.ringLabelText, { color: palette.muted }]}>
              {level}
            </ThemedText>
          </View>
        );
      })}
    </>
  );
});
