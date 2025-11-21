import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { SocialFeed } from '@/components/social/social-feed';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getBookingsForAthlete, formatDate } from '@/constants/mock-data';

export function UserHomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const upcomingBookings = getBookingsForAthlete(currentUser.id)
    .filter((b) => new Date(b.scheduledAt) > new Date() && b.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const nextSession = upcomingBookings[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Home
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Your training journey
          </ThemedText>
        </View>

        {/* Next Session Card */}
        {nextSession && (
          <SurfaceCard style={styles.nextSession}>
            <View style={styles.sessionHeader}>
              <Ionicons name="time" size={20} color={palette.tint} />
              <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
                Upcoming Session
              </ThemedText>
            </View>
            <ThemedText type="subtitle" style={styles.coachName}>
              {nextSession.coachName}
            </ThemedText>
            <View style={styles.sessionDetails}>
              <View style={styles.sessionDetail}>
                <Ionicons name="calendar-outline" size={16} color={palette.muted} />
                <ThemedText style={{ color: palette.muted }}>
                  {formatDate(nextSession.scheduledAt)}
                </ThemedText>
              </View>
              <View style={styles.sessionDetail}>
                <Ionicons name="location-outline" size={16} color={palette.muted} />
                <ThemedText style={{ color: palette.muted }}>
                  {nextSession.location}
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        )}

        {/* Social Feed */}
        <SocialFeed title="Recent Activity" />
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
  nextSession: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  coachName: {
    fontSize: 18,
    fontWeight: '700',
  },
  sessionDetails: {
    gap: Spacing.sm,
  },
  sessionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
