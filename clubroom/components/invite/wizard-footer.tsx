/**
 * WizardFooter — Navigation footer for multi-step invite wizards.
 *
 * Shared between group and squad invite flows.
 * Shows a "Continue" button or a custom action button on the final step.
 */

import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

export interface WizardFooterProps {
  /** Whether to show the continue button or the custom action */
  isLastStep: boolean;
  /** Whether the "Continue" button can be pressed */
  canProceed: boolean;
  /** Called when "Continue" is pressed */
  onNext: () => void;
  /** Custom action label for the last step (e.g. "Send 5 Invites") */
  actionLabel?: string;
  /** Whether the action is loading */
  actionLoading?: boolean;
  /** Called when the action button is pressed */
  onAction?: () => void;
  /** Custom action content — overrides actionLabel when provided */
  actionContent?: React.ReactNode;
  colors: ThemeColors;
}

export const WizardFooter = memo(function WizardFooter({
  isLastStep,
  canProceed,
  onNext,
  actionLabel,
  actionLoading,
  onAction,
  actionContent,
  colors,
}: WizardFooterProps) {
  return (
    <Row style={[styles.footer, { borderTopColor: colors.border }]}>
      {isLastStep && actionContent ? (
        actionContent
      ) : isLastStep && onAction ? (
        <Clickable
          onPress={onAction}
          disabled={actionLoading}
          style={[
            styles.button,
            { backgroundColor: colors.tint, opacity: actionLoading ? 0.6 : 1 },
          ]}
          accessibilityLabel={actionLabel ?? 'Submit'}
          accessibilityRole="button"
        >
          <Ionicons name="paper-plane" size={18} color={colors.onPrimary} />
          <ThemedText style={{ color: colors.onPrimary, ...Typography.bodySemiBold }}>
            {actionLoading ? 'Sending...' : actionLabel}
          </ThemedText>
        </Clickable>
      ) : (
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
          <ThemedText style={{ color: colors.onPrimary, ...Typography.bodySemiBold }}>
            Continue
          </ThemedText>
          <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
        </Clickable>
      )}
    </Row>
  );
});

const styles = StyleSheet.create({
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    minHeight: 44,
  },
});
