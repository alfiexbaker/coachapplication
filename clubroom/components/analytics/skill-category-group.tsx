/**
 * SkillCategoryGroup — Expandable category with skill bars.
 */
import { memo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { SkillProgress } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { getSkillLevelInfo, getCategoryIcon } from './skill-progress-helpers';
import { SkillProgressBar } from './skill-progress-item';
import { Row } from '@/components/primitives';

interface SkillCategoryGroupProps {
  category: string;
  skills: SkillProgress[];
  initialExpanded?: boolean;
}

function SkillCategoryGroupInner({
  category,
  skills,
  initialExpanded = true,
}: SkillCategoryGroupProps) {
  const { colors: palette } = useTheme();
  const [expanded, setExpanded] = useState(initialExpanded);

  const avgLevel = skills.reduce((sum, s) => sum + s.currentLevel, 0) / skills.length;
  const avgChangeValue = skills.reduce((sum, s) => sum + s.changePercent, 0) / skills.length;
  const levelInfo = getSkillLevelInfo(avgLevel);
  const trendColor =
    avgChangeValue > 0 ? palette.success : avgChangeValue < 0 ? palette.error : palette.muted;

  return (
    <SurfaceCard style={styles.card}>
      <Clickable
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${category} skill group`}
        accessibilityState={{ expanded }}
      >
        <Row style={styles.header}>
          <Row style={styles.left}>
            <View style={[styles.icon, { backgroundColor: withAlpha(levelInfo.color, 0.09) }]}>
              <Ionicons name={getCategoryIcon(category)} size={20} color={levelInfo.color} />
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.name}>
                {category}
              </ThemedText>
              <ThemedText style={[styles.count, { color: palette.muted }]}>
                {skills.length} skill{skills.length !== 1 ? 's' : ''}
              </ThemedText>
            </View>
          </Row>
          <Row style={styles.right}>
            <View style={styles.stats}>
              <ThemedText type="defaultSemiBold">{Math.round(avgLevel)}</ThemedText>
              <ThemedText style={[styles.avgLabel, { color: palette.muted }]}>avg</ThemedText>
            </View>
            <View style={[styles.trendDot, { backgroundColor: withAlpha(trendColor, 0.09) }]}>
              <Ionicons
                name={
                  avgChangeValue > 0 ? 'arrow-up' : avgChangeValue < 0 ? 'arrow-down' : 'remove'
                }
                size={10}
                color={trendColor}
              />
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={palette.icon}
            />
          </Row>
        </Row>
      </Clickable>

      {expanded && (
        <Animated.View
          entering={FadeIn}
          style={[styles.skills, { borderTopColor: palette.border }]}
        >
          {skills.map((skill, index) => (
            <SkillProgressBar key={skill.skillName} skill={skill} compact delay={index * 50} />
          ))}
        </Animated.View>
      )}
    </SurfaceCard>
  );
}

export const SkillCategoryGroup = memo(SkillCategoryGroupInner);

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.sm },
  header: { justifyContent: 'space-between', alignItems: 'center' },
  left: { alignItems: 'center', gap: Spacing.sm },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...Typography.subheading },
  count: { ...Typography.caption },
  right: { alignItems: 'center', gap: Spacing.sm },
  stats: { alignItems: 'center' },
  avgLabel: { ...Typography.micro },
  trendDot: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skills: { gap: Spacing.xs, paddingTop: Spacing.xs, borderTopWidth: 1, marginTop: Spacing.xs },
});
