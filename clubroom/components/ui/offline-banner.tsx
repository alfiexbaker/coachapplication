/**
 * Offline Banner
 *
 * Persistent top banner when the user is offline.
 * Animated slide-down/slide-up with Reanimated.
 * Shows queue count, sync progress, flush result, and retry.
 */

import { useEffect, useCallback } from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

export function OfflineBanner() {
  const { colors } = useTheme();
  const { isConnected, showReconnected } = useConnectionStatus();
  const { queueSize, isFlushing, lastFlushResult, manualFlush } = useOfflineQueue();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);

  const showBanner = !isConnected || showReconnected || isFlushing;

  useEffect(() => {
    if (showBanner) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
    } else {
      translateY.value = withTiming(-100, { duration: 300 });
    }
  }, [showBanner, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleRetry = useCallback(() => {
    void manualFlush();
  }, [manualFlush]);

  // Determine banner state
  const hasFailedActions = lastFlushResult !== null && lastFlushResult.failed > 0;

  let backgroundColor: string;
  let textColor: string;
  let iconName: keyof typeof Ionicons.glyphMap;
  let message: string;

  if (isFlushing) {
    backgroundColor = withAlpha(colors.tint, 0.09);
    textColor = colors.tint;
    iconName = 'sync';
    message = 'Syncing changes...';
  } else if (showReconnected && !hasFailedActions) {
    backgroundColor = withAlpha(colors.success, 0.09);
    textColor = colors.success;
    iconName = 'wifi';
    message =
      lastFlushResult && lastFlushResult.processed > 0
        ? `Back online. ${lastFlushResult.processed} change${lastFlushResult.processed === 1 ? '' : 's'} synced`
        : 'Back online';
  } else if (hasFailedActions) {
    backgroundColor = withAlpha(colors.error, 0.09);
    textColor = colors.error;
    iconName = 'alert-circle';
    message = `${lastFlushResult.failed} change${lastFlushResult.failed === 1 ? '' : 's'} failed to sync`;
  } else {
    // Offline state
    backgroundColor = withAlpha(colors.warning, 0.09);
    textColor = colors.warning;
    iconName = 'wifi-outline';
    message =
      queueSize > 0
        ? `You're offline. ${queueSize} change${queueSize === 1 ? '' : 's'} saved`
        : "You're offline. Changes will sync when you reconnect.";
  }

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        { paddingTop: insets.top + Spacing.xs, backgroundColor },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Row align="center" justify="center">
        {isFlushing ? (
          <ActivityIndicator size="small" color={textColor} style={styles.icon} />
        ) : (
          <Ionicons name={iconName} size={16} color={textColor} style={styles.icon} />
        )}
        <ThemedText style={[styles.text, { color: textColor }]}>{message}</ThemedText>
        {hasFailedActions && isConnected && (
          <Clickable
            onPress={handleRetry}
            style={styles.retryButton}
            accessibilityLabel="Retry syncing failed changes"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ThemedText style={[styles.retryText, { color: textColor }]}>Retry</ThemedText>
          </Clickable>
        )}
      </Row>
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
    paddingBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  text: {
    ...Typography.smallSemiBold,
  },
  retryButton: {
    marginLeft: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  retryText: {
    ...Typography.smallSemiBold,
    textDecorationLine: 'underline',
  },
});
