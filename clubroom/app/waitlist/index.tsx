import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { WaitlistCard } from '@/components/waitlist/WaitlistCard';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { waitlistService } from '@/services/waitlist-service';
import { createLogger } from '@/utils/logger';
import type { WaitlistEntry } from '@/constants/types';

const logger = createLogger('WaitlistScreen');

export default function WaitlistScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWaitlists = useCallback(async () => {
    if (!currentUser) return;

    try {
      const data = await waitlistService.getUserWaitlists(currentUser.id);
      setEntries(data);
    } catch (error) {
      logger.error('Failed to load waitlists', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadWaitlists();
  }, [loadWaitlists]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadWaitlists();
  };

  const handleLeaveWaitlist = async (entryId: string) => {
    try {
      await waitlistService.leaveWaitlist(entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (error) {
      logger.error('Failed to leave waitlist', error);
    }
  };

  const handleToggleAutoBook = async (entryId: string, currentValue: boolean) => {
    try {
      const updated = await waitlistService.updateAutoBook(entryId, !currentValue);
      if (updated) {
        setEntries((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, autoBook: !currentValue } : e))
        );
      }
    } catch (error) {
      logger.error('Failed to update auto-book', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">My Waitlists</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {entries.length === 0
              ? 'No waitlists joined'
              : `${entries.length} ${entries.length === 1 ? 'session' : 'sessions'} waiting`}
          </ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.tint}
          />
        }
      >
        {entries.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="No Waitlists"
            message="When you join a waitlist for a full session, it will appear here. You'll be notified when a spot opens up."
            actionLabel="Browse Sessions"
            onPressAction={() => router.push('/group-sessions')}
          />
        ) : (
          <View style={styles.list}>
            {entries.map((entry, index) => (
              <Animated.View key={entry.id} entering={FadeInDown.delay(index * 50).springify()}>
                <WaitlistCard
                  entry={entry}
                  onLeave={() => handleLeaveWaitlist(entry.id)}
                  onToggleAutoBook={() => handleToggleAutoBook(entry.id, entry.autoBook)}
                />
              </Animated.View>
            ))}
          </View>
        )}

        {entries.length > 0 && (
          <View style={[styles.infoCard, { backgroundColor: `${palette.tint}08` }]}>
            <View style={styles.infoRow}>
              <Ionicons name="flash" size={16} color={palette.tint} />
              <ThemedText style={[styles.infoText, { color: palette.muted }]}>
                <ThemedText style={{ fontWeight: '600', color: palette.tint }}>Auto-book</ThemedText>
                {' '}automatically reserves your spot when available
              </ThemedText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="notifications" size={16} color={palette.tint} />
              <ThemedText style={[styles.infoText, { color: palette.muted }]}>
                You&apos;ll receive a notification when a spot opens up
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  list: {
    gap: Spacing.md,
  },
  infoCard: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
