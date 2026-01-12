import { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsSection, SettingsToggleRow, SettingsRow } from '@/components/settings';
import { CalendarProviderSelect } from '@/components/calendar/CalendarProviderSelect';
import { SyncSettingsCard } from '@/components/calendar/SyncSettingsCard';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { calendarService } from '@/services/calendar-service';
import { bookingService } from '@/services/booking-service';
import { createLogger } from '@/utils/logger';
import type { CalendarSyncSettings, CalendarProvider } from '@/constants/types';

const logger = createLogger('CalendarSyncSettings');

export default function CalendarSyncScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [settings, setSettings] = useState<CalendarSyncSettings | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const userId = currentUser?.id ?? 'current_user';
      const existingSettings = await calendarService.getSyncSettings(userId);

      if (existingSettings) {
        setSettings(existingSettings);
      } else {
        // Initialize with defaults
        const defaults = calendarService.getDefaultSettings();
        setSettings({ ...defaults, userId });
      }
    } catch (error) {
      logger.error('Failed to load calendar settings', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = useCallback(
    async (updates: Partial<CalendarSyncSettings>) => {
      if (!settings) return;

      setIsSaving(true);
      try {
        const userId = currentUser?.id ?? 'current_user';
        const result = await calendarService.updateSyncSettings(userId, {
          ...settings,
          ...updates,
        });

        if (result.success && result.settings) {
          setSettings(result.settings);
          logger.debug('Settings saved successfully');
        } else {
          Alert.alert('Error', result.error || 'Failed to save settings');
        }
      } catch (error) {
        logger.error('Failed to save settings', error);
        Alert.alert('Error', 'Failed to save settings. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [settings, currentUser]
  );

  const handleToggleEnabled = useCallback(
    (enabled: boolean) => {
      saveSettings({ enabled });
    },
    [saveSettings]
  );

  const handleToggleAutoSync = useCallback(
    (autoSync: boolean) => {
      saveSettings({ autoSync });
    },
    [saveSettings]
  );

  const handleToggleLocation = useCallback(
    (includeLocation: boolean) => {
      saveSettings({ includeLocation });
    },
    [saveSettings]
  );

  const handleToggleNotes = useCallback(
    (includeNotes: boolean) => {
      saveSettings({ includeNotes });
    },
    [saveSettings]
  );

  const handleProviderChange = useCallback(
    (provider: CalendarProvider) => {
      saveSettings({ provider });
    },
    [saveSettings]
  );

  const handleReminderChange = useCallback(
    (reminderMinutes: number) => {
      saveSettings({ reminderMinutes });
    },
    [saveSettings]
  );

  const handleExportAllSessions = async () => {
    setIsExporting(true);
    try {
      const bookings = await bookingService.list();
      const upcomingBookings = bookings.filter((booking) => {
        if (booking.status === 'CANCELLED') return false;
        const bookingDate = new Date(booking.scheduledAt);
        return bookingDate > new Date();
      });

      if (upcomingBookings.length === 0) {
        Alert.alert('No Sessions', 'You have no upcoming sessions to export.');
        return;
      }

      const result = await calendarService.exportMultipleToCalendar(upcomingBookings);

      if (!result.success) {
        Alert.alert('Export Failed', result.error || 'Failed to export sessions.');
      }
    } catch (error) {
      logger.error('Failed to export sessions', error);
      Alert.alert('Error', 'Failed to export sessions. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Calendar Sync
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.accent} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading settings...
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
          Calendar Sync
        </ThemedText>
        {isSaving ? (
          <ActivityIndicator size="small" color={palette.accent} />
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Enable Sync Section */}
        <SettingsSection title="Sync Settings">
          <SettingsToggleRow
            icon="sync"
            title="Enable Calendar Sync"
            subtitle="Sync your sessions with your calendar"
            value={settings?.enabled ?? false}
            onValueChange={handleToggleEnabled}
          />
          <SettingsToggleRow
            icon="flash"
            title="Auto-Sync New Bookings"
            subtitle="Automatically add new bookings to calendar"
            value={settings?.autoSync ?? false}
            onValueChange={handleToggleAutoSync}
            disabled={!settings?.enabled}
          />
        </SettingsSection>

        {/* Calendar Provider */}
        <SettingsSection title="Calendar Provider">
          <CalendarProviderSelect
            selectedProvider={settings?.provider ?? 'APPLE'}
            onProviderChange={handleProviderChange}
            disabled={!settings?.enabled}
          />
        </SettingsSection>

        {/* Event Details */}
        <SettingsSection title="Event Details">
          <SettingsToggleRow
            icon="location"
            title="Include Location"
            subtitle="Add session location to calendar events"
            value={settings?.includeLocation ?? true}
            onValueChange={handleToggleLocation}
            disabled={!settings?.enabled}
          />
          <SettingsToggleRow
            icon="document-text"
            title="Include Notes"
            subtitle="Add session notes and details"
            value={settings?.includeNotes ?? true}
            onValueChange={handleToggleNotes}
            disabled={!settings?.enabled}
          />
        </SettingsSection>

        {/* Reminder Settings */}
        <SettingsSection title="Reminders">
          <SyncSettingsCard
            reminderMinutes={settings?.reminderMinutes ?? 60}
            onReminderChange={handleReminderChange}
            disabled={!settings?.enabled}
          />
        </SettingsSection>

        {/* Export Actions */}
        <SettingsSection title="Export">
          <View style={styles.exportSection}>
            <ThemedText style={[styles.exportDescription, { color: palette.muted }]}>
              Export all your upcoming sessions to your calendar app.
            </ThemedText>
            <Button
              onPress={handleExportAllSessions}
              disabled={isExporting}
              variant="primary"
              style={styles.exportButton}
            >
              {isExporting ? (
                <View style={styles.exportButtonContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <ThemedText style={styles.exportButtonText}>Exporting...</ThemedText>
                </View>
              ) : (
                <View style={styles.exportButtonContent}>
                  <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.exportButtonText}>Export All Sessions</ThemedText>
                </View>
              )}
            </Button>
          </View>
        </SettingsSection>

        {/* Last Sync Info */}
        {settings?.lastSyncAt && (
          <View style={styles.lastSyncContainer}>
            <ThemedText style={[styles.lastSyncText, { color: palette.muted }]}>
              Last synced: {new Date(settings.lastSyncAt).toLocaleString()}
            </ThemedText>
          </View>
        )}

        {/* Info text */}
        <View style={styles.infoContainer}>
          <ThemedText style={[styles.infoText, { color: palette.muted }]}>
            Calendar sync allows you to keep your training sessions organized in your preferred
            calendar app. Sessions will appear with all relevant details including location,
            coach information, and session notes.
          </ThemedText>
        </View>
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
    gap: Spacing.lg,
  },
  exportSection: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  exportDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  exportButton: {
    marginTop: Spacing.xs,
  },
  exportButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  lastSyncContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  lastSyncText: {
    fontSize: 12,
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
