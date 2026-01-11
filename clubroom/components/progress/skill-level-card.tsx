import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SkillLevel } from '@/services/progress-service';

type SkillLevelCardProps = {
  skill: SkillLevel;
  showHistory?: boolean;
  compact?: boolean;
};

export function SkillLevelCard({ skill, showHistory = false, compact = false }: SkillLevelCardProps) {
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

  // Calculate change from previous
  const change = skill.previousLevel !== undefined
    ? skill.level - skill.previousLevel
    : 0;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <ThemedText style={styles.compactSkillName}>{skill.skill}</ThemedText>
          <View style={styles.compactRight}>
            <ThemedText type="defaultSemiBold" style={[styles.compactLevel, { color: skillColor }]}>
              {skill.level}
            </ThemedText>
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
      <View style={styles.header}>
        <View style={styles.skillInfo}>
          <ThemedText type="defaultSemiBold" style={styles.skillName}>
            {skill.skill}
          </ThemedText>
          <View style={[styles.trendBadge, { backgroundColor: `${trendInfo.color}15` }]}>
            <Ionicons name={trendInfo.name as any} size={12} color={trendInfo.color} />
            <ThemedText style={[styles.trendText, { color: trendInfo.color }]}>
              {getTrendLabel()}
            </ThemedText>
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
};

export function SkillLevelGrid({ skills, compact = false }: SkillLevelGridProps) {
  if (skills.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <View style={styles.compactGrid}>
        {skills.map((skill) => (
          <SkillLevelCard key={skill.skill} skill={skill} compact />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {skills.map((skill) => (
        <SkillLevelCard key={skill.skill} skill={skill} />
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
});
