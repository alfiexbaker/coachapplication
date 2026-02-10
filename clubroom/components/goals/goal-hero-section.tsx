import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ProgressRing, CategoryBadge } from '@/components/goals';
import { Spacing, Typography } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';
import { progressService } from '@/services/progress-service';
import type { Goal } from '@/constants/types';

interface GoalHeroSectionProps {
  goal: Goal;
}

export const GoalHeroSection = memo(function GoalHeroSection({ goal }: GoalHeroSectionProps) {
  const { colors } = useTheme();
  const { color: categoryColor } = progressService.getCategoryInfo(goal.category);

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.hero}>
      <View style={styles.content}>
        <CategoryBadge category={goal.category} />
        <ThemedText type="title" style={styles.title}>{goal.title}</ThemedText>
        {goal.description && (
          <ThemedText style={[styles.description, { color: colors.muted }]}>{goal.description}</ThemedText>
        )}
      </View>
      <ProgressRing
        progress={goal.progress}
        size={100}
        strokeWidth={10}
        progressColor={goal.status === 'COMPLETED' ? colors.success : categoryColor}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  hero: { alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.md, gap: Spacing.md },
  content: { flex: 1, gap: Spacing.xs },
  title: { ...Typography.display, fontSize: scaleFont(Typography.display.fontSize), marginTop: Spacing.xs },
  description: { ...Typography.body, fontSize: scaleFont(Typography.body.fontSize), lineHeight: scaleFont(22) },
});
