import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SkillProgress } from '@/constants/types';
import { getSkillColor, getSkillLabel } from './skill-radar-helpers';
import { Row } from '@/components/primitives';

interface SkillRadarListProps {
  skillsByCategory: Record<string, SkillProgress[]>;
}

function SkillRadarListInner({ skillsByCategory }: SkillRadarListProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.listView}>
      {Object.entries(skillsByCategory).map(([category, categorySkills], catIndex) => (
        <View key={category} style={styles.categorySection}>
          <Row style={styles.categorySectionHeader}>
            <ThemedText style={[styles.categorySectionTitle, { color: palette.muted }]}>
              {category.toUpperCase()}
            </ThemedText>
            <View style={[styles.categoryLine, { backgroundColor: palette.border }]} />
          </Row>
          {categorySkills.map((skill, index) => {
            const skillColor = getSkillColor(skill.currentLevel);
            const changeColor =
              skill.changePercent > 0
                ? palette.success
                : skill.changePercent < 0
                  ? palette.error
                  : palette.muted;
            return (
              <Animated.View
                key={skill.skillName}
                entering={FadeInDown.delay(catIndex * 100 + index * 50).springify()}
                style={styles.skillRow}
              >
                <Row style={styles.skillRowLeft}>
                  <View style={[styles.skillColorIndicator, { backgroundColor: skillColor }]} />
                  <View style={styles.skillRowInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.skillRowName}>
                      {skill.skillName}
                    </ThemedText>
                    <ThemedText style={[styles.skillRowLevel, { color: skillColor }]}>
                      {getSkillLabel(skill.currentLevel)}
                    </ThemedText>
                  </View>
                </Row>
                <Row style={styles.skillRowRight}>
                  <Row style={styles.skillRowValue}>
                    <ThemedText type="defaultSemiBold" style={styles.skillRowValueText}>
                      {skill.currentLevel}
                    </ThemedText>
                    <ThemedText style={[styles.skillRowMax, { color: palette.muted }]}>
                      /100
                    </ThemedText>
                  </Row>
                  <Row
                    style={[
                      styles.skillRowTrend,
                      { backgroundColor: withAlpha(changeColor, 0.09) },
                    ]}
                  >
                    <Ionicons
                      name={
                        skill.changePercent > 0
                          ? 'trending-up'
                          : skill.changePercent < 0
                            ? 'trending-down'
                            : 'remove'
                      }
                      size={12}
                      color={changeColor}
                    />
                    <ThemedText style={[styles.skillRowTrendText, { color: changeColor }]}>
                      {skill.changePercent > 0 ? '+' : ''}
                      {skill.changePercent.toFixed(1)}%
                    </ThemedText>
                  </Row>
                </Row>
              </Animated.View>
            );
          })}
        </View>
      ))}
    </Animated.View>
  );
}

export const SkillRadarList = SkillRadarListInner;

const styles = StyleSheet.create({
  listView: { gap: Spacing.md },
  categorySection: { gap: Spacing.xs },
  categorySectionHeader: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  categorySectionTitle: { ...Typography.caption, letterSpacing: 0.5 },
  categoryLine: { flex: 1, height: 1 },
  skillRow: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  skillRowLeft: { alignItems: 'center', gap: Spacing.sm },
  skillColorIndicator: { width: 4, height: 32, borderRadius: Radii.xs },
  skillRowInfo: { gap: Spacing.micro },
  skillRowName: { ...Typography.bodySmall },
  skillRowLevel: { ...Typography.caption },
  skillRowRight: { alignItems: 'center', gap: Spacing.sm },
  skillRowValue: { alignItems: 'baseline' },
  skillRowValueText: { ...Typography.subheading },
  skillRowMax: { ...Typography.caption },
  skillRowTrend: {
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    minWidth: 58,
  },
  skillRowTrendText: { ...Typography.caption },
});
