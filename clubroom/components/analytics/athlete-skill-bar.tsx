import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SkillProgress } from '@/constants/types';
import { Row } from '@/components/primitives';

interface AthleteSkillBarProps {
  skill: SkillProgress;
  index: number;
}

export const AthleteSkillBar = memo(function AthleteSkillBar({ skill, index }: AthleteSkillBarProps) {
  const { colors } = useTheme();

  const changeColor =
    skill.changePercent > 0 ? colors.success : skill.changePercent < 0 ? colors.error : colors.muted;

  return (
    <Animated.View entering={FadeInRight.delay(index * 75).springify()} style={styles.item}>
      <Row style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.name}>{skill.skillName}</ThemedText>
        <Row style={styles.change}>
          {skill.changePercent !== 0 && (
            <Ionicons name={skill.changePercent > 0 ? 'arrow-up' : 'arrow-down'} size={12} color={changeColor} />
          )}
          <ThemedText style={[styles.changeText, { color: changeColor }]}>
            {skill.changePercent > 0 ? '+' : ''}{skill.changePercent.toFixed(1)}%
          </ThemedText>
        </Row>
      </Row>
      <View style={[styles.barBg, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[styles.barFill, {
            width: `${skill.currentLevel}%`,
            backgroundColor: skill.currentLevel >= 70 ? colors.success : skill.currentLevel >= 50 ? colors.warning : colors.tint,
          }]}
        />
      </View>
      <Row style={styles.meta}>
        <ThemedText style={[styles.category, { color: colors.muted }]}>{skill.category}</ThemedText>
        <ThemedText style={[styles.level, { color: colors.text }]}>{skill.currentLevel}/100</ThemedText>
      </Row>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  item: { gap: Spacing.xxs },
  header: { alignItems: 'center', justifyContent: 'space-between' },
  name: { ...Typography.bodySmall },
  change: { alignItems: 'center', gap: Spacing.micro },
  changeText: { ...Typography.caption },
  barBg: { height: 8, borderRadius: Radii.xs, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radii.xs },
  meta: { justifyContent: 'space-between' },
  category: { ...Typography.caption },
  level: { ...Typography.caption },
});
