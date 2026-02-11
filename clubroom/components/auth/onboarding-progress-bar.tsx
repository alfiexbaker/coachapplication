/**
 * OnboardingProgressBar — Step progress indicator for onboarding wizard.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface OnboardingProgressBarProps {
  stepNumber: number;
  totalSteps: number;
  stepLabel?: string;
}

function OnboardingProgressBarInner({
  stepNumber,
  totalSteps,
  stepLabel,
}: OnboardingProgressBarProps) {
  const { colors: palette } = useTheme();
  const percent = Math.round((stepNumber / totalSteps) * 100);

  const fillStyle = useAnimatedStyle(() => ({
    width: withTiming(`${(stepNumber / totalSteps) * 100}%`, { duration: 300 }),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText style={[styles.text, { color: palette.muted }]}>
          Step {stepNumber} of {totalSteps}
        </ThemedText>
        <ThemedText style={[styles.percent, { color: palette.text }]}>{percent}%</ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: withAlpha(palette.border, 0.85) }]}>
        <Animated.View style={[styles.fill, { backgroundColor: palette.tint }, fillStyle]} />
      </View>
      <View style={styles.milestonesRow}>
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const isActive = idx + 1 <= stepNumber;
          return (
            <View
              key={`step-dot-${idx}`}
              style={[
                styles.milestoneDot,
                {
                  backgroundColor: isActive ? palette.tint : withAlpha(palette.border, 0.9),
                  opacity: isActive ? 1 : 0.6,
                },
              ]}
            />
          );
        })}
      </View>
      {stepLabel ? (
        <ThemedText style={[styles.stepLabel, { color: palette.muted }]} numberOfLines={1}>
          {stepLabel}
        </ThemedText>
      ) : null}
    </View>
  );
}

export const OnboardingProgressBar = memo(OnboardingProgressBarInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.xs,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    height: 6,
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
  percent: {
    ...Typography.caption,
    fontWeight: '700',
  },
  milestonesRow: {
    flexDirection: 'row',
    gap: Spacing.xxs,
  },
  milestoneDot: {
    flex: 1,
    height: 3,
    borderRadius: Radii.xs,
  },
  stepLabel: {
    ...Typography.caption,
  },
});
