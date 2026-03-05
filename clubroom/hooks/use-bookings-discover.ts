/**
 * useBookingsDiscover — Aggregates data for the Discover tab within the Bookings screen.
 *
 * Fetches pending invites, this-week offerings, familiar coaches, club/open sessions,
 * and suggested coaches. Applies per-child filtering when activeChildId is set.
 */

import { useCallback, useRef } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { bookingService } from '@/services/booking';
import { eventService } from '@/services/event';
import { inviteService as sessionInviteService } from '@/services/invite';
import { discoverService } from '@/services/discover-service';
// Note: discoverService.getSuggestedCoaches() exists but we deliberately
// don't surface coach rankings — marketplace fairness concern.
import { apiClient } from '@/services/api-client';
import { ensureRelationalDemoSeeded } from '@/services/relational-demo-seed-service';
import { ServiceEvents } from '@/services/event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen } from '@/hooks/use-screen';
import { useBookingFlow } from '@/context/booking-flow-context';
import { createLogger } from '@/utils/logger';
import { getSessionInviteCoachName } from '@/utils/session-invite-display';
import { getSessionOfferingHeadcount } from '@/utils/session-offering-capacity';
import { buildBookingDraftPatchFromOffering } from '@/utils/booking-draft-prefill';
import {
  canViewerSeeEvent,
  extractGroupSessionIdFromOfferingId,
  isGroupSessionRelevantToViewer,
  mapEventToOffering,
  mapGroupSessionToOffering,
  normalizeSessionOfferingSource,
} from '@/utils/session-offering-projections';
import { ok, err, serviceError } from '@/types/result';
import type {
  SessionOffering,
  SessionInvite,
  CoachProfile,
  GroupSession,
  GroupRegistration,
} from '@/constants/types';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('useBookingsDiscover');

interface DiscoverData {
  pendingInvites: SessionInvite[];
  thisWeekOfferings: SessionOffering[];
  familiarCoaches: CoachProfile[];
  clubSessions: GroupSession[];
  openSessions: SessionOffering[];
}

