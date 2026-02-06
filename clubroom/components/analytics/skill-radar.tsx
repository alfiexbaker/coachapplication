import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SkillProgress } from '@/constants/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RADAR_SIZE = Math.min(SCREEN_WIDTH - Spacing.lg * 4, 260);
const CENTER = RADAR_SIZE / 2;
const RADIUS = RADAR_SIZE / 2 - 45;

// Skill level color scheme
const SKILL_COLORS = {
  beginner: '#F59E0B',
  developing: '#3B82F6',
  proficient: '#10B981',
  advanced: '#8B5CF6',
  expert: '#EC4899',
};

const getSkillColor = (level: number) => {
  if (level < 20) return SKILL_COLORS.beginner;
  if (level < 40) return SKILL_COLORS.developing;
  if (level < 60) return SKILL_COLORS.proficient;
  if (level < 80) return SKILL_COLORS.advanced;
  return SKILL_COLORS.expert;
};

const getSkillLabel = (level: number) => {
  if (level < 20) return 'Beginner';
  if (level < 40) return 'Developing';
  if (level < 60) return 'Proficient';
  if (level < 80) return 'Advanced';
  return 'Expert';
};

interface SkillRadarProps {
  skills: SkillProgress[];
  title?: string;
  showComparison?: boolean;
  comparisonValues?: number[];
  comparisonLabel?: string;
  showDetailedList?: boolean;
}

