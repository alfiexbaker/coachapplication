/**
 * Extracted sub-components for RSVPFlow.
 *
 * formatSessionDate, formatSessionTime, getTimeUntilDeadline — helpers.
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
// HELPERS
// ============================================================================

export function formatSessionDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatSessionTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTimeUntilDeadline(deadline: string): string {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h left to respond`;
  if (hours > 0) return `${hours}h left to respond`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m left to respond`;
}

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

export const ResponseButton = React.memo(function ResponseButton({
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
});

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
