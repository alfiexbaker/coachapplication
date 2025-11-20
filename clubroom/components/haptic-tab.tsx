import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import { forwardRef } from 'react';
import { Platform, type View } from 'react-native';

export const HapticTab = forwardRef<View, BottomTabBarButtonProps>(function HapticTab(
  { href, ...props },
  ref
) {
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
    />
  );

  if (Platform.OS === 'web' && href) {
    return (
      <Link href={href} asChild>
        {content}
      </Link>
    );
  }

  return content;
});
