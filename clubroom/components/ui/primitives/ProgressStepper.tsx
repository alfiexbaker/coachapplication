import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface ProgressStepperProps {
  currentStep: number;
  totalSteps: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

function clampStep(currentStep: number, totalSteps: number): number {
  if (totalSteps <= 1) return 0;
  return Math.max(0, Math.min(currentStep, totalSteps - 1));
}

function ProgressStepperInner({ currentStep, totalSteps, label, style }: ProgressStepperProps) {
  const { colors } = useTheme();
  const step = clampStep(currentStep, totalSteps);

  return (
    <View style={[styles.wrapper, style]}>
      <Row align="center" style={styles.trackRow}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isDone = index < step;
          const isActive = index === step;
          const dotColor = isDone || isActive ? colors.tint : colors.border;
          const dotBorderColor = isDone || isActive ? colors.tint : colors.border;

          return (
            <React.Fragment key={index}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: dotColor,
                    borderColor: dotBorderColor,
                  },
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
                ) : isActive ? (
                  <View
                    style={[
                      styles.activeInner,
                      { backgroundColor: withAlpha(colors.onPrimary, 0.9) },
                    ]}
                  />
                ) : null}
              </View>

              {index < totalSteps - 1 && (
                <View
                  style={[
                    styles.connector,
                    {
                      backgroundColor: index < step ? colors.tint : colors.border,
                    },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </Row>

      <ThemedText style={[styles.caption, { color: colors.muted }]}>
        Step {step + 1} of {totalSteps}
        {label ? `: ${label}` : ''}
      </ThemedText>
    </View>
  );
}

export const ProgressStepper = ProgressStepperInner;

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs,
  },
  trackRow: {
    alignItems: 'center',
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeInner: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
  },
  connector: {
    flex: 1,
    minWidth: 20,
    height: 2,
    marginHorizontal: Spacing.xs,
    borderRadius: Radii.pill,
  },
  caption: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
