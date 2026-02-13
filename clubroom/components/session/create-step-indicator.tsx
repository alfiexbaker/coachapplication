import React, { memo } from 'react';
import { StyleSheet } from 'react-native';

import { ProgressStepper } from '@/components/ui/primitives';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { type WizardStep, WIZARD_STEPS, WIZARD_STEP_LABELS } from './create-session-types';

// ============================================================================
// PROPS
// ============================================================================

interface CreateStepIndicatorProps {
  currentStep: WizardStep;
  currentStepIndex: number;
  colors: ThemeColors;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CreateStepIndicator = memo(function CreateStepIndicator({
  currentStep,
  currentStepIndex,
}: CreateStepIndicatorProps) {
  return (
    <ProgressStepper
      currentStep={currentStepIndex}
      totalSteps={WIZARD_STEPS.length}
      label={WIZARD_STEP_LABELS[currentStep]}
      style={styles.wrapper}
    />
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
});
