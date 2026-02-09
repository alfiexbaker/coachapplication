/**
 * Hook: useCalendarSync
 *
 * Manages calendar sync settings state: load, save, toggle, export.
 * Used by app/settings/calendar-sync.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { calendarService } from '@/services/calendar-service';
import { bookingService } from '@/services/booking-service';
import { createLogger } from '@/utils/logger';
import type { CalendarSyncSettings, CalendarProvider } from '@/constants/types';

const logger = createLogger('useCalendarSync');

export function useCalendarSync() {
  const { currentUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [settings, setSettings] = useState<CalendarSyncSettings | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const userId = currentUser?.id ?? 'current_user';
      const existingSettings = await calendarService.getSyncSettings(userId);
      if (existingSettings) {
        setSettings(existingSettings);
      } else {
        const defaults = calendarService.getDefaultSettings();
        setSettings({ ...defaults, userId });
      }
    } catch (error) {
      logger.error('Failed to load calendar settings', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const saveSettings = useCallback(async (updates: Partial<CalendarSyncSettings>) => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const userId = currentUser?.id ?? 'current_user';
      const result = await calendarService.updateSyncSettings(userId, { ...settings, ...updates });
      if (result.success && result.settings) {
        setSettings(result.settings);
      } else {
        Alert.alert('Error', result.error || 'Failed to save settings');
      }
    } catch (error) {
      logger.error('Failed to save settings', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [settings, currentUser]);

  const handleToggleEnabled = useCallback((enabled: boolean) => saveSettings({ enabled }), [saveSettings]);
  const handleToggleAutoSync = useCallback((autoSync: boolean) => saveSettings({ autoSync }), [saveSettings]);
  const handleToggleLocation = useCallback((includeLocation: boolean) => saveSettings({ includeLocation }), [saveSettings]);
  const handleToggleNotes = useCallback((includeNotes: boolean) => saveSettings({ includeNotes }), [saveSettings]);
  const handleProviderChange = useCallback((provider: CalendarProvider) => saveSettings({ provider }), [saveSettings]);
  const handleReminderChange = useCallback((reminderMinutes: number) => saveSettings({ reminderMinutes }), [saveSettings]);

  const handleExportAllSessions = useCallback(async () => {
    setIsExporting(true);
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
        Alert.alert('Export Failed', result.error || 'Failed to export sessions.');
      }
    } catch (error) {
      logger.error('Failed to export sessions', error);
      Alert.alert('Error', 'Failed to export sessions. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    isLoading, isSaving, isExporting, settings,
    handleToggleEnabled, handleToggleAutoSync,
    handleToggleLocation, handleToggleNotes,
    handleProviderChange, handleReminderChange,
    handleExportAllSessions,
  };
}
