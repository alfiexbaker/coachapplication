/**
 * Hook: useCalendarSync
 *
 * Manages calendar sync settings state: load, save, toggle, export.
 * Used by app/settings/calendar-sync.tsx
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { calendarService } from '@/services/calendar-service';
import { bookingService } from '@/services/booking-service';
import { groupSessionService } from '@/services/group-session-service';
import { eventService } from '@/services/event';
import { createLogger } from '@/utils/logger';
import type { CalendarSyncSettings, CalendarProvider, CalendarEvent } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useCalendarSync');

export function useCalendarSync() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? 'current_user';

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [settingsOverride, setSettingsOverride] = useState<CalendarSyncSettings | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const defaultSettings = useMemo<CalendarSyncSettings>(
    () => ({
      ...calendarService.getDefaultSettings(),
      userId,
    }),
    [userId],
  );

  const loadSettings = useCallback(async () => {
    try {
      const existingSettings = await calendarService.getSyncSettings(userId);
      return ok<CalendarSyncSettings>(existingSettings ?? defaultSettings);
    } catch (loadError) {
      logger.error('Failed to load calendar settings', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load calendar settings.', loadError));
    }
  }, [defaultSettings, userId]);

  const {
    data,
    status,
    error: loadError,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<CalendarSyncSettings>({
    load: loadSettings,
    deps: [userId],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  useEffect(() => {
    if (data) {
      setSettingsOverride(data);
    }
  }, [data]);

  const settings = settingsOverride ?? data ?? defaultSettings;

  const saveSettings = useCallback(
    async (updates: Partial<CalendarSyncSettings>) => {
      const previousSettings = settings;
      const nextSettings: CalendarSyncSettings = { ...previousSettings, ...updates, userId };

      setIsSaving(true);
      setSettingsOverride(nextSettings);
      setActionError(null);

      try {
        const result = await calendarService.updateSyncSettings(userId, nextSettings);
        if (result.success && result.settings) {
          setSettingsOverride(result.settings);
        } else {
          setSettingsOverride(previousSettings);
          const message = result.error || 'Failed to save settings';
          setActionError(message);
          Alert.alert('Error', message);
        }
      } catch (saveError) {
        logger.error('Failed to save settings', saveError);
        setSettingsOverride(previousSettings);
        setActionError('Failed to save settings. Please try again.');
        Alert.alert('Error', 'Failed to save settings. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [settings, userId],
  );

  const handleToggleEnabled = useCallback(
    (enabled: boolean) => saveSettings({ enabled }),
    [saveSettings],
  );
  const handleToggleAutoSync = useCallback(
    (autoSync: boolean) => saveSettings({ autoSync }),
    [saveSettings],
  );
  const handleToggleLocation = useCallback(
    (includeLocation: boolean) => saveSettings({ includeLocation }),
    [saveSettings],
  );
  const handleToggleNotes = useCallback(
    (includeNotes: boolean) => saveSettings({ includeNotes }),
    [saveSettings],
  );
  const handleProviderChange = useCallback(
    (provider: CalendarProvider) => saveSettings({ provider }),
    [saveSettings],
  );
  const handleReminderChange = useCallback(
    (reminderMinutes: number) => saveSettings({ reminderMinutes }),
    [saveSettings],
  );

  const handleExportAllSessions = useCallback(async () => {
    setIsExporting(true);
    setActionError(null);
    try {
      const now = new Date();
      const allEvents: CalendarEvent[] = [];

      // Bookings
      const bookings = await bookingService.list();
      const upcomingBookings = bookings.filter((booking) => {
        if (booking.status === 'CANCELLED') return false;
        return new Date(booking.scheduledAt) > now;
      });
      allEvents.push(...upcomingBookings.map((b) => calendarService.bookingToEvent(b)));

      // Group sessions
      try {
        const coachSessions = await groupSessionService.getCoachSessions(userId);
        const activeSessions = coachSessions.filter(
          (s) => s.status !== 'CANCELLED' && s.status !== 'COMPLETED',
        );
        allEvents.push(...activeSessions.map((s) => calendarService.groupSessionToEvent(s)));
      } catch (gsError) {
        logger.warn('Could not fetch group sessions for export', gsError);
      }

      // Club events
      try {
        const upcomingEvents = await eventService.getUpcomingEvents(userId);
        allEvents.push(...upcomingEvents.map((e) => calendarService.clubEventToEvent(e)));
      } catch (evError) {
        logger.warn('Could not fetch club events for export', evError);
      }

      if (allEvents.length === 0) {
        Alert.alert('No Sessions', 'You have no upcoming sessions to export.');
        return;
      }

      const result = await calendarService.generateICSFileFromEvents(allEvents);
      if (!result.success || !result.filePath) {
        const message = result.error || 'Failed to export sessions.';
        setActionError(message);
        Alert.alert('Export Failed', message);
        return;
      }

      const isAvailable = await (await import('expo-sharing')).isAvailableAsync();
      if (!isAvailable) {
        setActionError('Sharing is not available on this device');
        Alert.alert('Export Failed', 'Sharing is not available on this device');
        return;
      }

      await (await import('expo-sharing')).shareAsync(result.filePath, {
        mimeType: 'text/calendar',
        dialogTitle: 'Export All Sessions',
        UTI: 'public.calendar-event',
      });
    } catch (exportError) {
      logger.error('Failed to export sessions', exportError);
      setActionError('Failed to export sessions. Please try again.');
      Alert.alert('Error', 'Failed to export sessions. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [userId]);

  const error =
    actionError ??
    (status === 'error'
      ? ((loadError as ServiceError | null)?.message ?? 'Failed to load calendar settings.')
      : null);

  return {
    isLoading: status === 'loading',
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    isSaving,
    isExporting,
    settings,
    handleToggleEnabled,
    handleToggleAutoSync,
    handleToggleLocation,
    handleToggleNotes,
    handleProviderChange,
    handleReminderChange,
    handleExportAllSessions,
  } satisfies {
    isLoading: boolean;
    status: ScreenStatus;
    error: string | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    isSaving: boolean;
    isExporting: boolean;
    settings: CalendarSyncSettings;
    handleToggleEnabled: (enabled: boolean) => void;
    handleToggleAutoSync: (autoSync: boolean) => void;
    handleToggleLocation: (includeLocation: boolean) => void;
    handleToggleNotes: (includeNotes: boolean) => void;
    handleProviderChange: (provider: CalendarProvider) => void;
    handleReminderChange: (reminderMinutes: number) => void;
    handleExportAllSessions: () => Promise<void>;
  };
}
