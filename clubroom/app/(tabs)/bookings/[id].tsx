import { useState, useEffect } from 'react';
import { Image, ScrollView, StyleSheet, View, Alert, Pressable, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api-client';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SessionNotesView } from '@/components/session/session-notes-view';
import { BookingCoachView } from '@/components/bookings/booking-coach-view';
import { BookingParentView } from '@/components/bookings/booking-parent-view';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { useSessionNote } from '@/hooks/use-session-note';
import { upcomingBookings } from '@/constants/mock-data';
import { BookingSummary, Booking } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SessionDetailScreen');

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [booking, setBooking] = useState<BookingSummary | undefined>();
  const [loading, setLoading] = useState(true);
  const isCoach = currentUser?.role === 'COACH';

  const {
    note: sessionNote,
    loading: sessionNoteLoading,
    error: sessionNoteError,
    refresh: refreshSessionNote,
  } = useSessionNote(id);

  useEffect(() => {
    const loadBooking = async () => {
      logger.debug('Loading booking', { id });
      let foundBooking = upcomingBookings.find((b) => b.id === id);

      if (!foundBooking) {
        try {
          const sessionBookings = await apiClient.get<Booking[]>('session_bookings', []);
          const sessionBooking = sessionBookings.find((b) => b.id === id);
          if (sessionBooking) {
            foundBooking = {
              id: sessionBooking.id,
              coachName: sessionBooking.coachName ?? 'Coach',
              childName: sessionBooking.athleteName ?? 'Athlete',
              service: sessionBooking.service ?? 'Session',
              start: sessionBooking.scheduledAt,
              status: sessionBooking.status === 'CONFIRMED' ? 'Confirmed' : sessionBooking.status === 'PENDING' ? 'Pending' : 'Completed',
              locationLabel: sessionBooking.location,
              coach: { name: sessionBooking.coachName ?? 'Coach', photoUrl: 'https://i.pravatar.cc/100?u=' + sessionBooking.coachId },
              client: { name: sessionBooking.athleteName ?? 'Athlete', photoUrl: 'https://i.pravatar.cc/100?u=' + sessionBooking.athleteId },
              coachId: sessionBooking.coachId,
              clientId: sessionBooking.athleteId ?? '',
            };
          }
        } catch (error) {
          logger.error('Failed to load session bookings', error);
        }
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
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <EmptyState
          icon="warning"
          title="Booking not found"
          message="Double-check the link or pick a booking from the list."
          actionLabel="Back to bookings"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const date = new Date(booking.start);
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' });
  const time = date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
  const coachPhotoUrl = booking.coach?.photoUrl || 'https://i.pravatar.cc/100';

  const handleMessageCoach = () => {
    router.push(Routes.messagesWith({ coachId: booking.coachId }));
  };

  const handleCancelBooking = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking? This action cannot be undone.', [
      { text: 'Keep Booking', style: 'cancel' },
      { text: 'Cancel Booking', style: 'destructive', onPress: () => { Alert.alert('Success', 'Booking cancelled successfully'); router.back(); } },
    ]);
  };

  const handleRefund = () => {
    Alert.alert('Issue Refund', 'Process a refund for this booking?', [
      { text: 'Back', style: 'cancel' },
      { text: 'Process Refund', onPress: () => Alert.alert('Success', 'Refund processed successfully') },
    ]);
  };

  const handleReschedule = () => Alert.alert('Reschedule', 'Rescheduling not available');
  const handleReportProblem = () => router.push(Routes.BOOKINGS_REPORT_PROBLEM);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Session Type Header */}
        <ThemedView style={styles.headerSection}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="title">{booking.service}</ThemedText>
            </View>
            <StatusBadge status={booking.status} />
          </View>
        </ThemedView>

        {/* Date & Time Card */}
        <SurfaceCard style={styles.card}>
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
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
            <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
              <Ionicons name="location" size={24} color={palette.tint} />
            </View>
            <View style={styles.cardContent}>
              <ThemedText style={styles.cardTitle}>Location</ThemedText>
              <ThemedText type="subtitle" style={styles.cardValue}>
                {booking.locationLabel}
              </ThemedText>
            </View>
            <Clickable
              style={[styles.actionIconButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
              onPress={() => {
                const location = encodeURIComponent(booking.locationLabel);
                Linking.openURL(`https://maps.google.com/?q=${location}`).catch(() =>
                  Alert.alert('Error', 'Could not open maps application.')
                );
              }}
            >
              <Ionicons name="navigate" size={20} color={palette.tint} />
            </Clickable>
          </View>
          <View style={[styles.mapPreview, { backgroundColor: palette.border }]}>
            <Ionicons name="map" size={32} color={palette.muted} />
            <ThemedText style={styles.mapText}>Map preview</ThemedText>
          </View>
        </SurfaceCard>

        {/* Payment Card */}
        <SurfaceCard style={styles.card}>
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
              <Ionicons name="card" size={24} color={palette.tint} />
            </View>
            <View style={styles.cardContent}>
              <ThemedText style={styles.cardTitle}>Payment</ThemedText>
              <ThemedText type="subtitle" style={styles.cardValue}>£65 (mock)</ThemedText>
            </View>
          </View>
        </SurfaceCard>

        {/* Coach Card */}
        <Clickable onPress={() => router.push(Routes.COACH_PROFILE)}>
          <SurfaceCard style={styles.card}>
            <View style={styles.iconRow}>
              <Image source={{ uri: coachPhotoUrl }} style={styles.coachAvatar} />
              <View style={styles.cardContent}>
                <ThemedText style={styles.cardTitle}>Your Coach</ThemedText>
                <ThemedText type="subtitle" style={styles.cardValue}>{booking.coachName}</ThemedText>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={palette.warning} />
                  <ThemedText style={styles.ratingText}>4.9 · 127 reviews</ThemedText>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </View>
          </SurfaceCard>
        </Clickable>

        {/* Athlete Card (coach view) */}
        {!booking.isGroupSession && booking.childName && booking.clientId && isCoach && (
          <Clickable onPress={() => router.push(Routes.developmentAthlete(booking.clientId!))}>
            <SurfaceCard style={styles.card}>
              <View style={styles.iconRow}>
                <Image source={{ uri: booking.client?.photoUrl || 'https://i.pravatar.cc/100' }} style={styles.coachAvatar} />
                <View style={styles.cardContent}>
                  <ThemedText style={styles.cardTitle}>Athlete</ThemedText>
                  <ThemedText type="subtitle" style={styles.cardValue}>{booking.childName}</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.muted} />
              </View>
            </SurfaceCard>
          </Clickable>
        )}

        {/* Participants (group sessions) */}
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
                  <Pressable
                    onPress={isCoach ? () => router.push(Routes.developmentAthlete(participant.id)) : undefined}
                    style={styles.participantInfo}
                    disabled={!isCoach}
                  >
                    <View style={[styles.participantAvatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                      <ThemedText style={[styles.participantAvatarText, { color: palette.tint }]}>
                        {participant.avatar}
                      </ThemedText>
                    </View>
                    <View style={styles.participantDetails}>
                      <View style={styles.participantNameRow}>
                        <ThemedText type="defaultSemiBold" style={isCoach && styles.clickableText}>
                          {participant.name}
                        </ThemedText>
                        {isCoach && <Ionicons name="arrow-forward" size={14} color={palette.tint} />}
                      </View>
                      <View style={[
                        styles.participantStatus,
                        {
                          backgroundColor: participant.status === 'confirmed'
                            ? withAlpha(Colors.light.success, 0.12)
                            : participant.status === 'pending'
                            ? withAlpha(Colors.light.warning, 0.12)
                            : withAlpha(Colors.light.error, 0.12),
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
                  </Pressable>
                  {isCoach && (
                    <Clickable
                      onPress={() => router.push(Routes.messagesWith({ coachId: booking.coachId, athleteId: participant.id }))}
                      style={[styles.messageParticipantButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
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
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Session notes & development</ThemedText>
            <Clickable style={styles.linkPill} onPress={() => router.push(Routes.sessionNotes(id))}>
              <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>
                {sessionNote ? 'View & edit' : 'Add notes'}
              </ThemedText>
            </Clickable>
          </View>
          {sessionNoteLoading && !sessionNote ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.tint} />
              <ThemedText style={{ color: palette.muted }}>Loading coach notes...</ThemedText>
            </View>
          ) : null}
          {sessionNoteError ? (
            <Clickable onPress={refreshSessionNote} style={styles.errorPill}>
              <Ionicons name="refresh" size={16} color={palette.error} />
              <ThemedText style={{ color: palette.error, fontWeight: '700' }}>Retry loading notes</ThemedText>
            </Clickable>
          ) : null}
          {sessionNote ? (
            <View style={{ gap: Spacing.sm }}>
              <SessionNotesView {...sessionNote} />
            </View>
          ) : !sessionNoteLoading ? (
            <View style={{ gap: Spacing.xs }}>
              <ThemedText style={{ color: palette.muted }}>
                Capture what was covered, effort and homework so parents can track the session.
              </ThemedText>
              <Clickable
                onPress={() => router.push(Routes.sessionNotes(id))}
                style={[styles.ctaButton, { backgroundColor: withAlpha(palette.tint, 0.07) }]}
              >
                <Ionicons name="create" size={16} color={palette.tint} />
                <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Add coach notes</ThemedText>
              </Clickable>
            </View>
          ) : null}
        </SurfaceCard>

        {/* Follow-up Actions */}
        <SurfaceCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Follow-ups parents will see</ThemedText>
            <Clickable style={styles.linkPill} onPress={refreshSessionNote}>
              <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>
                {sessionNoteLoading ? 'Refreshing...' : 'Sync now'}
              </ThemedText>
            </Clickable>
          </View>
          <View style={{ gap: Spacing.sm }}>
            {[
              { label: 'Share homework reminder', completed: Boolean(sessionNote?.homework) },
              { label: 'Confirm attendance', completed: Boolean(sessionNote?.attendance) },
              { label: 'Log effort & focus', completed: Boolean(sessionNote?.effort && sessionNote?.focus?.length) },
            ].map((action) => (
              <View key={action.label} style={styles.metaItem}>
                <Ionicons
                  name={action.completed ? 'checkmark-circle' : 'radio-button-off'}
                  size={18}
                  color={action.completed ? palette.tint : palette.icon}
                />
                <ThemedText style={{ color: action.completed ? palette.tint : palette.muted }}>
                  {action.label}
                </ThemedText>
              </View>
            ))}
          </View>
        </SurfaceCard>

        {/* Action Buttons */}
        {isCoach ? (
          <BookingCoachView
            booking={booking}
            onMessageClient={handleMessageCoach}
            onReschedule={handleReschedule}
            onRefund={handleRefund}
            onCancelBooking={handleCancelBooking}
          />
        ) : (
          <BookingParentView
            onMessageCoach={handleMessageCoach}
            onReportProblem={handleReportProblem}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  headerSection: { gap: Spacing.sm, marginBottom: Spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  card: { padding: Spacing.lg, gap: Spacing.md },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconCircle: { width: 48, height: 48, borderRadius: Radii.xl, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, gap: Spacing.xxs },
  cardTitle: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, fontWeight: '600' },
  cardValue: { ...Typography.subheading },
  cardSubtext: { ...Typography.bodySmall, opacity: 0.6 },
  mapPreview: { height: 120, borderRadius: Radii.md, justifyContent: 'center', alignItems: 'center', gap: Spacing.xs },
  mapText: { ...Typography.caption, opacity: 0.5 },
  coachAvatar: { width: 48, height: 48, borderRadius: Radii.xl },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  ratingText: { ...Typography.caption, opacity: 0.6 },
  errorState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  participantsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  capacityBadge: { ...Typography.bodySmallSemiBold },
  participantsList: { gap: Spacing.sm },
  participantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: withAlpha(Colors.light.border, 0.19) },
  participantInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  participantAvatar: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  participantAvatarText: { ...Typography.heading },
  participantDetails: { flex: 1, gap: Spacing.xxs },
  participantNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  clickableText: { textDecorationLine: 'underline' },
  participantStatus: { alignSelf: 'flex-start', paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.md },
  participantStatusText: { ...Typography.caption, textTransform: 'capitalize' },
  messageParticipantButton: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  actionIconButton: { width: 40, height: 40, borderRadius: Radii.xl, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  linkPill: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill, backgroundColor: Colors.light.background },
  errorPill: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill, backgroundColor: withAlpha(Colors.light.error, 0.06), flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  ctaButton: { marginTop: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radii.button, borderWidth: 1, borderColor: withAlpha(Colors.light.border, 0.25), flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'flex-start' },
});
