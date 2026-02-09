/**
 * OnboardingProgressBar — Step progress indicator for onboarding wizard.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface OnboardingProgressBarProps {
  stepNumber: number;
  totalSteps: number;
}

function OnboardingProgressBarInner({ stepNumber, totalSteps }: OnboardingProgressBarProps) {
  const { colors: palette } = useTheme();

  const fillStyle = useAnimatedStyle(() => ({
    width: withTiming(`${(stepNumber / totalSteps) * 100}%`, { duration: 300 }),
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: palette.border }]}>
        <Animated.View style={[styles.fill, { backgroundColor: palette.tint }, fillStyle]} />
      </View>
      <ThemedText style={[styles.text, { color: palette.muted }]}>
        Step {stepNumber} of {totalSteps}
      </ThemedText>
    </View>
  );
}

export const OnboardingProgressBar = memo(OnboardingProgressBarInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.xs,
  },
  track: {
    height: Spacing.xs,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radii.sm,
  },
  text: {
    ...Typography.caption,
  },
});
