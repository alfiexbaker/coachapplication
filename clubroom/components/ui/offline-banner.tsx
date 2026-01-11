/**
 * Offline Banner Component
 *
 * Displays a banner at the top of the screen when the device is offline.
 * Automatically shows/hides based on network status.
 */

import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNetworkStatus } from '@/hooks/use-network-status';

interface OfflineBannerProps {
  /** Optional message to display (default: "You're offline. Some features may be unavailable.") */
  message?: string;
  /** Whether to show a retry button */
  showRetry?: boolean;
  /** Callback when retry is pressed */
  onRetry?: () => void;
}

/**
 * Banner that appears when the device is offline
 *
 * @example
 * ```tsx
 * // In your root layout
 * <OfflineBanner />
 * ```
 */
export function OfflineBanner({
  message = "You're offline. Some features may be unavailable.",
  showRetry = true,
  onRetry,
}: OfflineBannerProps) {
  const { isOffline, refresh } = useNetworkStatus();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();

  const handleRetry = async () => {
    if (onRetry) {
      onRetry();
    }
    await refresh();
  };

  if (!isOffline) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.xs,
          backgroundColor: palette.warning,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name="cloud-offline-outline"
          size={18}
          color="#FFFFFF"
          style={styles.icon}
        />
        <Text style={styles.message}>{message}</Text>
        {showRetry && (
          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Standalone hook-based banner that can be used anywhere
 * Renders nothing when online
 */
export function useOfflineBanner() {
  const { isOffline } = useNetworkStatus();
  return { isOffline };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: Spacing.xs,
  },
  message: {
    ...Typography.small,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    marginLeft: Spacing.xs,
  },
  retryButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  retryText: {
    ...Typography.small,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
