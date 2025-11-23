import { ScrollView, StyleSheet, View, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SettingsScreen');

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser, logout } = useAuth();

  // Notification settings state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);

  // Privacy settings state
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [showLocation, setShowLocation] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            logger.press('ConfirmLogout', { userId: currentUser?.id });
            await logout();
            logger.info('Logout complete - returning to login screen');
          },
        },
      ]
    );
  };

  const SettingRow = ({
    icon,
    title,
    subtitle,
    onPress,
    showChevron = true,
    rightElement,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showChevron?: boolean;
    rightElement?: React.ReactNode;
  }) => (
    <Clickable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.settingRow,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${palette.accent}15` }]}>
        <Ionicons name={icon as any} size={22} color={palette.accent} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText type="defaultSemiBold" style={styles.settingTitle}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText style={[styles.settingSubtitle, { color: palette.muted }]}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {rightElement || (showChevron && onPress && (
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      ))}
    </Clickable>
  );

  const ToggleRow = ({
    icon,
    title,
    subtitle,
    value,
    onValueChange,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <SettingRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      showChevron={false}
      rightElement={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: palette.border, true: palette.accent }}
          thumbColor="#FFFFFF"
        />
      }
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Settings
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Manage your account and preferences
          </ThemedText>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <SectionHeader title="Account" />
          <SurfaceCard style={styles.card}>
            <SettingRow
              icon="person"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={() => {
                logger.press('EditProfile');
                router.push('/(tabs)/edit-user-profile');
              }}
            />
            {currentUser?.role === 'COACH' && (
              <SettingRow
                icon="briefcase"
                title="Coach Profile"
                subtitle="Manage your professional profile"
                onPress={() => {
                  logger.press('EditCoachProfile');
                  router.push('/(tabs)/edit-profile');
                }}
              />
            )}
            <SettingRow
              icon="shield-checkmark"
              title="Verification"
              subtitle="Background checks and credentials"
              onPress={() => {
                logger.press('Verification');
                Alert.alert('Coming Soon', 'Verification badges coming in Sprint 2');
              }}
            />
          </SurfaceCard>
        </View>

        {/* Social & Privacy */}
        <View style={styles.section}>
          <SectionHeader title="Social & Privacy" />
          <SurfaceCard style={styles.card}>
            <SettingRow
              icon="people"
              title="Social Profile"
              subtitle="Manage your social presence and posts"
              onPress={() => {
                logger.press('SocialProfile');
                router.push('/(tabs)/feed');
              }}
            />
            <ToggleRow
              icon="eye"
              title="Profile Visibility"
              subtitle="Allow others to find your profile"
              value={profileVisibility}
              onValueChange={setProfileVisibility}
            />
            <ToggleRow
              icon="location"
              title="Show Location"
              subtitle="Display your city and distance"
              value={showLocation}
              onValueChange={setShowLocation}
            />
          </SurfaceCard>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <SectionHeader title="Notifications" />
          <SurfaceCard style={styles.card}>
            <ToggleRow
              icon="notifications"
              title="Push Notifications"
              subtitle="Receive push notifications on this device"
              value={pushNotifications}
              onValueChange={setPushNotifications}
            />
            <ToggleRow
              icon="mail"
              title="Email Notifications"
              subtitle="Receive updates via email"
              value={emailNotifications}
              onValueChange={setEmailNotifications}
            />
            <ToggleRow
              icon="calendar"
              title="Session Reminders"
              subtitle="Get reminded before sessions start"
              value={sessionReminders}
              onValueChange={setSessionReminders}
            />
            <ToggleRow
              icon="chatbubbles"
              title="Message Notifications"
              subtitle="Alerts for new messages"
              value={messageNotifications}
              onValueChange={setMessageNotifications}
            />
          </SurfaceCard>
        </View>

        {/* Payment Settings (Coach only) */}
        {currentUser?.role === 'COACH' && (
          <View style={styles.section}>
            <SectionHeader title="Payments" />
            <SurfaceCard style={styles.card}>
              <SettingRow
                icon="card"
                title="Payment Methods"
                subtitle="Manage how you get paid"
                onPress={() => {
                  logger.press('PaymentMethods');
                  Alert.alert('Coming Soon', 'Stripe integration in Sprint 3');
                }}
              />
              <SettingRow
                icon="wallet"
                title="Payout History"
                subtitle="View your earnings and payouts"
                onPress={() => {
                  logger.press('PayoutHistory');
                  Alert.alert('Coming Soon', 'Payment history coming in Sprint 3');
                }}
              />
            </SurfaceCard>
          </View>
        )}

        {/* Preferences */}
        <View style={styles.section}>
          <SectionHeader title="Preferences" />
          <SurfaceCard style={styles.card}>
            <SettingRow
              icon="language"
              title="Language"
              subtitle="English (UK)"
              onPress={() => {
                logger.press('Language');
                Alert.alert('Language', 'More languages coming soon');
              }}
            />
            <SettingRow
              icon="moon"
              title="Dark Mode"
              subtitle={scheme === 'dark' ? 'On' : 'Off'}
              onPress={() => {
                logger.press('DarkMode');
                Alert.alert('Dark Mode', 'Auto-switches with system settings');
              }}
            />
          </SurfaceCard>
        </View>

        {/* Support & Legal */}
        <View style={styles.section}>
          <SectionHeader title="Support & Legal" />
          <SurfaceCard style={styles.card}>
            <SettingRow
              icon="help-circle"
              title="Help & Support"
              subtitle="Get help and contact us"
              onPress={() => {
                logger.press('HelpSupport');
                Alert.alert('Support', 'Email: support@clubroom.app');
              }}
            />
            <SettingRow
              icon="document-text"
              title="Terms of Service"
              onPress={() => {
                logger.press('Terms');
                Alert.alert('Terms', 'View our Terms of Service');
              }}
            />
            <SettingRow
              icon="lock-closed"
              title="Privacy Policy"
              onPress={() => {
                logger.press('Privacy');
                Alert.alert('Privacy', 'View our Privacy Policy');
              }}
            />
          </SurfaceCard>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <SectionHeader title="Account Actions" />
          <SurfaceCard style={styles.card}>
            <Clickable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.settingRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${palette.error}15` }]}>
                <Ionicons name="log-out" size={22} color={palette.error} />
              </View>
              <View style={styles.settingContent}>
                <ThemedText type="defaultSemiBold" style={[styles.settingTitle, { color: palette.error }]}>
                  Sign Out
                </ThemedText>
              </View>
            </Clickable>
          </SurfaceCard>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <ThemedText style={[styles.versionText, { color: palette.muted }]}>
            Clubroom v1.0.0
          </ThemedText>
          <ThemedText style={[styles.versionText, { color: palette.muted }]}>
            {currentUser?.role} Account
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
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  card: {
    padding: 0,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    fontSize: 16,
  },
  settingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  versionContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  versionText: {
    fontSize: 13,
  },
});
