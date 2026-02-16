/**
 * RSVP Button Group
 *
 * Going / Maybe / Can't Go — one-tap response with animated state transitions.
 * Selected state: filled background + scale pulse + haptic. No Alert dialog.
 * Deselected buttons fade to muted outlines.
 */

import { memo, useCallback } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export type RsvpStatus = 'going' | 'maybe' | 'cant_go';

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

/** Individual animated RSVP button — pulse on selection change. */
const RsvpButton = memo(function RsvpButton({
  config,
  isSelected,
  color,
  textColor,
  onPress,
  disabled,
  compact,
}: {
  config: ButtonConfig;
  isSelected: boolean;
  color: string;
  textColor: string;
  onPress: () => void;
  disabled: boolean;
  compact: boolean;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    // Pulse animation — quick scale up then settle
    scale.value = withSequence(
      withSpring(1.05, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 300 }),
    );
    onPress();
  }, [onPress, scale]);

  return (
    <Animated.View style={[{ flex: 1 }, animStyle]}>
      <Clickable
        onPress={handlePress}
        disabled={disabled}
        accessibilityLabel={`${config.label}${isSelected ? ', selected' : ''}`}
        accessibilityRole="button"
        style={[
          styles.button,
          compact ? styles.buttonCompact : styles.buttonFull,
          {
            backgroundColor: isSelected ? color : 'transparent',
            borderColor: isSelected ? color : withAlpha(color, isSelected ? 1 : 0.3),
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Ionicons
          name={isSelected ? config.selectedIcon : config.icon}
          size={compact ? 16 : 20}
          color={isSelected ? textColor : color}
        />
        <ThemedText
          style={[
            compact ? styles.labelCompact : styles.labelFull,
            { color: isSelected ? textColor : color },
          ]}
          numberOfLines={1}
        >
          {config.label}
        </ThemedText>
      </Clickable>
    </Animated.View>
  );
});

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
        // Success haptic for "going", light for others
        if (status === 'going') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
      onRespond(status);
    },
    [onRespond],
  );

  return (
    <Row style={styles.row}>
      {BUTTONS.map((btn) => {
        const isSelected = currentStatus === btn.status;
        const color = palette[btn.colorKey];

        return (
          <RsvpButton
            key={btn.status}
            config={btn}
            isSelected={isSelected}
            color={color}
            textColor={palette.onPrimary}
            onPress={() => handlePress(btn.status)}
            disabled={disabled}
            compact={compact}
          />
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
