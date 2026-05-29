import { useState } from 'react';

import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/primitives/screen-header';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/use-notifications';
import { useToast } from '@/components/ui/toast';
import { NotificationsPanel } from '@/components/notification/notifications-panel';
import { NotificationsActionsBar } from '@/components/notification/notifications-actions-bar';

import { runAsyncFinally } from '@/utils/async-control';

// Re-export NotificationsPanel for backward compatibility
export { NotificationsPanel } from '@/components/notification/notifications-panel';

export default function NotificationsScreen() {
  const { colors: palette } = useTheme();
  const [refreshToken, setRefreshToken] = useState(0);
  const [seedOnMount, setSeedOnMount] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [clearingAllLoading, setClearingAllLoading] = useState(false);
  const { unreadCount, markAllAsRead, clearAll } = useNotifications();
  const { showToast } = useToast();

  const handleClearAll = async () => {
    setClearingAllLoading(true);
    setSeedOnMount(false);

    await runAsyncFinally(async () => {
      await clearAll();
      setRefreshToken((token) => token + 1);
      showToast('Notifications cleared', 'success');
    }, () => {
      setClearingAllLoading(false);
    });
  };

  const handleMarkAllRead = async () => {
    if (unreadCount <= 0 || markingAllRead) return;

    const performMarkAllRead = async () => {
      setMarkingAllRead(true);

      await runAsyncFinally(async () => {
        await markAllAsRead();
        setRefreshToken((token) => token + 1);
        showToast(
          `${unreadCount} notification${unreadCount === 1 ? '' : 's'} marked as read`,
          'success',
        );
      }, () => {
        setMarkingAllRead(false);
      });
    };

    await performMarkAllRead();
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScreenHeader title="Notifications" />
      <NotificationsActionsBar
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkAllRead}
        onClearAll={handleClearAll}
        markingAllRead={markingAllRead}
        clearingAll={clearingAllLoading}
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
