import * as Haptics from 'expo-haptics';
import type { ReactNode, Ref } from 'react';
import { Pressable, type PressableProps, type View } from 'react-native';

export type TabButtonProps = PressableProps & {
  children?: ReactNode;
  href?: string;
  ref?: Ref<View>;
  to?: string;
};

export function HapticTab({
  children,
  href,
  to,
  accessibilityLabel,
  accessibilityState,
  onPress,
  onPressIn,
  ref,
  ...rest
}: TabButtonProps) {
  const content = (
    <Pressable
      ref={ref}
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      hitSlop={8}
      onPress={(ev) => {
        onPress?.(ev);
      }}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(ev);
      }}
      {...rest}
    >
      {children}
    </Pressable>
  );

  // Expo Router already wires up tab presses to navigation; avoid extra
  // Link wrappers on web to prevent DOM render errors while keeping the
  // same pressable element across platforms. Also drop the `href`/`to`
  // props so the pressable doesn't render an <a> element on web, as that
  // has been causing hydration errors.
  return content;
}
