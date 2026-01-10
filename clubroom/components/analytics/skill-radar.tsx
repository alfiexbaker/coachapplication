import { View, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SkillProgress } from '@/constants/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RADAR_SIZE = Math.min(SCREEN_WIDTH - Spacing.lg * 4, 280);
const CENTER = RADAR_SIZE / 2;
const RADIUS = RADAR_SIZE / 2 - 40;

interface SkillRadarProps {
  skills: SkillProgress[];
  title?: string;
  showComparison?: boolean;
  comparisonValues?: number[];
  comparisonLabel?: string;
}

export function SkillRadar({
  skills,
  title = 'Skills Overview',
  showComparison = false,
  comparisonValues = [],
  comparisonLabel = 'Average',
}: SkillRadarProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  if (skills.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="stats-chart-outline" size={32} color={palette.muted} />
        <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
          No skill data available
        </ThemedText>
      </View>
    );
  }

  const numSkills = skills.length;
  const angleStep = (2 * Math.PI) / numSkills;

  // Calculate positions for each skill
  const getPosition = (index: number, level: number) => {
    const angle = angleStep * index - Math.PI / 2; // Start from top
    const r = (level / 100) * RADIUS;
    return {
      x: CENTER + r * Math.cos(angle),
      y: CENTER + r * Math.sin(angle),
    };
  };

  // Generate ring circles
  const rings = [25, 50, 75, 100];

  return (
    <View style={styles.container}>
      {title && (
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title}
        </ThemedText>
      )}

      <View style={[styles.radarContainer, { width: RADAR_SIZE, height: RADAR_SIZE }]}>
        {/* Background rings */}
        {rings.map((ring) => (
          <View
            key={ring}
            style={[
              styles.ring,
              {
                width: (ring / 100) * RADIUS * 2,
                height: (ring / 100) * RADIUS * 2,
                borderColor: palette.border,
              },
            ]}
          />
        ))}

        {/* Axis lines and skill labels */}
        {skills.map((skill, index) => {
          const labelPos = getPosition(index, 115);
          const lineEnd = getPosition(index, 100);

          return (
            <View key={skill.skillName}>
              {/* Axis line */}
              <View
                style={[
                  styles.axisLine,
                  {
                    backgroundColor: palette.border,
                    width: RADIUS,
                    left: CENTER,
                    top: CENTER,
                    transform: [
                      { translateX: -0.5 },
                      { rotate: `${(index * 360) / numSkills - 90}deg` },
                      { translateX: RADIUS / 2 },
                    ],
                  },
                ]}
              />

              {/* Skill label */}
              <View
                style={[
                  styles.skillLabel,
                  {
                    left: labelPos.x - 30,
                    top: labelPos.y - 10,
                  },
                ]}
              >
                <ThemedText style={[styles.skillLabelText, { color: palette.text }]}>
                  {skill.skillName}
                </ThemedText>
              </View>
            </View>
          );
        })}

        {/* Comparison polygon (if enabled) */}
        {showComparison && comparisonValues.length === skills.length && (
          <View style={styles.polygon}>
            {skills.map((_, index) => {
              const pos = getPosition(index, comparisonValues[index] || 50);
              return (
                <View
                  key={`comp-${index}`}
                  style={[
                    styles.dataPoint,
                    {
                      left: pos.x - 4,
                      top: pos.y - 4,
                      backgroundColor: `${palette.muted}40`,
                      borderColor: palette.muted,
                    },
                  ]}
                />
              );
            })}
          </View>
        )}

        {/* Data points polygon */}
        <View style={styles.polygon}>
          {skills.map((skill, index) => {
            const pos = getPosition(index, skill.currentLevel);
            const changeColor =
              skill.changePercent > 0
                ? palette.success
                : skill.changePercent < 0
                ? palette.error
                : palette.muted;

            return (
              <View
                key={skill.skillName}
                style={[
                  styles.dataPoint,
                  {
                    left: pos.x - 6,
                    top: pos.y - 6,
                    backgroundColor: palette.tint,
                    borderColor: palette.tint,
                  },
                ]}
              >
                {/* Value tooltip */}
                <View style={[styles.valueTooltip, { backgroundColor: palette.surface }]}>
                  <ThemedText style={[styles.valueText, { color: palette.text }]}>
                    {skill.currentLevel}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.tint }]} />
          <ThemedText style={[styles.legendText, { color: palette.text }]}>Current</ThemedText>
        </View>
        {showComparison && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: palette.muted }]} />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>
              {comparisonLabel}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Skills List */}
      <View style={styles.skillsList}>
        {skills.map((skill) => {
          const changeColor =
            skill.changePercent > 0
              ? palette.success
              : skill.changePercent < 0
              ? palette.error
              : palette.muted;

          return (
            <View key={skill.skillName} style={styles.skillRow}>
              <View style={styles.skillInfo}>
                <ThemedText style={styles.skillName}>{skill.skillName}</ThemedText>
                <ThemedText style={[styles.skillCategory, { color: palette.muted }]}>
                  {skill.category}
                </ThemedText>
              </View>
              <View style={styles.skillValue}>
                <ThemedText type="defaultSemiBold">{skill.currentLevel}</ThemedText>
                <View style={styles.changeIndicator}>
                  <Ionicons
                    name={skill.changePercent > 0 ? 'arrow-up' : skill.changePercent < 0 ? 'arrow-down' : 'remove'}
                    size={12}
                    color={changeColor}
                  />
                  <ThemedText style={[styles.changeText, { color: changeColor }]}>
                    {skill.changePercent > 0 ? '+' : ''}
                    {skill.changePercent.toFixed(1)}%
                  </ThemedText>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  title: {
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  radarContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 1000,
    borderStyle: 'dashed',
  },
  axisLine: {
    position: 'absolute',
    height: 1,
    transformOrigin: 'left center',
  },
  skillLabel: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
  },
  skillLabelText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  polygon: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  valueTooltip: {
    position: 'absolute',
    bottom: 14,
    left: -8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 10,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
  },
  skillsList: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skillInfo: {
    gap: 2,
  },
  skillName: {
    fontSize: 14,
    fontWeight: '500',
  },
  skillCategory: {
    fontSize: 11,
  },
  skillValue: {
    alignItems: 'flex-end',
    gap: 2,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
