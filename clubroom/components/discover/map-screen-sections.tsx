import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

type HeaderProps = {
  colors: ThemeColors;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onBack: () => void;
  onToggleView: () => void;
};

export const MapScreenHeader = React.memo(function MapScreenHeader({
  colors,
  searchQuery,
  onSearchChange,
  onSearch,
  onClearSearch,
  onBack,
  onToggleView,
}: HeaderProps) {
  return (
    <Row align="center" gap="sm" style={styles.header}>
      <Clickable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={styles.headerButton}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Clickable>

      <Row
        align="center"
        gap="sm"
        style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search coaches..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={onSearchChange}
          onSubmitEditing={onSearch}
          returnKeyType="search"
          accessibilityLabel="Search coaches"
        />
        {searchQuery.length > 0 && (
          <Clickable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={onClearSearch}
          >
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Clickable>
        )}
      </Row>

      <Clickable
        accessibilityRole="button"
        accessibilityLabel="Switch to list view"
        onPress={onToggleView}
        style={styles.headerButton}
      >
        <Ionicons name="list" size={24} color={colors.text} />
      </Clickable>
    </Row>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    padding: 0,
  },
});
