import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationCard } from '@/components/notification/notification-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { notificationService } from '@/services/notification-service';
import { NotificationItem } from '@/constants/types';
import { Clickable } from '@/components/primitives/clickable';

const seedNotifications: NotificationItem[] = [
  { id: 'n1', type: 'booking', title: 'Booking confirmed', body: 'Tom - 5pm with Sarah at Hyde Park', timeLabel: '2h ago', read: false },
  { id: 'n2', type: 'message', title: 'New message', body: 'Coach Sarah sent a message', timeLabel: '3h ago', read: true },
  { id: 'n3', type: 'review', title: 'Review request', body: 'Rate your last session with Mike', timeLabel: '1d ago', read: false },
];

export default function NotificationsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    notificationService.clearAll();
    seedNotifications.forEach((n) => notificationService.create(n));
    refresh();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    const list = await notificationService.list();
    setItems(list);
    setRefreshing(false);
  };

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    refresh();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <View style={styles.header}>
        <ThemedText type="title">Notifications</ThemedText>
        <Clickable onPress={() => notificationService.clearAll().then(refresh)}>
          <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Clear all</ThemedText>
        </Clickable>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {items.map((item) => (
          <Clickable key={item.id} onPress={() => markAsRead(item.id)}>
            <NotificationCard item={item} />
          </Clickable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
});
