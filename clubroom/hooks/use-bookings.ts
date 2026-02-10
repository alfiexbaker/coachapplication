/**
 * useBookings — Data loading, filtering, and handlers for the bookings list screen.
 *
 * Manages session bookings, offerings, pending invites, time filtering,
 * modal state, and all navigation/action handlers.
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { bookingService } from '@/services/booking';
import { inviteService as sessionInviteService } from '@/services/invite';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import {
  upcomingBookings,
  getChildrenForParent,
} from '@/constants/mock-data';
import { useAuth } from '@/hooks/use-auth';
import { hasChildren } from '@/utils/user-helpers';
import { createLogger } from '@/utils/logger';
import type { BookingSummary, SessionOffering, SessionInvite } from '@/constants/types';
import type { TimeFilter } from '@/components/bookings/BookingsList';

const logger = createLogger('useBookings');

export interface UseBookingsResult {
  // Data
  displayItems: (SessionOffering | BookingSummary)[];
  pendingInvitesList: SessionInvite[];
  pendingInvites: number;
  userRole: string | undefined;

  // State
  loading: boolean;
  error: string | null;
  timeFilter: TimeFilter;
  showDetailModal: boolean;
  selectedOffering: SessionOffering | null;

  // Setters
  setTimeFilter: (filter: TimeFilter) => void;

  // Handlers
  handleRateCoachPress: () => void;
  handleCalendarPress: () => void;
  handleSettingsPress: () => void;
  handleGroupSessionsPress: () => void;
  handleDiscoverSessionsPress: () => void;
  handleInvitesPress: () => void;
  handleCreateSessionPress: () => void;
  handleFindCoachPress: () => void;
  handleOfferingPress: (offering: SessionOffering) => void;
  handleModalClose: () => void;
  handleModalUpdate: () => void;
  handleAcceptInvite: (invite: SessionInvite, selectedSlot?: SessionInvite['proposedSlots'][0]) => Promise<void>;
  handleDeclineInvite: (invite: SessionInvite) => void;
}

export function useBookings(): UseBookingsResult {
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
      const bookings = await bookingService.list();
      if (bookings.length > 0) {
        const summaries: BookingSummary[] = bookings.map((booking) => ({
          id: booking.id,
          coachName: booking.coachName,
          childName: booking.athleteName ?? 'Athlete',
          service: booking.service ?? 'Session',
          start: booking.scheduledAt,
          status: booking.status === 'CONFIRMED' ? 'Confirmed' : booking.status === 'PENDING' ? 'Pending' : 'Completed',
          locationLabel: booking.location,
          coach: {
            name: booking.coachName,
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

      const offerings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
      if (offerings.length > 0) {
        setSessionOfferings(offerings);
        logger.debug('Loaded session offerings', { count: offerings.length });
      }

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

  // Reload on screen focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Event bus subscriptions
  useEffect(() => {
    const unsubCreated = onTyped(ServiceEvents.BOOKING_CREATED, () => { loadData(); });
    const unsubCancelled = onTyped(ServiceEvents.BOOKING_CANCELLED, () => { loadData(); });
    const unsubConfirmed = onTyped(ServiceEvents.BOOKING_CONFIRMED, () => { loadData(); });
    return () => {
      unsubCreated();
      unsubCancelled();
      unsubConfirmed();
    };
  }, [loadData]);

  // Compute display items
  const now = new Date();
  let displayItems: (SessionOffering | BookingSummary)[] = [];

  if (userRole === 'COACH') {
    const myOfferings = sessionOfferings.filter(o => o.coachId === currentUser?.id);
    displayItems = timeFilter === 'upcoming'
      ? myOfferings.filter(o => new Date(o.scheduledAt) >= now || o.isRecurring)
      : myOfferings.filter(o => new Date(o.scheduledAt) < now && !o.isRecurring);
  } else {
    const myRegisteredOfferings = sessionOfferings.filter(offering =>
      offering.registrations.some(reg =>
        reg.userId === currentUser?.id && reg.status === 'confirmed'
      )
    );

    const allBookings = [...upcomingBookings, ...sessionBookings];
    const filteredBookings = allBookings.filter((booking) => {
      if (hasChildren(currentUser)) {
        const children = getChildrenForParent(currentUser?.id || '');
        const childrenIds = children.map(c => c.id);
        return childrenIds.includes(booking.clientId || '') ||
               booking.clientId === currentUser?.id ||
               booking.client?.name === currentUser?.fullName;
      }
      return booking.clientId === currentUser?.id || booking.client?.name === currentUser?.fullName;
    });

    displayItems = timeFilter === 'upcoming'
      ? [...myRegisteredOfferings.filter(o => new Date(o.scheduledAt) >= now || o.isRecurring), ...filteredBookings]
      : myRegisteredOfferings.filter(o => new Date(o.scheduledAt) < now && !o.isRecurring);
  }

  // Navigation handlers
  const handleRateCoachPress = useCallback(() => {
    logger.press('RateCoachButton', { route: '/rate-coach' });
    router.push(Routes.RATE_COACH);
  }, []);

  const handleCalendarPress = useCallback(() => {
    logger.press('CalendarButton', { route: '/(tabs)/availability' });
    router.push(Routes.AVAILABILITY);
  }, []);

  const handleSettingsPress = useCallback(() => {
    logger.press('SettingsButton', { route: '/(tabs)/settings' });
    router.push(Routes.SETTINGS);
  }, []);

  const handleGroupSessionsPress = useCallback(() => {
    logger.press('GroupSessionsButton', { route: '/group-sessions' });
    router.push(Routes.GROUP_SESSIONS);
  }, []);

  const handleDiscoverSessionsPress = useCallback(() => {
    logger.press('DiscoverSessionsButton', { route: '/discover-sessions' });
    router.push(Routes.DISCOVER_SESSIONS);
  }, []);

  const handleInvitesPress = useCallback(() => {
    logger.press('InvitesButton', { route: '/invites' });
    router.push(Routes.INVITES);
  }, []);

  const handleCreateSessionPress = useCallback(() => {
    logger.press('CreateSessionButton', { route: '/sessions/create' });
    router.push(Routes.SESSIONS_CREATE);
  }, []);

  const handleFindCoachPress = useCallback(() => {
    logger.press('FindCoachButton', { route: '/(tabs)/index' });
    router.push(Routes.HOME_INDEX);
  }, []);

  const handleOfferingPress = useCallback((offering: SessionOffering) => {
    setSelectedOffering(offering);
    setShowDetailModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowDetailModal(false);
    setSelectedOffering(null);
  }, []);

  const handleModalUpdate = useCallback(() => {
    loadData();
  }, [loadData]);

  const handleAcceptInvite = useCallback(async (invite: SessionInvite, selectedSlot?: SessionInvite['proposedSlots'][0]) => {
    const slot = selectedSlot || invite.proposedSlots[0];
    const result = await sessionInviteService.respondToInvite({
      inviteId: invite.id,
      response: 'ACCEPTED',
      selectedSlot: slot,
    });
    if (result.success) {
      loadData();
    }
  }, [loadData]);

  const handleDeclineInvite = useCallback((invite: SessionInvite) => {
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
  }, [loadData]);

  return {
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
  };
}
