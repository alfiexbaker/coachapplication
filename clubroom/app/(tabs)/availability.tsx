import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { Clickable } from '@/components/primitives/clickable';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = ['6a', '8a', '10a', '12p', '2p', '4p', '6p'];

export default function AvailabilityScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // Mock coach data - in real app this would come from API
  const coachName = currentUser?.role === 'Coach' ? 'Elite Sports Academy' : 'Your School';
  const coachTitle = 'Professional Football Coach';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Your Calendar</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Manage your coaching schedule and availability
          </ThemedText>
        </View>

        {/* Coach Identity Card */}
        <SurfaceCard style={[styles.identityCard, { backgroundColor: palette.surface }]}>
          <View style={styles.identityHeader}>
            <View style={[styles.avatarCircle, { backgroundColor: palette.premium }]}>
              <Ionicons name="person" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.identityInfo}>
              <ThemedText style={styles.schoolName}>{coachName}</ThemedText>
              <ThemedText style={[styles.coachTitle, { color: palette.muted }]}>{coachTitle}</ThemedText>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>4.9</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Rating</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>127</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Sessions</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>£2.4k</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>This Month</ThemedText>
            </View>
          </View>
        </SurfaceCard>

        <SectionHeader
          title="Weekly Schedule"
          subtitle="Tap slots to block or open times"
        />

        <SurfaceCard style={styles.calendarCard}>
          <View style={styles.gridHeader}>
            {DAYS.map((day) => (
              <ThemedText key={day} style={styles.gridHeaderText}>
                {day}
              </ThemedText>
            ))}
          </View>
          {TIME_SLOTS.map((slot) => (
            <View key={slot} style={styles.row}>
              {DAYS.map((day, index) => (
                <View
                  key={`${day}-${slot}`}
                  style={[
                    styles.cell,
                    { borderColor: palette.border, backgroundColor: palette.background },
                    index % 2 === 0 && slot === '4p'
                      ? {
                          backgroundColor: `${palette.premium}20`,
                          borderColor: palette.premium,
                          borderWidth: 2,
                        }
                      : null,
                  ]}>
                  {index % 2 === 0 && slot === '4p' ? (
                    <ThemedText style={[styles.cellLabel, { color: palette.premium }]}>
                      Group{'\n'}4 seats
                    </ThemedText>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </SurfaceCard>

        <SurfaceCard style={styles.actionsCard}>
          <ThemedText type="defaultSemiBold">Templates & blocks</ThemedText>
          <View style={styles.actionRow}>
            <Clickable style={[styles.actionButton, { borderColor: palette.border }]} onPress={() => router.push('/availability/set-schedule')}>
              <Ionicons name="repeat" size={18} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Set weekly template</ThemedText>
            </Clickable>
            <Clickable style={[styles.actionButton, { borderColor: palette.border }]}>
              <Ionicons name="close-circle" size={18} color={palette.error} />
              <ThemedText style={{ color: palette.error, fontWeight: '700' }}>Block date</ThemedText>
            </Clickable>
          </View>
          <ThemedText style={{ color: palette.muted }}>
            Booked times auto-block; override for holidays and one-off slots.
          </ThemedText>
        </SurfaceCard>
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
    padding: Spacing.lg + 4,
    gap: Spacing.lg,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md + 2,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: {
    flex: 1,
    gap: Spacing.xs - 2,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  coachTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs - 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 32,
  },
  calendarCard: {
    padding: Spacing.lg,
  },
  actionsCard: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs - 2,
  },
  gridHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  cell: {
    flex: 1,
    height: 64,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellLabel: {
    fontWeight: '700',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
});
