import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/primitives/page-header';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { QuickActions } from '@/components/bookings/QuickActions';
import { BookingsList } from '@/components/bookings/BookingsList';
import { PendingInvitesSection } from '@/components/bookings/pending-invites-section';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { useTheme } from '@/hooks/useTheme';
import { useBookings } from '@/hooks/use-bookings';

export default function BookingsScreen() {
  const { colors: palette } = useTheme();
  const {
    displayItems,
    pendingInvitesList,
    pendingInvites,
    userRole,
    loading,
    error,
    refreshing,
    timeFilter,
    showDetailModal,
    selectedOffering,
    setTimeFilter,
    handleRateCoachPress,
    handleCalendarPress,
    handleSettingsPress,
    handleGroupSessionsPress,
    handleDiscoverSessionsPress,
    handleInvitesPress,
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

  // ─── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader
          title="Bookings"
          subtitle={userRole === 'COACH' ? 'Manage your sessions' : 'Your upcoming sessions'}
        />
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader
          title="Bookings"
          subtitle={userRole === 'COACH' ? 'Manage your sessions' : 'Your upcoming sessions'}
        />
        <ErrorState message={error} onRetry={retry} />
      </SafeAreaView>
    );
  }

  // ─── Empty ─────────────────────────────────────────────────────
  if (displayItems.length === 0 && pendingInvitesList.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader
          title="Bookings"
          subtitle={userRole === 'COACH' ? 'Manage your sessions' : 'Your upcoming sessions'}
        />
        <QuickActions
          userRole={userRole}
          onRateCoachPress={handleRateCoachPress}
          onFindCoachPress={handleFindCoachPress}
          onCalendarPress={handleCalendarPress}
          onSettingsPress={handleSettingsPress}
          onGroupSessionsPress={handleGroupSessionsPress}
          onDiscoverSessionsPress={handleDiscoverSessionsPress}
          onInvitesPress={handleInvitesPress}
          pendingInvites={pendingInvites}
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
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader
        title="Bookings"
        subtitle={userRole === 'COACH' ? 'Manage your sessions' : 'Your upcoming sessions'}
      />

      <QuickActions
        userRole={userRole}
        onRateCoachPress={handleRateCoachPress}
        onFindCoachPress={handleFindCoachPress}
        onCalendarPress={handleCalendarPress}
        onSettingsPress={handleSettingsPress}
        onGroupSessionsPress={handleGroupSessionsPress}
        onDiscoverSessionsPress={handleDiscoverSessionsPress}
        onInvitesPress={handleInvitesPress}
        pendingInvites={pendingInvites}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
