/**
 * MessagesSearchBar — Search input for filtering message threads.
 *
 * Styled search row with icon + TextInput using design tokens.
 */

import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface MessagesSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const MessagesSearchBar = function MessagesSearchBar({
  value,
  onChangeText,
}: MessagesSearchBarProps) {
  const { colors: palette } = useTheme();

  return (
    <Row
      gap="sm"
      align="center"
      style={[styles.searchRow, { backgroundColor: palette.background }]}
    >
      <Ionicons name="search" size={18} color={palette.icon} />
      <TextInput
        placeholder="Search by coach or team"
        placeholderTextColor={palette.muted}
        value={value}
        onChangeText={onChangeText}
        style={[styles.searchInput, { color: palette.text }]}
        accessibilityLabel="Search messages"

            maxLength={200}
          />
    </Row>
  );
};

const styles = StyleSheet.create({
  searchRow: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
  },
});
