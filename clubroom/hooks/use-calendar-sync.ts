/**
 * Hook: useCalendarSync
 *
 * Manages device-local calendar export preferences and the export action.
 * Used by app/settings/calendar-sync.tsx
 */

import { useState, useEffect, startTransition } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { calendarService } from '@/services/calendar-service';
import { apiClient } from '@/services/api-client';
import { bookingService } from '@/services/booking-service';
import { groupSessionService } from '@/services/group-session-service';
import { eventService } from '@/services/event';
import { createLogger } from '@/utils/logger';
import type { CalendarSyncSettings, CalendarEvent } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('useCalendarSync');

function loadExpoSharing() {
  return import('expo-sharing');
}

export function useCalendarSync() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? null;

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [settingsOverride, setSettingsOverride] = useState<CalendarSyncSettings | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const defaultSettings = ({
    ...calendarService.getDefaultSettings(),
    userId: userId ?? '',
  });

  const loadSettings = async () => {
    if (!userId) {
      return err(serviceError('UNAUTHORIZED', 'Sign in to manage calendar export settings.'));
    }

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
    dataKey: `calendar-sync:${userId ?? 'missing'}`,
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
    if (!userId) {
      uiFeedback.showToast('Sign in to manage calendar export settings.', 'error');
      return;
    }

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

  const handleToggleLocation = (includeLocation: boolean) => saveSettings({ includeLocation });
  const handleToggleNotes = (includeNotes: boolean) => saveSettings({ includeNotes });
  const handleReminderChange = (reminderMinutes: number) => saveSettings({ reminderMinutes });

  const handleExportCalendar = async () => {
    if (!userId) {
      uiFeedback.showToast('Sign in before exporting your calendar.', 'error');
      return;
    }

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
        if (!apiClient.isMockMode) {
          const message = 'Could not load all group sessions for export. Please try again.';
          setActionError(message);
          uiFeedback.showToast(message, 'error');
          return;
        }
      }

      // Club events
      try {
        const upcomingEvents = await eventService.getUpcomingUserEvents(userId);
        allEvents.push(...upcomingEvents.map((e) => calendarService.clubEventToEvent(e)));
      } catch (evError) {
        logger.warn('Could not fetch club events for export', evError);
        if (!apiClient.isMockMode) {
          const message = 'Could not load all club events for export. Please try again.';
          setActionError(message);
          uiFeedback.showToast(message, 'error');
          return;
        }
      }

      if (allEvents.length === 0) {
        uiFeedback.showToast('You have no upcoming calendar items to export.');
        return;
      }

      const result = await calendarService.generateICSFileFromEvents(allEvents, undefined, settings);
      if (!result.success || !result.filePath) {
        const message = result.error || 'Failed to export calendar.';
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
        dialogTitle: 'Export Calendar',
        UTI: 'public.calendar-event',
      });
    }, async exportError => {
      logger.error('Failed to export calendar', exportError);
      setActionError('Failed to export calendar. Please try again.');
      uiFeedback.showToast('Failed to export calendar. Please try again.', 'error');
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
    handleToggleLocation,
    handleToggleNotes,
    handleReminderChange,
    handleExportCalendar,
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
    handleToggleLocation: (includeLocation: boolean) => void;
    handleToggleNotes: (includeNotes: boolean) => void;
    handleReminderChange: (reminderMinutes: number) => void;
    handleExportCalendar: () => Promise<void>;
  };
}
