import { useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { WaitlistCard } from '@/components/waitlist/WaitlistCard';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { waitlistService } from '@/services/waitlist-service';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError } from '@/types/result';
import type { WaitlistEntry } from '@/constants/types';

const logger = createLogger('WaitlistScreen');

export default function WaitlistScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const loadWaitlists = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<WaitlistEntry[]>([]);
    }

    try {
      const result = await waitlistService.getUserWaitlists(currentUser.id);
      if (result.success) {
        return ok(result.data);
      }

      logger.error('Failed to load waitlists', result.error);
      return err(serviceError('UNKNOWN', result.error.message || 'Failed to load waitlists.'));
    } catch (loadError) {
      logger.error('Failed to load waitlists', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load waitlists.', loadError));
    }
  }, [currentUser]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<WaitlistEntry[]>({
    load: loadWaitlists,
    deps: [currentUser?.id],
    isEmpty: (value) => value.length === 0,
    refetchOnFocus: true,
  });

  const entries = data ?? [];

  const handleLeaveWaitlist = async (entryId: string) => {
    const result = await waitlistService.leaveWaitlist(entryId);
    if (!result.success || !result.data) {
      logger.error('Failed to leave waitlist', result.success ? undefined : result.error);
      return;
    }
    onRefresh();
  };

  const handleToggleAutoBook = async (entryId: string, currentValue: boolean) => {
    const result = await waitlistService.updateAutoBook(entryId, !currentValue);
    if (!result.success || !result.data) {
      logger.error('Failed to update auto-book', result.error);
      return;
    }
    onRefresh();
  };

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState message={error?.message ?? 'Failed to load waitlists.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <Row align="center" gap="md" style={styles.header}>
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
      </Row>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        {entries.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="No Waitlists"
            message="When you join a waitlist for a full session, it will appear here. You'll be notified when a spot opens up."
            actionLabel="Browse Sessions"
            onPressAction={() => router.push(Routes.GROUP_SESSIONS)}
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
          <View style={[styles.infoCard, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
            <Row align="start" gap="sm" style={styles.infoRow}>
              <Ionicons name="flash" size={16} color={palette.tint} />
              <ThemedText style={[styles.infoText, { color: palette.muted }]}>
                <ThemedText style={{ fontWeight: '600', color: palette.tint }}>
                  Auto-book
                </ThemedText>{' '}
                automatically reserves your spot when available
              </ThemedText>
            </Row>
            <Row align="start" gap="sm" style={styles.infoRow}>
              <Ionicons name="notifications" size={16} color={palette.tint} />
              <ThemedText style={[styles.infoText, { color: palette.muted }]}>
                You&apos;ll receive a notification when a spot opens up
              </ThemedText>
            </Row>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    ...Typography.small,
    marginTop: Spacing.micro,
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
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  infoRow: {},
  infoText: {
    flex: 1,
    ...Typography.small,
  },
});
