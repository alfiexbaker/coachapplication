import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { useThemePreferences } from '@/hooks/theme-provider';
import { createLogger } from '@/utils/logger';
import { mockUserProfile } from '@/constants/mock-data';
import { NotificationsPanel } from './notifications';

const logger = createLogger('SettingsScreen');

const NAV_LINKS: Record<string, { title: string; subtitle?: string; icon: string; route: string }[]> = {
  COACH: [
    { title: 'Calendar & Availability', subtitle: 'Manage slots and bookings', icon: 'calendar-outline', route: '/(tabs)/bookings' },
    { title: 'Coach Profile', subtitle: 'Services, rates, identity', icon: 'person-circle-outline', route: '/(tabs)/coach-profile' },
    { title: 'Messages', subtitle: 'Chat with athletes & parents', icon: 'chatbubbles-outline', route: '/(tabs)/messages' },
    { title: 'Earnings', subtitle: 'Mock payouts & statements', icon: 'wallet-outline', route: '/(tabs)/earnings' },
  ],
  USER: [
    { title: 'My Bookings', subtitle: 'Upcoming & past sessions', icon: 'calendar-outline', route: '/(tabs)/bookings' },
    { title: 'Messages', subtitle: 'Chat with coaches', icon: 'chatbubbles-outline', route: '/(tabs)/messages' },
    { title: 'Feed & Community', subtitle: 'Posts, drills, highlights', icon: 'newspaper-outline', route: '/(tabs)/feed' },
    { title: 'Badges & Achievements', subtitle: 'All badges and progress tracking', icon: 'ribbon-outline', route: '/badges' },
  ],
  PARENT: [
    { title: 'Kids & Bookings', subtitle: 'See all children', icon: 'people-outline', route: '/(tabs)/bookings' },
    { title: 'Messages', subtitle: 'Coaches and updates', icon: 'chatbubbles-outline', route: '/(tabs)/messages' },
    { title: 'Discover Coaches', subtitle: 'Find local sessions', icon: 'search-outline', route: '/(tabs)/more' },
    { title: 'Activity Feed', subtitle: 'Goals and highlights', icon: 'newspaper-outline', route: '/(tabs)/feed' },
    { title: 'Badges & Achievements', subtitle: 'View earned badges and milestones', icon: 'ribbon-outline', route: '/badges' },
  ],
  ADMIN: [
    { title: 'User Directory', subtitle: 'Moderate accounts', icon: 'person-circle-outline', route: '/(tabs)/index' },
    { title: 'Bookings', subtitle: 'Platform overview', icon: 'calendar-outline', route: '/(tabs)/bookings' },
    { title: 'Messages', subtitle: 'Threads & safety', icon: 'chatbubbles-outline', route: '/(tabs)/messages' },
    { title: 'Invite Codes', subtitle: 'Schools & org onboarding', icon: 'key-outline', route: '/(tabs)/admin/invite-codes' },
  ],
};

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser, logout } = useAuth();
  const { colorScheme, setColorScheme } = useThemePreferences();

  // Notification settings state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);

  // Privacy settings state
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [showLocation, setShowLocation] = useState(true);

  const navLinks = NAV_LINKS[currentUser?.role ?? 'USER'] ?? NAV_LINKS.USER;

  useEffect(() => {
    logger.debug('Settings screen mounted', { role: currentUser?.role, navLinks: navLinks.length });
  }, [currentUser?.role, navLinks.length]);

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
      style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
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
      {rightElement || (showChevron && onPress && <Ionicons name="chevron-forward" size={20} color={palette.muted} />)}
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
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <ThemedText type="title" style={styles.title}>
              Settings
            </ThemedText>
            <Clickable
              onPress={() => {
                logger.press('SettingsHub', { targetRoute: '/settings' });
                router.push('/settings');
              }}
              hitSlop={8}
              style={({ pressed }) => [
                styles.settingsButton,
                { backgroundColor: pressed ? `${palette.accent}20` : `${palette.accent}10` },
              ]}
            >
              <Ionicons name="settings-outline" size={22} color={palette.accent} />
            </Clickable>
          </View>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>Collated controls, profile, and alerts</ThemedText>
        </View>

        <SurfaceCard style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {mockUserProfile.profilePhotoUrl ? (
              <Image source={{ uri: mockUserProfile.profilePhotoUrl }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, { backgroundColor: palette.border }]}>
                <Ionicons name="person" size={40} color={palette.muted} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <ThemedText type="subtitle" style={styles.profileName}>
                {mockUserProfile.fullName}
              </ThemedText>
              <ThemedText style={[styles.profileEmail, { color: palette.muted }]}>
                {mockUserProfile.email}
              </ThemedText>
              {mockUserProfile.phone && (
                <ThemedText style={[styles.profilePhone, { color: palette.muted }]}>
                  {mockUserProfile.phone}
                </ThemedText>
              )}
            </View>
            <View
              style={[
                styles.rolePill,
                { backgroundColor: `${palette.premium}20`, borderColor: palette.premium },
              ]}
            >
              <ThemedText style={[styles.rolePillLabel, { color: palette.premium }]}>
                {currentUser?.role ?? 'GUEST'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.profileActions}>
            <Clickable
              style={({ pressed }) => [
                styles.editButton,
                {
                  backgroundColor: pressed ? palette.tintPressed : palette.tint,
                },
              ]}
              onPress={() => {
                logger.press('EditProfileButton', { targetRoute: '/(tabs)/edit-user-profile' });
                router.push('/(tabs)/edit-user-profile');
              }}
            >
              <Ionicons name="create-outline" size={20} color="#FFFFFF" />
              <ThemedText style={styles.editButtonLabel} lightColor="#FFFFFF" darkColor="#000000">
                Edit profile
              </ThemedText>
            </Clickable>
            {currentUser?.role === 'COACH' && (
              <Clickable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: palette.tint,
                    backgroundColor: pressed ? `${palette.tint}10` : palette.surface,
                  },
                ]}
                onPress={() => router.push('/(tabs)/coach-profile')}
              >
                <Ionicons name="person-circle-outline" size={20} color={palette.tint} />
                <ThemedText style={[styles.editButtonLabel, { color: palette.tint }]}>Coach profile</ThemedText>
              </Clickable>
            )}
          </View>
        </SurfaceCard>

        {/* Navigation hub - only show for non-USER roles */}
        {currentUser?.role !== 'USER' && (
          <View style={styles.section}>
            <SectionHeader title="Navigation hub" subtitle="Jump to the places you need" />
            <View style={styles.navGrid}>
              {navLinks.map((link) => (
                <SurfaceCard key={link.title} style={styles.navCard} onPress={() => router.push(link.route as any)}>
                  <View style={[styles.navIcon, { backgroundColor: `${palette.accent}12` }]}>
                    <Ionicons name={link.icon as any} size={22} color={palette.accent} />
                  </View>
                  <View style={styles.navText}>
                    <ThemedText type="defaultSemiBold">{link.title}</ThemedText>
                    {link.subtitle && (
                      <ThemedText style={{ color: palette.muted, fontSize: 13 }}>{link.subtitle}</ThemedText>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.muted} />
                </SurfaceCard>
              ))}
            </View>
          </View>
        )}

        {/* Latest alerts - only show for non-USER roles */}
        {currentUser?.role !== 'USER' && (
          <View style={styles.section}>
            <SectionHeader title="Latest alerts" subtitle="Inline so they never take a full page" />
            <SurfaceCard style={styles.card}>
              <NotificationsPanel limit={3} />
              <ThemedText style={[styles.helperText, { color: palette.muted }]}>
                Alerts stay inline here; manage the toggles below.
              </ThemedText>
            </SurfaceCard>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Account" />
          <SurfaceCard style={styles.card}>
            <SettingRow
              icon="person"
              title="Edit profile"
              subtitle="Update your personal information"
              onPress={() => {
                logger.press('EditProfile');
                router.push('/(tabs)/edit-user-profile');
              }}
            />
            {currentUser?.role === 'COACH' && (
              <>
                <SettingRow
                  icon="briefcase"
                  title="Coach profile"
                  subtitle="Services, identity, and badges"
                  onPress={() => {
                    logger.press('EditCoachProfile');
                    router.push('/(tabs)/coach-profile');
                  }}
                />
                <SettingRow
                  icon="shield-checkmark"
                  title="Verification"
                  subtitle="Background checks and credentials"
                  onPress={() => {
                    logger.press('Verification');
                    Alert.alert('Coming Soon', 'Verification badges coming in Sprint 2');
                  }}
                />
              </>
            )}
          </SurfaceCard>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Notifications" subtitle="Control how we nudge you" />
          <SurfaceCard style={styles.card}>
            <ToggleRow
              icon="notifications"
              title="Push notifications"
              subtitle="Receive push notifications on this device"
              value={pushNotifications}
              onValueChange={setPushNotifications}
            />
            <ToggleRow
              icon="mail"
              title="Email notifications"
              subtitle="Receive updates via email"
              value={emailNotifications}
              onValueChange={setEmailNotifications}
            />
            <ToggleRow
              icon="calendar"
              title="Session reminders"
              subtitle="Get reminded before sessions start"
              value={sessionReminders}
              onValueChange={setSessionReminders}
            />
            <ToggleRow
              icon="chatbubbles"
              title="Message notifications"
              subtitle="Alerts for new messages"
              value={messageNotifications}
              onValueChange={setMessageNotifications}
            />
          </SurfaceCard>
        </View>

        <View style={styles.section}>
          <SectionHeader title={currentUser?.role === 'USER' ? 'Privacy' : 'Social & privacy'} />
          <SurfaceCard style={styles.card}>
            {currentUser?.role !== 'USER' && (
              <SettingRow
                icon="people"
                title="Social profile"
                subtitle="Manage your social presence and posts"
                onPress={() => {
                  logger.press('SocialProfile');
                  router.push('/(tabs)/feed');
                }}
              />
            )}
            <ToggleRow
              icon="eye"
              title="Profile visibility"
              subtitle="Allow others to find your profile"
              value={profileVisibility}
              onValueChange={setProfileVisibility}
            />
            <ToggleRow
              icon="location"
              title="Show location"
              subtitle="Display your city and distance"
              value={showLocation}
              onValueChange={setShowLocation}
            />
          </SurfaceCard>
        </View>

        {currentUser?.role === 'COACH' && (
          <View style={styles.section}>
            <SectionHeader title="Payments" />
            <SurfaceCard style={styles.card}>
              <SettingRow
                icon="card"
                title="Payment methods"
                subtitle="Manage how you get paid"
                onPress={() => {
                  logger.press('PaymentMethods');
                  Alert.alert('Coming Soon', 'Stripe integration in Sprint 3');
                }}
              />
              <SettingRow
                icon="wallet"
                title="Payout history"
                subtitle="View your earnings and payouts"
                onPress={() => {
                  logger.press('PayoutHistory');
                  Alert.alert('Coming Soon', 'Payment history coming in Sprint 3');
                }}
              />
            </SurfaceCard>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Preferences" />
          <SurfaceCard style={styles.card}>
            <SettingRow
              icon="language"
              title="Language"
              subtitle="English (UK)"
              onPress={() => {
                logger.press('Language');
                Alert.alert('Language', 'Additional languages not available');
              }}
            />
            <ToggleRow
              icon="moon"
              title="Dark mode"
              subtitle={colorScheme === 'dark' ? 'On' : 'Off'}
              value={colorScheme === 'dark'}
              onValueChange={(value) => setColorScheme(value ? 'dark' : 'light')}
            />
          </SurfaceCard>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Support & legal" />
          <SurfaceCard style={styles.card}>
            <SettingRow
              icon="help-circle"
              title="Help & support"
              subtitle="Get help and contact us"
              onPress={() => {
                logger.press('HelpSupport');
                Alert.alert('Support', 'Email: support@clubroom.app');
              }}
            />
            <SettingRow
              icon="document-text"
              title="Terms of service"
              onPress={() => {
                logger.press('Terms');
                Alert.alert('Terms', 'View our Terms of Service');
              }}
            />
            <SettingRow
              icon="lock-closed"
              title="Privacy policy"
              onPress={() => {
                logger.press('Privacy');
                Alert.alert('Privacy', 'View our Privacy Policy');
              }}
            />
          </SurfaceCard>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Account actions" />
          <SurfaceCard style={styles.card}>
            <Clickable
              onPress={handleLogout}
              style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${palette.error}15` }]}>
                <Ionicons name="log-out" size={22} color={palette.error} />
              </View>
              <View style={styles.settingContent}>
                <ThemedText type="defaultSemiBold" style={[styles.settingTitle, { color: palette.error }]}>
                  Sign out
                </ThemedText>
              </View>
            </Clickable>
          </SurfaceCard>
        </View>

        <View style={styles.versionContainer}>
          <ThemedText style={[styles.versionText, { color: palette.muted }]}>Clubroom v1.0.0</ThemedText>
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
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  profileCard: {
    gap: Spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  profilePhoto: {
    width: Components.avatar.xl,
    height: Components.avatar.xl,
    borderRadius: Components.avatar.xl / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 15,
  },
  profilePhone: {
    fontSize: 14,
  },
  rolePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  rolePillLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  profileActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 999,
    flex: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 999,
    flex: 1,
    borderWidth: 1.5,
  },
  editButtonLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
  section: {
    gap: Spacing.sm,
  },
  card: {
    padding: 0,
    gap: 0,
  },
  navGrid: {
    gap: Spacing.sm,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navText: {
    flex: 1,
    gap: 2,
  },
  helperText: {
    marginTop: Spacing.sm,
    fontSize: 13,
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
