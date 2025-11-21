import { ScrollView, StyleSheet, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import CoachProfileScreen from './coach-profile';
import { mockUserProfile } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ProfileScreen');

// USER/ATHLETE quick actions - access to all features
const USER_ACTIONS = [
  {
    title: 'My Progress & Goals',
    description: 'Track your development, view session history, and manage objectives.',
    cta: 'View Progress',
    route: '/(tabs)/bookings',
    icon: 'trending-up',
  },
  {
    title: 'Feed & Community',
    description: 'Connect with coaches and other athletes in the community.',
    cta: 'View Feed',
    route: '/(tabs)/feed',
    icon: 'newspaper',
  },
];

// PARENT quick actions - access to all features
const PARENT_ACTIONS = [
  {
    title: 'Child Development',
    description: 'Track progress, goals, and session feedback for each child.',
    cta: 'View Progress',
    route: '/(tabs)/more',
    icon: 'trending-up',
  },
  {
    title: 'Feed & Community',
    description: 'Stay connected with coaches and community updates.',
    cta: 'View Feed',
    route: '/(tabs)/feed',
    icon: 'newspaper',
  },
  {
    title: 'Messages',
    description: 'Chat with coaches and receive session updates.',
    cta: 'Open Messages',
    route: '/(tabs)/messages',
    icon: 'chatbubbles',
  },
];

// COACH settings actions
const COACH_SETTINGS = [
  {
    title: 'Verification badges',
    description: 'Background check, pro experience, credential uploads.',
    cta: 'In progress',
    route: null,
    icon: 'shield-checkmark',
  },
  {
    title: 'Messaging & notifications',
    description: 'Placeholder toggles until the real-time messaging stack lands in S2.',
    cta: 'Coming soon',
    route: null,
    icon: 'notifications',
  },
  {
    title: 'Payments & payouts',
    description: 'Stripe onboarding is staged for S3; keep UI hooks discoverable.',
    cta: 'Waiting on Trust sprint',
    route: null,
    icon: 'card',
  },
];

const ADMIN_ACTIONS = [
  {
    title: 'School Invite Codes',
    description: 'Generate and manage invite codes for schools to onboard coaches.',
    cta: 'Manage Codes',
    route: '/(tabs)/admin/invite-codes',
  },
  {
    title: 'User Management',
    description: 'View and moderate all users, coaches, and parents on the platform.',
    cta: 'Coming soon',
    route: null,
  },
  {
    title: 'Platform Analytics',
    description: 'Track bookings, revenue, and platform usage statistics.',
    cta: 'Coming soon',
    route: null,
  },
];

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser, logout } = useAuth();

  logger.debug('ProfileScreen rendered', {
    userRole: currentUser?.role,
    username: currentUser?.username,
    isCoach: currentUser?.role === 'COACH'
  });

  // If user is a coach, show the coach profile page
  // Fixed: was checking 'Coach' (capitalized), now checking 'COACH' (uppercase)
  if (currentUser?.role === 'COACH') {
    logger.info('Showing coach profile screen');
    return <CoachProfileScreen />;
  }

  // Get actions based on role - each role gets their specific quick access
  let actions: typeof USER_ACTIONS = [];
  if (currentUser?.role === 'ADMIN') {
    actions = ADMIN_ACTIONS;
  } else if (currentUser?.role === 'USER') {
    actions = USER_ACTIONS;
  } else if (currentUser?.role === 'PARENT') {
    actions = PARENT_ACTIONS;
  } else if (currentUser?.role === 'COACH') {
    // Coaches don't see this screen, they see CoachProfileScreen
    actions = [];
  }

  logger.debug('Actions loaded', {
    actionsCount: actions.length,
    isAdmin: currentUser?.role === 'ADMIN'
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User Profile Card */}
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
          </View>

          {mockUserProfile.bio && (
            <ThemedText style={[styles.profileBio, { color: palette.muted }]}>
              {mockUserProfile.bio}
            </ThemedText>
          )}

          {mockUserProfile.children && mockUserProfile.children.length > 0 && (
            <View style={styles.childrenSection}>
              <ThemedText type="defaultSemiBold" style={styles.childrenLabel}>
                Children
              </ThemedText>
              {mockUserProfile.children.map((child, index) => (
                <View key={index} style={styles.childItem}>
                  <Ionicons name="person-circle-outline" size={20} color={palette.muted} />
                  <ThemedText style={{ color: palette.foreground }}>
                    {child.name}, {child.age}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

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
            }}>
            <Ionicons name="create-outline" size={20} color="#FFFFFF" />
            <ThemedText style={styles.editButtonLabel} lightColor="#FFFFFF" darkColor="#000000">
              Edit Profile
            </ThemedText>
          </Clickable>
        </SurfaceCard>

        {/* Settings Card */}
        <SurfaceCard
          style={styles.settingsCard}
          onPress={() => {
            logger.press('SettingsButton');
            router.push('/(tabs)/settings');
          }}>
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: `${palette.accent}15` }]}>
              <Ionicons name="settings" size={24} color={palette.accent} />
            </View>
            <View style={styles.settingsText}>
              <ThemedText type="defaultSemiBold" style={styles.settingsTitle}>
                Settings & Preferences
              </ThemedText>
              <ThemedText style={[styles.settingsSubtitle, { color: palette.muted }]}>
                Manage account, privacy, notifications & more
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={24} color={palette.muted} />
          </View>
        </SurfaceCard>

        {/* Account Type */}
        <SurfaceCard style={styles.identityCard}>
          <View style={styles.roleRow}>
            <ThemedText type="defaultSemiBold">Account Type</ThemedText>
            <View
              style={[
                styles.rolePill,
                { backgroundColor: `${palette.premium}20`, borderColor: palette.premium },
              ]}>
              <ThemedText style={[styles.rolePillLabel, { color: palette.premium }]}>
                {currentUser?.role ?? 'Guest'}
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>
        {/* Quick Access Cards */}
        {actions.length > 0 && (
          <View style={styles.sectionContainer}>
            <SectionHeader title="Quick Access" />
            {actions.map((action) => (
              <SurfaceCard
                key={action.title}
                onPress={() => {
                  logger.press('ActionCard', {
                    title: action.title,
                    route: action.route,
                    hasRoute: !!action.route
                  });
                  if (action.route) {
                    logger.navigate('ProfileScreen', action.route);
                    router.push(action.route as any);
                  } else {
                    logger.warn('Action card pressed but no route defined', { title: action.title });
                  }
                }}
                style={styles.actionCard}>
                <View style={styles.actionHeader}>
                  {action.icon && (
                    <View style={[styles.iconContainer, { backgroundColor: `${palette.accent}15` }]}>
                      <Ionicons name={action.icon as any} size={24} color={palette.accent} />
                    </View>
                  )}
                  <View style={styles.actionTextContainer}>
                    <ThemedText type="defaultSemiBold" style={styles.actionTitle}>
                      {action.title}
                    </ThemedText>
                    <ThemedText style={[styles.description, { color: palette.muted }]}>
                      {action.description}
                    </ThemedText>
                  </View>
                </View>
                <View
                  style={[
                    styles.ctaPill,
                    {
                      backgroundColor: action.route ? palette.tint : palette.surface,
                      borderColor: action.route ? palette.tint : palette.border,
                    },
                  ]}>
                  <ThemedText
                    style={[
                      styles.ctaLabel,
                      { color: action.route ? '#FFFFFF' : palette.muted }
                    ]}>
                    {action.cta}
                  </ThemedText>
                </View>
              </SurfaceCard>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg + 4,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  profileCard: {
    gap: Spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  profileBio: {
    fontSize: 15,
    lineHeight: 22,
  },
  childrenSection: {
    gap: Spacing.sm,
  },
  childrenLabel: {
    fontSize: 15,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: 999,
  },
  editButtonLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
  settingsCard: {
    padding: Spacing.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingsIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsText: {
    flex: 1,
    gap: 4,
  },
  settingsTitle: {
    fontSize: 17,
  },
  settingsSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  identityCard: {
    gap: Spacing.md,
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  sectionContainer: {
    gap: Spacing.sm,
  },
  actionCard: {
    gap: Spacing.sm,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radii.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.button,
    marginTop: Spacing.xs,
    borderWidth: 1.5,
  },
  ctaLabel: {
    fontWeight: '700',
    fontSize: 13,
  },
});
