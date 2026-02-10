/**
 * NotificationFilterChip — A single filter chip for the notification filter bar.
 *
 * Displays an icon + label with active/inactive styling.
 * Memoized to avoid re-renders in the horizontal ScrollView.
 */

import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface NotificationFilterChipProps {
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
}

export const NotificationFilterChip = memo(function NotificationFilterChip({
  label,
  icon,
  isActive,
  onPress,
}: NotificationFilterChipProps) {
  const { colors: palette } = useTheme();

  return (
    <Clickable onPress={onPress} accessibilityLabel={`Filter by ${label}`}>
      <Row
        align="center"
        gap="xxs"
        style={[
          styles.filterChip,
          {
            backgroundColor: isActive ? palette.tint : palette.surface,
            borderColor: isActive ? palette.tint : palette.border,
          },
        ]}
      >
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={14}
          color={isActive ? palette.onPrimary : palette.muted}
        />
        <ThemedText
          style={[
            styles.filterLabel,
            { color: isActive ? palette.onPrimary : palette.text },
          ]}
        >
          {label}
        </ThemedText>
      </Row>
    </Clickable>
  );
});

const styles = StyleSheet.create({
  filterChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterLabel: {
    ...Typography.smallSemiBold,
  },
});
