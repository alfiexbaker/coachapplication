import { View, StyleSheet, Pressable } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SkillProgress } from '@/constants/types';

// Color constants for skill levels
const SKILL_LEVEL_COLORS = {
  beginner: '#F59E0B',    // Amber
  developing: '#3B82F6',  // Blue
  proficient: '#10B981',  // Emerald
  advanced: '#8B5CF6',    // Violet
  expert: '#EC4899',      // Pink
};

const getSkillLevelInfo = (level: number) => {
  if (level < 20) return { label: 'Beginner', color: SKILL_LEVEL_COLORS.beginner };
  if (level < 40) return { label: 'Developing', color: SKILL_LEVEL_COLORS.developing };
  if (level < 60) return { label: 'Proficient', color: SKILL_LEVEL_COLORS.proficient };
  if (level < 80) return { label: 'Advanced', color: SKILL_LEVEL_COLORS.advanced };
  return { label: 'Expert', color: SKILL_LEVEL_COLORS.expert };
};

interface SkillProgressBarProps {
  skill: SkillProgress;
  showHistory?: boolean;
  compact?: boolean;
  delay?: number;
}

export function SkillProgressBar({
  skill,
  showHistory = false,
  compact = false,
  delay = 0,
}: SkillProgressBarProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [expanded, setExpanded] = useState(false);

  const levelInfo = getSkillLevelInfo(skill.currentLevel);
  const previousLevelInfo = getSkillLevelInfo(skill.previousLevel);

  const trendColor = skill.changePercent > 0
    ? palette.success
    : skill.changePercent < 0
    ? palette.error
    : palette.muted;

  const trendIcon = skill.changePercent > 0
    ? 'trending-up'
    : skill.changePercent < 0
    ? 'trending-down'
    : 'remove';

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Pressable onPress={() => setExpanded(!expanded)}>
        <View style={[styles.container, compact && styles.containerCompact]}>
          {/* Main Row */}
          <View style={styles.mainRow}>
            {/* Skill Info */}
            <View style={styles.skillInfo}>
              <View style={styles.skillNameRow}>
                <ThemedText
                  type={compact ? 'default' : 'defaultSemiBold'}
                  style={[styles.skillName, compact && styles.skillNameCompact]}
                >
                  {skill.skillName}
                </ThemedText>
                {!compact && (
                  <View style={[styles.categoryBadge, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
                    <ThemedText style={[styles.categoryText, { color: palette.tint }]}>
                      {skill.category}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Level Label */}
              <View style={styles.levelRow}>
                <View style={[styles.levelDot, { backgroundColor: levelInfo.color }]} />
                <ThemedText style={[styles.levelLabel, { color: palette.muted }]}>
                  {levelInfo.label}
                </ThemedText>
              </View>
            </View>

            {/* Value and Trend */}
            <View style={styles.valueSection}>
              <View style={styles.valueRow}>
                <ThemedText type="defaultSemiBold" style={styles.valueText}>
                  {skill.currentLevel}
                </ThemedText>
                <ThemedText style={[styles.maxValue, { color: palette.muted }]}>/100</ThemedText>
              </View>

              {/* Trend Indicator */}
              <View style={[styles.trendBadge, { backgroundColor: withAlpha(trendColor, 0.09) }]}>
                <Ionicons name={trendIcon} size={12} color={trendColor} />
                <ThemedText style={[styles.trendText, { color: trendColor }]}>
                  {skill.changePercent > 0 ? '+' : ''}{skill.changePercent.toFixed(1)}%
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: palette.border }]}>
              {/* Previous level indicator (ghost bar) */}
              {skill.previousLevel !== skill.currentLevel && (
                <View
                  style={[
                    styles.progressBarPrevious,
                    {
                      width: `${skill.previousLevel}%`,
                      backgroundColor: withAlpha(previousLevelInfo.color, 0.19),
                    }
                  ]}
                />
              )}

              {/* Current level */}
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${skill.currentLevel}%`,
                    backgroundColor: levelInfo.color,
                  }
                ]}
              />

              {/* Level markers */}
              {!compact && (
                <>
                  <View style={[styles.levelMarker, { left: '25%', backgroundColor: palette.background }]} />
                  <View style={[styles.levelMarker, { left: '50%', backgroundColor: palette.background }]} />
                  <View style={[styles.levelMarker, { left: '75%', backgroundColor: palette.background }]} />
                </>
              )}
            </View>

            {/* Scale labels */}
            {!compact && (
              <View style={styles.scaleLabels}>
                <ThemedText style={[styles.scaleLabel, { color: palette.muted }]}>0</ThemedText>
                <ThemedText style={[styles.scaleLabel, { color: palette.muted }]}>25</ThemedText>
                <ThemedText style={[styles.scaleLabel, { color: palette.muted }]}>50</ThemedText>
                <ThemedText style={[styles.scaleLabel, { color: palette.muted }]}>75</ThemedText>
                <ThemedText style={[styles.scaleLabel, { color: palette.muted }]}>100</ThemedText>
              </View>
            )}
          </View>

          {/* Expanded History */}
          {expanded && showHistory && skill.history.length > 0 && (
            <Animated.View entering={FadeIn} style={styles.historySection}>
              <View style={[styles.historyDivider, { backgroundColor: palette.border }]} />
              <ThemedText style={[styles.historyTitle, { color: palette.muted }]}>
                Recent Progress
              </ThemedText>
              <View style={styles.historyChart}>
                {skill.history.slice(-7).map((entry, index) => {
                  const barHeight = (entry.level / 100) * 40;
                  const entryLevelInfo = getSkillLevelInfo(entry.level);
                  return (
                    <View key={entry.date} style={styles.historyBarContainer}>
                      <View
                        style={[
                          styles.historyBar,
                          {
                            height: barHeight,
                            backgroundColor: entryLevelInfo.color,
                          }
                        ]}
                      />
                      <ThemedText style={[styles.historyDate, { color: palette.muted }]}>
                        {new Date(entry.date).getDate()}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Expand indicator */}
          {showHistory && skill.history.length > 0 && (
            <View style={styles.expandIndicator}>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={palette.muted}
              />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Grouped skills by category with expandable sections
interface SkillCategoryGroupProps {
  category: string;
  skills: SkillProgress[];
  initialExpanded?: boolean;
}

export function SkillCategoryGroup({
  category,
  skills,
  initialExpanded = true,
}: SkillCategoryGroupProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [expanded, setExpanded] = useState(initialExpanded);

  // Calculate category average
  const avgLevel = skills.reduce((sum, s) => sum + s.currentLevel, 0) / skills.length;
  const avgChangeValue = skills.reduce((sum, s) => sum + s.changePercent, 0) / skills.length;
  const levelInfo = getSkillLevelInfo(avgLevel);

  const trendColor = avgChangeValue > 0
    ? palette.success
    : avgChangeValue < 0
    ? palette.error
    : palette.muted;

  return (
    <SurfaceCard style={styles.categoryCard}>
      <Pressable onPress={() => setExpanded(!expanded)}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryLeft}>
            <View style={[styles.categoryIcon, { backgroundColor: withAlpha(levelInfo.color, 0.09) }]}>
              <Ionicons
                name={getCategoryIcon(category)}
                size={20}
                color={levelInfo.color}
              />
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.categoryName}>
                {category}
              </ThemedText>
              <ThemedText style={[styles.skillCount, { color: palette.muted }]}>
                {skills.length} skill{skills.length !== 1 ? 's' : ''}
              </ThemedText>
            </View>
          </View>

          <View style={styles.categoryRight}>
            <View style={styles.categoryStats}>
              <ThemedText type="defaultSemiBold">{Math.round(avgLevel)}</ThemedText>
              <ThemedText style={[styles.avgLabel, { color: palette.muted }]}>avg</ThemedText>
            </View>
            <View style={[styles.trendBadgeSmall, { backgroundColor: withAlpha(trendColor, 0.09) }]}>
              <Ionicons
                name={avgChangeValue > 0 ? 'arrow-up' : avgChangeValue < 0 ? 'arrow-down' : 'remove'}
                size={10}
                color={trendColor}
              />
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={palette.icon}
            />
          </View>
        </View>
      </Pressable>

      {expanded && (
        <Animated.View entering={FadeIn} style={styles.categorySkills}>
          {skills.map((skill, index) => (
            <SkillProgressBar
              key={skill.skillName}
              skill={skill}
              compact
              delay={index * 50}
            />
          ))}
        </Animated.View>
      )}
    </SurfaceCard>
  );
}

// Helper to get category icon
function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    'Technical': 'football',
    'Physical': 'fitness',
    'Tactical': 'bulb',
    'Mental': 'bulb',
    'Dribbling': 'football',
    'Passing': 'arrow-forward-circle',
    'Defending': 'shield',
    'Finishing': 'flag',
    'Goalkeeping': 'hand-left',
    'Conditioning': 'barbell',
  };
  return icons[category] || 'stats-chart';
}

// Summary stats for all skills
interface SkillsSummaryProps {
  skills: SkillProgress[];
}

export function SkillsSummary({ skills }: SkillsSummaryProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  if (skills.length === 0) {
    return (
      <SurfaceCard style={styles.summaryEmpty}>
        <Ionicons name="analytics-outline" size={40} color={palette.muted} />
        <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.sm }}>
          No Skills Tracked Yet
        </ThemedText>
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          Skills will appear here after your first training sessions
        </ThemedText>
      </SurfaceCard>
    );
  }

  const avgLevel = skills.reduce((sum, s) => sum + s.currentLevel, 0) / skills.length;
  const improvingCount = skills.filter(s => s.changePercent > 0).length;
  const decliningCount = skills.filter(s => s.changePercent < 0).length;
  const steadyCount = skills.filter(s => s.changePercent === 0).length;

  const topSkill = skills.reduce((best, s) => s.currentLevel > best.currentLevel ? s : best, skills[0]);
  const mostImproved = skills.reduce((best, s) => s.changePercent > best.changePercent ? s : best, skills[0]);

  return (
    <SurfaceCard style={styles.summaryCard}>
      <ThemedText type="defaultSemiBold" style={styles.summaryTitle}>
        Skills Overview
      </ThemedText>

      {/* Overall Stats */}
      <View style={styles.summaryStats}>
        <View style={styles.summaryStat}>
          <View style={[styles.summaryStatIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText type="heading" style={[styles.summaryStatValue, { color: palette.tint }]}>
              {Math.round(avgLevel)}
            </ThemedText>
          </View>
          <ThemedText style={[styles.summaryStatLabel, { color: palette.muted }]}>
            Avg Level
          </ThemedText>
        </View>

        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />

        <View style={styles.trendStats}>
          <View style={styles.trendStatRow}>
            <Ionicons name="trending-up" size={14} color={palette.success} />
            <ThemedText style={[styles.trendStatValue, { color: palette.success }]}>
              {improvingCount}
            </ThemedText>
            <ThemedText style={[styles.trendStatLabel, { color: palette.muted }]}>improving</ThemedText>
          </View>
          <View style={styles.trendStatRow}>
            <Ionicons name="remove" size={14} color={palette.muted} />
            <ThemedText style={[styles.trendStatValue, { color: palette.muted }]}>
              {steadyCount}
            </ThemedText>
            <ThemedText style={[styles.trendStatLabel, { color: palette.muted }]}>steady</ThemedText>
          </View>
          <View style={styles.trendStatRow}>
            <Ionicons name="trending-down" size={14} color={palette.error} />
            <ThemedText style={[styles.trendStatValue, { color: palette.error }]}>
              {decliningCount}
            </ThemedText>
            <ThemedText style={[styles.trendStatLabel, { color: palette.muted }]}>need focus</ThemedText>
          </View>
        </View>
      </View>

      {/* Highlights */}
      <View style={styles.highlights}>
        <View style={[styles.highlightCard, { backgroundColor: withAlpha(palette.success, 0.03) }]}>
          <Ionicons name="trophy" size={16} color={palette.success} />
          <View style={styles.highlightContent}>
            <ThemedText style={[styles.highlightLabel, { color: palette.muted }]}>Top Skill</ThemedText>
            <ThemedText type="defaultSemiBold">{topSkill.skillName}</ThemedText>
            <ThemedText style={[styles.highlightValue, { color: palette.success }]}>
              Level {topSkill.currentLevel}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.highlightCard, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
          <Ionicons name="rocket" size={16} color={palette.tint} />
          <View style={styles.highlightContent}>
            <ThemedText style={[styles.highlightLabel, { color: palette.muted }]}>Most Improved</ThemedText>
            <ThemedText type="defaultSemiBold">{mostImproved.skillName}</ThemedText>
            <ThemedText style={[styles.highlightValue, { color: palette.tint }]}>
              +{mostImproved.changePercent.toFixed(1)}%
            </ThemedText>
          </View>
        </View>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  containerCompact: {
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  skillInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  skillNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  skillName: { ...Typography.body },
  skillNameCompact: { ...Typography.bodySmall },
  categoryBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  categoryText: { ...Typography.micro },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
  },
  levelLabel: { ...Typography.caption },
  valueSection: {
    alignItems: 'flex-end',
    gap: Spacing.xxs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  valueText: { ...Typography.heading, letterSpacing: -0.5 },
  maxValue: { ...Typography.caption },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  trendText: { ...Typography.caption },
  progressBarContainer: {
    gap: Spacing.xxs,
  },
  progressBarBg: {
    height: 8,
    borderRadius: Radii.xs,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: Radii.xs,
  },
  progressBarPrevious: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: Radii.xs,
  },
  levelMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    opacity: 0.5,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: { ...Typography.micro },
  historySection: {
    marginTop: Spacing.sm,
  },
  historyDivider: {
    height: 1,
    marginBottom: Spacing.sm,
  },
  historyTitle: { ...Typography.caption, marginBottom: Spacing.xs },
  historyChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 60,
  },
  historyBarContainer: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  historyBar: {
    width: 20,
    borderRadius: Radii.xs,
    minHeight: 4,
  },
  historyDate: { ...Typography.micro },
  expandIndicator: {
    alignItems: 'center',
    marginTop: -4,
  },

  // Category group styles
  categoryCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: { ...Typography.subheading },
  skillCount: { ...Typography.caption },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryStats: {
    alignItems: 'center',
  },
  avgLabel: { ...Typography.micro },
  trendBadgeSmall: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categorySkills: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    marginTop: Spacing.xs,
  },

  // Summary styles
  summaryCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  summaryEmpty: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.small, textAlign: 'center',
    maxWidth: 240 },
  summaryTitle: { ...Typography.subheading },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryStat: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryStatIcon: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStatValue: { ...Typography.title },
  summaryStatLabel: { ...Typography.caption },
  summaryDivider: {
    width: 1,
    height: 50,
  },
  trendStats: {
    flex: 1,
    gap: Spacing.xs,
  },
  trendStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  trendStatValue: { ...Typography.bodySmallSemiBold },
  trendStatLabel: { ...Typography.caption },
  highlights: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  highlightCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  highlightContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  highlightLabel: { ...Typography.micro },
  highlightValue: { ...Typography.caption },
});
