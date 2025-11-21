import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MOCK_USERS } from '@/constants/mock-data';

export function AdminUsersScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const userCounts = {
    coaches: MOCK_USERS.filter((u) => u.role === 'COACH').length,
    users: MOCK_USERS.filter((u) => u.role === 'USER').length,
    parents: MOCK_USERS.filter((u) => u.role === 'PARENT').length,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Users
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            System overview and management
          </ThemedText>
        </View>

        <View style={styles.statsGrid}>
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
  statsGrid: {
    flexDirection: 'row',
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
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
