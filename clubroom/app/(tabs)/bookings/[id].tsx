import { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingState } from '@/components/ui/screen-states';
import { EmptyState } from '@/components/ui/empty-state';
import { BookingCoachView } from '@/components/bookings/booking-coach-view';
import { BookingParentView } from '@/components/bookings/booking-parent-view';
import {
  DateTimeCard,
  LocationCard,
  PaymentCard,
  BookingCoachCard,
  BookingAthleteCard,
} from '@/components/bookings/booking-info-cards';
import { BookingParticipantsCard } from '@/components/bookings/booking-participants-card';
import { BookingNotesCard, BookingFollowUpsCard } from '@/components/bookings/booking-notes-card';
import { Row } from '@/components/primitives/row';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBookingDetail } from '@/hooks/use-booking-detail';
import { getBookingSummaryClientName, getBookingSummaryCoachName } from '@/utils/booking-display';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();
  const { booking, status, isCoach, sessionNote, handlers, formatted } = useBookingDetail(id);
  const coachName = booking ? getBookingSummaryCoachName(booking) : 'Coach';
  const childName = booking ? getBookingSummaryClientName(booking) : 'Athlete';

  const handleGoBack = useCallback(() => router.back(), []);

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'not-found' || !booking || !formatted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <EmptyState
          icon="warning"
          title="Booking not found"
          message="Double-check the link or pick a booking from the list."
          actionLabel="Back to bookings"
          onPressAction={handleGoBack}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <ThemedView style={styles.headerSection}>
          <Row gap="md" align="center">
            <ThemedText type="title" style={styles.flex1}>{booking.service}</ThemedText>
            <StatusBadge status={booking.status} />
          </Row>
        </ThemedView>

        {/* Info Cards */}
        <DateTimeCard weekday={formatted.weekday} dateStr={formatted.dateStr} time={formatted.time} />
        <LocationCard locationLabel={booking.locationLabel} />
        <PaymentCard />
        <BookingCoachCard coachName={coachName} coachPhotoUrl={formatted.coachPhotoUrl} />

        {/* Athlete Card (coach view, 1-on-1 sessions) */}
        {!booking.isGroupSession && booking.clientId && isCoach && (
          <BookingAthleteCard
            childName={childName}
            clientId={booking.clientId}
            clientPhotoUrl={booking.client?.photoUrl || 'https://i.pravatar.cc/100'}
          />
        )}

        {/* Participants (group sessions) */}
        {booking.isGroupSession && booking.participants && booking.participants.length > 0 && (
          <BookingParticipantsCard
            participants={booking.participants}
            currentParticipants={booking.currentParticipants}
            maxParticipants={booking.maxParticipants}
            coachId={booking.coachId}
            isCoach={isCoach}
          />
        )}

        {/* Session Notes */}
        <BookingNotesCard
          bookingId={id}
          sessionNote={sessionNote.note}
          loading={sessionNote.loading}
          error={sessionNote.error}
          onRefresh={sessionNote.refresh}
        />

        {/* Follow-ups */}
        <BookingFollowUpsCard
          sessionNote={sessionNote.note}
          loading={sessionNote.loading}
          onRefresh={sessionNote.refresh}
        />

        {/* Action Buttons */}
        {isCoach ? (
          <BookingCoachView
            booking={booking}
            onMessageClient={handlers.messageCoach}
            onReschedule={handlers.reschedule}
            onRefund={handlers.refund}
            onCancelBooking={handlers.cancelBooking}
          />
        ) : (
          <BookingParentView
            onMessageCoach={handlers.messageCoach}
            onReportProblem={handlers.reportProblem}
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
  flex1: { flex: 1 },
});
