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
import { createLogger } from '@/utils/logger';
import type { CalendarSyncSettings, CalendarProvider } from '@/constants/types';
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
      const bookings = await bookingService.list();
      const upcomingBookings = bookings.filter((booking) => {
        if (booking.status === 'CANCELLED') return false;
        return new Date(booking.scheduledAt) > new Date();
      });
      if (upcomingBookings.length === 0) {
        Alert.alert('No Sessions', 'You have no upcoming sessions to export.');
        return;
      }
      const result = await calendarService.exportMultipleToCalendar(upcomingBookings);
      if (!result.success) {
        const message = result.error || 'Failed to export sessions.';
        setActionError(message);
        Alert.alert('Export Failed', message);
      }
    } catch (exportError) {
      logger.error('Failed to export sessions', exportError);
      setActionError('Failed to export sessions. Please try again.');
      Alert.alert('Error', 'Failed to export sessions. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, []);

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
