import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { AttendeeList } from '@/components/event/AttendeeList';
import { CheckInButton } from '@/components/event/CheckInButton';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography } from '@/constants/theme';
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
    isCoach,
    isEventToday,
    checkInAvailable,
    currentUser,
    handleCheckIn,
    handleUndoCheckIn,
    handleAttendeePress,
    handleExport,
    handleSendReminder,
  } = useEventAttendees(id);

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState message={error?.message || 'Failed to load attendee data.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty' || !event) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <EmptyState
          icon="people-outline"
          title="Event not found"
          message="This event could not be loaded."
          actionLabel="Go Back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
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
              userRole={isCoach ? 'COACH' : 'PARENT'}
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
          onAttendeePress={handleAttendeePress}
          showFilters
          showStats
          loading={refreshing}
          emptyMessage="No RSVPs yet. Be the first to respond!"
        />
      </View>

      {isCoach && (
        <Row
          gap="sm"
          style={[
            styles.coachActions,
            { backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          <Clickable
            style={[
              styles.actionButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={handleExport}
          >
            <Row align="center" justify="center" gap="xxs">
              <Ionicons name="download-outline" size={20} color={colors.text} />
              <ThemedText style={styles.actionText}>Export List</ThemedText>
            </Row>
          </Clickable>
          <Clickable
            style={[
              styles.actionButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={handleSendReminder}
          >
            <Row align="center" justify="center" gap="xxs">
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              <ThemedText style={styles.actionText}>Send Reminder</ThemedText>
            </Row>
          </Clickable>
        </Row>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  errorText: { ...Typography.subheading, textAlign: 'center' },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  checkInSection: { padding: Spacing.md },
  checkInCard: { padding: Spacing.md, gap: Spacing.sm },
  todayBadge: { marginBottom: Spacing.xs },
  todayText: { ...Typography.smallSemiBold },
  listContainer: { flex: 1, paddingHorizontal: Spacing.md },
  coachActions: { padding: Spacing.md, borderTopWidth: 1 },
  actionButton: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  actionText: { ...Typography.smallSemiBold },
});
