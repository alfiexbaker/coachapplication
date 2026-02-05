/**
 * Offline Banner
 *
 * Persistent top banner when the user is offline.
 * Animated slide-down/slide-up with Reanimated.
 * Shows brief "Back online" flash on reconnect.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radii } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';

export function OfflineBanner() {
  const { isConnected, showReconnected } = useConnectionStatus();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);

  const showBanner = !isConnected || showReconnected;

  useEffect(() => {
    if (showBanner) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
    } else {
      translateY.value = withTiming(-100, { duration: 300 });
    }
  }, [showBanner]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backgroundColor = showReconnected
    ? `${Colors.light.success}15`
    : `${Colors.light.warning}15`;

  const textColor = showReconnected
    ? Colors.light.success
    : Colors.light.warning;

  const iconName = showReconnected ? 'wifi' : 'wifi-outline';
  const message = showReconnected
    ? 'Back online'
    : "You're offline. Changes will sync when you reconnect.";

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        { paddingTop: insets.top + Spacing.xs, backgroundColor },
      ]}
    >
      <Ionicons
        name={iconName as any}
        size={16}
        color={textColor}
        style={styles.icon}
      />
      <ThemedText style={[styles.text, { color: textColor }]}>{message}</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  text: {
    ...Typography.small,
    fontWeight: '600',
  },
});
