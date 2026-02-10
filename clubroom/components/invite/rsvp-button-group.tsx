/**
 * RSVP Button Group
 *
 * Facebook-style Going / Maybe / Can't Go button row.
 * Selected state shows filled background + checkmark.
 * Includes haptic feedback on press.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

type RsvpStatus = 'going' | 'maybe' | 'cant_go';

interface RsvpButtonGroupProps {
  currentStatus?: RsvpStatus | null;
  onRespond: (status: RsvpStatus) => void;
  disabled?: boolean;
  compact?: boolean;
}

interface ButtonConfig {
  status: RsvpStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selectedIcon: keyof typeof Ionicons.glyphMap;
  colorKey: 'success' | 'warning' | 'error';
}

const BUTTONS: ButtonConfig[] = [
  {
    status: 'going',
    label: 'Going',
    icon: 'checkmark-circle-outline',
    selectedIcon: 'checkmark-circle',
    colorKey: 'success',
  },
  {
    status: 'maybe',
    label: 'Maybe',
    icon: 'help-circle-outline',
    selectedIcon: 'help-circle',
    colorKey: 'warning',
  },
  {
    status: 'cant_go',
    label: "Can't Go",
    icon: 'close-circle-outline',
    selectedIcon: 'close-circle',
    colorKey: 'error',
  },
];

function RsvpButtonGroupComponent({
  currentStatus,
  onRespond,
  disabled = false,
  compact = false,
}: RsvpButtonGroupProps) {
  const { colors: palette } = useTheme();

  const handlePress = useCallback(
    (status: RsvpStatus) => {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onRespond(status);
    },
    [onRespond]
  );

  return (
    <Row style={styles.row}>
      {BUTTONS.map((btn) => {
        const isSelected = currentStatus === btn.status;
        const color = palette[btn.colorKey];

        return (
          <Clickable
            key={btn.status}
            onPress={() => handlePress(btn.status)}
            disabled={disabled}
            accessibilityLabel={`${btn.label}${isSelected ? ', selected' : ''}`}
            accessibilityRole="button"
            style={[
              styles.button,
              compact ? styles.buttonCompact : styles.buttonFull,
              {
                backgroundColor: isSelected ? color : 'transparent',
                borderColor: isSelected ? color : withAlpha(color, 0.4),
                opacity: disabled ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons
              name={isSelected ? btn.selectedIcon : btn.icon}
              size={compact ? 16 : 20}
              color={isSelected ? palette.onPrimary : color}
            />
            <ThemedText
              style={[
                compact ? styles.labelCompact : styles.labelFull,
                { color: isSelected ? palette.onPrimary : color },
              ]}
              numberOfLines={1}
            >
              {btn.label}
            </ThemedText>
          </Clickable>
        );
      })}
    </Row>
  );
}

export const RsvpButtonGroup = memo(RsvpButtonGroupComponent);

const styles = StyleSheet.create({
  row: {
    gap: Spacing.xs,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    borderWidth: 1.5,
    borderRadius: Radii.md,
  },
  buttonCompact: {
    minHeight: 44,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  buttonFull: {
    minHeight: 48,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  labelCompact: {
    ...Typography.smallSemiBold,
  },
  labelFull: {
    ...Typography.bodySemiBold,
  },
});
