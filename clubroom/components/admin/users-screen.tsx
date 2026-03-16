import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Typography } from '@/constants/theme';
import { hasChildren } from '@/utils/user-helpers';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { Row } from '@/components/primitives';
import { router } from 'expo-router';
import { DemoWalkthroughCard } from '@/components/ui/demo-walkthrough-card';
import { buildPrimaryDemoWalkthrough } from '@/utils/demo-walkthrough';

export function AdminUsersScreen() {
  const { colors: palette } = useTheme();
  const { availableUsers, currentUser } = useAuth();
  const walkthrough = buildPrimaryDemoWalkthrough({ user: currentUser });

  const userCounts = {
    coaches: availableUsers.filter((user) => user.role === 'COACH').length,
    users: availableUsers.filter((user) => user.role === 'USER').length,
    parents: availableUsers.filter((user) => hasChildren(user)).length,
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Users
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            System overview and management
          </ThemedText>
        </View>

        <Row style={styles.statsGrid}>
          <SurfaceCard style={styles.statCard}>
            <Ionicons name="people" size={32} color={palette.tint} />
            <ThemedText type="title" style={styles.statNumber}>
              {userCounts.coaches}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Coaches</ThemedText>
          </SurfaceCard>

          <SurfaceCard style={styles.statCard}>
            <Ionicons name="person" size={32} color={palette.tint} />
            <ThemedText type="title" style={styles.statNumber}>
              {userCounts.users}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Athletes</ThemedText>
          </SurfaceCard>

          <SurfaceCard style={styles.statCard}>
            <Ionicons name="people-circle" size={32} color={palette.tint} />
            <ThemedText type="title" style={styles.statNumber}>
              {userCounts.parents}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Parents</ThemedText>
          </SurfaceCard>
        </Row>

        {walkthrough ? (
          <DemoWalkthroughCard
            walkthrough={walkthrough}
            onPressStep={(step) => router.push(step.route)}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  title: { ...Typography.display, letterSpacing: -0.8 },
  subtitle: { ...Typography.body, fontWeight: '500' },
  statsGrid: {
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    padding: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  statNumber: { ...Typography.display },
  statLabel: { ...Typography.smallSemiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
});
