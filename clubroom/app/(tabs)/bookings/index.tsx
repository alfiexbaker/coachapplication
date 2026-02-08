import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/primitives/page-header';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Typography, Spacing, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  upcomingBookings,
  getChildrenForParent,
} from '@/constants/mock-data';
import { BookingSummary, SessionOffering, Booking, SessionInvite } from '@/constants/types';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { SessionInviteCard } from '@/components/parent/session-invite-card';
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
  const [pendingInvitesList, setPendingInvitesList] = useState<SessionInvite[]>([]);

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

      // Load pending invites for parents/athletes
      if (currentUser && currentUser.role !== 'COACH') {
        try {
          const invites = await sessionInviteService.getPendingInvites(currentUser.id);
          setPendingInvitesList(invites);
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

  const handleAcceptInvite = async (invite: SessionInvite, selectedSlot?: SessionInvite['proposedSlots'][0]) => {
    const slot = selectedSlot || invite.proposedSlots[0];
    const result = await sessionInviteService.respondToInvite({
      inviteId: invite.id,
      response: 'ACCEPTED',
      selectedSlot: slot,
    });
    if (result.success) {
      loadData(); // Refresh - accepted invite becomes a booking
    }
  };

  const handleDeclineInvite = async (invite: SessionInvite) => {
    Alert.alert(
      'Decline Invite?',
      `Decline the session invite from ${invite.coachName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            const result = await sessionInviteService.respondToInvite({
              inviteId: invite.id,
              response: 'DECLINED',
            });
            if (result.success) {
              loadData();
            }
          },
        },
      ]
    );
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

      {/* Action Required - Pending Invites (non-coach users) */}
      {pendingInvitesList.length > 0 && userRole !== 'COACH' && (
        <View style={styles.actionRequiredSection}>
          <View style={styles.actionRequiredHeader}>
            <ThemedText type="defaultSemiBold" style={styles.actionRequiredTitle}>
              Action Required
            </ThemedText>
            <View style={[styles.actionRequiredBadge, { backgroundColor: palette.error }]}>
              <ThemedText style={[styles.actionRequiredBadgeText, { color: palette.onPrimary }]}>{pendingInvitesList.length}</ThemedText>
            </View>
          </View>
          {pendingInvitesList.slice(0, 3).map(invite => (
            <SessionInviteCard
              key={invite.id}
              invite={invite}
              onPress={() => router.push(Routes.sessionInvite(invite.id))}
              onAccept={(slot) => handleAcceptInvite(invite, slot)}
              onDecline={() => handleDeclineInvite(invite)}
              compact
            />
          ))}
          {pendingInvitesList.length > 3 && (
            <Clickable onPress={() => router.push(Routes.SESSION_INVITES)} accessibilityLabel={`View all ${pendingInvitesList.length} invites`} style={styles.viewAllInvites}>
              <ThemedText style={[styles.viewAllInvitesText, { color: palette.tint }]}>
                View all {pendingInvitesList.length} invites
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={palette.tint} />
            </Clickable>
          )}
        </View>
      )}

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
    padding: Spacing['2xl'],
  },
  errorContainer: {
    margin: Spacing.lg,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  errorText: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  // Action Required Section
  actionRequiredSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  actionRequiredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionRequiredTitle: {
    ...Typography.subheading,
  },
  actionRequiredBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  actionRequiredBadgeText: {
    ...Typography.micro,
  },
  viewAllInvites: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
  },
  viewAllInvitesText: {
    ...Typography.smallSemiBold,
  },
});
