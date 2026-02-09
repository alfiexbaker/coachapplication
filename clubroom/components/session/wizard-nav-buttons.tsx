/**
 * WizardNavButtons — Navigation buttons for the session completion wizard.
 *
 * Shows Back / Next / Submit buttons depending on the current step.
 * Used at the bottom of the completion wizard scroll area.
 */

import React, { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives';
import { Spacing, Typography, Components } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { CompletionStep } from '@/hooks/use-session-completion';

// ============================================================================
// PROPS
// ============================================================================

interface WizardNavButtonsProps {
  colors: ThemeColors;
  currentStep: CompletionStep;
  currentStepIndex: number;
  submitting: boolean;
  onNext: () => void;
  onPrev: () => void;
  onComplete: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WizardNavButtons = memo(function WizardNavButtons({
  colors,
  currentStep,
  currentStepIndex,
  submitting,
  onNext,
  onPrev,
  onComplete,
}: WizardNavButtonsProps) {
  return (
    <Row gap="sm" style={styles.container}>
      {currentStepIndex > 0 && (
        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={onPrev}
          accessibilityLabel="Go to previous step"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <ThemedText style={[styles.secondaryText, { color: colors.text }]}>Back</ThemedText>
        </Pressable>
      )}

      {currentStep !== 'summary' ? (
        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: colors.tint, flex: currentStepIndex === 0 ? 1 : undefined },
          ]}
          onPress={onNext}
          accessibilityLabel="Go to next step"
          accessibilityRole="button"
        >
          <ThemedText style={[styles.primaryText, { color: colors.onPrimary }]}>
            {currentStep === 'badges' ? 'Review' : 'Next'}
          </ThemedText>
          <Ionicons name="chevron-forward" size={18} color={colors.onPrimary} />
        </Pressable>
      ) : (
        <Pressable
          style={[styles.submitButton, { backgroundColor: submitting ? colors.muted : colors.tint }]}
          onPress={onComplete}
          disabled={submitting}
          accessibilityLabel="Complete session"
          accessibilityRole="button"
        >
          {submitting ? (
            <ThemedText style={[styles.submitText, { color: colors.onPrimary }]}>Saving...</ThemedText>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={colors.onPrimary} />
              <ThemedText style={[styles.submitText, { color: colors.onPrimary }]}>Complete Session</ThemedText>
            </>
          )}
        </Pressable>
      )}
    </Row>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
  },
  primaryText: {
    ...Typography.subheading,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    paddingHorizontal: Spacing.md,
    borderRadius: Components.button.borderRadius,
    borderWidth: 1.5,
  },
  secondaryText: {
    ...Typography.subheading,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
  },
  submitText: {
    ...Typography.heading,
  },
});
