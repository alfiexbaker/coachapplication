/**
 * MessagesViewToggle — Segmented control for switching between Direct and Groups views.
 *
 * Pill-shaped toggle with two options. Active state uses tint color.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ViewMode } from '@/hooks/use-messages';

const VIEW_OPTIONS: { key: ViewMode; label: string }[] = [
  { key: 'direct', label: 'Direct' },
  { key: 'groups', label: 'Groups' },
];

interface MessagesViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const MessagesViewToggle = memo(function MessagesViewToggle({
  viewMode,
  onViewModeChange,
}: MessagesViewToggleProps) {
  const { colors: palette } = useTheme();

  return (
    <Row
      gap="xs"
      style={[styles.segmentedControl, { borderColor: palette.border }]}
    >
      {VIEW_OPTIONS.map((option) => {
        const active = viewMode === option.key;
        return (
          <Clickable
            key={option.key}
            onPress={() => onViewModeChange(option.key)}
            style={[
              styles.segmentedButton,
              {
                backgroundColor: active ? palette.tint : palette.surface,
                borderColor: active ? palette.tint : palette.border,
              },
            ]}
            accessibilityLabel={`Show ${option.label.toLowerCase()} messages`}
            accessibilityRole="button"
          >
            <ThemedText
              style={{
                color: active ? palette.surface : palette.text,
                ...Typography.bodySemiBold,
              }}
            >
              {option.label}
            </ThemedText>
          </Clickable>
        );
      })}
    </Row>
  );
});

const styles = StyleSheet.create({
  segmentedControl: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  segmentedButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
});
