import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { AttendeeList } from '@/components/event/AttendeeList';
import { CheckInButton } from '@/components/event/CheckInButton';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useEventAttendees } from '@/hooks/use-event-attendees';

export default function EventAttendeesScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    event,
    rsvps,
    attendance,
    stats,
    currentAttendance,
    status,
    error,
    refreshing,
    retry,
    actorRole,
    canManageEvent,
    isEventToday,
    checkInAvailable,
    currentUser,
    handleCheckIn,
    handleUndoCheckIn,
  } = useEventAttendees(id);
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  if (status === 'loading') {
    return renderShell(<LoadingState variant="list" />);
  }

  if (status === 'error') {
    return renderShell(<ErrorState message={error?.message || 'Failed to load attendee data.'} onRetry={retry} />);
  }

  if (status === 'empty' || !event) {
    return renderShell(
      <EmptyState
        icon="people-outline"
        title="Event not found"
        message="This event could not be loaded."
        actionLabel="Go Back"
        onPressAction={() => router.back()}
      />,
    );
  }

  if (!canManageEvent) {
    return renderShell(
      <>
        <PageHeader
          title="Attendees"
          subtitle={event.title}
          showBack
          backIcon="arrow-back"
          onBackPress={() => router.back()}
          centerTitle
          containerStyle={[styles.header, { borderBottomColor: colors.border }]}
        />
        <EmptyState
          icon="people-outline"
          title="Staff access required"
          message="Full RSVP and attendance records are available to event staff only."
          actionLabel="Go Back"
          onPressAction={() => router.back()}
        />
      </>,
    );
  }

  return renderShell(
    <>
      <PageHeader
        title="Attendees"
        subtitle={event.title}
        showBack
        backIcon="arrow-back"
        onBackPress={() => router.back()}
        centerTitle
        containerStyle={[styles.header, { borderBottomColor: colors.border }]}
      />

      {(isEventToday || checkInAvailable || currentAttendance) && currentUser && (
        <View style={styles.checkInSection}>
          <SurfaceCard style={styles.checkInCard}>
            {isEventToday && (
              <Row align="center" gap="xxs" style={styles.todayBadge}>
                <Ionicons name="today" size={14} color={colors.success} />
                <ThemedText style={[styles.todayText, { color: colors.success }]}>
                  Event is today
                </ThemedText>
              </Row>
            )}
            <CheckInButton
              event={event}
              userId={currentUser.id}
              userName={currentUser.name || 'Unknown'}
              userRole={actorRole}
              userPhotoUrl={currentUser.avatar}
              currentAttendance={currentAttendance}
              onCheckIn={handleCheckIn}
              onUndoCheckIn={handleUndoCheckIn}
            />
          </SurfaceCard>
        </View>
      )}

      <View style={styles.listContainer}>
        <AttendeeList
          rsvps={rsvps}
          attendance={attendance}
          stats={stats || undefined}
          onAttendeePress={undefined}
          showFilters
          showStats
          loading={refreshing}
          emptyMessage="No RSVPs yet. Be the first to respond!"
        />
      </View>
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  checkInSection: { padding: Spacing.md },
  checkInCard: { padding: Spacing.md, gap: Spacing.sm },
  todayBadge: { marginBottom: Spacing.xs },
  todayText: { ...Typography.smallSemiBold },
  listContainer: { flex: 1, paddingHorizontal: Spacing.md },
});
