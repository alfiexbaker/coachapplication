import { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Clickable } from '@/components/primitives/clickable';
import { createLogger } from '@/utils/logger';
import { ExtendedNotificationItem } from '@/services/notification-service';
import { useNotificationToast } from '@/hooks/use-notifications';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>({ notification: null, visible: false });
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast({ notification: null, visible: false });
    });
  }, [slideAnim, opacityAnim]);

  const showToast = useCallback((notification: ExtendedNotificationItem) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToast({ notification, visible: true });

    // Animate in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide after 6 seconds (extended for better user visibility)
    timeoutRef.current = setTimeout(() => {
      hideToast();
    }, 6000);
  }, [slideAnim, opacityAnim, hideToast]);

  const handlePress = useCallback(() => {
    hideToast();
    if (toast.notification?.deepLink) {
      try {
        router.push(toast.notification.deepLink as Href);
      } catch (error) {
        logger.error('Navigation error', error);
      }
    }
  }, [toast.notification, hideToast, router]);

  // Subscribe to new notifications
  useNotificationToast(showToast);

  if (!toast.visible || !toast.notification) {
    return <>{children}</>;
  }

  const icon = ICONS[toast.notification.type] || 'notifications';

  return (
    <>
      {children}
      <Animated.View
        style={[
          styles.container,
          {
            top: insets.top + 10,
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Clickable onPress={handlePress}>
          <View style={[styles.toast, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={palette.tint} />
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
          </View>
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const icon = ICONS[notification.type] || 'notifications';

  return (
    <Clickable onPress={onPress}>
      <View style={[styles.toast, { backgroundColor: palette.surface, borderColor: palette.border }]}>
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
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    shadowColor: '#000',
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
