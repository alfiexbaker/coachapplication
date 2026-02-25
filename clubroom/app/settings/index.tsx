import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { SettingsRow, SettingsSection } from '@/components/settings';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsHub } from '@/hooks/use-settings-hub';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SettingsHub');

export default function SettingsHubScreen() {
  const { colors } = useTheme();
  const { currentUser, isCoach, userHasChildren, handleLogout } = useSettingsHub();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Settings"
        showBack
        backIcon="arrow-back"
        onBackPress={() => router.back()}
        centerTitle
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SurfaceCard
          style={styles.profileCard}
          onPress={() => {
            logger.press('ProfileCard');
            router.push(Routes.EDIT_PROFILE);
          }}
        >
          <Row align="center" gap="md">
            {currentUser?.avatar ? (
              <Image source={{ uri: currentUser.avatar }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, { backgroundColor: colors.border }]}>
                <Ionicons name="person" size={32} color={colors.muted} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <ThemedText type="subtitle" style={styles.profileName}>
                {currentUser?.fullName || currentUser?.name || 'User'}
              </ThemedText>
              <ThemedText style={[styles.profileEmail, { color: colors.muted }]}>
                {currentUser?.email || 'Not set'}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Row>
        </SurfaceCard>

        <SettingsSection title="Account">
          <SettingsRow
            icon="person"
            title="Account"
            subtitle="Email, password, delete account"
            onPress={() => {
              logger.press('AccountSettings');
              router.push(Routes.SETTINGS_ACCOUNT);
            }}
          />
          {isCoach && (
            <SettingsRow
              icon="briefcase"
              title="Coach Profile"
              subtitle="Services, rates, verification"
              onPress={() => {
                logger.press('CoachProfile');
                router.push(Routes.COACH_PROFILE);
              }}
            />
          )}
          {isCoach && (
            <SettingsRow
              icon="calendar"
              title="Availability"
              subtitle="Set your schedule and time slots"
              onPress={() => {
                logger.press('Availability');
                router.push(Routes.AVAILABILITY);
              }}
            />
          )}
          {(userHasChildren || currentUser?.hasChildren) && (
            <SettingsRow
              icon="people"
              title="Children"
              subtitle="Manage your children's profiles"
              onPress={() => {
                logger.press('ChildrenManagement');
                router.push(Routes.CHILDREN);
              }}
            />
          )}
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingsRow
            icon="notifications"
            title="Notifications"
            subtitle="Push, email, and session reminders"
            onPress={() => {
              logger.press('NotificationSettings');
              router.push(Routes.SETTINGS_NOTIFICATIONS);
            }}
          />
          <SettingsRow
            icon="calendar"
            title="Calendar Sync"
            subtitle="Export sessions to Google/Apple Calendar"
            onPress={() => {
              logger.press('CalendarSync');
              router.push(Routes.SETTINGS_CALENDAR_SYNC);
            }}
          />
          <SettingsRow
            icon="moon"
            title="Appearance"
            subtitle="Dark mode and display settings"
            onPress={() => {
              logger.press('AppearanceSettings');
              router.push(Routes.SETTINGS_APPEARANCE);
            }}
          />
          <SettingsRow
            icon="language"
            title="Language"
            value="English (UK)"
            onPress={() => {
              logger.press('Language');
              Alert.alert('Language', 'Additional languages not available');
            }}
          />
        </SettingsSection>

        <SettingsSection title="Privacy & Security">
          <SettingsRow
            icon="shield-checkmark"
            title="Privacy"
            subtitle="Profile visibility and data sharing"
            onPress={() => {
              logger.press('PrivacySettings');
              router.push(Routes.SETTINGS_PRIVACY);
            }}
          />
          <SettingsRow
            icon="lock-closed"
            title="Security"
            subtitle="Password and account protection"
            onPress={() => {
              logger.press('Security');
              Alert.alert('Coming Soon', 'Security settings coming in Sprint 2');
            }}
          />
        </SettingsSection>

        {(isCoach || userHasChildren) && (
          <SettingsSection title="Payments">
            <SettingsRow
              icon="card"
              title="Payment Methods"
              subtitle={isCoach ? 'Manage how you get paid' : 'Manage your payment methods'}
              onPress={() => {
                logger.press('PaymentMethods');
                router.push(Routes.PAYMENT_METHODS);
              }}
            />
            {isCoach && (
              <SettingsRow
                icon="wallet"
                title="Earnings"
                subtitle="View your earnings and payouts"
                onPress={() => {
                  logger.press('Earnings');
                  router.push(Routes.EARNINGS);
                }}
              />
            )}
          </SettingsSection>
        )}

        <SettingsSection title="Support">
          <SettingsRow
            icon="help-circle"
            title="Help & Support"
            subtitle="FAQ, contact us, report a problem"
            onPress={() => {
              logger.press('HelpSupport');
              router.push(Routes.SETTINGS_HELP);
            }}
          />
          <SettingsRow
            icon="information-circle"
            title="About"
            subtitle="Version, terms, privacy policy"
            onPress={() => {
              logger.press('About');
              Alert.alert(
                'Clubroom',
                'Version 1.0.0\n\nBuilt with care for athletes, coaches, and parents.',
                [{ text: 'OK' }],
              );
            }}
          />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow
            icon="log-out"
            title="Sign Out"
            onPress={handleLogout}
            showChevron={false}
            destructive
          />
        </SettingsSection>

        <View style={styles.versionContainer}>
          <ThemedText style={[styles.versionText, { color: colors.muted }]}>
            Clubroom v1.0.0
          </ThemedText>
          <ThemedText style={[styles.versionText, { color: colors.muted }]}>
            {currentUser?.role ?? 'GUEST'} account
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { ...Typography.heading },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'], gap: Spacing.lg },
  profileCard: { marginBottom: Spacing.xs },
  profilePhoto: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: { flex: 1, gap: Spacing.micro },
  profileName: { ...Typography.heading },
  profileEmail: { ...Typography.bodySmall },
  versionContainer: { alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md },
  versionText: { ...Typography.small },
});
