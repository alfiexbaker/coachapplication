/**
 * useBookingsDiscover — Aggregates data for the Discover tab within the Bookings screen.
 *
 * Fetches pending invites, this-week offerings, familiar coaches, club/open sessions,
 * and suggested coaches. Applies per-child filtering when activeChildId is set.
 */

import { useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { Routes } from '@/navigation/routes';

import { bookingService } from '@/services/booking';
import { inviteService as sessionInviteService } from '@/services/invite';
import { groupSessionService } from '@/services/group-session';
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
import { createLogger } from '@/utils/logger';
import { getSessionInviteCoachName } from '@/utils/session-invite-display';
import { getSessionOfferingHeadcount } from '@/utils/session-offering-capacity';
import { ok, err, serviceError } from '@/types/result';
import type {
  SessionOffering,
  SessionInvite,
  CoachProfile,
  GroupSession,
} from '@/constants/types';

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
  const { children: contextChildren, activeChildId, isParent } = useChildContext();

  const loadData = useCallback(async () => {
    try {
      await ensureRelationalDemoSeeded();

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

      // --- All session offerings ---
      const allOfferings = await apiClient.get<SessionOffering[]>(
        STORAGE_KEYS.SESSION_OFFERINGS,
        [],
      );

      // --- Past bookings → familiar coach IDs ---
      const bookings = await bookingService.list();
      const viewerIds = new Set<string>();
      if (userId) viewerIds.add(userId);
      if (isParent) {
        for (const child of contextChildren) {
          viewerIds.add(child.id);
        }
      }
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

      // --- Club training sessions ---
      let clubSessions: GroupSession[] = [];
      const childClubIds = new Set<string>();
      for (const child of contextChildren) {
        if (activeChildId && child.id !== activeChildId) continue;
        for (const clubId of child.clubIds) {
          childClubIds.add(clubId);
        }
      }
      for (const clubId of childClubIds) {
        try {
          const sessions = await groupSessionService.getClubTrainingSessions(clubId);
          clubSessions.push(...sessions);
        } catch (e) {
          logger.error('Failed to load club sessions', { clubId, error: e });
        }
      }

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
  }, [currentUser, contextChildren, isParent, activeChildId]);

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
  const loading = status === 'loading';
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
      Alert.alert('Decline Invite?', `Decline the session invite from ${coachName}?`, [
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
    router.push(Routes.bookSessionType(coachId));
  }, []);

  const handleOfferingPress = useCallback((_offering: SessionOffering) => {
    // Handled by parent via callback — offering detail modal
  }, []);

  const handleGroupSessionPress = useCallback((sessionId: string) => {
    logger.press('DiscoverGroupSession', { sessionId });
    router.push(Routes.groupSession(sessionId));
  }, []);

  const handleFindCoachPress = useCallback(() => {
    logger.press('DiscoverFindCoach');
    router.push(Routes.HOME_INDEX);
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
