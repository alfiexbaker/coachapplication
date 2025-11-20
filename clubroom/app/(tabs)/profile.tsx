import { Pressable, ScrollView, StyleSheet, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import CoachProfileScreen from './coach-profile';
import { mockUserProfile } from '@/constants/mock-data';

const ACTIONS = [
  {
    title: 'Verification badges',
    description: 'Background check, pro experience, credential uploads.',
    cta: 'In progress',
    route: null,
  },
  {
    title: 'Messaging & notifications',
    description: 'Placeholder toggles until the real-time messaging stack lands in S2.',
    cta: 'Coming soon',
    route: null,
  },
  {
    title: 'Payments & payouts',
    description: 'Stripe onboarding is staged for S3; keep UI hooks discoverable.',
    cta: 'Waiting on Trust sprint',
    route: null,
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

  // If user is a coach, show the coach profile page
  if (currentUser?.role === 'Coach') {
    return <CoachProfileScreen />;
  }

  // Get actions based on role
  const actions = currentUser?.role === 'Admin' ? ADMIN_ACTIONS : ACTIONS;

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

          <Pressable
            style={({ pressed }) => [
              styles.editButton,
              {
                backgroundColor: pressed ? palette.tintPressed : palette.tint,
              },
            ]}
            onPress={() => router.push('/(tabs)/edit-user-profile')}>
            <Ionicons name="create-outline" size={20} color="#FFFFFF" />
            <ThemedText style={styles.editButtonLabel} lightColor="#FFFFFF" darkColor="#000000">
              Edit Profile
            </ThemedText>
          </Pressable>
        </SurfaceCard>

        {/* Role & Sign Out */}
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

          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              {
                backgroundColor: pressed ? `${palette.destructive}20` : 'transparent',
                borderColor: palette.destructive,
              },
            ]}
            onPress={logout}>
            <ThemedText style={[styles.signOutLabel, { color: palette.destructive }]}>
              Sign Out
            </ThemedText>
          </Pressable>
        </SurfaceCard>
        {actions.map((action) => (
          <SurfaceCard
            key={action.title}
            onPress={() => {
              if (action.route) {
                router.push(action.route as any);
              } else {
                console.log('Navigate to', action.title);
              }
            }}>
            <ThemedText type="defaultSemiBold" style={styles.actionTitle}>
              {action.title}
            </ThemedText>
            <ThemedText style={[styles.description, { color: palette.muted }]}>
              {action.description}
            </ThemedText>
            <View
              style={[
                styles.ctaPill,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}>
              <ThemedText style={[styles.ctaLabel, { color: palette.text }]}>{action.cta}</ThemedText>
            </View>
          </SurfaceCard>
        ))}
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
  signOutButton: {
    paddingVertical: Spacing.md,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 2,
  },
  signOutLabel: {
    fontWeight: '700',
    fontSize: 15,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  description: {
    marginTop: Spacing.sm,
    fontSize: 15,
    lineHeight: 22,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 999,
    marginTop: Spacing.md,
    borderWidth: 1,
  },
  ctaLabel: {
    fontWeight: '700',
    fontSize: 13,
  },
});
