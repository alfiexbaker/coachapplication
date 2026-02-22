import React, { memo } from 'react';
import { StyleSheet } from 'react-native';

import { ProgressStepper } from '@/components/ui/primitives';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { type CompletionStep, COMPLETION_STEPS } from '@/hooks/use-session-completion';

// ============================================================================
// PROPS
// ============================================================================

interface CompletionStepIndicatorProps {
  currentStep: CompletionStep;
  currentStepIndex: number;
  colors: ThemeColors;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CompletionStepIndicator = memo(function CompletionStepIndicator({
  currentStep,
  currentStepIndex,
}: CompletionStepIndicatorProps) {
  const stepLabel =
    currentStep === 'quickRate'
      ? 'Quick Rate'
      : currentStep.charAt(0).toUpperCase() + currentStep.slice(1);

  return (
    <ProgressStepper
      currentStep={currentStepIndex}
      totalSteps={COMPLETION_STEPS.length}
      label={stepLabel}
      style={styles.wrapper}
    />
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
