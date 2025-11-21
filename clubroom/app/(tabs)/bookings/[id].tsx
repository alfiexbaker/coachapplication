import { useState, useEffect } from 'react';
import { Image, ScrollView, StyleSheet, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { upcomingBookings } from '@/constants/mock-data';
import { BookingSummary } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SessionDetailScreen');

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  console.log('🔴🔴🔴 [SessionDetailScreen] COMPONENT RENDERING - ID from params:', id);

  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [booking, setBooking] = useState<BookingSummary | undefined>();
  const [loading, setLoading] = useState(true);

  const isCoach = currentUser?.role === 'COACH';

  // Load booking from both mock data and AsyncStorage
  useEffect(() => {
    const loadBooking = async () => {
      console.log('🔴 [SessionDetailScreen] useEffect - Starting to load booking for ID:', id);
      logger.debug('Loading booking', { id });

      // First check mock data
      console.log('🔴 [SessionDetailScreen] Searching mock data, total bookings:', upcomingBookings.length);
      let foundBooking = upcomingBookings.find((b) => b.id === id);
      console.log('🔴 [SessionDetailScreen] Mock data result:', foundBooking ? 'FOUND' : 'NOT FOUND');

      // If not found, check session bookings
      if (!foundBooking) {
        try {
          const stored = await AsyncStorage.getItem('session_bookings');
          if (stored) {
            const sessionBookings = JSON.parse(stored);
            const sessionBooking = sessionBookings.find((b: any) => b.id === id);

            if (sessionBooking) {
              // Convert to BookingSummary format
              foundBooking = {
                id: sessionBooking.id,
                coachName: sessionBooking.coachName,
                childName: sessionBooking.athleteName,
                service: sessionBooking.service,
                start: sessionBooking.scheduledAt,
                status: sessionBooking.status === 'CONFIRMED' ? 'Confirmed' : sessionBooking.status === 'PENDING' ? 'Pending' : 'Completed',
                locationLabel: sessionBooking.location,
                coach: {
                  name: sessionBooking.coachName,
                  photoUrl: 'https://i.pravatar.cc/100?u=' + sessionBooking.coachId,
                },
                client: {
                  name: sessionBooking.athleteName,
                  photoUrl: 'https://i.pravatar.cc/100?u=' + sessionBooking.athleteId,
                },
                coachId: sessionBooking.coachId,
                clientId: sessionBooking.athleteId,
              };
              logger.debug('Found booking in session storage', { id });
            }
          }
        } catch (error) {
          logger.error('Failed to load session bookings', error);
        }
      } else {
        logger.debug('Found booking in mock data', { id });
      }

      setBooking(foundBooking);
      setLoading(false);
    };

    loadBooking();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.errorState}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

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
    const date = new Date(booking.start);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return { weekday, dateStr, time };
  };

  const { weekday, dateStr, time } = formatDateTime();

  // Get coach photo from booking data
  const coachPhotoUrl = booking.coach?.photoUrl || 'https://i.pravatar.cc/100';

  const handleMessageCoach = () => {
    // Navigate to messages tab and open thread with this coach
    router.push({
      pathname: '/(tabs)/messages',
      params: { coachId: booking.coachId },
    });
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This action cannot be undone.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Booking cancelled successfully');
            router.back();
          },
        },
      ]
    );
  };

  const handleRefund = () => {
    Alert.alert(
      'Issue Refund',
      'Process a refund for this booking?',
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Process Refund',
          onPress: () => {
            Alert.alert('Success', 'Refund processed successfully');
          },
        },
      ]
    );
  };

  const handleReschedule = () => {
    Alert.alert('Reschedule', 'Rescheduling feature coming soon');
  };

  const handleReportProblem = () => {
    router.push('/bookings/report-problem');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Session Type Header */}
        <ThemedView style={styles.headerSection}>
          <ThemedText type="title">{booking.service}</ThemedText>
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
                {booking.locationLabel}
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
        <Clickable onPress={() => router.push('/(tabs)/coach-profile')}>
          <SurfaceCard style={styles.card}>
            <View style={styles.iconRow}>
              <Image source={{ uri: coachPhotoUrl }} style={styles.coachAvatar} />
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
        </Clickable>

        {/* Participants Card (Group Bookings Only) */}
        {booking.isGroupSession && booking.participants && booking.participants.length > 0 && (
          <SurfaceCard style={styles.card}>
            <View style={styles.participantsHeader}>
              <ThemedText style={styles.cardTitle}>Participants</ThemedText>
              <ThemedText style={[styles.capacityBadge, { color: palette.tint }]}>
                {booking.currentParticipants}/{booking.maxParticipants} spots
              </ThemedText>
            </View>
            <View style={styles.participantsList}>
              {booking.participants.map((participant) => (
                <View key={participant.id} style={styles.participantRow}>
                  <View style={styles.participantInfo}>
                    <View style={[styles.participantAvatar, { backgroundColor: palette.tint + '20' }]}>
                      <ThemedText style={[styles.participantAvatarText, { color: palette.tint }]}>
                        {participant.avatar}
                      </ThemedText>
                    </View>
                    <View style={styles.participantDetails}>
                      <ThemedText type="defaultSemiBold">{participant.name}</ThemedText>
                      <View style={[
                        styles.participantStatus,
                        {
                          backgroundColor: participant.status === 'confirmed'
                            ? Colors.light.success + '20'
                            : participant.status === 'pending'
                            ? Colors.light.warning + '20'
                            : Colors.light.error + '20',
                        },
                      ]}>
                        <ThemedText style={[
                          styles.participantStatusText,
                          {
                            color: participant.status === 'confirmed'
                              ? Colors.light.success
                              : participant.status === 'pending'
                              ? Colors.light.warning
                              : Colors.light.error,
                          },
                        ]}>
                          {participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                  {isCoach && (
                    <Clickable
                      onPress={() => {
                        router.push({
                          pathname: '/(tabs)/messages',
                          params: { coachId: booking.coachId, athleteId: participant.id },
                        });
                      }}
                      style={[styles.messageParticipantButton, { backgroundColor: palette.tint + '10' }]}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color={palette.tint} />
                    </Clickable>
                  )}
                </View>
              ))}
            </View>
          </SurfaceCard>
        )}

        {/* Session Notes */}
        <SurfaceCard style={styles.card}>
          <ThemedText style={styles.cardTitle}>Session Focus</ThemedText>
          <ThemedText style={styles.notesText}>
            This session will focus on improving your ball control and dribbling technique. We'll work on close control drills and 1v1 situations.
          </ThemedText>
        </SurfaceCard>

        {/* Action Buttons */}
        {isCoach ? (
          /* Coach Management Options */
          <View style={styles.actions}>
            <Clickable
              onPress={handleMessageCoach}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: palette.tint },
                pressed && { opacity: 0.8 },
              ]}>
              <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
              <ThemedText style={styles.primaryButtonText} lightColor="#FFFFFF" darkColor="#000000">
                Message Client
              </ThemedText>
            </Clickable>

            <View style={styles.buttonRow}>
              <Clickable
                onPress={handleReschedule}
                style={({ pressed }) => [
                  styles.halfButton,
                  { borderColor: palette.border },
                  pressed && { backgroundColor: palette.border, opacity: 0.7 },
                ]}>
                <Ionicons name="calendar-outline" size={18} color={palette.foreground} />
                <ThemedText style={styles.secondaryButtonText}>Reschedule</ThemedText>
              </Clickable>

              <Clickable
                onPress={handleRefund}
                style={({ pressed }) => [
                  styles.halfButton,
                  { borderColor: palette.border },
                  pressed && { backgroundColor: palette.border, opacity: 0.7 },
                ]}>
                <Ionicons name="cash-outline" size={18} color={palette.foreground} />
                <ThemedText style={styles.secondaryButtonText}>Refund</ThemedText>
              </Clickable>
            </View>

            <Clickable
              onPress={handleCancelBooking}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: '#EF4444' },
                pressed && { backgroundColor: '#FEE2E2', opacity: 0.7 },
              ]}>
              <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
              <ThemedText style={[styles.secondaryButtonText, { color: '#EF4444' }]}>
                Cancel Booking
              </ThemedText>
            </Clickable>
          </View>
        ) : (
          /* User/Parent Options */
          <View style={styles.actions}>
            <Clickable
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
            </Clickable>

            <Clickable
              onPress={handleReportProblem}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: palette.border },
                pressed && { backgroundColor: palette.border, opacity: 0.7 },
              ]}>
              <Ionicons name="warning-outline" size={20} color={palette.foreground} />
              <ThemedText style={styles.secondaryButtonText}>Report Problem</ThemedText>
            </Clickable>
          </View>
        )}
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
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
  halfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
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
  // Participants section
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  capacityBadge: {
    fontSize: 14,
    fontWeight: '600',
  },
  participantsList: {
    gap: Spacing.sm,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border + '30',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarText: {
    fontSize: 18,
  },
  participantDetails: {
    flex: 1,
    gap: 4,
  },
  participantStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  participantStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  messageParticipantButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
