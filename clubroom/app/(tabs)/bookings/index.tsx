import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/primitives/page-header';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
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
    handleAcceptInvite,
    handleDeclineInvite,
  } = useBookings();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <PageHeader
        title="Bookings"
        subtitle={userRole === 'COACH' ? 'Manage your sessions' : 'Your upcoming sessions'}
      />

      {/* Quick Actions - Role-based */}
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

      {/* Action Required - Pending Invites (non-coach users) */}
      {userRole !== 'COACH' && (
        <PendingInvitesSection
          invites={pendingInvitesList}
          onAccept={handleAcceptInvite}
          onDecline={handleDeclineInvite}
        />
      )}

      {/* Loading State */}
      {loading && <LoadingState variant="list" />}

      {/* Error State */}
      {error && !loading && (
        <ErrorState
          message={error}
          onRetry={handleModalUpdate}
        />
      )}

      {/* Bookings List */}
      {!loading && (
        <BookingsList
          items={displayItems}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          userRole={userRole}
          onOfferingPress={handleOfferingPress}
          onFindCoachPress={handleFindCoachPress}
          onCreateSessionPress={handleCreateSessionPress}
        />
      )}

      {/* Session Detail Modal */}
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
