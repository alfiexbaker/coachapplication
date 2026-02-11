import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
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
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import { getBookingSummaryClientName, getBookingSummaryCoachName } from '@/utils/booking-display';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();
  const {
    booking,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    isCoach,
    sessionNote,
    handlers,
    formatted,
  } = useBookingDetail(id);
  const coachName = booking ? getBookingSummaryCoachName(booking) : 'Coach';
  const childName = booking ? getBookingSummaryClientName(booking) : 'Athlete';
  const [cancellationSummary, setCancellationSummary] = useState('Standard cancellation policy');

  const handleGoBack = useCallback(() => router.back(), []);

  useEffect(() => {
    if (!booking?.coachId) return;

    let isMounted = true;

    void schedulingRulesService.getCancellationPolicy(booking.coachId).then((result) => {
      if (!isMounted) return;
      setCancellationSummary(
        schedulingRulesService.getCancellationPolicySummary(result.success ? result.data : null),
      );
    });

    return () => {
      isMounted = false;
    };
  }, [booking?.coachId]);

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <ErrorState message={error?.message ?? 'Failed to load booking details.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty' || !booking || !formatted) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['bottom']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        {/* Header */}
        <ThemedView style={styles.headerSection}>
          <Row gap="md" align="center">
            <ThemedText type="title" style={styles.flex1}>
              {booking.service}
            </ThemedText>
            <StatusBadge status={booking.status} />
          </Row>
        </ThemedView>

        {/* Info Cards */}
        <DateTimeCard
          weekday={formatted.weekday}
          dateStr={formatted.dateStr}
          time={formatted.time}
        />
        <LocationCard locationLabel={booking.locationLabel} />
        <PaymentCard />
        <ThemedView style={[styles.policyCard, { borderColor: palette.border }]}>
          <Row gap="sm" align="center">
            <Ionicons name="shield-checkmark-outline" size={18} color={palette.muted} />
            <ThemedText type="defaultSemiBold">Cancellation Policy</ThemedText>
          </Row>
          <ThemedText style={[styles.policySummary, { color: palette.muted }]}>
            {cancellationSummary}
          </ThemedText>
        </ThemedView>
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
  policyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  policySummary: {
    fontSize: 13,
    lineHeight: 18,
  },
});
