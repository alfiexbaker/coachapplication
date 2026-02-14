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
import { Radii, Spacing } from '@/constants/theme';
import { useNotificationCount } from '@/hooks/use-notifications';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';

interface NotificationBellProps {
  size?: number;
  color?: string;
}

export function NotificationBell({ size = 24, color }: NotificationBellProps) {
  const { colors: palette } = useTheme();
  const router = useRouter();
  const unreadCount = useNotificationCount();

  const iconColor = color || palette.text;

  const handlePress = () => {
    router.push(Routes.NOTIFICATIONS);
  };

  return (
    <Clickable onPress={handlePress}>
      <View style={styles.container}>
        <Ionicons name="notifications-outline" size={size} color={iconColor} />
        {unreadCount > 0 && (
          <View
            style={[styles.badge, { backgroundColor: palette.error, borderColor: palette.surface }]}
          >
            <ThemedText style={[styles.badgeText, { color: palette.onError }]}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </ThemedText>
          </View>
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
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.micro + 1,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700', lineHeight: 11, letterSpacing: -0.1 },
});
