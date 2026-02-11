/**
 * Extracted sub-components for AvailabilityTutorial.
 *
 * TUTORIAL_STEPS — step config data.
 * TutorialStepContent — animated step content (icon + title + description).
 * TutorialProgressDots — step indicator dots.
 * TutorialNavButtons — back/next navigation buttons.
 */

import React, { memo } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { styles } from './availability-tutorial-styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TutorialStep {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accentColor: 'tint' | 'success' | 'warning' | 'info';
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: 'calendar-outline',
    title: 'Welcome to Availability',
    description:
      "Let's set up when parents can book sessions with you. It only takes a minute to get started.",
    accentColor: 'tint',
  },
  {
    icon: 'grid-outline',
    title: 'Tap to Set Availability',
    description:
      'Use the weekly grid to mark yourself as available. Tap any time slot to toggle it on or off.',
    accentColor: 'success',
  },
  {
    icon: 'flash-outline',
    title: 'Quick Setup Templates',
    description:
      'Short on time? Use a quick-start template like "Weekday Mornings" or "Weekend Sessions" to set up in one tap.',
    accentColor: 'warning',
  },
  {
    icon: 'checkmark-circle-outline',
    title: "You're All Set!",
    description:
      'Parents can now see your availability and book sessions. You can always adjust your schedule later.',
    accentColor: 'info',
  },
];

// ─── TutorialStepContent ─────────────────────────────────────────────────────

interface TutorialStepContentProps {
  step: TutorialStep;
  accentColor: string;
  fadeAnim: SharedValue<number>;
  slideAnim: SharedValue<number>;
  palette: ThemeColors;
}

export const TutorialStepContent = memo(function TutorialStepContent({
  step,
  accentColor,
  fadeAnim,
  slideAnim,
  palette,
}: TutorialStepContentProps) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateX: slideAnim.value }],
  }));

  return (
    <Animated.View style={[styles.stepContent, animStyle]}>
      <View style={[styles.iconCircle, { backgroundColor: withAlpha(accentColor, 0.09) }]}>
        <Ionicons name={step.icon} size={40} color={accentColor} />
      </View>

      <ThemedText type="subtitle" style={styles.stepTitle}>
        {step.title}
      </ThemedText>

      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        {step.description}
      </ThemedText>
    </Animated.View>
  );
});

// ─── TutorialProgressDots ────────────────────────────────────────────────────

interface TutorialProgressDotsProps {
  currentStep: number;
  totalSteps: number;
  palette: ThemeColors;
}

export const TutorialProgressDots = memo(function TutorialProgressDots({
  currentStep,
  totalSteps,
  palette,
}: TutorialProgressDotsProps) {
  return (
    <Row style={styles.progressDots}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor:
                index === currentStep ? palette.tint : palette.border,
              width: index === currentStep ? 20 : 8,
            },
          ]}
        />
      ))}
    </Row>
  );
});

// ─── TutorialNavButtons ──────────────────────────────────────────────────────

interface TutorialNavButtonsProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
  palette: ThemeColors;
}

export const TutorialNavButtons = memo(function TutorialNavButtons({
  isFirstStep,
  isLastStep,
  onBack,
  onNext,
  palette,
}: TutorialNavButtonsProps) {
  return (
    <Row style={styles.buttonRow}>
      {!isFirstStep ? (
        <Clickable
          onPress={onBack}
          style={[styles.backButton, { borderColor: palette.border }]}
        >
          <Ionicons name="arrow-back" size={18} color={palette.text} />
          <ThemedText style={[styles.backButtonText, { color: palette.text }]}>
            Back
          </ThemedText>
        </Clickable>
      ) : (
        <View style={styles.buttonPlaceholder} />
      )}

      <Clickable
        onPress={onNext}
        style={[styles.nextButton, { backgroundColor: palette.tint, maxWidth: SCREEN_WIDTH * 0.45 }]}
      >
        <ThemedText style={[styles.nextButtonText, { color: palette.onPrimary }]}>
          {isLastStep ? 'Get Started' : 'Next'}
        </ThemedText>
        {!isLastStep && (
          <Ionicons name="arrow-forward" size={18} color={palette.onPrimary} />
        )}
        {isLastStep && (
          <Ionicons name="checkmark" size={18} color={palette.onPrimary} />
        )}
      </Clickable>
    </Row>
  );
});

export { styles };
