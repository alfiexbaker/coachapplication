/**
 * useBookings — Data loading, filtering, and handlers for the bookings list screen.
 *
 * Manages session bookings, offerings, pending invites, time filtering,
 * modal state, and all navigation/action handlers.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

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
import {
  matchesCoachBusinessFilter,
  type CoachBusinessFilter,
} from '@/utils/coach-business-context';
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
import { uiFeedback } from '@/services/ui-feedback';

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
  totalVisibleItemCount: number;
  overallVisibleItemCount: number;
  pendingInvitesList: SessionInvite[];
  pendingInvites: number;
  isCoachUser: boolean;
  userRole: string | undefined;
  businessFilter: CoachBusinessFilter;
  businessCounts: Record<CoachBusinessFilter, number>;

  // State
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  timeFilter: TimeFilter;
  showDetailModal: boolean;
  selectedOffering: SessionOffering | null;

  // Setters
  setTimeFilter: (filter: TimeFilter) => void;
  setBusinessFilter: (filter: CoachBusinessFilter) => void;

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

// Keep the most recent bookings payload so tab remounts do not flash loading.
let lastBookingsSnapshot: BookingsScreenData | null = null;

export function useBookings(): UseBookingsResult {
  const { currentUser } = useAuth();
  const { children: contextChildren } = useChildContext();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const [businessFilter, setBusinessFilter] = useState<CoachBusinessFilter>('all');
  const [selectedOffering, setSelectedOffering] = useState<SessionOffering | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const seedEnsuredRef = useRef(false);
  const loadCycleRef = useRef(0);

  const userRole = currentUser?.role;
  const isCoachUser = isCoach(currentUser) || isAdmin(currentUser);
  const hasChildProfiles = contextChildren.length > 0;

  const ensureSeedOnce = useCallback(async () => {
    if (seedEnsuredRef.current) {
      return;
    }
    await ensureRelationalDemoSeeded();
    seedEnsuredRef.current = true;
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    const loadId = ++loadCycleRef.current;
    logger.debug('Load cycle start', {
      loadId,
      userId: currentUser?.id,
      role: currentUser?.role,
      isCoachUser,
      hasChildProfiles,
      childCount: contextChildren.length,
      childIds: contextChildren.map((child) => child.id),
      childReferenceIds: contextChildren.map((child) => child.referenceId),
      childProfileIds: contextChildren.map((child) => child.profileId).filter(Boolean),
    });
    try {
      await ensureSeedOnce();
      logger.debug('Seed ensured for load cycle', {
        loadId,
        seedEnsured: seedEnsuredRef.current,
      });

      const bookings = await bookingService.list();
      const viewerNameById = new Map<string, string>();
      if (currentUser?.id) {
        viewerNameById.set(currentUser.id, 'You');
      }
      for (const child of contextChildren) {
        viewerNameById.set(child.id, child.name);
        viewerNameById.set(child.referenceId, child.name);
        if (child.profileId) {
          viewerNameById.set(child.profileId, child.name);
        }
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
          commercialMode: booking.commercialMode ?? recurringSource?.commercialMode,
          ownerCoachId: booking.ownerCoachId ?? recurringSource?.ownerCoachId,
          assigneeCoachId: booking.assigneeCoachId ?? recurringSource?.assigneeCoachId,
          createdByUserId: booking.createdByUserId ?? recurringSource?.createdByUserId,
          createdByRole: booking.createdByRole ?? recurringSource?.createdByRole,
        };
      });
      const bookingStatusCounts = summaries.reduce<Record<string, number>>((acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {});
      logger.debug('Loaded session bookings', {
        loadId,
        count: summaries.length,
        statusCounts: bookingStatusCounts,
      });

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
        viewerIds.add(child.referenceId);
        if (child.profileId) {
          viewerIds.add(child.profileId);
        }
      }
      logger.debug('Viewer identity scope resolved', {
        loadId,
        viewerIds: Array.from(viewerIds),
        viewerNameMapSize: viewerNameById.size,
      });
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
          canViewerSeeEvent(event, viewerIds, isCoachUser, hasChildProfiles, currentUser?.id),
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
      const offeringsBySource = offerings.reduce<Record<string, number>>((acc, offering) => {
        const source = offering.source || 'unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});
      logger.debug('Loaded session offerings', {
        loadId,
        count: offerings.length,
        baseOfferings: baseOfferings.length,
        eventOfferings: eventOfferings.length,
        groupSessionOfferings: groupSessionOfferings.length,
        offeringsBySource,
        sampleOfferingIds: offerings.slice(0, 8).map((offering) => offering.id),
      });

      let pendingInvitesList: SessionInvite[] = [];
      if (currentUser && !isCoachUser) {
        try {
          const invites = await sessionInviteService.getPendingInvites(currentUser.id);
          pendingInvitesList = invites;
          logger.debug('Loaded pending invites', {
            loadId,
            count: invites.length,
            inviteIds: invites.slice(0, 8).map((invite) => invite.id),
          });
        } catch (inviteErr) {
          logger.error('Failed to load pending invites', { loadId, error: inviteErr });
        }
      }

      logger.debug('Load cycle complete', {
        loadId,
        bookings: summaries.length,
        offerings: offerings.length,
        pendingInvites: pendingInvitesList.length,
      });
      return ok<BookingsScreenData>({
        sessionBookings: summaries,
        sessionOfferings: offerings,
        pendingInvitesList,
      });
    } catch (loadError) {
      logger.error('Failed to load bookings data', { loadId, error: loadError });
      return err(
        serviceError('UNKNOWN', 'Failed to load bookings. Pull down to refresh.', loadError),
      );
    }
  }, [contextChildren, currentUser, isCoachUser, hasChildProfiles, ensureSeedOnce]);

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

  useEffect(() => {
    if (data) {
      lastBookingsSnapshot = data;
    }
  }, [data]);

  const resolvedData = data ?? lastBookingsSnapshot;
  const sessionBookings = resolvedData?.sessionBookings;
  const sessionOfferings = resolvedData?.sessionOfferings;
  const pendingInvitesList = resolvedData?.pendingInvitesList ?? [];
  const pendingInvites = pendingInvitesList.length;
  const loading = status === 'loading' && resolvedData === null;
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
      const timeWindowOfferings =
        timeFilter === 'upcoming'
          ? myOfferings.filter((offering) => !isPastOffering(offering))
          : myOfferings.filter((offering) => isPastOffering(offering));

      return timeWindowOfferings.filter((offering) =>
        matchesCoachBusinessFilter(offering, businessFilter),
      );
    }

    const viewerIds = new Set<string>();
    const viewerNameById = new Map<string, string>();
    if (currentUser?.id) {
      viewerIds.add(currentUser.id);
      viewerNameById.set(currentUser.id, 'You');
    }
    for (const child of contextChildren) {
      viewerIds.add(child.id);
      viewerIds.add(child.referenceId);
      if (child.profileId) {
        viewerIds.add(child.profileId);
      }
      viewerNameById.set(child.id, child.name);
      viewerNameById.set(child.referenceId, child.name);
      if (child.profileId) {
        viewerNameById.set(child.profileId, child.name);
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
            if (currentUser?.id && registration.userId === currentUser.id) {
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
    sessionBookings,
    sessionOfferings,
    timeFilter,
    isCoachUser,
    businessFilter,
  ]);

  const businessCounts = useMemo<Record<CoachBusinessFilter, number>>(() => {
    if (!isCoachUser) {
      const count = displayItems.length;
      return { all: count, org: 0, independent: 0 };
    }

    const myOfferings = (sessionOfferings ?? []).filter((offering) =>
      isOfferingVisibleToCoachUser(offering, currentUser?.id),
    );
    const now = new Date();
    const isPastOffering = (offering: SessionOffering) =>
      offering.status === 'completed' ||
      offering.status === 'cancelled' ||
      (!offering.isRecurring && new Date(offering.scheduledAt) < now);
    const timeWindowOfferings =
      timeFilter === 'upcoming'
        ? myOfferings.filter((offering) => !isPastOffering(offering))
        : myOfferings.filter((offering) => isPastOffering(offering));

    return {
      all: timeWindowOfferings.length,
      org: timeWindowOfferings.filter((offering) => matchesCoachBusinessFilter(offering, 'org'))
        .length,
      independent: timeWindowOfferings.filter((offering) =>
        matchesCoachBusinessFilter(offering, 'independent'),
      ).length,
    };
  }, [currentUser?.id, displayItems.length, isCoachUser, sessionOfferings, timeFilter]);

  const overallVisibleItemCount = useMemo(() => {
    if (isCoachUser) {
      return (sessionOfferings ?? []).filter((offering) =>
        isOfferingVisibleToCoachUser(offering, currentUser?.id),
      ).length;
    }

    return displayItems.length;
  }, [currentUser?.id, displayItems.length, isCoachUser, sessionOfferings]);

  const totalVisibleItemCount = isCoachUser ? businessCounts.all : displayItems.length;
  useEffect(() => {
    const offeringCount = displayItems.filter((item): item is SessionOffering => 'registrations' in item).length;
    const bookingCount = displayItems.length - offeringCount;
    logger.debug('Display items updated', {
      timeFilter,
      businessFilter,
      total: displayItems.length,
      offeringCount,
      bookingCount,
      pendingInvites,
      isCoachUser,
      showDetailModal,
      selectedOfferingId: selectedOffering?.id,
    });
  }, [
    displayItems,
    isCoachUser,
    pendingInvites,
    selectedOffering?.id,
    showDetailModal,
    timeFilter,
    businessFilter,
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
    logger.press('OfferingCardPressed', {
      offeringId: normalizedOffering.id,
      source: normalizedOffering.source,
      sourceEntityId: normalizedOffering.sourceEntityId,
      coachId: normalizedOffering.coachId,
      clubId: normalizedOffering.clubId,
      status: normalizedOffering.status,
      sessionType: normalizedOffering.sessionType,
    });
    if (normalizedOffering.source === 'group') {
      const groupSessionId =
        normalizedOffering.sourceEntityId ??
        extractGroupSessionIdFromOfferingId(normalizedOffering.id) ??
        normalizedOffering.id.replace(GROUP_SESSION_OFFERING_PREFIX, '');
      if (groupSessionId) {
        logger.debug('Routing to group session screen from bookings list', {
          offeringId: normalizedOffering.id,
          groupSessionId,
        });
        router.push(Routes.groupSession(groupSessionId));
        return;
      }
    }
    logger.debug('Opening session detail modal from bookings list', {
      offeringId: normalizedOffering.id,
      source: normalizedOffering.source,
      sourceEntityId: normalizedOffering.sourceEntityId,
    });
    setSelectedOffering(normalizedOffering);
    setShowDetailModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    logger.debug('Session detail modal closed from bookings list', {
      selectedOfferingId: selectedOffering?.id,
      hadModalOpen: showDetailModal,
    });
    setShowDetailModal(false);
    setSelectedOffering(null);
  }, [selectedOffering?.id, showDetailModal]);

  const handleModalUpdate = useCallback(() => {
    logger.debug('Session detail modal requested bookings refresh');
    onRefresh();
  }, [onRefresh]);
  const processingInviteIdsRef = useRef<Set<string>>(new Set());

  const handleAcceptInvite = useCallback(
    async (invite: SessionInvite, selectedSlot?: SessionInvite['proposedSlots'][0]) => {
      if (processingInviteIdsRef.current.has(invite.id)) {
        logger.debug('Invite accept skipped - already processing', { inviteId: invite.id });
        return;
      }
      processingInviteIdsRef.current.add(invite.id);
      const slot = selectedSlot || invite.proposedSlots[0];
      logger.action('AcceptInvite', {
        inviteId: invite.id,
        coachId: invite.coachId,
        selectedSlotDate: slot?.date,
        selectedSlotStart: slot?.startTime,
      });
      try {
        const result = await sessionInviteService.respondToInvite({
          inviteId: invite.id,
          response: 'ACCEPTED',
          selectedSlot: slot,
        });
        logger.debug('Invite accept response', {
          inviteId: invite.id,
          success: result.success,
          errorCode: result.success ? undefined : result.error.code,
        });
        if (result.success) {
          onRefresh();
        }
      } finally {
        processingInviteIdsRef.current.delete(invite.id);
        logger.debug('Invite accept processing cleared', { inviteId: invite.id });
      }
    },
    [onRefresh],
  );

  const handleDeclineInvite = useCallback(
    (invite: SessionInvite) => {
      const coachName = getSessionInviteCoachName(invite);
      uiFeedback.alert('Decline Invite?', `Decline the session invite from ${coachName}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            if (processingInviteIdsRef.current.has(invite.id)) {
              logger.debug('Invite decline skipped - already processing', { inviteId: invite.id });
              return;
            }
            processingInviteIdsRef.current.add(invite.id);
            logger.action('DeclineInvite', { inviteId: invite.id, coachId: invite.coachId });
            try {
              const result = await sessionInviteService.respondToInvite({
                inviteId: invite.id,
                response: 'DECLINED',
              });
              logger.debug('Invite decline response', {
                inviteId: invite.id,
                success: result.success,
                errorCode: result.success ? undefined : result.error.code,
              });
              if (result.success) {
                onRefresh();
              }
            } finally {
              processingInviteIdsRef.current.delete(invite.id);
              logger.debug('Invite decline processing cleared', { inviteId: invite.id });
            }
          },
        },
      ]);
    },
    [onRefresh],
  );

  return {
    displayItems,
    totalVisibleItemCount,
    overallVisibleItemCount,
    pendingInvitesList,
    pendingInvites,
    isCoachUser,
    userRole,
    businessFilter,
    businessCounts,
    loading,
    error,
    refreshing,
    timeFilter,
    showDetailModal,
    selectedOffering,
    setTimeFilter,
    setBusinessFilter,
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
