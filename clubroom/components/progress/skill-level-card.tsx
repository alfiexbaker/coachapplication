import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SkillLevel } from '@/services/progress-service';

// Skill level labels based on 1-10 scale
const getSkillLevelLabel = (level: number): { label: string; description: string } => {
  if (level >= 9) return { label: 'Expert', description: 'Exceptional mastery' };
  if (level >= 7) return { label: 'Advanced', description: 'Strong proficiency' };
  if (level >= 5) return { label: 'Proficient', description: 'Solid foundation' };
  if (level >= 3) return { label: 'Developing', description: 'Making progress' };
  return { label: 'Beginner', description: 'Just starting' };
};

// Skill categories for grouping
export const SKILL_CATEGORIES: Record<string, string[]> = {
  Technical: ['Dribbling', 'Passing', 'Shooting', 'First Touch', 'Ball Control', 'Heading', 'Handling', 'Distribution'],
  Physical: ['Speed', 'Strength', 'Endurance', 'Agility', 'Balance', 'Jumping'],
  Mental: ['Decision Making', 'Concentration', 'Composure', 'Leadership', 'Communication'],
  Tactical: ['Positioning', 'Game Reading', 'Off the Ball', 'Defensive Awareness', 'Attacking Movement'],
};

const getSkillCategory = (skillName: string): string => {
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    if (skills.some(s => s.toLowerCase() === skillName.toLowerCase())) {
      return category;
    }
  }
  return 'Other';
};

type SkillLevelCardProps = {
  skill: SkillLevel;
  showHistory?: boolean;
  compact?: boolean;
  showUpdatedBy?: boolean;
};

