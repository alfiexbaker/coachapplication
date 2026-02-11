/**
 * RosterSearchBar — Search input for filtering the roster list.
 *
 * Themed search bar with search icon, text input, and clear button.
 * Uses Row primitive for layout. Memoized for FlatList parent performance.
 */

import { memo, useCallback } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Typography, Components } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface RosterSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const RosterSearchBar = memo(function RosterSearchBar({
  value,
  onChangeText,
}: RosterSearchBarProps) {
  const { colors } = useTheme();

  const handleClear = useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  return (
    <Row
      gap="sm"
      align="center"
      paddingH="md"
      paddingV="sm"
      style={[styles.container, { backgroundColor: colors.surface }]}
    >
      <Ionicons name="search" size={Components.icon.md} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search athletes or tags"
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text }]}
        accessibilityLabel="Search athletes"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Clickable
          onPress={handleClear}
          hitSlop={8}
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <Ionicons name="close-circle" size={Components.icon.md} color={colors.muted} />
        </Clickable>
      )}
    </Row>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    minHeight: Components.button.height,
  },
  input: {
    flex: 1,
    ...Typography.body,
  },
});
