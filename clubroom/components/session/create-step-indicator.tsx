/**
 * CreateStepIndicator — Step dots + label for the create session wizard.
 *
 * Displays progress through wizard steps with filled/unfilled dots
 * and connecting lines. Reusable for any wizard flow.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row, Center } from '@/components/primitives';
import { Spacing, Radii, Typography } from '@/constants/theme';
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
  colors,
}: CreateStepIndicatorProps) {
  return (
    <View style={styles.wrapper}>
      <Row align="center" justify="center" style={styles.dotsRow}>
        {WIZARD_STEPS.map((s, i) => (
          <Row key={s} align="center">
            <Center
              style={[
                styles.dot,
                { backgroundColor: i <= currentStepIndex ? colors.tint : colors.border },
              ]}
            >
              {i < currentStepIndex && (
                <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
              )}
            </Center>
            {i < WIZARD_STEPS.length - 1 && (
              <View
                style={[
                  styles.line,
                  { backgroundColor: i < currentStepIndex ? colors.tint : colors.border },
                ]}
              />
            )}
          </Row>
        ))}
      </Row>
      <ThemedText style={[styles.label, { color: colors.muted }]}>
        Step {currentStepIndex + 1} of {WIZARD_STEPS.length}: {WIZARD_STEP_LABELS[currentStep]}
      </ThemedText>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  wrapper: {
    paddingBottom: Spacing.sm,
  },
  dotsRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
  },
  line: {
    width: 60,
    height: 2,
    marginHorizontal: Spacing.xs,
  },
  label: {
    textAlign: 'center',
    ...Typography.caption,
  },
});
