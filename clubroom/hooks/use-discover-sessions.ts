/**
 * Hook for the Discover Sessions screen.
 * Manages offerings data, search/filters, and routes selections into booking flow.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { apiClient } from '@/services/api-client';
import { bookingService } from '@/services/booking';
import { inviteService } from '@/services/invite';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { useBookingFlow } from '@/context/booking-flow-context';
import type {
  SessionOffering,
  FootballObjective,
  GroupSession,
  GroupRegistration,
  SessionInvite,
} from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { getSessionOfferingCoachName } from '@/utils/session-display';
import { getSessionOfferingHeadcount } from '@/utils/session-offering-capacity';
import { getSessionInviteCoachName } from '@/utils/session-invite-display';
import {
  extractGroupSessionIdFromOfferingId,
  normalizeSessionOfferingSource,
  mapGroupSessionToOffering,
} from '@/utils/session-offering-projections';
import { buildBookingDraftPatchFromOffering } from '@/utils/booking-draft-prefill';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('DiscoverSessions');

export const SKILL_FILTERS: { value: FootballObjective | ''; label: string }[] = [
  { value: '', label: 'All Skills' },
  { value: 'Dribbling', label: 'Dribbling' },
  { value: 'Passing', label: 'Passing' },
  { value: 'Defending', label: 'Defending' },
  { value: 'Finishing', label: 'Finishing' },
  { value: 'Goalkeeping', label: 'Goalkeeping' },
  { value: 'Conditioning', label: 'Conditioning' },
];

export const TYPE_FILTERS = [
  { value: '', label: 'All Types' },
  { value: '1on1', label: '1:1' },
  { value: 'group', label: 'Group' },
];

interface DiscoverSessionsData {
  offerings: SessionOffering[];
  pendingInvites: SessionInvite[];
}

let lastDiscoverSessionsSnapshot: DiscoverSessionsData | null = null;

export interface UseDiscoverSessionsResult {
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  searchQuery: string;
  skillFilter: FootballObjective | '';
  typeFilter: '1on1' | 'group' | '';
  filteredOfferings: SessionOffering[];
  pendingInvites: SessionInvite[];
  setSearchQuery: (value: string) => void;
  setSkillFilter: (value: FootballObjective | '') => void;
  setTypeFilter: (value: '1on1' | 'group' | '') => void;
  clearSearch: () => void;
  handleOfferingPress: (offering: SessionOffering) => void;
  handleAcceptInvite: (
    invite: SessionInvite,
    selectedSlot?: SessionInvite['proposedSlots'][0],
  ) => Promise<void>;
  handleDeclineInvite: (invite: SessionInvite) => void;
}

export function useDiscoverSessions() {
  const { currentUser } = useAuth();
  const { updateDraft } = useBookingFlow();
  const { children: contextChildren, activeChildId } = useChildContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<FootballObjective | ''>('');
  const [typeFilter, setTypeFilter] = useState<'1on1' | 'group' | ''>('');

  const loadOfferings = useCallback(async () => {
    try {
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

      const [storedOfferings, groupSessions, groupRegistrations, allBookings, pendingInvites] =
        await Promise.all([
          apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
          apiClient.get<GroupSession[]>(STORAGE_KEYS.GROUP_SESSIONS, []),
          apiClient.get<GroupRegistration[]>(STORAGE_KEYS.GROUP_REGISTRATIONS, []),
          bookingService.list(),
          currentUser && currentUser.role !== 'COACH'
            ? inviteService.getPendingInvites(currentUser.id)
            : Promise.resolve([]),
        ]);
      const normalizedStoredOfferings = storedOfferings.map(normalizeSessionOfferingSource);
      const groupRegistrationsBySessionId = new Map<string, GroupRegistration[]>();
      for (const registration of groupRegistrations) {
        if (!groupRegistrationsBySessionId.has(registration.sessionId)) {
          groupRegistrationsBySessionId.set(registration.sessionId, []);
        }
        groupRegistrationsBySessionId.get(registration.sessionId)!.push(registration);
      }
      const projectedGroupOfferings = groupSessions
        .filter((session) => session.status !== 'DRAFT')
        .map((session) =>
          mapGroupSessionToOffering(
            session,
            groupRegistrationsBySessionId.get(session.id) ?? [],
            new Date(),
          ),
        )
        .filter((offering): offering is SessionOffering => offering !== null);
      const offeringsById = new Map<string, SessionOffering>();
      for (const offering of normalizedStoredOfferings) {
        offeringsById.set(offering.id, offering);
      }
      for (const offering of projectedGroupOfferings) {
        offeringsById.set(offering.id, offering);
      }
      const allOfferingsMerged = Array.from(offeringsById.values());

      const familiarCoachIds = new Set<string>();
      const familiarClubIds = new Set<string>();

      for (const offering of allOfferingsMerged) {
        const hasLinkedRegistration = offering.registrations.some(
          (registration) =>
            registration.status === 'confirmed' && viewerIds.has(registration.userId),
        );
        if (!hasLinkedRegistration) continue;
        familiarCoachIds.add(offering.coachId);
        if (offering.clubId) {
          familiarClubIds.add(offering.clubId);
        }
      }

      for (const booking of allBookings) {
        const linkedAthleteIds = new Set<string>();
        if (booking.athleteId) linkedAthleteIds.add(booking.athleteId);
        for (const athleteId of booking.athleteIds || []) {
          linkedAthleteIds.add(athleteId);
        }
        const isLinkedBooking = Array.from(linkedAthleteIds).some((athleteId) =>
          viewerIds.has(athleteId),
        );
        if (isLinkedBooking) {
          familiarCoachIds.add(booking.coachId);
        }
      }

      for (const invite of pendingInvites) {
        familiarCoachIds.add(invite.coachId);
      }

      const now = new Date();
      const available = allOfferingsMerged.filter((offering) => {
        if (offering.status !== 'active') return false;
        if (offering.coachId === currentUser?.id) return false;

        const isFutureOrRecurring =
          offering.isRecurring || new Date(offering.scheduledAt).getTime() > now.getTime();
        if (!isFutureOrRecurring) return false;

        const headcount = getSessionOfferingHeadcount(offering);
        if (headcount >= offering.maxParticipants) return false;

        const isInvited = offering.invitedAthleteIds?.some((id) => viewerIds.has(id)) ?? false;
        const isOpenSession = offering.inviteType !== 'CLOSED';
        if (!isOpenSession && !isInvited) return false;

        const coachLinked = familiarCoachIds.has(offering.coachId);
        const clubLinked = offering.clubId ? familiarClubIds.has(offering.clubId) : false;
        return coachLinked || clubLinked || isInvited;
      });

      logger.debug('Loaded offerings', { count: available.length, pendingInvites: pendingInvites.length });
      return ok<DiscoverSessionsData>({ offerings: available, pendingInvites });
    } catch (loadError) {
      logger.error('Failed to load offerings', loadError);
      return err(
        serviceError(
          'UNKNOWN',
          'Failed to load discover sessions. Pull down to refresh.',
          loadError,
        ),
      );
    }
  }, [contextChildren, currentUser]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<DiscoverSessionsData>({
    load: loadOfferings,
    deps: [currentUser?.id],
    isEmpty: (value) => value.offerings.length === 0 && value.pendingInvites.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'warm-first',
  });

  useEffect(() => {
    if (data) {
      lastDiscoverSessionsSnapshot = data;
    }
  }, [data]);

  const resolvedData = data ?? lastDiscoverSessionsSnapshot;
  const offerings = resolvedData?.offerings;
  const pendingInvites = resolvedData?.pendingInvites ?? [];
  const loading = status === 'loading' && !resolvedData;

  const filteredOfferings = useMemo(() => {
    let filtered = offerings ?? [];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.title.toLowerCase().includes(query) ||
          getSessionOfferingCoachName(o).toLowerCase().includes(query) ||
          o.location.toLowerCase().includes(query) ||
          o.description?.toLowerCase().includes(query),
      );
    }
    if (skillFilter) filtered = filtered.filter((o) => o.footballSkill === skillFilter);
    if (typeFilter) filtered = filtered.filter((o) => o.sessionType === typeFilter);
    return filtered.sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  }, [offerings, searchQuery, skillFilter, typeFilter]);

  const handleOfferingPress = useCallback((offering: SessionOffering) => {
    const normalizedOffering = normalizeSessionOfferingSource(offering);
    logger.press('DiscoverSessionsOffering', {
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
        entrySource: 'discover_sessions',
      }),
    );
    router.push(
      Routes.bookCoach(normalizedOffering.coachId, {
        offeringId: normalizedOffering.id,
        source: 'discover_sessions',
        childId: activeChildId || undefined,
      }),
    );
  }, [activeChildId, contextChildren, currentUser?.fullName, currentUser?.id, currentUser?.name, updateDraft]);

  const handleAcceptInvite = useCallback(
    async (invite: SessionInvite, selectedSlot?: SessionInvite['proposedSlots'][0]) => {
      const slot = selectedSlot ?? invite.proposedSlots[0];
      if (!slot) {
        return;
      }
      const result = await inviteService.respondToInvite({
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
            const result = await inviteService.respondToInvite({
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
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    searchQuery,
    skillFilter,
    typeFilter,
    filteredOfferings,
    pendingInvites,
    setSearchQuery,
    setSkillFilter,
    setTypeFilter,
    clearSearch,
    handleOfferingPress,
    handleAcceptInvite,
    handleDeclineInvite,
  } satisfies UseDiscoverSessionsResult;
}

export function formatNextSession(offering: SessionOffering): string {
  if (offering.isRecurring && offering.dayOfWeek !== undefined) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `Every ${days[offering.dayOfWeek]} at ${offering.timeOfDay}`;
  }
  const date = new Date(offering.scheduledAt);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
