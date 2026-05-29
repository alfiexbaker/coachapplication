/**
 * Hook: useCalendarSync
 *
 * Manages calendar sync settings state: load, save, toggle, export.
 * Used by app/settings/calendar-sync.tsx
 */

import { useState, useEffect, startTransition } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { calendarService } from '@/services/calendar-service';
import { bookingService } from '@/services/booking-service';
import { groupSessionService } from '@/services/group-session-service';
import { eventService } from '@/services/event';
import { createLogger } from '@/utils/logger';
import type { CalendarSyncSettings, CalendarProvider, CalendarEvent } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('useCalendarSync');

function loadExpoSharing() {
  return import('expo-sharing');
}

export function useCalendarSync() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? 'current_user';

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [settingsOverride, setSettingsOverride] = useState<CalendarSyncSettings | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const defaultSettings = ({
    ...calendarService.getDefaultSettings(),
    userId,
  });

  const loadSettings = async () => {
    try {
      const existingSettings = await calendarService.getSyncSettings(userId);
      return ok<CalendarSyncSettings>(existingSettings ?? defaultSettings);
    } catch (loadError) {
      logger.error('Failed to load calendar settings', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load calendar settings.', loadError));
    }
  };

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
    loadingStrategy: 'section-skeleton',
    dataKey: `calendar-sync:${userId}`,
  });

  useEffect(() => {
    if (data) {
      startTransition(() => {
        setSettingsOverride(data);
      });
    }
  }, [data]);

  const settings = settingsOverride ?? data ?? defaultSettings;

  const saveSettings = async (updates: Partial<CalendarSyncSettings>) => {
    const previousSettings = settings;
    const nextSettings: CalendarSyncSettings = { ...previousSettings, ...updates, userId };

    setIsSaving(true);
    setSettingsOverride(nextSettings);
    setActionError(null);

    await runAsyncTryCatchFinally(async () => {
      const result = await calendarService.updateSyncSettings(userId, nextSettings);
      if (result.success && result.settings) {
        setSettingsOverride(result.settings);
      } else {
        setSettingsOverride(previousSettings);
        const message = result.error || 'Failed to save settings';
        setActionError(message);
        uiFeedback.showToast(message, 'error');
      }
    }, async saveError => {
      logger.error('Failed to save settings', saveError);
      setSettingsOverride(previousSettings);
      setActionError('Failed to save settings. Please try again.');
      uiFeedback.showToast('Failed to save settings. Please try again.', 'error');
    }, () => {
      setIsSaving(false);
    });
  };

  const handleToggleEnabled = (enabled: boolean) => saveSettings({ enabled });
  const handleToggleAutoSync = (autoSync: boolean) => saveSettings({ autoSync });
  const handleToggleLocation = (includeLocation: boolean) => saveSettings({ includeLocation });
  const handleToggleNotes = (includeNotes: boolean) => saveSettings({ includeNotes });
  const handleProviderChange = (provider: CalendarProvider) => saveSettings({ provider });
  const handleReminderChange = (reminderMinutes: number) => saveSettings({ reminderMinutes });

  const handleExportAllSessions = async () => {
    setIsExporting(true);
    setActionError(null);

    return await runAsyncTryCatchFinally(async () => {
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
        uiFeedback.showToast('You have no upcoming sessions to export.');
        return;
      }

      const result = await calendarService.generateICSFileFromEvents(allEvents);
      if (!result.success || !result.filePath) {
        const message = result.error || 'Failed to export sessions.';
        setActionError(message);
        uiFeedback.showToast(message, 'error');
        return;
      }

      const Sharing = await loadExpoSharing();
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        setActionError('Sharing is not available on this device');
        uiFeedback.showToast('Sharing is not available on this device', 'error');
        return;
      }

      await Sharing.shareAsync(result.filePath, {
        mimeType: 'text/calendar',
        dialogTitle: 'Export All Sessions',
        UTI: 'public.calendar-event',
      });
    }, async exportError => {
      logger.error('Failed to export sessions', exportError);
      setActionError('Failed to export sessions. Please try again.');
      uiFeedback.showToast('Failed to export sessions. Please try again.', 'error');
    }, () => {
      setIsExporting(false);
    });
  };

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
