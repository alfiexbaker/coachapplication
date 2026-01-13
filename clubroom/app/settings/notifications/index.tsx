import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsToggleRow, SettingsSection } from '@/components/settings';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { hasChildren } from '@/utils/user-helpers';

const logger = createLogger('NotificationSettings');

export default function NotificationSettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // Push notification settings
  const [pushEnabled, setPushEnabled] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [bookingUpdates, setBookingUpdates] = useState(true);

  // Email notification settings
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailSessionSummary, setEmailSessionSummary] = useState(true);
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(false);
  const [emailPromotions, setEmailPromotions] = useState(false);

  // Coach-specific settings
  const [newBookingAlerts, setNewBookingAlerts] = useState(true);
  const [cancellationAlerts, setCancellationAlerts] = useState(true);
  const [payoutNotifications, setPayoutNotifications] = useState(true);

  // Parent-specific settings
  const [childActivityAlerts, setChildActivityAlerts] = useState(true);
  const [progressUpdates, setProgressUpdates] = useState(true);

  const isCoach = currentUser?.role === 'COACH';
  const userHasChildren = hasChildren(currentUser);

  const handleToggle = (name: string, value: boolean, setter: (v: boolean) => void) => {
    logger.debug(`Toggle ${name}`, { newValue: value });
    setter(value);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>
          Notifications
        </ThemedText>
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
            value={pushEnabled}
            onValueChange={(v) => handleToggle('pushEnabled', v, setPushEnabled)}
          />
          <SettingsToggleRow
            icon="alarm"
            title="Session Reminders"
            subtitle="Get reminded before your sessions"
            value={sessionReminders}
            onValueChange={(v) => handleToggle('sessionReminders', v, setSessionReminders)}
            disabled={!pushEnabled}
          />
          <SettingsToggleRow
            icon="chatbubble"
            title="Messages"
            subtitle="Notifications for new messages"
            value={messageNotifications}
            onValueChange={(v) => handleToggle('messageNotifications', v, setMessageNotifications)}
            disabled={!pushEnabled}
          />
          <SettingsToggleRow
            icon="calendar"
            title="Booking Updates"
            subtitle="Changes to your bookings"
            value={bookingUpdates}
            onValueChange={(v) => handleToggle('bookingUpdates', v, setBookingUpdates)}
            disabled={!pushEnabled}
          />
        </SettingsSection>

        {/* Email Notifications */}
        <SettingsSection title="Email Notifications">
          <SettingsToggleRow
            icon="mail"
            title="Email Notifications"
            subtitle="Receive notifications via email"
            value={emailEnabled}
            onValueChange={(v) => handleToggle('emailEnabled', v, setEmailEnabled)}
          />
          <SettingsToggleRow
            icon="document-text"
            title="Session Summaries"
            subtitle="Get a summary after each session"
            value={emailSessionSummary}
            onValueChange={(v) => handleToggle('emailSessionSummary', v, setEmailSessionSummary)}
            disabled={!emailEnabled}
          />
          <SettingsToggleRow
            icon="newspaper"
            title="Weekly Digest"
            subtitle="Weekly summary of your activity"
            value={emailWeeklyDigest}
            onValueChange={(v) => handleToggle('emailWeeklyDigest', v, setEmailWeeklyDigest)}
            disabled={!emailEnabled}
          />
          <SettingsToggleRow
            icon="megaphone"
            title="Promotions & Updates"
            subtitle="News, tips, and special offers"
            value={emailPromotions}
            onValueChange={(v) => handleToggle('emailPromotions', v, setEmailPromotions)}
            disabled={!emailEnabled}
          />
        </SettingsSection>

        {/* Coach-specific notifications */}
        {isCoach && (
          <SettingsSection title="Coach Notifications">
            <SettingsToggleRow
              icon="add-circle"
              title="New Booking Alerts"
              subtitle="When someone books a session with you"
              value={newBookingAlerts}
              onValueChange={(v) => handleToggle('newBookingAlerts', v, setNewBookingAlerts)}
            />
            <SettingsToggleRow
              icon="close-circle"
              title="Cancellation Alerts"
              subtitle="When a booking is cancelled"
              value={cancellationAlerts}
              onValueChange={(v) => handleToggle('cancellationAlerts', v, setCancellationAlerts)}
            />
            <SettingsToggleRow
              icon="wallet"
              title="Payout Notifications"
              subtitle="Updates about your earnings and payouts"
              value={payoutNotifications}
              onValueChange={(v) => handleToggle('payoutNotifications', v, setPayoutNotifications)}
            />
          </SettingsSection>
        )}

        {/* Parent-specific notifications */}
        {userHasChildren && (
          <SettingsSection title="Parent Notifications">
            <SettingsToggleRow
              icon="people"
              title="Child Activity Alerts"
              subtitle="Updates about your children's sessions"
              value={childActivityAlerts}
              onValueChange={(v) => handleToggle('childActivityAlerts', v, setChildActivityAlerts)}
            />
            <SettingsToggleRow
              icon="trending-up"
              title="Progress Updates"
              subtitle="When coaches share progress reports"
              value={progressUpdates}
              onValueChange={(v) => handleToggle('progressUpdates', v, setProgressUpdates)}
            />
          </SettingsSection>
        )}

        {/* Info text */}
        <View style={styles.infoContainer}>
          <ThemedText style={[styles.infoText, { color: palette.muted }]}>
            You can change these settings at any time. Some notifications may still be sent for important account and security updates.
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
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
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
