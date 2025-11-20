import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { forwardRef } from 'react';
import { Platform, Pressable, type PressableProps, type View } from 'react-native';

type TabButtonProps = BottomTabBarButtonProps &
  Pick<PressableProps, 'accessibilityLabel' | 'accessibilityState' | 'onPress'>;

export const HapticTab = forwardRef<View, TabButtonProps>(function HapticTab(
  { children, href, to, accessibilityLabel, accessibilityState, onPress, onPressIn, ...rest },
  ref,
) {
  const content = (
    <Pressable
      ref={ref}
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      hitSlop={8}
      onPress={(ev) => {
        if (__DEV__ && typeof console !== 'undefined') {
          console.debug('[HapticTab] onPress', {
            label: accessibilityLabel,
            state: accessibilityState,
          });
        }
        onPress?.(ev);
      }}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (__DEV__ && typeof console !== 'undefined') {
            console.debug('[HapticTab] haptic impact', {
              label: accessibilityLabel,
            });
          }
        }
        onPressIn?.(ev);
      }}
      {...rest}
    >
      {children}
    </Pressable>
  );

  if (__DEV__ && Platform.OS === 'web') {
    console.debug('[HapticTab] render', {
      label: accessibilityLabel,
      hasChildren: Boolean(children),
      hadHref: Boolean(href ?? to),
    });
  }

  // Expo Router already wires up tab presses to navigation; avoid extra
  // Link wrappers on web to prevent DOM render errors while keeping the
  // same pressable element across platforms. Also drop the `href`/`to`
  // props so the pressable doesn't render an <a> element on web, as that
  // has been causing hydration errors.
  return content;
});
