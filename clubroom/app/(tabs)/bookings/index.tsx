import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/primitives/page-header';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { QuickActions } from '@/components/bookings/QuickActions';
import { BookingsList } from '@/components/bookings/BookingsList';
import { PendingInvitesSection } from '@/components/bookings/pending-invites-section';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { NotificationBell } from '@/components/ui/notification-bell';
import { Components, Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
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
    handleCalendarPress,
    handleSettingsPress,
    handleDiscoverSessionsPress,
    handleCreateSessionPress,
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
    const isCoach = userRole === 'COACH';
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
        {isCoach && (
          <PrimaryBookingAction
            isCoach={isCoach}
            onPress={isCoach ? handleCreateSessionPress : handleFindCoachPress}
          />
        )}
        <QuickActions
          userRole={userRole}
          onFindCoachPress={handleFindCoachPress}
          onCalendarPress={handleCalendarPress}
          onSettingsPress={handleSettingsPress}
          onDiscoverSessionsPress={handleDiscoverSessionsPress}
          showCoachActions={true}
        />
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
  const isCoach = userRole === 'COACH';

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

      {isCoach && (
        <PrimaryBookingAction
          isCoach={isCoach}
          onPress={isCoach ? handleCreateSessionPress : handleFindCoachPress}
        />
      )}

      <QuickActions
        userRole={userRole}
        onFindCoachPress={handleFindCoachPress}
        onCalendarPress={handleCalendarPress}
        onSettingsPress={handleSettingsPress}
        onDiscoverSessionsPress={handleDiscoverSessionsPress}
        showCoachActions={true}
      />

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

function PrimaryBookingAction({
  isCoach,
  onPress,
}: {
  isCoach: boolean;
  onPress: () => void;
}) {
  const { colors: palette } = useTheme();
  return (
    <Clickable
      onPress={onPress}
      style={[styles.primaryAction, { backgroundColor: palette.tint }]}
      accessibilityLabel={isCoach ? 'Create a new session' : 'Book a coaching session'}
    >
      <Row align="center" justify="space-between" gap="sm">
        <Row align="center" gap="sm" style={styles.primaryActionLeft}>
          <Ionicons name={isCoach ? 'add' : 'search'} size={18} color={palette.onPrimary} />
          <Row align="center" gap="xxs" style={styles.primaryActionCopy}>
            <ThemedText style={[styles.primaryActionTitle, { color: palette.onPrimary }]}>
              {isCoach ? 'Create Session' : 'Book Session'}
            </ThemedText>
            <ThemedText style={[styles.primaryActionHint, { color: withAlpha(palette.onPrimary, 0.78) }]}>
              {isCoach ? 'Publish a slot and invite athletes' : 'Find coaches and lock your next session'}
            </ThemedText>
          </Row>
        </Row>
        <Ionicons name="chevron-forward" size={18} color={palette.onPrimary} />
      </Row>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  primaryAction: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radii.card,
    minHeight: Components.button.height,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  primaryActionLeft: {
    flex: 1,
    minWidth: 0,
  },
  primaryActionCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  primaryActionTitle: {
    ...Typography.subheading,
  },
  primaryActionHint: {
    ...Typography.caption,
  },
});
