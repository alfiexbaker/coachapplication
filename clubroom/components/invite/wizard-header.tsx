/**
 * WizardHeader — Navigation header for multi-step invite wizards.
 *
 * Shared between group and squad invite flows.
 * Shows back/close icon, title, and a spacer for alignment.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

export interface WizardHeaderProps {
  title: string;
  onBack: () => void;
  /** Show close (X) icon instead of back arrow */
  showClose?: boolean;
  colors: ThemeColors;
}

export const WizardHeader = memo(function WizardHeader({
  title,
  onBack,
  showClose,
  colors,
}: WizardHeaderProps) {
  return (
    <Row
      align="center"
      justify="between"
      paddingH="lg"
      paddingV="md"
    >
      <Clickable
        onPress={onBack}
        hitSlop={8}
        accessibilityLabel={showClose ? 'Close' : 'Go back'}
        accessibilityRole="button"
      >
        <Ionicons
          name={showClose ? 'close' : 'arrow-back'}
          size={24}
          color={colors.text}
        />
      </Clickable>
      <ThemedText type="title">{title}</ThemedText>
      <View style={styles.spacer} />
    </Row>
  );
});

const styles = StyleSheet.create({
  spacer: {
    width: 24,
  },
});
