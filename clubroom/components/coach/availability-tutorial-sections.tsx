/**
 * Extracted sub-components for AvailabilityTutorial.
 *
 * TutorialStepContent — animated step content (icon + title + description).
 * TutorialProgressDots — step indicator dots.
 * TutorialNavButtons — back/next navigation buttons.
 */

import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { styles } from './availability-tutorial-styles';
import type { TutorialStep } from './availability-tutorial-helpers';

// ─── TutorialStepContent ─────────────────────────────────────────────────────

interface TutorialStepContentProps {
  step: TutorialStep;
  accentColor: string;
  fadeAnim: SharedValue<number>;
  slideAnim: SharedValue<number>;
  palette: ThemeColors;
}

export const TutorialStepContent = function TutorialStepContent({
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
};

// ─── TutorialProgressDots ────────────────────────────────────────────────────

interface TutorialProgressDotsProps {
  currentStep: number;
  totalSteps: number;
  palette: ThemeColors;
}

const renderTutorialProgressDots = function renderTutorialProgressDots({
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
              backgroundColor: index === currentStep ? palette.tint : palette.border,
              width: index === currentStep ? 20 : 8,
            },
          ]}
        />
      ))}
    </Row>
  );
};
export const TutorialProgressDots = renderTutorialProgressDots;

// ─── TutorialNavButtons ──────────────────────────────────────────────────────

interface TutorialNavButtonsProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
  palette: ThemeColors;
}

export const TutorialNavButtons = function TutorialNavButtons({
  isFirstStep,
  isLastStep,
  onBack,
  onNext,
  palette,
}: TutorialNavButtonsProps) {
  const { width } = useWindowDimensions();

  return (
    <Row style={styles.buttonRow}>
      {!isFirstStep ? (
        <Clickable onPress={onBack} style={[styles.backButton, { borderColor: palette.border }]}>
          <Ionicons name="arrow-back" size={18} color={palette.text} />
          <ThemedText style={[styles.backButtonText, { color: palette.text }]}>Back</ThemedText>
        </Clickable>
      ) : (
        <View style={styles.buttonPlaceholder} />
      )}

      <Clickable
        onPress={onNext}
        style={[styles.nextButton, { backgroundColor: palette.tint, maxWidth: width * 0.45 }]}
      >
        <ThemedText style={[styles.nextButtonText, { color: palette.onPrimary }]}>
          {isLastStep ? 'Get Started' : 'Next'}
        </ThemedText>
        {!isLastStep && <Ionicons name="arrow-forward" size={18} color={palette.onPrimary} />}
        {isLastStep && <Ionicons name="checkmark" size={18} color={palette.onPrimary} />}
      </Clickable>
    </Row>
  );
};
