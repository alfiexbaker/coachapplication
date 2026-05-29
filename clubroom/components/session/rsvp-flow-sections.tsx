/**
 * Extracted sub-components for RSVPFlow.
 *
 * ResponseButton — reusable RSVP response button.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Typography, withAlpha } from '@/constants/theme';

// ============================================================================
// RESPONSE BUTTON
// ============================================================================

type RSVPStatus = 'going' | 'not_going' | 'maybe';

interface ResponseButtonProps {
  status: RSVPStatus;
  label: string;
  selectedIcon: string;
  outlineIcon: string;
  accentColor: string;
  surfaceColor: string;
  isSelected: boolean;
  isSubmitting: boolean;
  onPress: (status: RSVPStatus) => void;
}

export const ResponseButton = function ResponseButton({
  status,
  label,
  selectedIcon,
  outlineIcon,
  accentColor,
  surfaceColor,
  isSelected,
  isSubmitting,
  onPress,
}: ResponseButtonProps) {
  return (
    <Clickable
      style={[
        styles.responseButton,
        { borderColor: accentColor, backgroundColor: withAlpha(accentColor, 0.06) },
        isSelected && { backgroundColor: accentColor, borderColor: accentColor },
      ]}
      onPress={() => onPress(status)}
      disabled={isSubmitting}
    >
      <Row align="center" justify="center" gap="sm">
        <Ionicons
          name={(isSelected ? selectedIcon : outlineIcon) as keyof typeof Ionicons.glyphMap}
          size={28}
          color={isSelected ? surfaceColor : accentColor}
        />
        <ThemedText
          style={[
            styles.responseButtonText,
            { color: accentColor },
            isSelected && { color: surfaceColor },
          ]}
        >
          {label}
        </ThemedText>
      </Row>
    </Clickable>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  responseButton: {
    justifyContent: 'center',
    height: 64,
    borderRadius: Radii.card,
    borderWidth: 2,
  },
  responseButtonText: {
    ...Typography.heading,
    letterSpacing: -0.2,
  },
});
