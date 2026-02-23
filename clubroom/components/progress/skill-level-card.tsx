import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { SkillLevel } from '@/services/progress-service';
import { useTheme } from '@/hooks/useTheme';
import {
  getSkillLevelLabel,
  getSkillCategory,
  getSkillColor,
  formatLastUpdated,
} from './skill-level-helpers';

// ─── Types ──────────────────────────────────────────────────────────────────

type SkillLevelCardProps = {
  skill: SkillLevel;
  showHistory?: boolean;
  compact?: boolean;
  showUpdatedBy?: boolean;
};

// ─── Component ──────────────────────────────────────────────────────────────

export function SkillLevelCard({
  skill,
  showHistory = false,
  compact = false,
  showUpdatedBy = false,
}: SkillLevelCardProps) {
  const { colors: palette } = useTheme();

  const getTrendIcon = () => {
    switch (skill.trend) {
      case 'improving':
        return { name: 'trending-up', color: palette.success };
      case 'declining':
        return { name: 'arrow-forward', color: palette.warning };
      default:
        return { name: 'remove', color: palette.muted };
    }
  };

  const getTrendLabel = () => {
    switch (skill.trend) {
      case 'improving':
        return 'Improving';
      case 'declining':
        return 'Keep practising';
      default:
        return 'Steady';
    }
  };

  const trendInfo = getTrendIcon();
  const skillColor = getSkillColor(skill.level, palette);
  const progressPercent = (skill.level / 10) * 100;
  const levelInfo = getSkillLevelLabel(skill.level);
  const category = getSkillCategory(skill.skill);
  const change = skill.previousLevel !== undefined ? skill.level - skill.previousLevel : 0;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Row justify="space-between" align="center">
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.compactSkillName}>{skill.skill}</ThemedText>
            <ThemedText style={[styles.compactLevelLabel, { color: skillColor }]}>
              {levelInfo.label}
            </ThemedText>
          </View>
          <Row align="center" gap="xxs">
            <ThemedText type="defaultSemiBold" style={[styles.compactLevel, { color: skillColor }]}>
              {skill.level}
            </ThemedText>
            <ThemedText style={[styles.compactLevelMax, { color: palette.muted }]}>/10</ThemedText>
            <Ionicons
              name={trendInfo.name as keyof typeof Ionicons.glyphMap}
              size={14}
              color={trendInfo.color}
            />
          </Row>
        </Row>
        <View style={[styles.compactBar, { backgroundColor: withAlpha(skillColor, 0.12) }]}>
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
      <View style={[styles.categoryBadge, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
        <ThemedText style={[styles.categoryText, { color: palette.tint }]}>{category}</ThemedText>
      </View>

      <Row align="flex-start" justify="space-between">
        <View style={styles.skillInfo}>
          <ThemedText type="defaultSemiBold" style={styles.skillName}>
            {skill.skill}
          </ThemedText>
          <Row align="center" gap="xs" wrap>
            <View
              style={[styles.levelLabelBadge, { backgroundColor: withAlpha(skillColor, 0.09) }]}
            >
              <ThemedText style={[styles.levelLabelText, { color: skillColor }]}>
                {levelInfo.label}
              </ThemedText>
            </View>
            <Row
              align="center"
              gap="xxs"
              style={[styles.trendBadge, { backgroundColor: withAlpha(trendInfo.color, 0.09) }]}
            >
              <Ionicons
                name={trendInfo.name as keyof typeof Ionicons.glyphMap}
                size={12}
                color={trendInfo.color}
              />
              <ThemedText style={[styles.trendText, { color: trendInfo.color }]}>
                {getTrendLabel()}
              </ThemedText>
            </Row>
          </Row>
        </View>
        <Row align="baseline">
          <ThemedText type="heading" style={[styles.level, { color: skillColor }]}>
            {skill.level}
          </ThemedText>
          <ThemedText style={[styles.levelMax, { color: palette.muted }]}>/10</ThemedText>
        </Row>
      </Row>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: withAlpha(skillColor, 0.12) }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progressPercent}%`, backgroundColor: skillColor },
          ]}
        />
      </View>

      {/* Change indicator */}
      {change !== 0 && (
        <Row align="center" gap="xxs">
          <Ionicons
            name={change > 0 ? 'arrow-up' : 'arrow-forward'}
            size={12}
            color={change > 0 ? palette.success : palette.warning}
          />
          <ThemedText
            style={[styles.changeText, { color: change > 0 ? palette.success : palette.warning }]}
          >
            {change > 0 ? `+${change} from last assessment` : 'Keep practising this one'}
          </ThemedText>
        </Row>
      )}

      {/* Last updated info */}
      {showUpdatedBy && skill.lastUpdated && (
        <Row
          align="center"
          gap="xxs"
          style={[styles.updatedRow, { borderTopColor: palette.border }]}
        >
          <Ionicons name="time-outline" size={12} color={palette.muted} />
          <ThemedText style={[styles.updatedText, { color: palette.muted }]}>
            Updated {formatLastUpdated(skill.lastUpdated)}
          </ThemedText>
        </Row>
      )}

      {/* History */}
      {showHistory && skill.history.length > 1 && (
        <View style={styles.historySection}>
          <ThemedText style={[styles.historyLabel, { color: palette.muted }]}>
            Recent history
          </ThemedText>
          <Row align="flex-end" gap="xxs" style={styles.historyDots}>
            {skill.history.slice(-5).map((entry, index) => (
              <View
                key={index}
                style={[
                  styles.historyDot,
                  {
                    backgroundColor: getSkillColor(entry.level, palette),
                    height: 4 + entry.level * 2,
                  },
                ]}
              />
            ))}
          </Row>
        </View>
      )}
    </SurfaceCard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.sm },
  header: {
    /* layout moved to Row */
  },
  skillInfo: { flex: 1, gap: Spacing.xs },
  skillName: { ...Typography.subheading },
  trendBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  trendText: { ...Typography.caption },
  levelContainer: {
    /* layout moved to Row */
  },
  level: { ...Typography.display, fontVariant: ['tabular-nums'] },
  levelMax: { ...Typography.bodySmallSemiBold },
  progressBar: { height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.xs },
  changeRow: {
    /* layout moved to Row */
  },
  changeText: { ...Typography.caption },
  historySection: { gap: Spacing.xs, paddingTop: Spacing.xs },
  historyLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  historyDots: { height: 24 },
  historyDot: { width: 8, borderRadius: Radii.xs },
  compactContainer: { gap: Spacing.xxs, paddingVertical: Spacing.xs },
  compactHeader: {
    /* layout moved to Row */
  },
  compactSkillName: { ...Typography.smallSemiBold },
  compactRight: {
    /* layout moved to Row */
  },
  compactLevel: { ...Typography.bodySmall, fontVariant: ['tabular-nums'] },
  compactBar: { height: 4, borderRadius: Radii.xs, overflow: 'hidden' },
  compactBarFill: { height: '100%', borderRadius: Radii.xs },
  compactLevelLabel: { ...Typography.micro, textTransform: 'uppercase', letterSpacing: 0.3 },
  compactLevelMax: { ...Typography.caption },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    marginBottom: Spacing.xs,
  },
  categoryText: { ...Typography.micro, textTransform: 'uppercase', letterSpacing: 0.5 },
  labelsRow: {
    /* layout moved to Row */
  },
  levelLabelBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  levelLabelText: { ...Typography.caption },
  updatedRow: { paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: 'transparent' },
  updatedText: { ...Typography.caption },
});
