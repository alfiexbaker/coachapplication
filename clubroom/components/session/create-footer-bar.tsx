/**
 * CreateFooterBar — Bottom action bar for the session creation wizard.
 *
 * Shows "Continue" or "Create Session" depending on the current step.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { Button } from '@/components/primitives/button';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { WizardStep } from './create-session-types';

// ============================================================================
// PROPS
// ============================================================================

interface CreateFooterBarProps {
  colors: ThemeColors;
  step: WizardStep;
  loading: boolean;
  canProceed: boolean;
  onNext: () => void;
  onCreate: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CreateFooterBar = memo(function CreateFooterBar({
  colors,
  step,
  loading,
  canProceed,
  onNext,
  onCreate,
}: CreateFooterBarProps) {
  return (
    <View style={[styles.footer, { borderTopColor: colors.border }]}>
      {step === 'invite' ? (
        <Button
          onPress={onCreate}
          disabled={loading}
          accessibilityLabel={loading ? 'Creating session' : 'Create session'}
        >
          {loading ? 'Creating...' : 'Create Session'}
        </Button>
      ) : (
        <Button
          onPress={onNext}
          disabled={!canProceed}
          accessibilityLabel="Continue to next step"
        >
          Continue
        </Button>
      )}
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
