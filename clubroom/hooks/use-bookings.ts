/**
 * useBookings — Data loading, filtering, and handlers for the bookings list screen.
 *
 * Manages session bookings, offerings, pending invites, time filtering,
 * modal state, and all navigation/action handlers.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAppAlert } from '@/components/ui/app-alert';
import { bookingService } from '@/services/booking';
import { eventService } from '@/services/event';
import { inviteService as sessionInviteService } from '@/services/invite';
import { ensureRelationalDemoSeeded } from '@/services/relational-demo-seed-service';
import { ServiceEvents } from '@/services/event-bus';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen } from '@/hooks/use-screen';
import { createLogger } from '@/utils/logger';
import { getSessionInviteCoachName } from '@/utils/session-invite-display';
import { getBookingAthleteName } from '@/utils/booking-display';
import { isCoach, isAdmin } from '@/utils/user-helpers';
import {
  extractGroupSessionIdFromOfferingId,
  GROUP_SESSION_OFFERING_PREFIX,
  canViewerSeeEvent,
  isGroupSessionRelevantToViewer,
  isOfferingVisibleToCoachUser,
  mapEventToOffering,
  mapGroupSessionToOffering,
  normalizeSessionOfferingSource,
} from '@/utils/session-offering-projections';
import { err, ok, serviceError } from '@/types/result';
import type {
  BookingSummary,
  GroupRegistration,
  GroupSession,
  SessionOffering,
  SessionInvite,
  RecurringBooking,
} from '@/constants/types';
import type { TimeFilter } from '@/components/bookings/BookingsList';

const logger = createLogger('useBookings');

const mapBookingStatus = (status: string): BookingSummary['status'] => {
  if (status === 'CONFIRMED') return 'Confirmed';
  if (status === 'AWAITING_COMPLETION') return 'Needs Completion';
  if (status === 'PENDING' || status === 'AWAITING_CONFIRMATION') return 'Pending';
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'CANCELLED') return 'Cancelled';
  return 'Pending';
};

const DEFAULT_DEMO_CLUB_ID = 'club_lions';

function isOffPlatformAudienceLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return normalized.includes('off-platform') || normalized.includes('off platform');
}

export interface UseBookingsResult {
  // Data
  displayItems: (SessionOffering | BookingSummary)[];
  pendingInvitesList: SessionInvite[];
  pendingInvites: number;
  isCoachUser: boolean;
  userRole: string | undefined;

  // State
  loading: boolean;
  error: string | null;
  refreshing: boolean;
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
  handleCreateDirectPress: () => void;
  handleCreateGroupPress: () => void;
  handleFindCoachPress: () => void;
  handleOfferingPress: (offering: SessionOffering) => void;
  handleModalClose: () => void;
  handleModalUpdate: () => void;
  onRefresh: () => void;
  retry: () => void;
  handleAcceptInvite: (
    invite: SessionInvite,
    selectedSlot?: SessionInvite['proposedSlots'][0],
  ) => Promise<void>;
  handleDeclineInvite: (invite: SessionInvite) => void;
}

interface BookingsScreenData {
  sessionBookings: BookingSummary[];
  sessionOfferings: SessionOffering[];
  pendingInvitesList: SessionInvite[];
}

export function useBookings(): UseBookingsResult {
  const { showAlert } = useAppAlert();
  const { currentUser } = useAuth();
  const { children: contextChildren, isParent } = useChildContext();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const [selectedOffering, setSelectedOffering] = useState<SessionOffering | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const seedEnsuredRef = useRef(false);

  const userRole = currentUser?.role;
  const isCoachUser = isCoach(currentUser) || isAdmin(currentUser);

  const ensureSeedOnce = useCallback(async () => {
    if (seedEnsuredRef.current) {
      return;
    }
    await ensureRelationalDemoSeeded();
    seedEnsuredRef.current = true;
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      await ensureSeedOnce();

      const bookings = await bookingService.list();
      const viewerNameById = new Map<string, string>();
      if (currentUser?.id) {
        const selfLabel =
          isParent && contextChildren.length > 0
            ? 'You'
            : currentUser.name || currentUser.fullName || 'You';
        viewerNameById.set(currentUser.id, selfLabel);
      }
      for (const child of contextChildren) {
        viewerNameById.set(child.id, child.name);
      }

      const recurringBookings = await apiClient.get<RecurringBooking[]>(
        STORAGE_KEYS.RECURRING_BOOKINGS,
        [],
      );
      const recurringById = new Map(recurringBookings.map((recurring) => [recurring.id, recurring]));

      const summaries: BookingSummary[] = bookings.map((booking) => {
        const recurringSource = booking.recurringBookingId
          ? recurringById.get(booking.recurringBookingId)
          : undefined;
        const athleteId = booking.athleteId ?? booking.athleteIds?.[0] ?? '';
        const athleteName = getBookingAthleteName(booking);
        const isSelfBooking = Boolean(currentUser?.id && athleteId && athleteId === currentUser.id);
        const audienceLabel = isSelfBooking ? 'You' : viewerNameById.get(athleteId) || athleteName;
        return {
          id: booking.id,
          service: booking.service ?? 'Session',
          sessionSource: booking.sessionSource,
          sessionSourceEntityId: booking.sessionSourceEntityId,
          start: booking.scheduledAt,
          status: mapBookingStatus(booking.status),
          locationLabel: booking.location,
          coach: {
            name: booking.coachName ?? 'Coach',
            photoUrl: 'https://i.pravatar.cc/100?u=' + booking.coachId,
          },
          client: {
            name: audienceLabel,
            photoUrl: 'https://i.pravatar.cc/100?u=' + booking.athleteId,
          },
          coachId: booking.coachId,
          clientId: athleteId,
          bookedById: booking.bookedById,
          bookedByName: booking.bookedByName,
          audienceLabel,
          clubId: booking.clubId ?? recurringSource?.clubId,
          actingAs: booking.actingAs ?? recurringSource?.actingAs,
          ownerCoachId: booking.ownerCoachId ?? recurringSource?.ownerCoachId,
          assigneeCoachId: booking.assigneeCoachId ?? recurringSource?.assigneeCoachId,
          createdByUserId: booking.createdByUserId ?? recurringSource?.createdByUserId,
          createdByRole: booking.createdByRole ?? recurringSource?.createdByRole,
        };
      });
      logger.debug('Loaded session bookings', { count: summaries.length });

      const baseOfferingsRaw = await apiClient.get<SessionOffering[]>(
        STORAGE_KEYS.SESSION_OFFERINGS,
        [],
      );
      const baseOfferings = baseOfferingsRaw.map(normalizeSessionOfferingSource);
      const [groupSessions, groupRegistrations] = await Promise.all([
        apiClient.get<GroupSession[]>(STORAGE_KEYS.GROUP_SESSIONS, []),
        apiClient.get<GroupRegistration[]>(STORAGE_KEYS.GROUP_REGISTRATIONS, []),
      ]);

      const clubIds = new Set<string>();
      for (const offering of baseOfferings) {
        if (offering.clubId) {
          clubIds.add(offering.clubId);
        }
      }
      for (const booking of bookings) {
        if (booking.clubId) {
          clubIds.add(booking.clubId);
        }
      }
      if (clubIds.size === 0) {
        clubIds.add(DEFAULT_DEMO_CLUB_ID);
      }

      const viewerIds = new Set<string>();
      if (currentUser?.id) {
        viewerIds.add(currentUser.id);
      }
      for (const child of contextChildren) {
        viewerIds.add(child.id);
      }
      const childClubIds = new Set<string>();
      for (const child of contextChildren) {
        for (const clubId of child.clubIds) {
          childClubIds.add(clubId);
        }
      }

      const clubEventsResults = await Promise.all(
        Array.from(clubIds).map(async (clubId) => {
          try {
            return await eventService.getAllClubEvents(clubId);
          } catch (eventError) {
            logger.warn('Failed to load club events for bookings', { clubId, error: eventError });
            return [];
          }
        }),
      );
      const eventOfferings = clubEventsResults
        .flat()
        .filter((event) =>
          canViewerSeeEvent(event, viewerIds, isCoachUser, isParent, currentUser?.id),
        )
        .map(mapEventToOffering);

      const registrationsBySessionId = new Map<string, GroupRegistration[]>();
      for (const registration of groupRegistrations) {
        if (!registrationsBySessionId.has(registration.sessionId)) {
          registrationsBySessionId.set(registration.sessionId, []);
        }
        registrationsBySessionId.get(registration.sessionId)!.push(registration);
      }

      const relevantGroupSessions = groupSessions.filter((session) => {
        const sessionRegistrations = registrationsBySessionId.get(session.id) ?? [];
        return isGroupSessionRelevantToViewer({
          session,
          sessionRegistrations,
          viewerIds,
          childClubIds,
          currentUserId: currentUser?.id,
          isCoachUser,
        });
      });

      const groupSessionOfferings = relevantGroupSessions
        .map((session) =>
          mapGroupSessionToOffering(
            session,
            registrationsBySessionId.get(session.id) ?? [],
            new Date(),
          ),
        )
        .filter((offering): offering is SessionOffering => offering !== null);

      const offeringsById = new Map<string, SessionOffering>();
      for (const offering of baseOfferings) {
        offeringsById.set(offering.id, offering);
      }
      for (const eventOffering of eventOfferings) {
        offeringsById.set(eventOffering.id, eventOffering);
      }
      for (const groupOffering of groupSessionOfferings) {
        offeringsById.set(groupOffering.id, groupOffering);
      }
      const offerings = Array.from(offeringsById.values());
      logger.debug('Loaded session offerings', {
        count: offerings.length,
        baseOfferings: baseOfferings.length,
        eventOfferings: eventOfferings.length,
        groupSessionOfferings: groupSessionOfferings.length,
      });

      let pendingInvitesList: SessionInvite[] = [];
      if (currentUser && !isCoachUser) {
        try {
          const invites = await sessionInviteService.getPendingInvites(currentUser.id);
          pendingInvitesList = invites;
          logger.debug('Loaded pending invites', { count: invites.length });
        } catch (inviteErr) {
          logger.error('Failed to load pending invites', inviteErr);
        }
      }

      return ok<BookingsScreenData>({
        sessionBookings: summaries,
        sessionOfferings: offerings,
        pendingInvitesList,
      });
    } catch (loadError) {
      logger.error('Failed to load bookings data', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load bookings. Pull down to refresh.', loadError),
      );
    }
  }, [contextChildren, currentUser, isCoachUser, isParent, ensureSeedOnce]);

  const {
    data,
    status,
    error: screenError,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<BookingsScreenData>({
    load: loadData,
    deps: [loadData],
    events: [
      ServiceEvents.BOOKING_CREATED,
      ServiceEvents.BOOKING_UPDATED,
      ServiceEvents.BOOKING_CANCELLED,
      ServiceEvents.BOOKING_CONFIRMED,
      ServiceEvents.INVITE_ACCEPTED,
      ServiceEvents.INVITE_BOOKING_FAILED,
    ],
    isEmpty: (value) =>
      value.sessionBookings.length === 0 &&
      value.sessionOfferings.length === 0 &&
      value.pendingInvitesList.length === 0,
    refetchOnFocus: true,
  });

  const sessionBookings = data?.sessionBookings;
  const sessionOfferings = data?.sessionOfferings;
  const pendingInvitesList = data?.pendingInvitesList ?? [];
  const pendingInvites = pendingInvitesList.length;
  const loading = status === 'loading' && data === null;
  const error =
    status === 'error'
      ? (screenError?.message ?? 'Failed to load bookings. Pull down to refresh.')
      : null;

  const displayItems = useMemo<(SessionOffering | BookingSummary)[]>(() => {
    const now = new Date();
    const isPastBooking = (booking: BookingSummary) =>
      booking.status === 'Completed' ||
      booking.status === 'Cancelled' ||
      new Date(booking.start) < now;

    const isPastOffering = (offering: SessionOffering) =>
      offering.status === 'completed' ||
      offering.status === 'cancelled' ||
      (!offering.isRecurring && new Date(offering.scheduledAt) < now);

    if (isCoachUser) {
      const myOfferings = (sessionOfferings ?? []).filter((offering) =>
        isOfferingVisibleToCoachUser(offering, currentUser?.id),
      );
      return timeFilter === 'upcoming'
        ? myOfferings.filter((offering) => !isPastOffering(offering))
        : myOfferings.filter((offering) => isPastOffering(offering));
    }

    const viewerIds = new Set<string>();
    const viewerNameById = new Map<string, string>();
    if (currentUser?.id) {
      viewerIds.add(currentUser.id);
      const selfLabel =
        isParent && contextChildren.length > 0
          ? 'You'
          : currentUser.name || currentUser.fullName || 'You';
      viewerNameById.set(currentUser.id, selfLabel);
    }
    if (isParent) {
      for (const child of contextChildren) {
        viewerIds.add(child.id);
        viewerNameById.set(child.id, child.name);
      }
    }

    const myRegisteredOfferings = (sessionOfferings ?? []).reduce<SessionOffering[]>((acc, offering) => {
      const matchingRegistrations = offering.registrations.filter(
        (reg) => reg.status === 'confirmed' && viewerIds.has(reg.userId),
      );
      if (matchingRegistrations.length === 0) {
        return acc;
      }

      const viewerAthleteNames = Array.from(
        new Set(
          matchingRegistrations.map((registration) => {
            if (isParent && currentUser?.id && registration.userId === currentUser.id) {
              return 'You';
            }
            if (registration.userName?.trim()) {
              return registration.userName.trim();
            }
            return viewerNameById.get(registration.userId) || registration.userId;
          }),
        ),
      ).filter((name) => !isOffPlatformAudienceLabel(name));

      acc.push({
        ...offering,
        viewerAthleteNames,
      });
      return acc;
    }, []);

    const filteredBookings = (sessionBookings ?? []).filter((booking) => {
      const clientId = booking.clientId || '';
      const bookedById = booking.bookedById || '';
      const matchesByName =
        booking.client?.name === currentUser?.fullName || booking.client?.name === currentUser?.name;
      return viewerIds.has(clientId) || viewerIds.has(bookedById) || matchesByName;
    });

    return timeFilter === 'upcoming'
      ? [
          ...myRegisteredOfferings.filter((offering) => !isPastOffering(offering)),
          ...filteredBookings.filter((booking) => !isPastBooking(booking)),
        ]
      : [
          ...myRegisteredOfferings.filter((offering) => isPastOffering(offering)),
          ...filteredBookings.filter((booking) => isPastBooking(booking)),
        ];
  }, [
    contextChildren,
    currentUser?.fullName,
    currentUser?.id,
    currentUser?.name,
    isParent,
    sessionBookings,
    sessionOfferings,
    timeFilter,
    isCoachUser,
  ]);

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
    logger.press('SettingsButton', { route: '/settings' });
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
    logger.press('CreateSessionButton', { intent: 'new' });
    router.push(Routes.sessionsCreateIntent({ intent: 'new', source: 'manual' }));
  }, []);

  const handleCreateDirectPress = useCallback(() => {
    logger.press('CreateDirectButton', { preset: '1on1' });
    router.push(Routes.sessionsCreateIntent({ intent: 'new', source: 'manual', preset: '1on1' }));
  }, []);

  const handleCreateGroupPress = useCallback(() => {
    logger.press('CreateGroupButton', { preset: 'group' });
    router.push(Routes.sessionsCreateIntent({ intent: 'new', source: 'manual', preset: 'group' }));
  }, []);

  const handleFindCoachPress = useCallback(() => {
    logger.press('FindCoachButton', { route: Routes.DISCOVER_MAP });
    router.push(Routes.DISCOVER_MAP);
  }, []);

  const handleOfferingPress = useCallback((offering: SessionOffering) => {
    const normalizedOffering = normalizeSessionOfferingSource(offering);
    if (normalizedOffering.source === 'group') {
      const groupSessionId =
        normalizedOffering.sourceEntityId ??
        extractGroupSessionIdFromOfferingId(normalizedOffering.id) ??
        normalizedOffering.id.replace(GROUP_SESSION_OFFERING_PREFIX, '');
      if (groupSessionId) {
        router.push(Routes.groupSession(groupSessionId));
        return;
      }
    }
    setSelectedOffering(normalizedOffering);
    setShowDetailModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowDetailModal(false);
    setSelectedOffering(null);
  }, []);

  const handleModalUpdate = useCallback(() => {
    onRefresh();
  }, [onRefresh]);
  const processingInviteIdsRef = useRef<Set<string>>(new Set());

  const handleAcceptInvite = useCallback(
    async (invite: SessionInvite, selectedSlot?: SessionInvite['proposedSlots'][0]) => {
      if (processingInviteIdsRef.current.has(invite.id)) return;
      processingInviteIdsRef.current.add(invite.id);
      const slot = selectedSlot || invite.proposedSlots[0];
      try {
        const result = await sessionInviteService.respondToInvite({
          inviteId: invite.id,
          response: 'ACCEPTED',
          selectedSlot: slot,
        });
        if (result.success) {
          onRefresh();
        }
      } finally {
        processingInviteIdsRef.current.delete(invite.id);
      }
    },
    [onRefresh],
  );

  const handleDeclineInvite = useCallback(
    (invite: SessionInvite) => {
      const coachName = getSessionInviteCoachName(invite);
      showAlert('Decline Invite?', `Decline the session invite from ${coachName}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            if (processingInviteIdsRef.current.has(invite.id)) return;
            processingInviteIdsRef.current.add(invite.id);
            try {
              const result = await sessionInviteService.respondToInvite({
                inviteId: invite.id,
                response: 'DECLINED',
              });
              if (result.success) {
                onRefresh();
              }
            } finally {
              processingInviteIdsRef.current.delete(invite.id);
            }
          },
        },
      ]);
    },
    [onRefresh, showAlert],
  );

  return {
    displayItems,
    pendingInvitesList,
    pendingInvites,
    isCoachUser,
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
  };
}
