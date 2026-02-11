import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import {
  WaitlistManageHeader,
  WaitlistQuickActions,
  WaitlistSessionList,
} from '@/components/waitlist/waitlist-manage-screen-sections';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { waitlistService } from '@/services/waitlist-service';
import type { WaitlistEntry, WaitlistSummary } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError } from '@/types/result';

const logger = createLogger('WaitlistManage');

type WaitlistManageData = {
  summaries: WaitlistSummary[];
  sessionEntries: WaitlistEntry[];
};

export default function ManageWaitlistScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadWaitlists = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<WaitlistManageData>({ summaries: [], sessionEntries: [] });
    }

    try {
      const summariesResult = await waitlistService.getCoachWaitlistSummaries(currentUser.id);
      if (!summariesResult.success) {
        logger.error('Failed to load waitlist summaries', summariesResult.error);
        return err(serviceError('UNKNOWN', summariesResult.error.message || 'Failed to load waitlists.'));
      }

      if (!selectedSession) {
        return ok<WaitlistManageData>({ summaries: summariesResult.data, sessionEntries: [] });
      }

      const entriesResult = await waitlistService.getSessionWaitlist(selectedSession);
      if (!entriesResult.success) {
        logger.error('Failed to load session waitlist', entriesResult.error);
        return err(serviceError('UNKNOWN', entriesResult.error.message || 'Failed to load session waitlist.'));
      }

      return ok<WaitlistManageData>({ summaries: summariesResult.data, sessionEntries: entriesResult.data });
    } catch (loadError) {
      logger.error('Failed to load waitlists', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load waitlists.', loadError));
    }
  }, [currentUser, selectedSession]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<WaitlistManageData>({
    load: loadWaitlists,
    deps: [currentUser?.id, selectedSession],
    isEmpty: (value) => value.summaries.length === 0,
    refetchOnFocus: true,
  });

  const summaries = data?.summaries ?? [];
  const sessionEntries = data?.sessionEntries ?? [];

  const handleNotifyNext = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      const result = await waitlistService.notifyNextInLine(sessionId);
      if (!result.success) {
        logger.error('Failed to notify', result.error);
        Alert.alert('Error', 'Failed to send notification. Please try again.');
        return;
      }

      if (result.data) {
        Alert.alert('Notification Sent', `${result.data.userId} has been notified that a spot is available.`);
        onRefresh();
      } else {
        Alert.alert('No One on Waitlist', 'There is no one waiting for this session.');
      }
    } catch (notifyError) {
      logger.error('Failed to notify', notifyError);
      Alert.alert('Error', 'Failed to send notification. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromote = async (sessionId: string) => {
    Alert.alert('Promote from Waitlist', 'This will automatically book the next person in line. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Promote',
        onPress: async () => {
          setActionLoading(sessionId);
          try {
            const result = await waitlistService.promoteFromWaitlist(sessionId);
            if (!result.success) {
              Alert.alert('Error', result.error.message || 'Failed to promote from waitlist.');
              return;
            }

            if (result.data.success && result.data.entry) {
              Alert.alert('Success', `${result.data.entry.userId} has been booked for the session.`);
              onRefresh();
            } else {
              Alert.alert('Error', result.data.error || 'Failed to promote from waitlist.');
            }
          } catch (promoteError) {
            logger.error('Failed to promote', promoteError);
            Alert.alert('Error', 'Failed to promote. Please try again.');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleRemoveEntry = async (entryId: string, userName: string) => {
    Alert.alert('Remove from Waitlist', `Remove ${userName} from the waitlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(entryId);
          try {
            const removeResult = await waitlistService.removeFromWaitlist(entryId);
            if (removeResult.success && removeResult.data) {
              onRefresh();
            } else {
              logger.error('Failed to remove', removeResult.success ? undefined : removeResult.error);
              Alert.alert('Error', 'Failed to remove. Please try again.');
            }
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <ErrorState message={error?.message ?? 'Failed to load waitlist management data.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  const totalWaiting = summaries.reduce((sum, summary) => sum + summary.totalWaiting, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <WaitlistManageHeader
        colors={palette}
        totalWaiting={totalWaiting}
        summariesCount={summaries.length}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />}
      >
        {summaries.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No Waitlists"
            message="When athletes join waitlists for your full sessions, they will appear here for you to manage."
          />
        ) : (
          <WaitlistSessionList
            summaries={summaries}
            selectedSession={selectedSession}
            sessionEntries={sessionEntries}
            actionLoading={actionLoading}
            onToggle={(sessionId) => setSelectedSession((current) => (current === sessionId ? null : sessionId))}
            onNotify={handleNotifyNext}
            onPromote={handlePromote}
            onRemove={handleRemoveEntry}
          />
        )}

        <WaitlistQuickActions colors={palette} summaries={summaries} onNotify={handleNotifyNext} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
});
