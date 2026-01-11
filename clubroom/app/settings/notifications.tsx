import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsToggleRow, SettingsSection, SettingsRow } from '@/components/settings';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import {
  notificationPreferencesService,
  NotificationPreferences,
  ReminderTiming,
  DEFAULT_PREFERENCES,
} from '@/services/notification-preferences-service';

const logger = createLogger('NotificationSettings');

// Debounce delay for auto-save
const SAVE_DEBOUNCE_MS = 500;

// Reminder timing options
const REMINDER_OPTIONS: { value: ReminderTiming; label: string }[] = [
  { value: 0, label: 'Disabled' },
  { value: 1, label: '1 hour before' },
  { value: 24, label: '24 hours before' },
  { value: 48, label: '48 hours before' },
];

// Time picker options
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

export default function NotificationSettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // Loading and saving states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Preferences state
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  // Modal states
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showQuietHoursStart, setShowQuietHoursStart] = useState(false);
  const [showQuietHoursEnd, setShowQuietHoursEnd] = useState(false);

  // Debounce timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isCoach = currentUser?.role === 'COACH';
  const isParent = currentUser?.role === 'PARENT';
  const userId = currentUser?.id || 'default_user';

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
    return () => {
      // Clear any pending save on unmount
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [userId]);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const loaded = await notificationPreferencesService.getPreferences(userId);
      setPreferences(loaded);
      logger.debug('Preferences loaded', { userId });
    } catch (error) {
      logger.error('Failed to load preferences', { error });
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced save function
  const debouncedSave = useCallback(
    (newPreferences: NotificationPreferences) => {
      setHasUnsavedChanges(true);

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setIsSaving(true);
          await notificationPreferencesService.updatePreferences(userId, newPreferences);
          setHasUnsavedChanges(false);
          logger.debug('Preferences saved', { userId });
        } catch (error) {
          logger.error('Failed to save preferences', { error });
        } finally {
          setIsSaving(false);
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [userId]
  );

  // Update a single preference and trigger debounced save
  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    debouncedSave(newPreferences);
    logger.debug(`Preference changed: ${key}`, { newValue: value });
  };

  // Format time for display
  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Get reminder timing label
  const getReminderLabel = (): string => {
    const option = REMINDER_OPTIONS.find((o) => o.value === preferences.sessionReminderHours);
    return option?.label || '24 hours before';
  };

  // Time picker component
  const renderTimePicker = (
    visible: boolean,
    onClose: () => void,
    currentTime: string,
    onSelect: (time: string) => void,
    title: string
  ) => {
    const [selectedHour, selectedMinute] = currentTime.split(':');

    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { backgroundColor: palette.card }]}
          >
            <ThemedText type="defaultSemiBold" style={styles.modalTitle}>
              {title}
            </ThemedText>

            <View style={styles.timePickerContainer}>
              <View style={styles.timeColumn}>
                <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>Hour</ThemedText>
                <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                  {HOURS.map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.timeOption,
                        hour === selectedHour && { backgroundColor: `${palette.accent}20` },
                      ]}
                      onPress={() => onSelect(`${hour}:${selectedMinute}`)}
                    >
                      <ThemedText
                        style={[
                          styles.timeOptionText,
                          hour === selectedHour && { color: palette.accent, fontWeight: '600' },
                        ]}
                      >
                        {hour}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <ThemedText style={styles.timeSeparator}>:</ThemedText>

              <View style={styles.timeColumn}>
                <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>Min</ThemedText>
                <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                  {MINUTES.map((min) => (
                    <TouchableOpacity
                      key={min}
                      style={[
                        styles.timeOption,
                        min === selectedMinute && { backgroundColor: `${palette.accent}20` },
                      ]}
                      onPress={() => onSelect(`${selectedHour}:${min}`)}
                    >
                      <ThemedText
                        style={[
                          styles.timeOptionText,
                          min === selectedMinute && { color: palette.accent, fontWeight: '600' },
                        ]}
                      >
                        {min}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: palette.accent }]}
              onPress={onClose}
            >
              <ThemedText style={styles.doneButtonText}>Done</ThemedText>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Reminder picker modal
  const renderReminderPicker = () => (
    <Modal
      visible={showReminderPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowReminderPicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowReminderPicker(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalContent, { backgroundColor: palette.card }]}
        >
          <ThemedText type="defaultSemiBold" style={styles.modalTitle}>
            Session Reminder Timing
          </ThemedText>

          {REMINDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.reminderOption,
                { borderBottomColor: palette.border },
                preferences.sessionReminderHours === option.value && {
                  backgroundColor: `${palette.accent}10`,
                },
              ]}
              onPress={() => {
                updatePreference('sessionReminderHours', option.value);
                // If reminder is enabled, make sure sessionReminders is true
                if (option.value > 0 && !preferences.sessionReminders) {
                  updatePreference('sessionReminders', true);
                }
                // If reminder is disabled, also disable sessionReminders
                if (option.value === 0) {
                  updatePreference('sessionReminders', false);
                }
                setShowReminderPicker(false);
              }}
            >
              <ThemedText style={styles.reminderOptionText}>{option.label}</ThemedText>
              {preferences.sessionReminderHours === option.value && (
                <Ionicons name="checkmark" size={22} color={palette.accent} />
              )}
            </TouchableOpacity>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Notifications
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
        <View style={styles.headerTitleContainer}>
          <ThemedText type="title" style={styles.headerTitle}>
            Notifications
          </ThemedText>
          {(isSaving || hasUnsavedChanges) && (
            <View style={styles.savingIndicator}>
              {isSaving ? (
                <ActivityIndicator size="small" color={palette.accent} />
              ) : (
                <View style={[styles.unsavedDot, { backgroundColor: palette.warning }]} />
              )}
            </View>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Push Notifications */}
        <SettingsSection title="Push Notifications">
          <SettingsToggleRow
            icon="notifications"
            title="Enable Push Notifications"
            subtitle="Receive notifications on this device"
            value={preferences.pushEnabled}
            onValueChange={(v) => updatePreference('pushEnabled', v)}
          />
          <SettingsToggleRow
            icon="alarm"
            title="Session Reminders"
            subtitle="Get reminded before your sessions"
            value={preferences.sessionReminders}
            onValueChange={(v) => {
              updatePreference('sessionReminders', v);
              // If disabling reminders, set timing to 0
              if (!v) {
                updatePreference('sessionReminderHours', 0);
              } else if (preferences.sessionReminderHours === 0) {
                // If enabling but timing was 0, set to 24h
                updatePreference('sessionReminderHours', 24);
              }
            }}
            disabled={!preferences.pushEnabled}
          />
          {preferences.sessionReminders && preferences.pushEnabled && (
            <SettingsRow
              icon="time"
              title="Reminder Timing"
              subtitle="When to send session reminders"
              value={getReminderLabel()}
              onPress={() => setShowReminderPicker(true)}
              showChevron
            />
          )}
          <SettingsToggleRow
            icon="chatbubble"
            title="Messages"
            subtitle="Notifications for new messages"
            value={preferences.messageNotifications}
            onValueChange={(v) => updatePreference('messageNotifications', v)}
            disabled={!preferences.pushEnabled}
          />
          <SettingsToggleRow
            icon="calendar"
            title="Booking Updates"
            subtitle="Changes to your bookings"
            value={preferences.bookingUpdates}
            onValueChange={(v) => updatePreference('bookingUpdates', v)}
            disabled={!preferences.pushEnabled}
          />
          <SettingsToggleRow
            icon="ribbon"
            title="Badge Notifications"
            subtitle="When badges are awarded"
            value={preferences.badgeNotifications}
            onValueChange={(v) => updatePreference('badgeNotifications', v)}
            disabled={!preferences.pushEnabled}
          />
          <SettingsToggleRow
            icon="megaphone"
            title="Club Announcements"
            subtitle="Updates from your clubs"
            value={preferences.clubAnnouncements}
            onValueChange={(v) => updatePreference('clubAnnouncements', v)}
            disabled={!preferences.pushEnabled}
          />
        </SettingsSection>

        {/* Quiet Hours */}
        <SettingsSection title="Quiet Hours">
          <SettingsToggleRow
            icon="moon"
            title="Enable Quiet Hours"
            subtitle="Pause notifications during set hours"
            value={preferences.quietHoursEnabled}
            onValueChange={(v) => updatePreference('quietHoursEnabled', v)}
          />
          {preferences.quietHoursEnabled && (
            <>
              <SettingsRow
                icon="time"
                title="Start Time"
                subtitle="When quiet hours begin"
                value={formatTimeDisplay(preferences.quietHoursStart)}
                onPress={() => setShowQuietHoursStart(true)}
                showChevron
              />
              <SettingsRow
                icon="sunny"
                title="End Time"
                subtitle="When quiet hours end"
                value={formatTimeDisplay(preferences.quietHoursEnd)}
                onPress={() => setShowQuietHoursEnd(true)}
                showChevron
              />
            </>
          )}
        </SettingsSection>

        {/* Email Notifications */}
        <SettingsSection title="Email Notifications">
          <SettingsToggleRow
            icon="mail"
            title="Email Notifications"
            subtitle="Receive notifications via email"
            value={preferences.emailEnabled}
            onValueChange={(v) => updatePreference('emailEnabled', v)}
          />
          <SettingsToggleRow
            icon="document-text"
            title="Session Summaries"
            subtitle="Get a summary after each session"
            value={preferences.emailSessionSummary}
            onValueChange={(v) => updatePreference('emailSessionSummary', v)}
            disabled={!preferences.emailEnabled}
          />
          <SettingsToggleRow
            icon="newspaper"
            title="Weekly Digest"
            subtitle="Weekly summary of your activity"
            value={preferences.emailWeeklyDigest}
            onValueChange={(v) => updatePreference('emailWeeklyDigest', v)}
            disabled={!preferences.emailEnabled}
          />
          <SettingsToggleRow
            icon="gift"
            title="Promotions & Updates"
            subtitle="News, tips, and special offers"
            value={preferences.emailPromotions}
            onValueChange={(v) => updatePreference('emailPromotions', v)}
            disabled={!preferences.emailEnabled}
          />
        </SettingsSection>

        {/* Coach-specific notifications */}
        {isCoach && (
          <SettingsSection title="Coach Notifications">
            <SettingsToggleRow
              icon="add-circle"
              title="New Booking Alerts"
              subtitle="When someone books a session with you"
              value={preferences.newBookingAlerts}
              onValueChange={(v) => updatePreference('newBookingAlerts', v)}
            />
            <SettingsToggleRow
              icon="close-circle"
              title="Cancellation Alerts"
              subtitle="When a booking is cancelled"
              value={preferences.cancellationAlerts}
              onValueChange={(v) => updatePreference('cancellationAlerts', v)}
            />
            <SettingsToggleRow
              icon="wallet"
              title="Payout Notifications"
              subtitle="Updates about your earnings and payouts"
              value={preferences.payoutNotifications}
              onValueChange={(v) => updatePreference('payoutNotifications', v)}
            />
          </SettingsSection>
        )}

        {/* Parent-specific notifications */}
        {isParent && (
          <SettingsSection title="Parent Notifications">
            <SettingsToggleRow
              icon="people"
              title="Child Activity Alerts"
              subtitle="Updates about your children's sessions"
              value={preferences.childActivityAlerts}
              onValueChange={(v) => updatePreference('childActivityAlerts', v)}
            />
            <SettingsToggleRow
              icon="trending-up"
              title="Progress Updates"
              subtitle="When coaches share progress reports"
              value={preferences.progressUpdates}
              onValueChange={(v) => updatePreference('progressUpdates', v)}
            />
          </SettingsSection>
        )}

        {/* Info text */}
        <View style={styles.infoContainer}>
          <ThemedText style={[styles.infoText, { color: palette.muted }]}>
            Your preferences are automatically saved. Some notifications may still be sent for important account and security updates.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Modals */}
      {renderReminderPicker()}
      {renderTimePicker(
        showQuietHoursStart,
        () => setShowQuietHoursStart(false),
        preferences.quietHoursStart,
        (time) => updatePreference('quietHoursStart', time),
        'Quiet Hours Start'
      )}
      {renderTimePicker(
        showQuietHoursEnd,
        () => setShowQuietHoursEnd(false),
        preferences.quietHoursEnd,
        (time) => updatePreference('quietHoursEnd', time),
        'Quiet Hours End'
      )}
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  savingIndicator: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unsavedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 15,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reminderOptionText: {
    fontSize: 16,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  timeScroll: {
    height: 150,
    width: 60,
  },
  timeOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.sm,
    alignItems: 'center',
  },
  timeOptionText: {
    fontSize: 18,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '600',
    marginHorizontal: Spacing.md,
    marginTop: 24,
  },
  doneButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
