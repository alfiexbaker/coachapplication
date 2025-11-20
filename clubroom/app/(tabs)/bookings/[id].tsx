import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { upcomingBookings } from '@/constants/mock-data';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Find the booking by ID
  const booking = upcomingBookings.find((b) => b.id === id);

  if (!booking) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.errorState}>
          <ThemedText>Booking not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const formatDateTime = () => {
    const date = new Date(booking.dateTime);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return { weekday, dateStr, time };
  };

  const { weekday, dateStr, time } = formatDateTime();

  const handleMessageCoach = () => {
    // Navigate to messages tab and open thread with this coach
    router.push({
      pathname: '/(tabs)/messages',
      params: { coachId: booking.coachId },
    });
  };

  const handleReportProblem = () => {
    router.push('/bookings/report-problem');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Session Type Header */}
        <ThemedView style={styles.headerSection}>
          <ThemedText type="title">{booking.sessionType}</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: palette.tint + '20' }]}>
            <ThemedText style={[styles.statusText, { color: palette.tint }]}>
              {booking.status}
            </ThemedText>
          </View>
        </ThemedView>

        {/* Date & Time Card */}
        <SurfaceCard style={styles.card}>
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: palette.tint + '20' }]}>
              <Ionicons name="calendar" size={24} color={palette.tint} />
            </View>
            <View style={styles.cardContent}>
              <ThemedText style={styles.cardTitle}>Date & Time</ThemedText>
              <ThemedText type="subtitle" style={styles.cardValue}>
                {weekday}, {dateStr}
              </ThemedText>
              <ThemedText style={styles.cardSubtext}>{time}</ThemedText>
            </View>
          </View>
        </SurfaceCard>

        {/* Location Card */}
        <SurfaceCard style={styles.card}>
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: palette.tint + '20' }]}>
              <Ionicons name="location" size={24} color={palette.tint} />
            </View>
            <View style={styles.cardContent}>
              <ThemedText style={styles.cardTitle}>Location</ThemedText>
              <ThemedText type="subtitle" style={styles.cardValue}>
                {booking.location}
              </ThemedText>
            </View>
          </View>
          {/* Mini Map Placeholder */}
          <View style={[styles.mapPreview, { backgroundColor: palette.border }]}>
            <Ionicons name="map" size={32} color={palette.muted} />
            <ThemedText style={styles.mapText}>Map preview</ThemedText>
          </View>
        </SurfaceCard>

        {/* Coach Card */}
        <Pressable onPress={() => router.push('/(tabs)/coach-profile')}>
          <SurfaceCard style={styles.card}>
            <View style={styles.iconRow}>
              <Image source={{ uri: booking.coachPhotoUrl }} style={styles.coachAvatar} />
              <View style={styles.cardContent}>
                <ThemedText style={styles.cardTitle}>Your Coach</ThemedText>
                <ThemedText type="subtitle" style={styles.cardValue}>
                  {booking.coachName}
                </ThemedText>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <ThemedText style={styles.ratingText}>4.9 · 127 reviews</ThemedText>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </View>
          </SurfaceCard>
        </Pressable>

        {/* Session Notes */}
        <SurfaceCard style={styles.card}>
          <ThemedText style={styles.cardTitle}>Session Focus</ThemedText>
          <ThemedText style={styles.notesText}>
            This session will focus on improving your ball control and dribbling technique. We'll work on close control drills and 1v1 situations.
          </ThemedText>
        </SurfaceCard>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleMessageCoach}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: palette.tint },
              pressed && { opacity: 0.8 },
            ]}>
            <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
            <ThemedText style={styles.primaryButtonText} lightColor="#FFFFFF" darkColor="#000000">
              Message Coach
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleReportProblem}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: palette.border },
              pressed && { backgroundColor: palette.border, opacity: 0.7 },
            ]}>
            <Ionicons name="warning-outline" size={20} color={palette.foreground} />
            <ThemedText style={styles.secondaryButtonText}>Report Problem</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headerSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 16,
  },
  cardSubtext: {
    fontSize: 14,
    opacity: 0.6,
  },
  mapPreview: {
    height: 120,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  mapText: {
    fontSize: 12,
    opacity: 0.5,
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    opacity: 0.6,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
