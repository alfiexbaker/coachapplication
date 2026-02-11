/**
 * SkillProgressBar — Individual skill progress bar with expandable history.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { SkillProgress } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { getSkillLevelInfo } from './skill-progress-helpers';
import { Row } from '@/components/primitives';

interface SkillProgressBarProps {
  skill: SkillProgress;
  showHistory?: boolean;
  compact?: boolean;
  delay?: number;
}

export function SkillProgressBar({ skill, showHistory = false, compact = false, delay = 0 }: SkillProgressBarProps) {
  const { colors: palette } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const levelInfo = getSkillLevelInfo(skill.currentLevel);
  const previousLevelInfo = getSkillLevelInfo(skill.previousLevel);
  const trendColor = skill.changePercent > 0 ? palette.success : skill.changePercent < 0 ? palette.error : palette.muted;
  const trendIcon = skill.changePercent > 0 ? 'trending-up' : skill.changePercent < 0 ? 'trending-down' : 'remove';

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Clickable
        onPress={() => setExpanded(!expanded)}
        accessibilityLabel={`Toggle ${skill.skillName} progress details`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={[styles.container, compact && styles.containerCompact]}>
          {/* Main Row */}
          <Row style={styles.mainRow}>
            <View style={styles.skillInfo}>
              <Row style={styles.skillNameRow}>
                <ThemedText type={compact ? 'default' : 'defaultSemiBold'} style={[styles.skillName, compact && styles.skillNameCompact]}>
                  {skill.skillName}
                </ThemedText>
                {!compact && (
                  <View style={[styles.categoryBadge, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
                    <ThemedText style={[styles.categoryText, { color: palette.tint }]}>{skill.category}</ThemedText>
                  </View>
                )}
              </Row>
              <Row style={styles.levelRow}>
                <View style={[styles.levelDot, { backgroundColor: levelInfo.color }]} />
                <ThemedText style={[styles.levelLabel, { color: palette.muted }]}>{levelInfo.label}</ThemedText>
              </Row>
            </View>
            <View style={styles.valueSection}>
              <Row style={styles.valueRow}>
                <ThemedText type="defaultSemiBold" style={styles.valueText}>{skill.currentLevel}</ThemedText>
                <ThemedText style={[styles.maxValue, { color: palette.muted }]}>/100</ThemedText>
              </Row>
              <Row style={[styles.trendBadge, { backgroundColor: withAlpha(trendColor, 0.09) }]}>
                <Ionicons name={trendIcon} size={12} color={trendColor} />
                <ThemedText style={[styles.trendText, { color: trendColor }]}>
                  {skill.changePercent > 0 ? '+' : ''}{skill.changePercent.toFixed(1)}%
                </ThemedText>
              </Row>
            </View>
          </Row>

          {/* Progress Bar */}
          <View style={styles.barContainer}>
            <View style={[styles.barBg, { backgroundColor: palette.border }]}>
              {skill.previousLevel !== skill.currentLevel && (
                <View style={[styles.barPrevious, { width: `${skill.previousLevel}%`, backgroundColor: withAlpha(previousLevelInfo.color, 0.19) }]} />
              )}
              <View style={[styles.barFill, { width: `${skill.currentLevel}%`, backgroundColor: levelInfo.color }]} />
              {!compact && (
                <>
                  <View style={[styles.levelMarker, { left: '25%', backgroundColor: palette.background }]} />
                  <View style={[styles.levelMarker, { left: '50%', backgroundColor: palette.background }]} />
                  <View style={[styles.levelMarker, { left: '75%', backgroundColor: palette.background }]} />
                </>
              )}
            </View>
            {!compact && (
              <Row style={styles.scaleLabels}>
                <ThemedText style={[styles.scaleLabel, { color: palette.muted }]}>0</ThemedText>
                <ThemedText style={[styles.scaleLabel, { color: palette.muted }]}>25</ThemedText>
                <ThemedText style={[styles.scaleLabel, { color: palette.muted }]}>50</ThemedText>
                <ThemedText style={[styles.scaleLabel, { color: palette.muted }]}>75</ThemedText>
                <ThemedText style={[styles.scaleLabel, { color: palette.muted }]}>100</ThemedText>
              </Row>
            )}
          </View>

          {/* Expanded History */}
          {expanded && showHistory && skill.history.length > 0 && (
            <Animated.View entering={FadeIn} style={styles.historySection}>
              <View style={[styles.historyDivider, { backgroundColor: palette.border }]} />
              <ThemedText style={[styles.historyTitle, { color: palette.muted }]}>Recent Progress</ThemedText>
              <Row style={styles.historyChart}>
                {skill.history.slice(-7).map((entry) => {
                  const barHeight = (entry.level / 100) * 40;
                  const entryLevelInfo = getSkillLevelInfo(entry.level);
                  return (
                    <View key={entry.date} style={styles.historyBarContainer}>
                      <View style={[styles.historyBar, { height: barHeight, backgroundColor: entryLevelInfo.color }]} />
                      <ThemedText style={[styles.historyDate, { color: palette.muted }]}>{new Date(entry.date).getDate()}</ThemedText>
                    </View>
                  );
                })}
              </Row>
            </Animated.View>
          )}

          {/* Expand indicator */}
          {showHistory && skill.history.length > 0 && (
            <View style={styles.expandIndicator}>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={palette.muted} />
            </View>
          )}
        </View>
      </Clickable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm, paddingVertical: Spacing.sm },
  containerCompact: { paddingVertical: Spacing.xs, gap: Spacing.xs },
  mainRow: { justifyContent: 'space-between', alignItems: 'flex-start' },
  skillInfo: { flex: 1, gap: Spacing.xxs },
  skillNameRow: { alignItems: 'center', gap: Spacing.xs },
  skillName: { ...Typography.body },
  skillNameCompact: { ...Typography.bodySmall },
  categoryBadge: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  categoryText: { ...Typography.micro },
  levelRow: { alignItems: 'center', gap: Spacing.xxs },
  levelDot: { width: 6, height: 6, borderRadius: Radii.xs },
  levelLabel: { ...Typography.caption },
  valueSection: { alignItems: 'flex-end', gap: Spacing.xxs },
  valueRow: { alignItems: 'baseline' },
  valueText: { ...Typography.heading, letterSpacing: -0.5 },
  maxValue: { ...Typography.caption },
  trendBadge: { alignItems: 'center', gap: Spacing.micro, paddingHorizontal: Spacing.xxs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  trendText: { ...Typography.caption },
  barContainer: { gap: Spacing.xxs },
  barBg: { height: 8, borderRadius: Radii.xs, overflow: 'hidden', position: 'relative' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: Radii.xs },
  barPrevious: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: Radii.xs },
  levelMarker: { position: 'absolute', top: 0, bottom: 0, width: 2, opacity: 0.5 },
  scaleLabels: { justifyContent: 'space-between' },
  scaleLabel: { ...Typography.micro },
  historySection: { marginTop: Spacing.sm },
  historyDivider: { height: 1, marginBottom: Spacing.sm },
  historyTitle: { ...Typography.caption, marginBottom: Spacing.xs },
  historyChart: { justifyContent: 'space-around', alignItems: 'flex-end', height: 60 },
  historyBarContainer: { alignItems: 'center', gap: Spacing.xxs },
  historyBar: { width: 20, borderRadius: Radii.xs, minHeight: 4 },
  historyDate: { ...Typography.micro },
  expandIndicator: { alignItems: 'center', marginTop: -4 },
});
