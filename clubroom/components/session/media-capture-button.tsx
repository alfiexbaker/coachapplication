import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface MediaCaptureButtonProps {
  mode: 'photo' | 'video';
  disabled?: boolean;
  countLabel?: string;
  onPress: () => void;
}

export const MediaCaptureButton = memo(function MediaCaptureButton({
  mode,
  disabled,
  countLabel,
  onPress,
}: MediaCaptureButtonProps) {
  const { colors } = useTheme();
  const iconName = mode === 'photo' ? 'camera' : 'videocam';
  const label = mode === 'photo' ? 'Photo' : 'Video';

  return (
    <Clickable
      style={[
        styles.button,
        {
          borderColor: disabled ? colors.border : colors.tint,
          backgroundColor: disabled ? withAlpha(colors.border, 0.2) : withAlpha(colors.tint, 0.08),
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={`Capture ${label.toLowerCase()}`}
      accessibilityRole="button"
    >
      <Row align="center" justify="center" gap="xxs">
        <Ionicons name={iconName} size={16} color={disabled ? colors.muted : colors.tint} />
        <ThemedText style={[styles.label, { color: disabled ? colors.muted : colors.text }]}>
          {label}
        </ThemedText>
        {countLabel ? (
          <ThemedText style={[styles.count, { color: disabled ? colors.muted : colors.tint }]}>
            {countLabel}
          </ThemedText>
        ) : null}
      </Row>
    </Clickable>
  );
});

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  label: {
    ...Typography.bodySmallSemiBold,
  },
  count: {
    ...Typography.caption,
  },
});
