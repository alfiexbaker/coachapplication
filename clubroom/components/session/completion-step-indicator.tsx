/**
 * CompletionStepIndicator — Step dots + label for the session completion wizard.
 *
 * Displays progress through completion steps with filled/unfilled dots
 * and connecting lines between steps.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Row, Column } from '@/components/primitives';
import { Spacing, Radii, Typography } from '@/constants/theme';
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
  colors,
}: CompletionStepIndicatorProps) {
  const stepLabel = currentStep.charAt(0).toUpperCase() + currentStep.slice(1);

  return (
    <Column gap="xs" paddingH="md" paddingV="sm">
      <Row align="center">
        {COMPLETION_STEPS.map((step, index) => (
          <Row key={step} align="center" flex>
            <View
              style={[
                styles.dot,
                { backgroundColor: index <= currentStepIndex ? colors.tint : colors.border },
              ]}
            />
            {index < COMPLETION_STEPS.length - 1 && (
              <View
                style={[
                  styles.line,
                  { backgroundColor: index < currentStepIndex ? colors.tint : colors.border },
                ]}
              />
            )}
          </Row>
        ))}
      </Row>
      <ThemedText style={[styles.label, { color: colors.muted }]}>
        Step {currentStepIndex + 1} of {COMPLETION_STEPS.length}: {stepLabel}
      </ThemedText>
    </Column>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm,
  },
  line: {
    flex: 1,
    height: 2,
    marginHorizontal: Spacing.xxs,
  },
  label: {
    ...Typography.caption,
  },
});