export interface UseBookingsDiscoverResult {
  pendingInvites: SessionInvite[];
  thisWeekOfferings: SessionOffering[];
  familiarCoaches: CoachProfile[];
  clubSessions: GroupSession[];
  openSessions: SessionOffering[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  handleAcceptInvite: (
    invite: SessionInvite,
    selectedSlot?: SessionInvite['proposedSlots'][0],
  ) => Promise<void>;
  handleDeclineInvite: (invite: SessionInvite) => void;
  handleCoachPress: (coachId: string) => void;
  handleOfferingPress: (offering: SessionOffering) => void;
  handleGroupSessionPress: (sessionId: string) => void;
  handleFindCoachPress: () => void;
}

export function useBookingsDiscover(): UseBookingsDiscoverResult {
  const { currentUser } = useAuth();
  const { updateDraft } = useBookingFlow();
  const { children: contextChildren, activeChildId } = useChildContext();
  const seedEnsuredRef = useRef(false);

  const ensureSeedOnce = useCallback(async () => {
    if (seedEnsuredRef.current) {
      return;
    }
    await ensureRelationalDemoSeeded();
    seedEnsuredRef.current = true;
  }, []);

  const loadData = useCallback(async () => {
    try {
      await ensureSeedOnce();

      const userId = currentUser?.id ?? '';

      // --- Pending invites ---
      let pendingInvites: SessionInvite[] = [];
      if (currentUser && currentUser.role !== 'COACH') {
        try {
          pendingInvites = await sessionInviteService.getPendingInvites(userId);
        } catch (e) {
          logger.error('Failed to load pending invites', e);
        }
      }

      // --- All session offerings + group projections ---
      const [storedOfferings, groupSessions, groupRegistrations] = await Promise.all([
        apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
        apiClient.get<GroupSession[]>(STORAGE_KEYS.GROUP_SESSIONS, []),
        apiClient.get<GroupRegistration[]>(STORAGE_KEYS.GROUP_REGISTRATIONS, []),
      ]);
      const normalizedStoredOfferings = storedOfferings.map(normalizeSessionOfferingSource);

      const scopedChildren = contextChildren.filter(
        (child) => !activeChildId || child.id === activeChildId,
      );
      const hasChildProfiles = contextChildren.length > 0;
      const viewerIds = new Set<string>();
      if (userId) viewerIds.add(userId);
      for (const child of scopedChildren) {
        viewerIds.add(child.id);
      }
      const childClubIds = new Set<string>();
      for (const child of scopedChildren) {
        for (const clubId of child.clubIds) {
          childClubIds.add(clubId);
        }
      }

      const registrationsBySessionId = new Map<string, GroupRegistration[]>();
      for (const registration of groupRegistrations) {
        if (!registrationsBySessionId.has(registration.sessionId)) {
          registrationsBySessionId.set(registration.sessionId, []);
        }
        registrationsBySessionId.get(registration.sessionId)!.push(registration);
      }

      const isCoachUser = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
      const relevantGroupSessions = groupSessions.filter((session) => {
        const sessionRegistrations = registrationsBySessionId.get(session.id) ?? [];
        return isGroupSessionRelevantToViewer({
          session,
          sessionRegistrations,
          viewerIds,
          childClubIds,
          currentUserId: userId || undefined,
          isCoachUser,
        });
      });

      const projectedGroupOfferings = relevantGroupSessions
        .map((session) =>
          mapGroupSessionToOffering(
            session,
            registrationsBySessionId.get(session.id) ?? [],
            new Date(),
          ),
        )
        .filter((offering): offering is SessionOffering => offering !== null);

      const eventClubIds = new Set<string>(childClubIds);
      for (const offering of normalizedStoredOfferings) {
        if (offering.clubId) {
          eventClubIds.add(offering.clubId);
        }
      }
      const clubEventsResults = await Promise.all(
        Array.from(eventClubIds).map(async (clubId) => {
          try {
            return await eventService.getAllClubEvents(clubId);
          } catch (eventError) {
            logger.warn('Failed to load club events for discover', {
              clubId,
              error: eventError,
            });
            return [];
          }
        }),
      );
      const eventOfferings = clubEventsResults
        .flat()
        .filter((event) =>
          canViewerSeeEvent(event, viewerIds, isCoachUser, hasChildProfiles, userId),
        )
        .map(mapEventToOffering);

      const allOfferingsById = new Map<string, SessionOffering>();
      for (const offering of normalizedStoredOfferings) {
        allOfferingsById.set(offering.id, offering);
      }
      for (const offering of projectedGroupOfferings) {
        allOfferingsById.set(offering.id, offering);
      }
      for (const offering of eventOfferings) {
        allOfferingsById.set(offering.id, offering);
      }
      const allOfferings = Array.from(allOfferingsById.values());

      // --- Past bookings → familiar coach IDs ---
      const bookings = await bookingService.list();
      const familiarCoachIds = new Set<string>();
      for (const booking of bookings) {
        const athleteId = booking.athleteId ?? booking.athleteIds?.[0] ?? '';
        const bookedById = booking.bookedById ?? '';
        if (viewerIds.has(athleteId) || viewerIds.has(bookedById)) {
          if (booking.coachId) familiarCoachIds.add(booking.coachId);
        }
      }

      // --- Familiar coaches (profiles) ---
      let familiarCoaches: CoachProfile[] = [];
      if (familiarCoachIds.size > 0) {
        const allCoachesResult = await discoverService.getAllCoaches();
        if (allCoachesResult.success) {
          familiarCoaches = allCoachesResult.data.filter((c) => familiarCoachIds.has(c.id));
        }
      }

      // --- Filter offerings ---
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const isEligible = (offering: SessionOffering): boolean => {
        if (offering.status === 'completed' || offering.status === 'cancelled') return false;
        if (!offering.isRecurring && new Date(offering.scheduledAt) < now) return false;
        if (getSessionOfferingHeadcount(offering) >= offering.maxParticipants) return false;
        // Age filtering
        if (activeChildId) {
          const child = contextChildren.find((c) => c.id === activeChildId);
          if (child?.age != null) {
            if (offering.ageMin != null && child.age < offering.ageMin) return false;
            if (offering.ageMax != null && child.age > offering.ageMax) return false;
          }
        }
        return true;
      };

      const thisWeekOfferings = allOfferings.filter((o) => {
        if (!isEligible(o)) return false;
        if (o.isRecurring) return true; // recurring sessions always relevant for "this week"
        const scheduledDate = new Date(o.scheduledAt);
        return scheduledDate >= now && scheduledDate <= weekFromNow;
      });

      const openSessions = allOfferings.filter((o) => {
        if (!isEligible(o)) return false;
        return o.inviteType === 'OPEN';
      });

      // --- Club sessions (broad scope, not training-only) ---
      const clubSessions = relevantGroupSessions
        .filter((session) => Boolean(session.clubId))
        .sort((a, b) => {
          const aDate = a.schedule[0]?.date || '';
          const bDate = b.schedule[0]?.date || '';
          return aDate.localeCompare(bDate);
        });

      return ok<DiscoverData>({
        pendingInvites,
        thisWeekOfferings,
        familiarCoaches,
        clubSessions,
        openSessions,
      });
    } catch (loadError) {
      logger.error('Failed to load discover data', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load discover data. Pull down to refresh.', loadError),
      );
    }
  }, [currentUser, contextChildren, activeChildId, ensureSeedOnce]);

  const {
    data,
    status,
    error: screenError,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<DiscoverData>({
    load: loadData,
    deps: [loadData],
    events: [
      ServiceEvents.BOOKING_CREATED,
      ServiceEvents.BOOKING_UPDATED,
      ServiceEvents.INVITE_ACCEPTED,
      ServiceEvents.INVITE_BOOKING_FAILED,
    ],
    isEmpty: (value) =>
      value.pendingInvites.length === 0 &&
      value.thisWeekOfferings.length === 0 &&
      value.familiarCoaches.length === 0 &&
      value.clubSessions.length === 0 &&
      value.openSessions.length === 0,
    refetchOnFocus: true,
  });

  const pendingInvites = data?.pendingInvites ?? [];
  const thisWeekOfferings = data?.thisWeekOfferings ?? [];
  const familiarCoaches = data?.familiarCoaches ?? [];
  const clubSessions = data?.clubSessions ?? [];
  const openSessions = data?.openSessions ?? [];
  const loading = status === 'loading' && data === null;
  const error =
    status === 'error'
      ? (screenError?.message ?? 'Failed to load discover data. Pull down to refresh.')
      : null;

  // --- Handlers ---

  const handleAcceptInvite = useCallback(
    async (invite: SessionInvite, selectedSlot?: SessionInvite['proposedSlots'][0]) => {
      const slot = selectedSlot || invite.proposedSlots[0];
      const result = await sessionInviteService.respondToInvite({
        inviteId: invite.id,
        response: 'ACCEPTED',
        selectedSlot: slot,
      });
      if (result.success) {
        onRefresh();
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
            const result = await sessionInviteService.respondToInvite({
              inviteId: invite.id,
              response: 'DECLINED',
            });
            if (result.success) {
              onRefresh();
            }
          },
        },
      ]);
    },
    [onRefresh],
  );

  const handleCoachPress = useCallback((coachId: string) => {
    logger.press('DiscoverCoachCard', { coachId });
    const preferredOffering = [...thisWeekOfferings, ...openSessions]
      .filter((offering) => offering.coachId === coachId)
      .sort((a, b) => {
        const aTime = new Date(a.scheduledAt).getTime();
        const bTime = new Date(b.scheduledAt).getTime();
        if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
          return aTime - bTime;
        }
        if (Number.isFinite(aTime)) return -1;
        if (Number.isFinite(bTime)) return 1;
        return a.id.localeCompare(b.id);
      })[0];
    const prefillChild = (() => {
      if (activeChildId) {
        const activeChild = contextChildren.find((child) => child.id === activeChildId);
        if (activeChild) {
          return { id: activeChild.id, name: activeChild.name };
        }
      }
      if (contextChildren.length === 1) {
        return { id: contextChildren[0].id, name: contextChildren[0].name };
      }
      if (contextChildren.length === 0 && currentUser?.id) {
        return {
          id: currentUser.id,
          name: currentUser.name || currentUser.fullName || 'Athlete',
        };
      }
      return null;
    })();

    if (preferredOffering) {
      updateDraft(
        buildBookingDraftPatchFromOffering({
          coachId,
          offering: preferredOffering,
          child: prefillChild,
          entrySource: 'discover_feed',
        }),
      );
    }

    router.push(
      Routes.bookCoach(coachId, {
        offeringId: preferredOffering?.id,
        source: 'discover_feed',
        childId: activeChildId || undefined,
      }),
    );
  }, [activeChildId, contextChildren, currentUser?.fullName, currentUser?.id, currentUser?.name, openSessions, thisWeekOfferings, updateDraft]);

  const handleOfferingPress = useCallback((offering: SessionOffering) => {
    const normalizedOffering = normalizeSessionOfferingSource(offering);
    logger.press('DiscoverOffering', {
      offeringId: normalizedOffering.id,
      coachId: normalizedOffering.coachId,
      source: normalizedOffering.source,
    });
    if (normalizedOffering.source === 'group') {
      const groupSessionId =
        normalizedOffering.sourceEntityId ??
        extractGroupSessionIdFromOfferingId(normalizedOffering.id);
      if (groupSessionId) {
        router.push(Routes.groupSession(groupSessionId));
        return;
      }
    }
    const prefillChild = (() => {
      if (activeChildId) {
        const activeChild = contextChildren.find((child) => child.id === activeChildId);
        if (activeChild) {
          return { id: activeChild.id, name: activeChild.name };
        }
      }
      if (contextChildren.length === 1) {
        return { id: contextChildren[0].id, name: contextChildren[0].name };
      }
      if (contextChildren.length === 0 && currentUser?.id) {
        return {
          id: currentUser.id,
          name: currentUser.name || currentUser.fullName || 'Athlete',
        };
      }
      return null;
    })();
    updateDraft(
      buildBookingDraftPatchFromOffering({
        coachId: normalizedOffering.coachId,
        offering: normalizedOffering,
        child: prefillChild,
        entrySource: 'discover_feed',
      }),
    );
    router.push(
      Routes.bookCoach(normalizedOffering.coachId, {
        offeringId: normalizedOffering.id,
        source: 'discover_feed',
        childId: activeChildId || undefined,
      }),
    );
  }, [activeChildId, contextChildren, currentUser?.fullName, currentUser?.id, currentUser?.name, updateDraft]);

  const handleGroupSessionPress = useCallback((sessionId: string) => {
    logger.press('DiscoverGroupSession', { sessionId });
    router.push(Routes.groupSession(sessionId));
  }, []);

  const handleFindCoachPress = useCallback(() => {
    logger.press('DiscoverFindCoach');
    router.push(Routes.DISCOVER_MAP);
  }, []);

  return {
    pendingInvites,
    thisWeekOfferings,
    familiarCoaches,
    clubSessions,
    openSessions,
    loading,
    error,
    refreshing,
    onRefresh,
    retry,
    handleAcceptInvite,
    handleDeclineInvite,
    handleCoachPress,
    handleOfferingPress,
    handleGroupSessionPress,
    handleFindCoachPress,
  };
}
