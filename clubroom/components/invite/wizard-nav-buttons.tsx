/**
 * WizardNavButtons — Footer row with Continue / Send Invite button.
 *
 * Handles both intermediate steps (Continue) and final step (Send Invite).
 */

import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

export interface WizardNavButtonsProps {
  isConfirmStep: boolean;
  canProceed: boolean;
  loading: boolean;
  onNext: () => void;
  onSubmit: () => void;
  colors: ThemeColors;
}

export const WizardNavButtons = memo(function WizardNavButtons({
  isConfirmStep,
  canProceed,
  loading,
  onNext,
  onSubmit,
  colors,
}: WizardNavButtonsProps) {
  if (isConfirmStep) {
    return (
      <Clickable
        onPress={onSubmit}
        disabled={loading}
        style={[styles.button, { backgroundColor: colors.tint, opacity: loading ? 0.6 : 1 }]}
        accessibilityLabel={loading ? 'Sending invite' : 'Send invite'}
        accessibilityRole="button"
      >
        <Row gap="sm" align="center" justify="center">
          <Ionicons name="paper-plane" size={18} color={colors.onPrimary} />
          <ThemedText style={{ color: colors.onPrimary, ...Typography.bodySemiBold }}>
            {loading ? 'Sending...' : 'Send Invite'}
          </ThemedText>
        </Row>
      </Clickable>
    );
  }

  return (
    <Clickable
      onPress={onNext}
      disabled={!canProceed}
      style={[
        styles.button,
        { backgroundColor: colors.tint, opacity: canProceed ? 1 : 0.5 },
      ]}
      accessibilityLabel="Continue to next step"
      accessibilityRole="button"
    >
      <Row gap="sm" align="center" justify="center">
        <ThemedText style={{ color: colors.onPrimary, ...Typography.bodySemiBold }}>
          Continue
        </ThemedText>
        <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
      </Row>
    </Clickable>
  );
});

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    minHeight: 44,
  },
});
