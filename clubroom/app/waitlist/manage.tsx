import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { WaitlistManage } from '@/components/waitlist/WaitlistManage';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { waitlistService } from '@/services/waitlist-service';
import type { WaitlistEntry, WaitlistSummary } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('WaitlistManage');

export default function ManageWaitlistScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [summaries, setSummaries] = useState<WaitlistSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionEntries, setSessionEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadWaitlists = useCallback(async () => {
    if (!currentUser) return;

    try {
      const data = await waitlistService.getCoachWaitlistSummaries(currentUser.id);
      setSummaries(data);

      // If a session was selected, reload its entries
      if (selectedSession) {
        const entries = await waitlistService.getSessionWaitlist(selectedSession);
        setSessionEntries(entries);
      }
    } catch (error) {
      logger.error('Failed to load waitlists', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, selectedSession]);

  useEffect(() => {
    loadWaitlists();
  }, [loadWaitlists]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadWaitlists();
  };

  const handleSelectSession = async (sessionId: string) => {
    if (selectedSession === sessionId) {
      setSelectedSession(null);
      setSessionEntries([]);
      return;
    }

    setSelectedSession(sessionId);
    try {
      const entries = await waitlistService.getSessionWaitlist(sessionId);
      setSessionEntries(entries);
    } catch (error) {
      logger.error('Failed to load session waitlist', error);
    }
  };

  const handleNotifyNext = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      const result = await waitlistService.notifyNextInLine(sessionId);
      if (result) {
        Alert.alert(
          'Notification Sent',
          `${result.userName} has been notified that a spot is available.`
        );
        loadWaitlists();
      } else {
        Alert.alert('No One on Waitlist', 'There is no one waiting for this session.');
      }
    } catch (error) {
      logger.error('Failed to notify', error);
      Alert.alert('Error', 'Failed to send notification. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromote = async (sessionId: string) => {
    Alert.alert(
      'Promote from Waitlist',
      'This will automatically book the next person in line. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            setActionLoading(sessionId);
            try {
              const result = await waitlistService.promoteFromWaitlist(sessionId);
              if (result.success && result.entry) {
                Alert.alert(
                  'Success',
                  `${result.entry.userName} has been booked for the session.`
                );
                loadWaitlists();
              } else {
                Alert.alert('Error', result.error || 'Failed to promote from waitlist.');
              }
            } catch (error) {
              logger.error('Failed to promote', error);
              Alert.alert('Error', 'Failed to promote. Please try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRemoveEntry = async (entryId: string, userName: string) => {
    Alert.alert(
      'Remove from Waitlist',
      `Remove ${userName} from the waitlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(entryId);
            try {
              await waitlistService.removeFromWaitlist(entryId);
              setSessionEntries((prev) => prev.filter((e) => e.id !== entryId));
              loadWaitlists();
            } catch (error) {
              logger.error('Failed to remove', error);
              Alert.alert('Error', 'Failed to remove. Please try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
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

  const totalWaiting = summaries.reduce((sum, s) => sum + s.totalWaiting, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Manage Waitlists</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {totalWaiting === 0
              ? 'No one waiting'
              : `${totalWaiting} ${totalWaiting === 1 ? 'person' : 'people'} across ${summaries.length} ${summaries.length === 1 ? 'session' : 'sessions'}`}
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
        {summaries.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No Waitlists"
            message="When athletes join waitlists for your full sessions, they will appear here for you to manage."
          />
        ) : (
          <View style={styles.list}>
            {summaries.map((summary, index) => (
              <Animated.View key={summary.sessionId} entering={FadeInDown.delay(index * 50).springify()}>
                <WaitlistManage
                  summary={summary}
                  entries={selectedSession === summary.sessionId ? sessionEntries : []}
                  isExpanded={selectedSession === summary.sessionId}
                  isLoading={actionLoading === summary.sessionId}
                  onToggleExpand={() => handleSelectSession(summary.sessionId)}
                  onNotifyNext={() => handleNotifyNext(summary.sessionId)}
                  onPromote={() => handlePromote(summary.sessionId)}
                  onRemoveEntry={(entryId, userName) => handleRemoveEntry(entryId, userName)}
                />
              </Animated.View>
            ))}
          </View>
        )}

        {summaries.length > 0 && (
          <View style={[styles.quickActions, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ThemedText type="defaultSemiBold" style={styles.quickActionsTitle}>
              Quick Actions
            </ThemedText>
            <View style={styles.actionButtons}>
              <Clickable
                onPress={() => summaries.forEach((s) => handleNotifyNext(s.sessionId))}
                style={[styles.actionButton, { backgroundColor: `${palette.tint}10` }]}
              >
                <Ionicons name="notifications-outline" size={18} color={palette.tint} />
                <ThemedText style={[styles.actionButtonText, { color: palette.tint }]}>
                  Notify All Next
                </ThemedText>
              </Clickable>
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
  quickActions: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  quickActionsTitle: {
    marginBottom: Spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
