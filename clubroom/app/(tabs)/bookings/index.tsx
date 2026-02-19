import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/primitives/page-header';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { BookingsList } from '@/components/bookings/BookingsList';
import { PendingInvitesSection } from '@/components/bookings/pending-invites-section';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { NotificationBell } from '@/components/ui/notification-bell';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBookings } from '@/hooks/use-bookings';

export default function BookingsScreen() {
  const { colors: palette } = useTheme();
  const {
    displayItems,
    pendingInvitesList,
    userRole,
    loading,
    error,
    refreshing,
    timeFilter,
    showDetailModal,
    selectedOffering,
    setTimeFilter,
    handleCreateSessionPress,
    handleCreateDirectPress,
    handleCreateGroupPress,
    handleFindCoachPress,
    handleOfferingPress,
    handleModalClose,
    handleModalUpdate,
    onRefresh,
    retry,
    handleAcceptInvite,
    handleDeclineInvite,
  } = useBookings();
  const headerRightAction = userRole === 'COACH' ? <NotificationBell size={20} /> : undefined;

  // ─── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader
          title="Bookings"
          subtitle={userRole === 'COACH' ? 'Manage your sessions' : 'Your upcoming sessions'}
          rightAction={headerRightAction}
        />
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader
          title="Bookings"
          subtitle={userRole === 'COACH' ? 'Manage your sessions' : 'Your upcoming sessions'}
          rightAction={headerRightAction}
        />
        <ErrorState message={error} onRetry={retry} />
      </SafeAreaView>
    );
  }

  // ─── Empty ─────────────────────────────────────────────────────
  if (displayItems.length === 0 && pendingInvitesList.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader
          title="Bookings"
          subtitle={userRole === 'COACH' ? 'Manage your sessions' : 'Your upcoming sessions'}
          rightAction={headerRightAction}
        />
        {userRole === 'COACH' && (
          <CreatePills onDirectPress={handleCreateDirectPress} onGroupPress={handleCreateGroupPress} />
        )}
        <EmptyState
          icon="calendar-outline"
          title="No bookings yet"
          message={
            userRole === 'COACH'
              ? 'Your upcoming sessions will appear here once athletes book with you.'
              : 'Find a coach and book your first session to get started.'
          }
          actionLabel={userRole === 'COACH' ? 'Create Session' : 'Find a Coach'}
          onPressAction={userRole === 'COACH' ? handleCreateSessionPress : handleFindCoachPress}
        />
      </SafeAreaView>
    );
  }

  // ─── Success ───────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Bookings"
        subtitle={userRole === 'COACH' ? 'Manage your sessions' : 'Your upcoming sessions'}
        rightAction={headerRightAction}
      />

      {userRole === 'COACH' && (
        <CreatePills onDirectPress={handleCreateDirectPress} onGroupPress={handleCreateGroupPress} />
      )}

      {userRole !== 'COACH' && (
        <PendingInvitesSection
          invites={pendingInvitesList}
          onAccept={handleAcceptInvite}
          onDecline={handleDeclineInvite}
        />
      )}

      <BookingsList
        items={displayItems}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        userRole={userRole}
        onOfferingPress={handleOfferingPress}
        onFindCoachPress={handleFindCoachPress}
        onCreateSessionPress={handleCreateSessionPress}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <SessionDetailModal
        visible={showDetailModal}
        offering={selectedOffering}
        onClose={handleModalClose}
        onUpdate={handleModalUpdate}
      />
    </SafeAreaView>
  );
}

const CreatePills = memo(function CreatePills({
  onDirectPress,
  onGroupPress,
}: {
  onDirectPress: () => void;
  onGroupPress: () => void;
}) {
  const { colors: palette } = useTheme();
  return (
    <Row gap="xs" style={styles.pillRow}>
      <Clickable
        onPress={onDirectPress}
        accessibilityLabel="Create direct session"
        style={[styles.pill, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
      >
        <Row align="center" justify="center" gap="xs">
          <Ionicons name="person-outline" size={16} color={palette.tint} />
          <ThemedText style={[styles.pillText, { color: palette.tint }]}>Direct</ThemedText>
        </Row>
      </Clickable>
      <Clickable
        onPress={onGroupPress}
        accessibilityLabel="Create group session"
        style={[styles.pill, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
      >
        <Row align="center" justify="center" gap="xs">
          <Ionicons name="people-outline" size={16} color={palette.tint} />
          <ThemedText style={[styles.pillText, { color: palette.tint }]}>Group</ThemedText>
        </Row>
      </Clickable>
    </Row>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pillRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
  },
  pillText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
});
