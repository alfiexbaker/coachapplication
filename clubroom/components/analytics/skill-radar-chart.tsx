/**
 * SkillRadarChart — The radar/spider chart visualization.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SkillProgress } from '@/constants/types';
import {
  RADAR_SIZE,
  CENTER,
  RADIUS,
  getSkillColor,
  getSkillLabel,
  getPosition,
} from './skill-radar-helpers';
import { Row } from '@/components/primitives';

const RINGS = [25, 50, 75, 100];

interface SkillRadarChartProps {
  skills: SkillProgress[];
  selectedSkill: SkillProgress | null;
  onSelectSkill: (skill: SkillProgress | null) => void;
  showComparison: boolean;
  comparisonValues: number[];
  comparisonLabel: string;
}

function SkillRadarChartInner({
  skills,
  selectedSkill,
  onSelectSkill,
  showComparison,
  comparisonValues,
  comparisonLabel,
}: SkillRadarChartProps) {
  const { colors: palette } = useTheme();
  const numSkills = skills.length;

  return (
    <Animated.View entering={FadeIn}>
      <View style={[styles.radarContainer, { width: RADAR_SIZE, height: RADAR_SIZE }]}>
        {/* Background rings */}
        {RINGS.map((ring) => (
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

        {/* Ring labels */}
        <View style={[styles.ringLabel, { top: CENTER - RADIUS - 12 }]}>
          <ThemedText style={[styles.ringLabelText, { color: palette.muted }]}>100</ThemedText>
        </View>
        <View style={[styles.ringLabel, { top: CENTER - RADIUS * 0.5 - 12 }]}>
          <ThemedText style={[styles.ringLabelText, { color: palette.muted }]}>50</ThemedText>
        </View>

        {/* Axis lines and skill labels */}
        {skills.map((skill, index) => {
          const labelPos = getPosition(index, 118, numSkills);
          const isSelected = selectedSkill?.skillName === skill.skillName;
          const skillColor = getSkillColor(skill.currentLevel);
          return (
            <View key={skill.skillName}>
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
              <Clickable
                onPress={() => onSelectSkill(isSelected ? null : skill)}
                style={[styles.skillLabel, { left: labelPos.x - 32, top: labelPos.y - 14 }]}
                accessibilityRole="button"
                accessibilityLabel={`Select ${skill.skillName} skill`}
                accessibilityState={{ selected: isSelected }}
                hitSlop={12}
              >
                <View
                  style={[
                    styles.skillLabelBg,
                    isSelected
                      ? {
                          backgroundColor: withAlpha(skillColor, 0.12),
                          borderColor: skillColor,
                          borderWidth: 1,
                        }
                      : undefined,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.skillLabelText,
                      { color: isSelected ? skillColor : palette.text },
                    ]}
                  >
                    {skill.skillName.length > 8
                      ? skill.skillName.slice(0, 7) + '...'
                      : skill.skillName}
                  </ThemedText>
                </View>
              </Clickable>
            </View>
          );
        })}

        {/* Comparison polygon */}
        {showComparison && comparisonValues.length === numSkills && (
          <View style={styles.polygon}>
            {skills.map((_, index) => {
              const pos = getPosition(index, comparisonValues[index] || 50, numSkills);
              return (
                <View
                  key={`comp-${index}`}
                  style={[
                    styles.comparisonPoint,
                    {
                      left: pos.x - 4,
                      top: pos.y - 4,
                      backgroundColor: withAlpha(palette.muted, 0.25),
                      borderColor: palette.muted,
                    },
                  ]}
                />
              );
            })}
          </View>
        )}

        {/* Data points */}
        <View style={styles.polygon}>
          {skills.map((skill, index) => {
            const pos = getPosition(index, skill.currentLevel, numSkills);
            const isSelected = selectedSkill?.skillName === skill.skillName;
            return (
              <Clickable
                key={skill.skillName}
                onPress={() => onSelectSkill(isSelected ? null : skill)}
                style={[
                  styles.dataPoint,
                  {
                    left: pos.x - (isSelected ? 8 : 6),
                    top: pos.y - (isSelected ? 8 : 6),
                    width: isSelected ? 16 : 12,
                    height: isSelected ? 16 : 12,
                    backgroundColor: getSkillColor(skill.currentLevel),
                    borderColor: palette.surface,
                    borderWidth: 2,
                    shadowColor: palette.text,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select ${skill.skillName} skill`}
                accessibilityState={{ selected: isSelected }}
                hitSlop={16}
              />
            );
          })}
        </View>

        <View style={[styles.centerDot, { backgroundColor: palette.border }]} />
      </View>

      {/* Legend */}
      <Row style={styles.legend}>
        <Row style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.tint }]} />
          <ThemedText style={[styles.legendText, { color: palette.text }]}>Current</ThemedText>
        </Row>
        {showComparison && (
          <Row style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: palette.muted }]} />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>
              {comparisonLabel}
            </ThemedText>
          </Row>
        )}
      </Row>

      {/* Selected Skill Detail */}
      {selectedSkill && (
        <Animated.View entering={FadeInDown.springify()} style={styles.selectedDetail}>
          <View
            style={[
              styles.selectedCard,
              { borderColor: getSkillColor(selectedSkill.currentLevel) },
            ]}
          >
            <Row style={styles.selectedHeader}>
              <View>
                <ThemedText type="defaultSemiBold">{selectedSkill.skillName}</ThemedText>
                <ThemedText style={[styles.selectedCategory, { color: palette.muted }]}>
                  {selectedSkill.category}
                </ThemedText>
              </View>
              <View style={styles.selectedStats}>
                <ThemedText
                  type="heading"
                  style={{ color: getSkillColor(selectedSkill.currentLevel) }}
                >
                  {selectedSkill.currentLevel}
                </ThemedText>
                <Row
                  style={[
                    styles.selectedTrend,
                    {
                      backgroundColor:
                        selectedSkill.changePercent >= 0
                          ? withAlpha(palette.success, 0.09)
                          : withAlpha(palette.error, 0.09),
                    },
                  ]}
                >
                  <Ionicons
                    name={selectedSkill.changePercent >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={12}
                    color={selectedSkill.changePercent >= 0 ? palette.success : palette.error}
                  />
                  <ThemedText
                    style={{
                      ...Typography.caption,
                      color: selectedSkill.changePercent >= 0 ? palette.success : palette.error,
                    }}
                  >
                    {selectedSkill.changePercent >= 0 ? '+' : ''}
                    {selectedSkill.changePercent.toFixed(1)}%
                  </ThemedText>
                </Row>
              </View>
            </Row>
            <View style={styles.selectedProgressBar}>
              <View style={[styles.selectedProgressBg, { backgroundColor: palette.border }]}>
                <View
                  style={[
                    styles.selectedProgressFill,
                    {
                      width: `${selectedSkill.currentLevel}%`,
                      backgroundColor: getSkillColor(selectedSkill.currentLevel),
                    },
                  ]}
                />
              </View>
              <ThemedText
                style={[styles.selectedLevel, { color: getSkillColor(selectedSkill.currentLevel) }]}
              >
                {getSkillLabel(selectedSkill.currentLevel)}
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

export const SkillRadarChart = memo(SkillRadarChartInner);

const styles = StyleSheet.create({
  radarContainer: {
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: { position: 'absolute', borderWidth: 1, borderRadius: Radii.pill, borderStyle: 'dashed' },
  ringLabel: { position: 'absolute', left: '50%', marginLeft: -10 },
  ringLabelText: { ...Typography.micro },
  axisLine: { position: 'absolute', height: 1, transformOrigin: 'left center' },
  skillLabel: { position: 'absolute', width: 64, alignItems: 'center' },
  skillLabelBg: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  skillLabelText: { ...Typography.micro, textAlign: 'center' },
  polygon: { position: 'absolute', width: '100%', height: '100%' },
  dataPoint: { position: 'absolute', borderRadius: Radii.pill },
  comparisonPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
    borderWidth: 1,
  },
  centerDot: { position: 'absolute', width: 6, height: 6, borderRadius: Radii.xs },
  legend: { justifyContent: 'center', gap: Spacing.lg },
  legendItem: { alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: Radii.sm },
  legendText: { ...Typography.caption },
  selectedDetail: { marginTop: Spacing.sm },
  selectedCard: { padding: Spacing.sm, borderWidth: 2, borderRadius: Radii.md, gap: Spacing.sm },
  selectedHeader: { justifyContent: 'space-between', alignItems: 'flex-start' },
  selectedCategory: { ...Typography.caption, marginTop: Spacing.micro },
  selectedStats: { alignItems: 'flex-end', gap: Spacing.xxs },
  selectedTrend: {
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  selectedProgressBar: { gap: Spacing.xxs },
  selectedProgressBg: { height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  selectedProgressFill: { height: '100%', borderRadius: Radii.xs },
  selectedLevel: { ...Typography.caption, textAlign: 'right' },
});
