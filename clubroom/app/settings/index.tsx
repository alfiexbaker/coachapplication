import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsRow, SettingsSection } from '@/components/settings';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { hasChildren, isCoach as checkIsCoach } from '@/utils/user-helpers';

const logger = createLogger('SettingsHub');

export default function SettingsHubScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser, logout } = useAuth();

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
            router.replace('/');
          },
        },
      ]
    );
  };

  const isCoach = checkIsCoach(currentUser);
  const userHasChildren = hasChildren(currentUser);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>
          Settings
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <SurfaceCard
          style={styles.profileCard}
          onPress={() => {
            logger.press('ProfileCard', { targetRoute: '/(tabs)/edit-profile' });
            router.push('/(tabs)/edit-profile');
          }}
        >
          <View style={styles.profileHeader}>
            {currentUser?.avatar ? (
              <Image source={{ uri: currentUser.avatar }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, { backgroundColor: palette.border }]}>
                <Ionicons name="person" size={32} color={palette.muted} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <ThemedText type="subtitle" style={styles.profileName}>
                {currentUser?.fullName || currentUser?.name || 'User'}
              </ThemedText>
              <ThemedText style={[styles.profileEmail, { color: palette.muted }]}>
                {currentUser?.email || 'Not set'}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>
        </SurfaceCard>

        {/* Account Section */}
        <SettingsSection title="Account">
          <SettingsRow
            icon="person"
            title="Account"
            subtitle="Email, password, delete account"
            onPress={() => {
              logger.press('AccountSettings');
              router.push('/settings/account');
            }}
          />
          {isCoach && (
            <SettingsRow
              icon="briefcase"
              title="Coach Profile"
              subtitle="Services, rates, verification"
              onPress={() => {
                logger.press('CoachProfile');
                router.push('/(tabs)/coach-profile');
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
                router.push('/(tabs)/availability');
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
                router.push('/(tabs)/children');
              }}
            />
          )}
        </SettingsSection>

        {/* Preferences Section */}
        <SettingsSection title="Preferences">
          <SettingsRow
            icon="notifications"
            title="Notifications"
            subtitle="Push, email, and session reminders"
            onPress={() => {
              logger.press('NotificationSettings');
              router.push('/settings/notifications');
            }}
          />
          <SettingsRow
            icon="calendar"
            title="Calendar Sync"
            subtitle="Export sessions to Google/Apple Calendar"
            onPress={() => {
              logger.press('CalendarSync');
              router.push('/settings/calendar-sync');
            }}
          />
          <SettingsRow
            icon="moon"
            title="Appearance"
            subtitle="Dark mode and display settings"
            onPress={() => {
              logger.press('AppearanceSettings');
              router.push('/settings/appearance');
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

        {/* Privacy & Security */}
        <SettingsSection title="Privacy & Security">
          <SettingsRow
            icon="shield-checkmark"
            title="Privacy"
            subtitle="Profile visibility and data sharing"
            onPress={() => {
              logger.press('PrivacySettings');
              router.push('/settings/privacy');
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

        {/* Payments Section - Coach/Parent only */}
        {(isCoach || userHasChildren) && (
          <SettingsSection title="Payments">
            <SettingsRow
              icon="card"
              title="Payment Methods"
              subtitle={isCoach ? 'Manage how you get paid' : 'Manage your payment methods'}
              onPress={() => {
                logger.press('PaymentMethods');
                router.push('/payment/methods');
              }}
            />
            {isCoach && (
              <SettingsRow
                icon="wallet"
                title="Earnings"
                subtitle="View your earnings and payouts"
                onPress={() => {
                  logger.press('Earnings');
                  router.push('/(tabs)/earnings');
                }}
              />
            )}
          </SettingsSection>
        )}

        {/* Support Section */}
        <SettingsSection title="Support">
          <SettingsRow
            icon="help-circle"
            title="Help & Support"
            subtitle="FAQ, contact us, report a problem"
            onPress={() => {
              logger.press('HelpSupport');
              router.push('/settings/help');
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
                [{ text: 'OK' }]
              );
            }}
          />
        </SettingsSection>

        {/* Sign Out */}
        <SettingsSection>
          <SettingsRow
            icon="log-out"
            title="Sign Out"
            onPress={handleLogout}
            showChevron={false}
            destructive
          />
        </SettingsSection>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <ThemedText style={[styles.versionText, { color: palette.muted }]}>
            Clubroom v1.0.0
          </ThemedText>
          <ThemedText style={[styles.versionText, { color: palette.muted }]}>
            {currentUser?.role ?? 'GUEST'} account
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
  profileCard: {
    marginBottom: Spacing.xs,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  profilePhoto: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 14,
  },
  versionContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  versionText: {
    fontSize: 13,
  },
});
