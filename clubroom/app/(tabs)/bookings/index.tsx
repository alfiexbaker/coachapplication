import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/primitives/page-header';
import { Colors, Radii, Typography, Spacing, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  upcomingBookings,
  getChildrenForParent,
} from '@/constants/mock-data';
import { BookingSummary, SessionOffering, Booking } from '@/constants/types';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { bookingService } from '@/services/booking';
import { inviteService as sessionInviteService } from '@/services/invite';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import { hasChildren } from '@/utils/user-helpers';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

// Extracted components
import { QuickActions } from '@/components/bookings/QuickActions';
import { BookingsList, TimeFilter } from '@/components/bookings/BookingsList';

const logger = createLogger('BookingsScreen');

export default function BookingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [sessionBookings, setSessionBookings] = useState<BookingSummary[]>([]);
  const [sessionOfferings, setSessionOfferings] = useState<SessionOffering[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const [selectedOffering, setSelectedOffering] = useState<SessionOffering | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState(0);

  const userRole = currentUser?.role;

  // Load all data
  const loadData = useCallback(async () => {
    setError(null);
    try {
      // Load session bookings via booking service
      const bookings = await bookingService.list();
      if (bookings.length > 0) {
        // Convert to BookingSummary format
        const summaries: BookingSummary[] = bookings.map((booking) => ({
          id: booking.id,
          coachName: booking.coachName ?? 'Coach',
          childName: booking.athleteName ?? 'Athlete',
          service: booking.service ?? 'Session',
          start: booking.scheduledAt,
          status: booking.status === 'CONFIRMED' ? 'Confirmed' : booking.status === 'PENDING' ? 'Pending' : 'Completed',
          locationLabel: booking.location,
          coach: {
            name: booking.coachName ?? 'Coach',
            photoUrl: 'https://i.pravatar.cc/100?u=' + booking.coachId,
          },
          client: {
            name: booking.athleteName ?? 'Athlete',
            photoUrl: 'https://i.pravatar.cc/100?u=' + booking.athleteId,
          },
          coachId: booking.coachId,
          clientId: booking.athleteId ?? '',
        }));
        setSessionBookings(summaries);
        logger.debug('Loaded session bookings', { count: summaries.length });
      }

      // Load session offerings from storage (no dedicated service yet)
      const offerings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
      if (offerings.length > 0) {
        setSessionOfferings(offerings);
        logger.debug('Loaded session offerings', { count: offerings.length });
      }

      // Load pending invites count for parents/athletes
      if (currentUser && currentUser.role !== 'COACH') {
        try {
          const invites = await sessionInviteService.getPendingInvites(currentUser.id);
          setPendingInvites(invites.length);
          logger.debug('Loaded pending invites', { count: invites.length });
        } catch (inviteErr) {
          logger.error('Failed to load pending invites', inviteErr);
        }
      }
    } catch (err) {
      logger.error('Failed to load bookings data', err);
      setError('Failed to load bookings. Pull down to refresh.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Reload bookings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // React to booking events from the event bus so the list updates
  // without waiting for the next tab focus or manual pull-to-refresh.
  useEffect(() => {
    const unsubCreated = onTyped(ServiceEvents.BOOKING_CREATED, () => {
      loadData();
    });
    const unsubCancelled = onTyped(ServiceEvents.BOOKING_CANCELLED, () => {
      loadData();
    });
    const unsubConfirmed = onTyped(ServiceEvents.BOOKING_CONFIRMED, () => {
      loadData();
    });
    return () => {
      unsubCreated();
      unsubCancelled();
      unsubConfirmed();
    };
  }, [loadData]);

  // For COACHES: show their session offerings
  // For ATHLETES/PARENTS: show sessions they're registered for
  const now = new Date();

  let displayItems: (SessionOffering | BookingSummary)[] = [];

  if (userRole === 'COACH') {
    // Coaches see their session offerings
    const myOfferings = sessionOfferings.filter(o => o.coachId === currentUser?.id);
    displayItems = timeFilter === 'upcoming'
      ? myOfferings.filter(o => new Date(o.scheduledAt) >= now || o.isRecurring)
      : myOfferings.filter(o => new Date(o.scheduledAt) < now && !o.isRecurring);
  } else {
    // Athletes/Parents see sessions they're registered for
    const myRegisteredOfferings = sessionOfferings.filter(offering =>
      offering.registrations.some(reg =>
        reg.userId === currentUser?.id && reg.status === 'confirmed'
      )
    );

    // Also show old bookings
    const allBookings = [...upcomingBookings, ...sessionBookings];
    const filteredBookings = allBookings.filter((booking) => {
      // Check if user has children - show their children's bookings too
      if (hasChildren(currentUser)) {
        const children = getChildrenForParent(currentUser?.id || '');
        const childrenIds = children.map(c => c.id);
        return childrenIds.includes(booking.clientId || '') ||
               booking.clientId === currentUser?.id ||
               booking.client?.name === currentUser?.fullName;
      }
      // Regular user - show their own bookings
      return booking.clientId === currentUser?.id || booking.client?.name === currentUser?.fullName;
    });

    displayItems = timeFilter === 'upcoming'
      ? [...myRegisteredOfferings.filter(o => new Date(o.scheduledAt) >= now || o.isRecurring), ...filteredBookings]
      : myRegisteredOfferings.filter(o => new Date(o.scheduledAt) < now && !o.isRecurring);
  }

  // Navigation handlers
  const handleRateCoachPress = () => {
    logger.press('RateCoachButton', { route: '/rate-coach' });
    // Navigate to rate coach selection screen
    router.push(Routes.RATE_COACH);
  };

  const handleCalendarPress = () => {
    logger.press('CalendarButton', { route: '/(tabs)/availability' });
    router.push(Routes.AVAILABILITY);
  };

  const handleSettingsPress = () => {
    logger.press('SettingsButton', { route: '/(tabs)/settings' });
    router.push(Routes.SETTINGS);
  };

  const handleGroupSessionsPress = () => {
    logger.press('GroupSessionsButton', { route: '/group-sessions' });
    router.push(Routes.GROUP_SESSIONS);
  };

  const handleDiscoverSessionsPress = () => {
    logger.press('DiscoverSessionsButton', { route: '/discover-sessions' });
    router.push(Routes.DISCOVER_SESSIONS);
  };

  const handleInvitesPress = () => {
    logger.press('InvitesButton', { route: '/invites' });
    router.push(Routes.INVITES);
  };

  const handleCreateSessionPress = () => {
    logger.press('CreateSessionButton', { route: '/sessions/create' });
    router.push(Routes.SESSIONS_CREATE);
  };

  const handleFindCoachPress = () => {
    logger.press('FindCoachButton', { route: '/(tabs)/index' });
    router.push(Routes.HOME_INDEX);
  };

  const handleOfferingPress = (offering: SessionOffering) => {
    setSelectedOffering(offering);
    setShowDetailModal(true);
  };

  const handleModalClose = () => {
    setShowDetailModal(false);
    setSelectedOffering(null);
  };

  const handleModalUpdate = () => {
    loadData();
  };

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

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={[styles.errorContainer, { backgroundColor: withAlpha(palette.error, 0.06), borderColor: palette.error }]}>
          <ThemedText style={[styles.errorText, { color: palette.error }]}>{error}</ThemedText>
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorContainer: {
    margin: 16,
    padding: Spacing.xs + Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  errorText: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
});
