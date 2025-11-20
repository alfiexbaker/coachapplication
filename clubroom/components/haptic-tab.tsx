import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { forwardRef } from 'react';
import { Platform, type View } from 'react-native';

export const HapticTab = forwardRef<View, BottomTabBarButtonProps>(function HapticTab(props, ref) {
  const content = (
    <PlatformPressable
      ref={ref}
      accessibilityRole="tab"
      hitSlop={8}
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    >
      {props.children}
    </PlatformPressable>
  );

  if (__DEV__ && Platform.OS === 'web') {
    console.debug('[HapticTab] render', {
      label: props.accessibilityLabel,
      hasChildren: Boolean(props.children),
    });
  }

  // Expo Router already wires up tab presses to navigation; avoid extra
  // Link wrappers on web to prevent DOM render errors while keeping the
  // same pressable element across platforms.
  return content;
});
