import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/primitives/screen-header';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationsPanel } from '@/components/notification/notifications-panel';
import { NotificationsActionsBar } from '@/components/notification/notifications-actions-bar';

// Re-export NotificationsPanel for backward compatibility
export { NotificationsPanel } from '@/components/notification/notifications-panel';

export default function NotificationsScreen() {
  const { colors: palette } = useTheme();
  const [refreshToken, setRefreshToken] = useState(0);
  const [seedOnMount, setSeedOnMount] = useState(true);
  const { unreadCount, markAllAsRead, clearAll } = useNotifications();

  const handleClearAll = useCallback(async () => {
    setSeedOnMount(false);
    await clearAll();
    setRefreshToken((token) => token + 1);
  }, [clearAll]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead();
    setRefreshToken((token) => token + 1);
  }, [markAllAsRead]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <ScreenHeader title="Notifications" />
      <NotificationsActionsBar
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkAllRead}
        onClearAll={handleClearAll}
      />
      <NotificationsPanel seedOnMount={seedOnMount} refreshToken={refreshToken} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