export function SkillLevelCard({ skill, showHistory = false, compact = false, showUpdatedBy = false }: SkillLevelCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const getTrendIcon = () => {
    switch (skill.trend) {
      case 'improving':
        return { name: 'trending-up', color: palette.success };
      case 'declining':
        return { name: 'trending-down', color: palette.error };
      default:
        return { name: 'remove', color: palette.muted };
    }
  };

  const getTrendLabel = () => {
    switch (skill.trend) {
      case 'improving':
        return 'Improving';
      case 'declining':
        return 'Needs Focus';
      default:
        return 'Steady';
    }
  };

  const getSkillColor = (level: number) => {
    if (level >= 8) return palette.success;
    if (level >= 5) return palette.tint;
    if (level >= 3) return palette.warning;
    return palette.error;
  };

  const trendInfo = getTrendIcon();
  const skillColor = getSkillColor(skill.level);
  const progressPercent = (skill.level / 10) * 100;
  const levelInfo = getSkillLevelLabel(skill.level);
  const category = getSkillCategory(skill.skill);

  // Calculate change from previous
  const change = skill.previousLevel !== undefined
    ? skill.level - skill.previousLevel
    : 0;

  // Format last updated date
  const formatLastUpdated = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.compactSkillName}>{skill.skill}</ThemedText>
            <ThemedText style={[styles.compactLevelLabel, { color: skillColor }]}>
              {levelInfo.label}
            </ThemedText>
          </View>
          <View style={styles.compactRight}>
            <ThemedText type="defaultSemiBold" style={[styles.compactLevel, { color: skillColor }]}>
              {skill.level}
            </ThemedText>
            <ThemedText style={[styles.compactLevelMax, { color: palette.muted }]}>/10</ThemedText>
            <Ionicons name={trendInfo.name as any} size={14} color={trendInfo.color} />
          </View>
        </View>
        <View style={[styles.compactBar, { backgroundColor: `${skillColor}20` }]}>
          <View
            style={[
              styles.compactBarFill,
              { width: `${progressPercent}%`, backgroundColor: skillColor },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <SurfaceCard style={styles.card}>
      {/* Category badge */}
      <View style={[styles.categoryBadge, { backgroundColor: `${palette.tint}10` }]}>
        <ThemedText style={[styles.categoryText, { color: palette.tint }]}>
          {category}
        </ThemedText>
      </View>

      <View style={styles.header}>
        <View style={styles.skillInfo}>
          <ThemedText type="defaultSemiBold" style={styles.skillName}>
            {skill.skill}
          </ThemedText>
          <View style={styles.labelsRow}>
            {/* Skill level label */}
            <View style={[styles.levelLabelBadge, { backgroundColor: `${skillColor}15` }]}>
              <ThemedText style={[styles.levelLabelText, { color: skillColor }]}>
                {levelInfo.label}
              </ThemedText>
            </View>
            {/* Trend badge */}
            <View style={[styles.trendBadge, { backgroundColor: `${trendInfo.color}15` }]}>
              <Ionicons name={trendInfo.name as any} size={12} color={trendInfo.color} />
              <ThemedText style={[styles.trendText, { color: trendInfo.color }]}>
                {getTrendLabel()}
              </ThemedText>
            </View>
          </View>
        </View>
        <View style={styles.levelContainer}>
          <ThemedText type="heading" style={[styles.level, { color: skillColor }]}>
            {skill.level}
          </ThemedText>
          <ThemedText style={[styles.levelMax, { color: palette.muted }]}>/10</ThemedText>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: `${skillColor}20` }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progressPercent}%`, backgroundColor: skillColor },
          ]}
        />
      </View>

      {/* Change indicator */}
      {change !== 0 && (
        <View style={styles.changeRow}>
          <Ionicons
            name={change > 0 ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={change > 0 ? palette.success : palette.error}
          />
          <ThemedText
            style={[
              styles.changeText,
              { color: change > 0 ? palette.success : palette.error },
            ]}
          >
            {change > 0 ? '+' : ''}{change} from last assessment
          </ThemedText>
        </View>
      )}

      {/* Last updated info */}
      {showUpdatedBy && skill.lastUpdated && (
        <View style={styles.updatedRow}>
          <Ionicons name="time-outline" size={12} color={palette.muted} />
          <ThemedText style={[styles.updatedText, { color: palette.muted }]}>
            Updated {formatLastUpdated(skill.lastUpdated)}
          </ThemedText>
        </View>
      )}

      {/* History */}
      {showHistory && skill.history.length > 1 && (
        <View style={styles.historySection}>
          <ThemedText style={[styles.historyLabel, { color: palette.muted }]}>
            Recent history
          </ThemedText>
          <View style={styles.historyDots}>
            {skill.history.slice(-5).map((entry, index) => (
              <View
                key={index}
                style={[
                  styles.historyDot,
                  {
                    backgroundColor: getSkillColor(entry.level),
                    height: 4 + entry.level * 2,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      )}
    </SurfaceCard>
  );
}

type SkillLevelGridProps = {
  skills: SkillLevel[];
  compact?: boolean;
  groupByCategory?: boolean;
  showUpdatedBy?: boolean;
};

export function SkillLevelGrid({ skills, compact = false, groupByCategory = false, showUpdatedBy = false }: SkillLevelGridProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  if (skills.length === 0) {
    return null;
  }

  // Group skills by category
  if (groupByCategory) {
    const grouped: Record<string, SkillLevel[]> = {};

    skills.forEach(skill => {
      const category = getSkillCategory(skill.skill);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(skill);
    });

    const categoryOrder = ['Technical', 'Physical', 'Mental', 'Tactical', 'Other'];
    const sortedCategories = Object.keys(grouped).sort(
      (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
    );

    return (
      <View style={styles.groupedContainer}>
        {sortedCategories.map(category => (
          <View key={category} style={styles.categoryGroup}>
            <View style={styles.categoryHeader}>
              <ThemedText type="defaultSemiBold" style={styles.categoryTitle}>
                {category}
              </ThemedText>
              <View style={[styles.categoryCount, { backgroundColor: `${palette.tint}15` }]}>
                <ThemedText style={[styles.categoryCountText, { color: palette.tint }]}>
                  {grouped[category].length}
                </ThemedText>
              </View>
            </View>
            <View style={compact ? styles.compactGrid : styles.grid}>
              {grouped[category].map((skill) => (
                <SkillLevelCard
                  key={skill.skill}
                  skill={skill}
                  compact={compact}
                  showUpdatedBy={showUpdatedBy}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (compact) {
    return (
      <View style={styles.compactGrid}>
        {skills.map((skill) => (
          <SkillLevelCard key={skill.skill} skill={skill} compact showUpdatedBy={showUpdatedBy} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {skills.map((skill) => (
        <SkillLevelCard key={skill.skill} skill={skill} showUpdatedBy={showUpdatedBy} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  skillInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  skillName: {
    fontSize: 16,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  level: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  levelMax: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  historySection: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  historyLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyDots: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 24,
  },
  historyDot: {
    width: 8,
    borderRadius: 4,
  },
  grid: {
    gap: Spacing.sm,
  },
  // Compact styles
  compactContainer: {
    gap: 6,
    paddingVertical: Spacing.xs,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactSkillName: {
    fontSize: 13,
    fontWeight: '500',
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactLevel: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  compactBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  compactBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  compactGrid: {
    gap: Spacing.sm,
  },
  compactLevelLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  compactLevelMax: {
    fontSize: 11,
  },
  // Category and level label styles
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    marginBottom: Spacing.xs,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  levelLabelBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  levelLabelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  updatedText: {
    fontSize: 11,
  },
  // Grouped view styles
  groupedContainer: {
    gap: Spacing.lg,
  },
  categoryGroup: {
    gap: Spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryTitle: {
    fontSize: 15,
  },
  categoryCount: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    minWidth: 20,
    alignItems: 'center',
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
