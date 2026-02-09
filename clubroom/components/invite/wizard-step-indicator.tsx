/**
 * WizardStepIndicator — Shows progress dots for multi-step invite wizards.
 *
 * Shared between group and squad invite flows.
 * Displays a horizontal row of dots connected by lines, highlighting completed/current steps.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives';
import { Spacing, Radii } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

export interface WizardStepIndicatorProps {
  steps: readonly string[];
  currentStep: string;
  colors: ThemeColors;
}

export const WizardStepIndicator = memo(function WizardStepIndicator({
  steps,
  currentStep,
  colors,
}: WizardStepIndicatorProps) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <Row align="center" justify="center" paddingH="lg" style={styles.container}>
      {steps.map((s, index) => (
        <Row key={s} align="center">
          <View
            style={[
              styles.dot,
              {
                backgroundColor: index <= currentIndex ? colors.tint : colors.border,
              },
            ]}
          >
            {index < currentIndex && (
              <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
            )}
          </View>
          {index < steps.length - 1 && (
            <View
              style={[
                styles.line,
                { backgroundColor: index < currentIndex ? colors.tint : colors.border },
              ]}
            />
          )}
        </Row>
      ))}
    </Row>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.md,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 36,
    height: 2,
    marginHorizontal: Spacing.xxs,
  },
});
