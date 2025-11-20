import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import CoachProfileScreen from './coach-profile';

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
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            {currentUser?.role === 'Admin' ? 'Admin Settings' : 'Profile'}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {currentUser?.role === 'Admin'
              ? 'Manage platform settings and configurations'
              : 'Manage your account and preferences'}
          </ThemedText>
        </View>

        <SurfaceCard style={styles.identityCard}>
          <ThemedText type="defaultSemiBold">Signed in as</ThemedText>
          <ThemedText type="title" style={styles.username}>
            {currentUser?.username ?? 'Demo user'}
          </ThemedText>
          <View
            style={[
              styles.rolePill,
              { backgroundColor: `${palette.premium}20`, borderColor: palette.premium },
            ]}>
            <ThemedText style={[styles.rolePillLabel, { color: palette.premium }]}>
              {currentUser?.role ?? 'Guest'}
            </ThemedText>
          </View>
          <ThemedText style={styles.identityHelper}>
            Authentication is intentionally hardcoded so you can preview how the rest of the build feels
            from different roles before wiring up a backend.
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              {
                backgroundColor: pressed ? palette.tintPressed : palette.tint,
              },
            ]}
            onPress={logout}>
            <ThemedText style={styles.signOutLabel} lightColor="#FFFFFF" darkColor="#000000">
              Sign out
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
  header: {
    gap: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  identityCard: {
    gap: Spacing.md,
  },
  username: {
    marginTop: -Spacing.xs,
    fontSize: 28,
    fontWeight: '800',
  },
  rolePill: {
    alignSelf: 'flex-start',
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
  identityHelper: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
  },
  signOutButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: 999,
    alignItems: 'center',
  },
  signOutLabel: {
    fontWeight: '800',
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
