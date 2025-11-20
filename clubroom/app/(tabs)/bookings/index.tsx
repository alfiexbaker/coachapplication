import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CompactBookingCard } from '@/components/bookings/compact-booking-card';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { upcomingBookings } from '@/constants/mock-data';

export default function BookingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const hasBookings = upcomingBookings.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="title">Bookings</ThemedText>
      </ThemedView>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable
          onPress={() => router.push('/bookings/objectives')}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          <SurfaceCard style={styles.actionCard}>
            <Ionicons name="football-outline" size={24} color={palette.tint} />
            <ThemedText style={styles.actionText}>My Goals</ThemedText>
          </SurfaceCard>
        </Pressable>

        <Pressable
          onPress={() => router.push('/bookings/statistics')}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          <SurfaceCard style={styles.actionCard}>
            <Ionicons name="stats-chart-outline" size={24} color={palette.tint} />
            <ThemedText style={styles.actionText}>Progress</ThemedText>
          </SurfaceCard>
        </Pressable>
      </View>

      {/* Bookings List */}
      {hasBookings ? (
        <FlatList
          data={upcomingBookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CompactBookingCard booking={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: palette.border }]}>
            <Ionicons name="calendar-outline" size={48} color={palette.muted} />
          </View>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            No upcoming sessions
          </ThemedText>
          <ThemedText style={styles.emptyDescription}>
            Book your first coaching session to get started
          </ThemedText>
          <Pressable
            onPress={() => router.push('/(tabs)/index')}
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: palette.tint },
              pressed && { opacity: 0.8 },
            ]}>
            <ThemedText style={styles.ctaText} lightColor="#FFFFFF" darkColor="#000000">
              Find a Coach
            </ThemedText>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.6,
    fontSize: 14,
  },
  ctaButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.md,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
