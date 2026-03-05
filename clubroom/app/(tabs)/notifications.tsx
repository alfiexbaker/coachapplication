import { useCallback, useState } from 'react';

import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/primitives/screen-header';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/use-notifications';
import { useToast } from '@/components/ui/toast';
import { NotificationsPanel } from '@/components/notification/notifications-panel';
import { NotificationsActionsBar } from '@/components/notification/notifications-actions-bar';
import { uiFeedback } from '@/services/ui-feedback';

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

  const handleClearAll = useCallback(async () => {
    setClearingAllLoading(true);
    setSeedOnMount(false);
    try {
      await clearAll();
      setRefreshToken((token) => token + 1);
      showToast('Notifications cleared', 'success');
    } finally {
      setClearingAllLoading(false);
    }
  }, [clearAll, showToast]);

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount <= 0 || markingAllRead) return;

    const performMarkAllRead = async () => {
      setMarkingAllRead(true);
      try {
        await markAllAsRead();
        setRefreshToken((token) => token + 1);
        showToast(
          `${unreadCount} notification${unreadCount === 1 ? '' : 's'} marked as read`,
          'success',
        );
      } finally {
        setMarkingAllRead(false);
      }
    };

    if (unreadCount > 20) {
      uiFeedback.alert(
        'Mark all as read?',
        `This will mark ${unreadCount} notifications as read.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Mark All Read', onPress: () => void performMarkAllRead() },
        ],
      );
      return;
    }

    await performMarkAllRead();
  }, [markAllAsRead, unreadCount, markingAllRead, showToast]);

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