export function SkillRadar({
  skills,
  title = 'Skills Overview',
  showComparison = false,
  comparisonValues = [],
  comparisonLabel = 'Average',
  showDetailedList = true,
}: SkillRadarProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [selectedSkill, setSelectedSkill] = useState<SkillProgress | null>(null);
  const [viewMode, setViewMode] = useState<'radar' | 'list'>('radar');

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const grouped: Record<string, SkillProgress[]> = {};
    skills.forEach(skill => {
      const cat = skill.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(skill);
    });
    return grouped;
  }, [skills]);

  if (skills.length === 0) {
    return (
      <SurfaceCard style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface }]}>
          <Ionicons name="analytics-outline" size={32} color={palette.muted} />
        </View>
        <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
          No Skill Data
        </ThemedText>
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          Complete training sessions to start tracking your skill progress
        </ThemedText>
      </SurfaceCard>
    );
  }

  const numSkills = skills.length;
  const angleStep = (2 * Math.PI) / numSkills;

  // Calculate positions for each skill
  const getPosition = (index: number, level: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (level / 100) * RADIUS;
    return {
      x: CENTER + r * Math.cos(angle),
      y: CENTER + r * Math.sin(angle),
    };
  };

  // Generate ring circles
  const rings = [25, 50, 75, 100];

  // Calculate overall average
  const avgLevel = skills.reduce((sum, s) => sum + s.currentLevel, 0) / skills.length;
  const avgChange = skills.reduce((sum, s) => sum + s.changePercent, 0) / skills.length;

  return (
    <SurfaceCard style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {title && (
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {title}
            </ThemedText>
          )}
          <View style={styles.avgBadge}>
            <ThemedText style={[styles.avgText, { color: palette.tint }]}>
              Avg: {Math.round(avgLevel)}
            </ThemedText>
            {avgChange !== 0 && (
              <View style={styles.avgTrend}>
                <Ionicons
                  name={avgChange > 0 ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={avgChange > 0 ? palette.success : palette.error}
                />
                <ThemedText style={{ ...Typography.caption, color: avgChange > 0 ? palette.success : palette.error, fontWeight: '600' }}>
                  {avgChange > 0 ? '+' : ''}{avgChange.toFixed(1)}%
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* View Toggle */}
        <View style={[styles.viewToggle, { backgroundColor: palette.surface }]}>
          <Pressable
            onPress={() => setViewMode('radar')}
            style={[
              styles.toggleButton,
              viewMode === 'radar' ? { backgroundColor: palette.tint } : undefined
            ]}
          >
            <Ionicons
              name="pie-chart"
              size={16}
              color={viewMode === 'radar' ? palette.onPrimary : palette.icon}
            />
          </Pressable>
          <Pressable
            onPress={() => setViewMode('list')}
            style={[
              styles.toggleButton,
              viewMode === 'list' ? { backgroundColor: palette.tint } : undefined
            ]}
          >
            <Ionicons
              name="list"
              size={16}
              color={viewMode === 'list' ? palette.onPrimary : palette.icon}
            />
          </Pressable>
        </View>
      </View>

      {/* Radar View */}
      {viewMode === 'radar' && (
        <Animated.View entering={FadeIn}>
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

            {/* Ring labels */}
            <View style={[styles.ringLabel, { top: CENTER - RADIUS - 12 }]}>
              <ThemedText style={[styles.ringLabelText, { color: palette.muted }]}>100</ThemedText>
            </View>
            <View style={[styles.ringLabel, { top: CENTER - (RADIUS * 0.5) - 12 }]}>
              <ThemedText style={[styles.ringLabelText, { color: palette.muted }]}>50</ThemedText>
            </View>

            {/* Axis lines and skill labels */}
            {skills.map((skill, index) => {
              const labelPos = getPosition(index, 118);
              const isSelected = selectedSkill?.skillName === skill.skillName;
              const skillColor = getSkillColor(skill.currentLevel);

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
                  <Pressable
                    onPress={() => setSelectedSkill(isSelected ? null : skill)}
                    style={[
                      styles.skillLabel,
                      {
                        left: labelPos.x - 32,
                        top: labelPos.y - 14,
                      },
                    ]}
                  >
                    <View style={[
                      styles.skillLabelBg,
                      isSelected ? { backgroundColor: withAlpha(skillColor, 0.12), borderColor: skillColor, borderWidth: 1 } : undefined
                    ]}>
                      <ThemedText style={[
                        styles.skillLabelText,
                        { color: isSelected ? skillColor : palette.text }
                      ]}>
                        {skill.skillName.length > 8 ? skill.skillName.slice(0, 7) + '...' : skill.skillName}
                      </ThemedText>
                    </View>
                  </Pressable>
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
                const pos = getPosition(index, skill.currentLevel);
                const skillColor = getSkillColor(skill.currentLevel);
                const isSelected = selectedSkill?.skillName === skill.skillName;

                return (
                  <Pressable
                    key={skill.skillName}
                    onPress={() => setSelectedSkill(isSelected ? null : skill)}
                    style={[
                      styles.dataPoint,
                      {
                        left: pos.x - (isSelected ? 8 : 6),
                        top: pos.y - (isSelected ? 8 : 6),
                        width: isSelected ? 16 : 12,
                        height: isSelected ? 16 : 12,
                        backgroundColor: skillColor,
                        borderColor: Colors.light.surface,
                        borderWidth: 2,
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Center dot */}
            <View style={[styles.centerDot, { backgroundColor: palette.border }]} />
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

          {/* Selected Skill Detail */}
          {selectedSkill && (
            <Animated.View entering={FadeInDown.springify()} style={styles.selectedDetail}>
              <View style={[styles.selectedCard, { borderColor: getSkillColor(selectedSkill.currentLevel) }]}>
                <View style={styles.selectedHeader}>
                  <View>
                    <ThemedText type="defaultSemiBold">{selectedSkill.skillName}</ThemedText>
                    <ThemedText style={[styles.selectedCategory, { color: palette.muted }]}>
                      {selectedSkill.category}
                    </ThemedText>
                  </View>
                  <View style={styles.selectedStats}>
                    <ThemedText type="heading" style={{ color: getSkillColor(selectedSkill.currentLevel) }}>
                      {selectedSkill.currentLevel}
                    </ThemedText>
                    <View style={[
                      styles.selectedTrend,
                      { backgroundColor: selectedSkill.changePercent >= 0 ? withAlpha(palette.success, 0.09) : withAlpha(palette.error, 0.09) }
                    ]}>
                      <Ionicons
                        name={selectedSkill.changePercent >= 0 ? 'arrow-up' : 'arrow-down'}
                        size={12}
                        color={selectedSkill.changePercent >= 0 ? palette.success : palette.error}
                      />
                      <ThemedText style={{ ...Typography.caption, color: selectedSkill.changePercent >= 0 ? palette.success : palette.error }}>
                        {selectedSkill.changePercent >= 0 ? '+' : ''}{selectedSkill.changePercent.toFixed(1)}%
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <View style={styles.selectedProgressBar}>
                  <View style={[styles.selectedProgressBg, { backgroundColor: palette.border }]}>
                    <View style={[
                      styles.selectedProgressFill,
                      {
                        width: `${selectedSkill.currentLevel}%`,
                        backgroundColor: getSkillColor(selectedSkill.currentLevel)
                      }
                    ]} />
                  </View>
                  <ThemedText style={[styles.selectedLevel, { color: getSkillColor(selectedSkill.currentLevel) }]}>
                    {getSkillLabel(selectedSkill.currentLevel)}
                  </ThemedText>
                </View>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* List View */}
      {viewMode === 'list' && showDetailedList && (
        <Animated.View entering={FadeIn} style={styles.listView}>
          {Object.entries(skillsByCategory).map(([category, categorySkills], catIndex) => (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categorySectionHeader}>
                <ThemedText style={[styles.categorySectionTitle, { color: palette.muted }]}>
                  {category.toUpperCase()}
                </ThemedText>
                <View style={[styles.categoryLine, { backgroundColor: palette.border }]} />
              </View>

              {categorySkills.map((skill, index) => {
                const skillColor = getSkillColor(skill.currentLevel);
                const changeColor = skill.changePercent > 0
                  ? palette.success
                  : skill.changePercent < 0
                  ? palette.error
                  : palette.muted;

                return (
                  <Animated.View
                    key={skill.skillName}
                    entering={FadeInDown.delay((catIndex * 100) + (index * 50)).springify()}
                    style={styles.skillRow}
                  >
                    <View style={styles.skillRowLeft}>
                      <View style={[styles.skillColorIndicator, { backgroundColor: skillColor }]} />
                      <View style={styles.skillRowInfo}>
                        <ThemedText type="defaultSemiBold" style={styles.skillRowName}>
                          {skill.skillName}
                        </ThemedText>
                        <ThemedText style={[styles.skillRowLevel, { color: skillColor }]}>
                          {getSkillLabel(skill.currentLevel)}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.skillRowRight}>
                      <View style={styles.skillRowValue}>
                        <ThemedText type="defaultSemiBold" style={styles.skillRowValueText}>
                          {skill.currentLevel}
                        </ThemedText>
                        <ThemedText style={[styles.skillRowMax, { color: palette.muted }]}>/100</ThemedText>
                      </View>

                      <View style={[styles.skillRowTrend, { backgroundColor: withAlpha(changeColor, 0.09) }]}>
                        <Ionicons
                          name={skill.changePercent > 0 ? 'trending-up' : skill.changePercent < 0 ? 'trending-down' : 'remove'}
                          size={12}
                          color={changeColor}
                        />
                        <ThemedText style={[styles.skillRowTrendText, { color: changeColor }]}>
                          {skill.changePercent > 0 ? '+' : ''}{skill.changePercent.toFixed(1)}%
                        </ThemedText>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          ))}
        </Animated.View>
      )}

      {/* Level Legend */}
      <View style={styles.levelLegend}>
        <ThemedText style={[styles.levelLegendTitle, { color: palette.muted }]}>Skill Levels:</ThemedText>
        <View style={styles.levelLegendItems}>
          {[
            { label: 'Beginner', color: SKILL_COLORS.beginner },
            { label: 'Developing', color: SKILL_COLORS.developing },
            { label: 'Proficient', color: SKILL_COLORS.proficient },
            { label: 'Advanced', color: SKILL_COLORS.advanced },
            { label: 'Expert', color: SKILL_COLORS.expert },
          ].map((item) => (
            <View key={item.label} style={styles.levelLegendItem}>
              <View style={[styles.levelLegendDot, { backgroundColor: item.color }]} />
              <ThemedText style={[styles.levelLegendLabel, { color: palette.muted }]}>
                {item.label}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    gap: Spacing.xs,
  },
  title: { ...Typography.subheading },
  avgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avgText: { ...Typography.smallSemiBold },
  avgTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    padding: Spacing.micro,
  },
  toggleButton: {
    padding: Spacing.xs,
    borderRadius: Radii.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...Typography.subheading, marginTop: Spacing.xs },
  emptyText: { ...Typography.small, textAlign: 'center',
    maxWidth: 240,
    lineHeight: 19 },
  radarContainer: {
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: Radii.pill,
    borderStyle: 'dashed',
  },
  ringLabel: {
    position: 'absolute',
    left: '50%',
    marginLeft: -10,
  },
  ringLabelText: { ...Typography.micro },
  axisLine: {
    position: 'absolute',
    height: 1,
    transformOrigin: 'left center',
  },
  skillLabel: {
    position: 'absolute',
    width: 64,
    alignItems: 'center',
  },
  skillLabelBg: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  skillLabelText: { ...Typography.micro, textAlign: 'center' },
  polygon: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  dataPoint: {
    position: 'absolute',
    borderRadius: Radii.pill,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  comparisonPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
    borderWidth: 1,
  },
  centerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
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
    borderRadius: Radii.sm,
  },
  legendText: { ...Typography.caption },
  selectedDetail: {
    marginTop: Spacing.sm,
  },
  selectedCard: {
    padding: Spacing.sm,
    borderWidth: 2,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectedCategory: { ...Typography.caption, marginTop: Spacing.micro },
  selectedStats: {
    alignItems: 'flex-end',
    gap: Spacing.xxs,
  },
  selectedTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  selectedProgressBar: {
    gap: Spacing.xxs,
  },
  selectedProgressBg: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  selectedProgressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  selectedLevel: { ...Typography.caption, textAlign: 'right' },
  listView: {
    gap: Spacing.md,
  },
  categorySection: {
    gap: Spacing.xs,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  categorySectionTitle: { ...Typography.caption, letterSpacing: 0.5 },
  categoryLine: {
    flex: 1,
    height: 1,
  },
  skillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  skillRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  skillColorIndicator: {
    width: 4,
    height: 32,
    borderRadius: Radii.xs,
  },
  skillRowInfo: {
    gap: Spacing.micro,
  },
  skillRowName: { ...Typography.bodySmall },
  skillRowLevel: { ...Typography.caption },
  skillRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  skillRowValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  skillRowValueText: { ...Typography.subheading },
  skillRowMax: { ...Typography.caption },
  skillRowTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    minWidth: 58,
  },
  skillRowTrendText: { ...Typography.caption },
  levelLegend: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: Spacing.xs,
  },
  levelLegendTitle: { ...Typography.micro },
  levelLegendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  levelLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  levelLegendDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  levelLegendLabel: { ...Typography.micro },
});
