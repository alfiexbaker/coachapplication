/**
 * Notification Bell
 *
 * Bell icon with unread badge count. Tapping navigates to the notifications screen.
 * Displays a red dot when there are unread notifications.
 */

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotificationCount } from '@/hooks/use-notifications';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';

interface NotificationBellProps {
  size?: number;
  color?: string;
}

export function NotificationBell({ size = 24, color }: NotificationBellProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();
  const unreadCount = useNotificationCount();

  const iconColor = color || palette.text;

  const handlePress = () => {
    router.push('/(tabs)/notifications');
  };

  return (
    <Clickable onPress={handlePress}>
      <View style={styles.container}>
        <Ionicons name="notifications-outline" size={size} color={iconColor} />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: palette.error }]}>
            <ThemedText style={styles.badgeText}>
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
    minWidth: 18,
    height: 18,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.light.surface,
  },
  badgeText: {
    color: Colors.light.surface,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
