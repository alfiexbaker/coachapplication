/**
 * Notification Bell
 *
 * Bell icon with unread badge count. Tapping navigates to the notifications screen.
 * Displays a red dot when there are unread notifications.
 */

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useNotificationBadgeState } from '@/hooks/use-notifications';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';

interface NotificationBellProps {
  size?: number;
  color?: string;
}

export function NotificationBell({ size = 24, color }: NotificationBellProps) {
  const { colors: palette } = useTheme();
  const { push } = useRouter();
  const badgeState = useNotificationBadgeState();

  const iconColor = color || palette.text;

  const handlePress = () => {
    push(Routes.NOTIFICATIONS);
  };

  return (
    <Clickable onPress={handlePress} accessibilityLabel="Open notifications">
      <View style={styles.container}>
        <Ionicons name="notifications-outline" size={size} color={iconColor} />
        {badgeState.variant === 'count' && badgeState.label ? (
          <View
            style={[styles.badge, { backgroundColor: palette.error, borderColor: palette.surface }]}
          >
            <ThemedText style={[styles.badgeText, { color: palette.onError }]}>
              {badgeState.label}
            </ThemedText>
          </View>
        ) : null}
        {badgeState.variant === 'dot' && (
          <View
            style={[
              styles.dot,
              { backgroundColor: palette.error, borderColor: palette.surface },
            ]}
          />
        )}
      </View>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: Spacing.xxs,
    right: Spacing.micro,
    minWidth: 16,
    height: 16,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.micro + 1,
    borderWidth: 1,
  },
  badgeText: { fontSize: Typography.micro.fontSize, fontWeight: '700', lineHeight: 11, letterSpacing: -0.1 },
  dot: {
    position: 'absolute',
    top: Spacing.xs - 1,
    right: Spacing.xs - 1,
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
});
