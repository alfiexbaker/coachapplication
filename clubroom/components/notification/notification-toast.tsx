import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Clickable } from '@/components/primitives/clickable';
import { createLogger } from '@/utils/logger';
import { ExtendedNotificationItem } from '@/services/notification-service';
import { useNotificationToast } from '@/hooks/use-notifications';
import { navigateToDeepLink } from '@/utils/deep-link';

const logger = createLogger('NotificationToast');

Dimensions.get('window');

const ICONS: Record<string, string> = {
  booking: 'calendar',
  message: 'chatbubbles',
  review: 'star',
  payment: 'card',
  reminder: 'alarm',
  badge: 'ribbon',
};

interface ToastState {
  notification: ExtendedNotificationItem | null;
  visible: boolean;
}

export function NotificationToastProvider({ children }: { children: React.ReactNode }) {
  const { colors: palette } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>({ notification: null, visible: false });
  const slideAnim = useSharedValue(-100);
  const opacityAnim = useSharedValue(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    slideAnim.value = withTiming(-100, { duration: 200 });
    opacityAnim.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(setToast)({ notification: null, visible: false });
    });
  }, [slideAnim, opacityAnim]);

  const showToast = useCallback(
    (notification: ExtendedNotificationItem) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setToast({ notification, visible: true });

      // Animate in
      slideAnim.value = withSpring(0, { stiffness: 80, damping: 12 });
      opacityAnim.value = withTiming(1, { duration: 200 });

      // Auto-hide after 6 seconds (extended for better user visibility)
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, 6000);
    },
    [slideAnim, opacityAnim, hideToast],
  );

  const handlePress = useCallback(() => {
    hideToast();
    if (toast.notification?.deepLink) {
      try {
        const navigated = navigateToDeepLink(router, toast.notification.deepLink);
        if (!navigated) {
          logger.warn('Invalid toast deep link', { deepLink: toast.notification.deepLink });
        }
      } catch (error) {
        logger.error('Navigation error', error);
      }
    }
  }, [toast.notification, hideToast, router]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
    opacity: opacityAnim.value,
  }));

  // Subscribe to new notifications
  useNotificationToast(showToast);

  if (!toast.visible || !toast.notification) {
    return <>{children}</>;
  }

  const icon = ICONS[toast.notification.type] || 'notifications';

  return (
    <>
      {children}
      <Animated.View style={[styles.container, { top: insets.top + 10 }, containerAnimStyle]}>
        <Clickable onPress={handlePress}>
          <Row
            align="center"
            gap="sm"
            style={[
              styles.toast,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                shadowColor: palette.text,
              },
            ]}
          >
            {/* Icon */}
            <View
              style={[styles.iconContainer, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
            >
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={palette.tint}
              />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.title}>
                {toast.notification.title}
              </ThemedText>
              <ThemedText style={[styles.body, { color: palette.muted }]} numberOfLines={2}>
                {toast.notification.body}
              </ThemedText>
            </View>

            {/* Close button */}
            <Clickable onPress={hideToast}>
              <View style={styles.closeButton}>
                <Ionicons name="close" size={18} color={palette.muted} />
              </View>
            </Clickable>
          </Row>
        </Clickable>
      </Animated.View>
    </>
  );
}

/**
 * Standalone toast component that can be used without the provider
 * Useful for testing or manual triggering
 */
export function NotificationToast({
  notification,
  onPress,
  onDismiss,
}: {
  notification: ExtendedNotificationItem;
  onPress?: () => void;
  onDismiss?: () => void;
}) {
  const { colors: palette } = useTheme();
  const icon = ICONS[notification.type] || 'notifications';

  return (
    <Clickable onPress={onPress}>
      <Row
        align="center"
        gap="sm"
        style={[
          styles.toast,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            shadowColor: palette.text,
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={palette.tint} />
        </View>

        <View style={styles.content}>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.title}>
            {notification.title}
          </ThemedText>
          <ThemedText style={[styles.body, { color: palette.muted }]} numberOfLines={2}>
            {notification.body}
          </ThemedText>
        </View>

        {onDismiss && (
          <Clickable onPress={onDismiss}>
            <View style={styles.closeButton}>
              <Ionicons name="close" size={18} color={palette.muted} />
            </View>
          </Clickable>
        )}
      </Row>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
    elevation: 10,
  },
  toast: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: Spacing.micro,
  },
  title: { ...Typography.bodySmall },
  body: { ...Typography.small, lineHeight: 18 },
  closeButton: {
    padding: Spacing.xxs,
  },
});
