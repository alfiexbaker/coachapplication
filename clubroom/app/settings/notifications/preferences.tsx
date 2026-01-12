/**
 * Notification Preferences Screen
 *
 * Full preferences UI for configuring notification settings.
 *
 * Features:
 * - Configure quiet hours (time range when notifications are paused)
 * - Toggle notification channels (push, email, SMS)
 * - Opt-out by notification type (grouped by category)
 * - Manage muted coaches
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import {
  QuietHoursSelector,
  ChannelToggle,
  NotificationTypeList,
  MutedCoachesList,
} from '@/components/notification';
import { notificationService } from '@/services/notification-service';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import type {
  EnhancedNotificationPreferences,
  NotificationChannel,
  NotificationType,
  QuietHours,
} from '@/constants/types';

const logger = createLogger('NotificationPreferences');

export default function NotificationPreferencesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [preferences, setPreferences] = useState<EnhancedNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const userId = currentUser?.id ?? 'demo_user';

  // Load preferences
  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await notificationService.getPreferences(userId);
      setPreferences(prefs);
    } catch (error) {
      logger.error('Failed to load preferences', { error });
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadPreferences();
      setLoading(false);
    };
    init();
  }, [loadPreferences]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPreferences();
    setRefreshing(false);
  }, [loadPreferences]);

  // Handle quiet hours change
  const handleQuietHoursChange = useCallback(
    async (quietHours: QuietHours) => {
      if (!preferences) return;

      setUpdating(true);
      try {
        const updated = await notificationService.setQuietHours(
          userId,
          quietHours.startTime,
          quietHours.endTime,
          quietHours.enabled
        );
        setPreferences(updated);
        logger.info('Quiet hours updated', { quietHours });
      } catch (error) {
        logger.error('Failed to update quiet hours', { error });
      } finally {
        setUpdating(false);
      }
    },
    [preferences, userId]
  );

  // Handle channel toggle
  const handleChannelToggle = useCallback(
    async (channel: NotificationChannel, enabled: boolean) => {
      if (!preferences) return;

      setUpdating(true);
      try {
        const updated = await notificationService.toggleChannel(userId, channel, enabled);
        setPreferences(updated);
        logger.info('Channel toggled', { channel, enabled });
      } catch (error) {
        logger.error('Failed to toggle channel', { error });
      } finally {
        setUpdating(false);
      }
    },
    [preferences, userId]
  );

  // Handle notification type toggle
  const handleTypeToggle = useCallback(
    async (type: NotificationType, enabled: boolean) => {
      if (!preferences) return;

      setUpdating(true);
      try {
        const updated = await notificationService.toggleNotificationType(userId, type, enabled);
        setPreferences(updated);
        logger.info('Notification type toggled', { type, enabled });
      } catch (error) {
        logger.error('Failed to toggle notification type', { error });
      } finally {
        setUpdating(false);
      }
    },
    [preferences, userId]
  );

  // Handle unmute coach
  const handleUnmuteCoach = useCallback(
    async (coachId: string) => {
      if (!preferences) return;

      setUpdating(true);
      try {
        const updated = await notificationService.unmuteCoach(userId, coachId);
        setPreferences(updated);
        logger.info('Coach unmuted', { coachId });
      } catch (error) {
        logger.error('Failed to unmute coach', { error });
      } finally {
        setUpdating(false);
      }
    },
    [preferences, userId]
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Notification Preferences
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.accent} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading preferences...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>
          Notification Preferences
        </ThemedText>
        <View style={{ width: 24 }}>
          {updating && <ActivityIndicator size="small" color={palette.accent} />}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.accent}
          />
        }
      >
        {preferences && (
          <>
            {/* Quiet Hours Section */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
                QUIET HOURS
              </ThemedText>
              <QuietHoursSelector
                value={preferences.quietHours}
                onChange={handleQuietHoursChange}
                disabled={updating}
                loading={updating}
              />
            </View>

            {/* Notification Channels Section */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
                NOTIFICATION CHANNELS
              </ThemedText>
              <ChannelToggle
                value={preferences.channels}
                onChange={handleChannelToggle}
                disabled={updating}
                loading={updating}
              />
            </View>

            {/* Notification Types Section */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
                NOTIFICATION TYPES
              </ThemedText>
              <ThemedText style={[styles.sectionDescription, { color: palette.muted }]}>
                Choose which notifications you want to receive. Tap a category to expand.
              </ThemedText>
              <NotificationTypeList
                typePreferences={preferences.typePreferences}
                onToggle={handleTypeToggle}
                disabled={updating}
                loading={updating}
              />
            </View>

            {/* Muted Coaches Section */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
                MUTED COACHES
              </ThemedText>
              <MutedCoachesList
                mutedCoaches={preferences.mutedCoaches}
                onUnmute={handleUnmuteCoach}
                disabled={updating}
                loading={updating}
              />
            </View>

            {/* Info Text */}
            <View style={styles.infoContainer}>
              <ThemedText style={[styles.infoText, { color: palette.muted }]}>
                Some critical notifications like account security and payment issues cannot be disabled.
              </ThemedText>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoContainer: {
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
