/**
 * useSessionDetailModal — State, handlers, and computed values for SessionDetailModal.
 */
import { useEffect, useMemo, useState, startTransition } from 'react';
import { router } from 'expo-router';
import { toDateStr } from '@/utils/format';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { badgeService } from '@/services/badge-service';
import { bookingService } from '@/services/booking-service';
import { groupSessionService } from '@/services/group-session-service';
import { orgStaffingService } from '@/services/org-staffing-service';
import type { Booking } from '@/constants/app-types';
import type {
  ClubRole,
  SessionOffering,
  BadgeAward,
  SessionOwnershipAuditEvent,
} from '@/constants/types';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';
import { useBookingFlow } from '@/context/booking-flow-context';
import { buildBookingDraftPatchFromOffering } from '@/utils/booking-draft-prefill';
import {
  getSessionOfferingHeadcount,
  getSessionOfferingOffPlatformCount,
  getSessionOfferingRegisteredCount,
  isSessionOfferingFull,
} from '@/utils/session-offering-capacity';
import {
  getSessionOfferingGroupSessionId,
  resolveSessionOfferingSourceIds,
} from '@/utils/session-offering-projections';
import {
  canManageSessionOperations,
  isAssignedSessionCoach,
} from '@/utils/session-ownership-authority';
import { resolveBookingTarget, resolveDefaultBookingTarget } from '@/utils/booking-targets';
import { uiFeedback } from '@/services/ui-feedback';
import { runAsyncTryCatchFinally } from '@/utils/async-control';
const logger = createLogger('useSessionDetailModal');
interface OwnershipAssigneeOption {
  id: string;
  label: string;
  role: ClubRole;
}
interface LinkedBookingMatch {
  id: string;
  scheduledAt: string;
  duration?: number;
  status: Booking['status'];
}
export interface SessionOwnershipTimelineEntry {
  id: string;
  title: string;
  meta?: string;
  timestampLabel: string;
}
function formatTimelineTimestamp(iso?: string): string {
  if (!iso) return 'Unknown time';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Generate upcoming instances for a recurring session. */
function getUpcomingInstances(offering: SessionOffering, count: number = 8): Date[] {
  if (!offering.isRecurring || offering.dayOfWeek === undefined) return [];
  const instances: Date[] = [];
  const now = new Date();
  const endDate = offering.endDate ? new Date(offering.endDate) : null;
  const cancelledDates = new Set(offering.cancelledInstances || []);
  let currentDate = new Date(offering.scheduledAt);
  if (isNaN(currentDate.getTime())) {
    currentDate = new Date(now);
  }
  if (currentDate < now) {
    currentDate = new Date(now);
    const targetDay = offering.dayOfWeek;
    const currentDay = currentDate.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;
    currentDate.setDate(currentDate.getDate() + (daysUntilTarget === 0 ? 0 : daysUntilTarget));
  }
  if (offering.timeOfDay) {
    const [hours, minutes] = offering.timeOfDay.split(':').map(Number);
    currentDate.setHours(hours, minutes, 0, 0);
  }
  if (currentDate <= now) {
    const increment = offering.recurrenceType === 'biweekly' ? 14 : 7;
    currentDate.setDate(currentDate.getDate() + increment);
  }
  const increment = offering.recurrenceType === 'biweekly' ? 14 : 7;
  while (instances.length < count) {
    if (endDate && currentDate > endDate) break;
    const dateStr = toDateStr(currentDate);
    if (!cancelledDates.has(dateStr)) {
      instances.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + increment);
  }
  return instances;
}
function getNextBookableSessionStart(offering: SessionOffering): Date | null {
  if (offering.isRecurring) {
    return getUpcomingInstances(offering, 1)[0] ?? null;
  }
  const scheduledAt = new Date(offering.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }
  return scheduledAt;
}
function getSessionEndFromOffering(offering: SessionOffering | null): Date | null {
  if (!offering) return null;
  const scheduledAt = new Date(offering.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return null;
  const durationMinutes = Math.max(1, offering.duration ?? 60);
  return new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
}
function getSessionEndFromBooking(booking: LinkedBookingMatch | null): Date | null {
  if (!booking) return null;
  const scheduledAt = new Date(booking.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return null;
  const durationMinutes = Math.max(1, booking.duration ?? 60);
  return new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
}
export function useSessionDetailModal(
  visible: boolean,
  offering: SessionOffering | null,
  onClose: () => void,
  onUpdate?: () => void,
) {
  const { currentUser } = useAuth();
  const { updateDraft } = useBookingFlow();
  const { children: contextChildren } = useChildContext();
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [linkedBookingAthleteIds, setLinkedBookingAthleteIds] = useState<string[]>([]);
  const [linkedBookings, setLinkedBookings] = useState<LinkedBookingMatch[]>([]);
  const [weeksToBook, setWeeksToBook] = useState(1);
  const [sessionAwards, setSessionAwards] = useState<BadgeAward[]>([]);
  const [showInstanceManagement, setShowInstanceManagement] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState<OwnershipAssigneeOption[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [canManageClubOwnership, setCanManageClubOwnership] = useState(false);
  const [reassigningOwnership, setReassigningOwnership] = useState(false);
  const [draftOffPlatformParticipants, setDraftOffPlatformParticipants] = useState(0);
  const [savingOffPlatform, setSavingOffPlatform] = useState(false);
  const [clubNameById, setClubNameById] = useState<Record<string, string>>({});
  const [nowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!visible || !offering) return;
    let cancelled = false;
    logger.debug('Session detail modal open cycle start', {
      offeringId: offering.id,
      offeringSource: offering.source,
      offeringSourceEntityId: offering.sourceEntityId,
      offeringStatus: offering.status,
      sessionType: offering.sessionType,
      currentUserId: currentUser?.id,
      currentUserRole: currentUser?.role,
      childCount: contextChildren.length,
      childIds: contextChildren.map((child) => child.id),
      childReferenceIds: contextChildren.map((child) => child.referenceId),
      childProfileIds: contextChildren.flatMap((child) =>
        child.profileId ? [child.profileId] : [],
      ),
    });
    startTransition(() => {
      setShowInstanceManagement(false);
    });
    startTransition(() => {
      setSelectedChildIds((previous) => (previous.length === 0 ? previous : []));
    });
    logger.debug('Reset modal transient state', {
      offeringId: offering.id,
      selectedChildIds: [],
      showInstanceManagement: false,
    });
    badgeService.listAwardsForSession(offering.id).then((awards) => {
      if (!cancelled) {
        setSessionAwards(awards);
        logger.debug('Loaded session awards for modal', {
          offeringId: offering.id,
          awardCount: awards.length,
        });
      }
    });
    return () => {
      cancelled = true;
      logger.debug('Session detail modal open cycle cleanup', {
        offeringId: offering.id,
      });
    };
  }, [contextChildren, currentUser?.id, currentUser?.role, offering, visible]);
  useEffect(() => {
    if (!visible || !offering) {
      startTransition(() => {
        setDraftOffPlatformParticipants(0);
      });
      return;
    }
    startTransition(() => {
      setDraftOffPlatformParticipants(getSessionOfferingOffPlatformCount(offering));
    });
  }, [offering, visible]);
  useEffect(() => {
    if (!visible || !offering || !currentUser?.id) {
      startTransition(() => {
        setAssigneeOptions((previous) => (previous.length === 0 ? previous : []));
      });
      startTransition(() => {
        setSelectedAssigneeId(null);
      });
      startTransition(() => {
        setCanManageClubOwnership(false);
      });
      return;
    }
    if (offering.actingAs !== 'club' || !offering.clubId) {
      startTransition(() => {
        setAssigneeOptions((previous) => (previous.length === 0 ? previous : []));
      });
      startTransition(() => {
        setSelectedAssigneeId(
          offering.assigneeCoachId || offering.ownerCoachId || offering.coachId,
        );
      });
      startTransition(() => {
        setCanManageClubOwnership(false);
      });
      return;
    }
    let cancelled = false;
    const loadOwnershipContext = async () => {
      try {
        const staffingResult = await orgStaffingService.getConsoleData(
          offering.clubId as string,
          currentUser.id,
        );
        if (cancelled) return;
        if (!staffingResult.success) {
          setCanManageClubOwnership(false);
          setClubNameById({});
          setAssigneeOptions((previous) => (previous.length === 0 ? previous : []));
          return;
        }
        setClubNameById({
          [staffingResult.data.club.id]: staffingResult.data.club.name,
        });
        setCanManageClubOwnership(staffingResult.data.canManageAssignments);
        const options = staffingResult.data.staff.flatMap((member) =>
          member.canTakeAssignments
            ? [
                {
                  id: member.userId,
                  label: member.label,
                  role: member.role,
                },
              ]
            : [],
        );
        setAssigneeOptions(options);
        setSelectedAssigneeId((previous) => {
          if (previous && options.some((option) => option.id === previous)) {
            return previous;
          }
          const existingOwner =
            offering.assigneeCoachId || offering.ownerCoachId || offering.coachId;
          if (existingOwner && options.some((option) => option.id === existingOwner)) {
            return existingOwner;
          }
          return options[0]?.id ?? null;
        });
      } catch (error) {
        if (cancelled) return;
        logger.warn('Failed to load session ownership context', {
          offeringId: offering.id,
          error,
        });
        setAssigneeOptions((previous) => (previous.length === 0 ? previous : []));
        setCanManageClubOwnership(false);
      }
    };
    void loadOwnershipContext();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, offering, visible]);
  const upcomingInstances = (() => {
    if (!offering) return [];
    return getUpcomingInstances(offering, 8);
  })();
  const offeringSessionEnd = getSessionEndFromOffering(offering);
  const nextBookableSessionStart = (() => {
    if (!offering) return null;
    return getNextBookableSessionStart(offering);
  })();
  const isCoach = currentUser?.role === 'COACH';
  const isMyOffering = Boolean(
    offering &&
    currentUser &&
    isAssignedSessionCoach({
      actingAs: offering.actingAs,
      coachId: offering.coachId,
      ownerCoachId: offering.ownerCoachId,
      assigneeCoachId: offering.assigneeCoachId,
      currentUserId: currentUser.id,
    }),
  );
  const canManageOffering = Boolean(
    offering &&
    currentUser &&
    canManageSessionOperations({
      actingAs: offering.actingAs,
      coachId: offering.coachId,
      ownerCoachId: offering.ownerCoachId,
      assigneeCoachId: offering.assigneeCoachId,
      currentUserId: currentUser.id,
      canManageClubAssignments: canManageClubOwnership,
    }),
  );
  const canManageRecurringInstances = Boolean(
    canManageOffering && offering?.source === 'group' && offering?.isRecurring,
  );
  const canReassignOwnership = Boolean(
    offering &&
    offering.actingAs === 'club' &&
    offering.clubId &&
    assigneeOptions.length > 0 &&
    canManageClubOwnership,
  );
  const contextChildrenSignature = contextChildren
    .map((child) =>
      [child.id, child.name, child.fullName, child.referenceId, child.profileId ?? ''].join(':'),
    )
    .join('|');
  const children = useMemo(
    () =>
      contextChildren.map((child) => ({
        id: child.id,
        name: child.name,
        fullName: child.fullName,
        referenceId: child.referenceId,
        profileId: child.profileId,
      })),
    [contextChildrenSignature],
  );
  const userNameMap = useMemo(() => {
    const nextMap: Record<string, string> = {};
    const addName = (id: string | null | undefined, name: string | null | undefined) => {
      const normalizedId = id?.trim();
      const normalizedName = name?.trim();
      if (normalizedId && normalizedName) {
        nextMap[normalizedId] = normalizedName;
      }
    };

    addName(currentUser?.id, currentUser?.fullName || currentUser?.name);
    for (const child of children) {
      const childName = child.fullName || child.name;
      addName(child.id, childName);
      addName(child.referenceId, childName);
      addName(child.profileId, childName);
    }
    if (offering) {
      addName(offering.createdByUserId, offering.createdByName);
      for (const registration of offering.registrations) {
        addName(registration.userId, registration.userName);
      }
      for (const event of offering.ownershipAuditTrail ?? []) {
        addName(event.actorUserId, event.actorName);
      }
    }
    for (const option of assigneeOptions) {
      addName(option.id, option.label);
    }

    return nextMap;
  }, [
    assigneeOptions,
    children,
    currentUser?.fullName,
    currentUser?.id,
    currentUser?.name,
    offering,
  ]);
  const ownerCoachId = offering?.assigneeCoachId || offering?.ownerCoachId || offering?.coachId;
  const ownerCoachName = ownerCoachId ? userNameMap[ownerCoachId] || ownerCoachId : 'Unassigned';
  const clubLabel = offering?.clubId ? clubNameById[offering.clubId] || offering.clubId : undefined;
  const registeredCount = offering ? getSessionOfferingRegisteredCount(offering) : 0;
  const offPlatformParticipants = offering ? getSessionOfferingOffPlatformCount(offering) : 0;
  const totalParticipants = offering ? getSessionOfferingHeadcount(offering) : 0;
  const isFull = offering ? isSessionOfferingFull(offering) : false;
  const actorIdSet = useMemo(() => {
    const ids = new Set<string>();
    if (currentUser?.id) {
      ids.add(currentUser.id);
    }
    for (const child of children) {
      ids.add(child.id);
      if (child.referenceId) {
        ids.add(child.referenceId);
      }
      if (child.profileId) {
        ids.add(child.profileId);
      }
    }
    return ids;
  }, [children, currentUser?.id]);
  useEffect(() => {
    if (!visible || !offering) return;
    logger.debug('Resolved actor identity scope for session modal', {
      offeringId: offering.id,
      actorIds: Array.from(actorIdSet),
      childCount: children.length,
    });
  }, [actorIdSet, children.length, offering, visible]);
  useEffect(() => {
    if (!visible || !offering) {
      startTransition(() => {
        setLinkedBookingAthleteIds((previous) => (previous.length === 0 ? previous : []));
      });
      startTransition(() => {
        setLinkedBookings((previous) => (previous.length === 0 ? previous : []));
      });
      return;
    }
    let cancelled = false;
    const sourceIds = resolveSessionOfferingSourceIds(offering);
    const directEntityIds = new Set(sourceIds.directEntityIds);
    const groupSessionIds = new Set(sourceIds.groupSessionIds);
    const loadLinkedBookings = async () => {
      try {
        const bookings = await bookingService.list();
        if (cancelled) return;
        const matchedAthleteIds = new Set<string>();
        const matchedBookings: LinkedBookingMatch[] = [];
        const matchedBookingDetails: {
          bookingId: string;
          status: string;
          sessionSource?: string;
          sessionSourceEntityId?: string;
          groupSessionId?: string;
          athleteId?: string;
          athleteIds?: string[];
          bookedById?: string;
          reason: 'actor_athlete' | 'booked_by_actor';
        }[] = [];
        let linkedBookingCount = 0;
        let skippedNotLinkedCount = 0;
        let skippedNotActorCount = 0;
        for (const booking of bookings) {
          if (booking.status === 'CANCELLED') continue;
          const linkedToOffering =
            (booking.sessionSourceEntityId
              ? directEntityIds.has(booking.sessionSourceEntityId)
              : false) ||
            (booking.groupSessionId ? groupSessionIds.has(booking.groupSessionId) : false) ||
            (booking.sessionSource === 'group' && booking.sessionSourceEntityId
              ? groupSessionIds.has(booking.sessionSourceEntityId)
              : false);
          if (!linkedToOffering) {
            skippedNotLinkedCount += 1;
            continue;
          }
          linkedBookingCount += 1;
          const bookingAthleteIds = new Set<string>();
          if (booking.athleteId) {
            bookingAthleteIds.add(booking.athleteId);
          }
          for (const athleteId of booking.athleteIds ?? []) {
            bookingAthleteIds.add(athleteId);
          }
          const hasActorAthlete = Array.from(bookingAthleteIds).some((id) => actorIdSet.has(id));
          const bookedByActor = booking.bookedById ? actorIdSet.has(booking.bookedById) : false;
          if (!hasActorAthlete && !bookedByActor) {
            skippedNotActorCount += 1;
            continue;
          }
          if (bookingAthleteIds.size === 0) {
            if (booking.bookedById) {
              matchedAthleteIds.add(booking.bookedById);
            }
            matchedBookings.push({
              id: booking.id,
              scheduledAt: booking.scheduledAt,
              duration: booking.duration,
              status: booking.status,
            });
            matchedBookingDetails.push({
              bookingId: booking.id,
              status: booking.status,
              sessionSource: booking.sessionSource,
              sessionSourceEntityId: booking.sessionSourceEntityId,
              groupSessionId: booking.groupSessionId,
              athleteId: booking.athleteId,
              athleteIds: booking.athleteIds,
              bookedById: booking.bookedById,
              reason: 'booked_by_actor',
            });
            continue;
          }
          for (const athleteId of bookingAthleteIds) {
            matchedAthleteIds.add(athleteId);
          }
          matchedBookings.push({
            id: booking.id,
            scheduledAt: booking.scheduledAt,
            duration: booking.duration,
            status: booking.status,
          });
          matchedBookingDetails.push({
            bookingId: booking.id,
            status: booking.status,
            sessionSource: booking.sessionSource,
            sessionSourceEntityId: booking.sessionSourceEntityId,
            groupSessionId: booking.groupSessionId,
            athleteId: booking.athleteId,
            athleteIds: booking.athleteIds,
            bookedById: booking.bookedById,
            reason: hasActorAthlete ? 'actor_athlete' : 'booked_by_actor',
          });
        }
        setLinkedBookingAthleteIds(Array.from(matchedAthleteIds));
        setLinkedBookings(
          matchedBookings.sort((left, right) => {
            const offeringTimestamp = new Date(offering.scheduledAt).getTime();
            const leftTimestamp = new Date(left.scheduledAt).getTime();
            const rightTimestamp = new Date(right.scheduledAt).getTime();
            const leftDistance = Math.abs(leftTimestamp - offeringTimestamp);
            const rightDistance = Math.abs(rightTimestamp - offeringTimestamp);
            return leftDistance - rightDistance;
          }),
        );
        logger.debug('Linked bookings resolved for session modal', {
          offeringId: offering.id,
          directEntityIds: Array.from(directEntityIds),
          groupSessionIds: Array.from(groupSessionIds),
          actorIds: Array.from(actorIdSet),
          scannedBookings: bookings.length,
          linkedBookingCount,
          skippedNotLinkedCount,
          skippedNotActorCount,
          matchedAthleteIds: Array.from(matchedAthleteIds),
          matchedBookingDetails,
        });
      } catch {
        if (!cancelled) {
          setLinkedBookingAthleteIds((previous) => (previous.length === 0 ? previous : []));
          setLinkedBookings((previous) => (previous.length === 0 ? previous : []));
        }
        logger.warn('Failed to resolve linked bookings for session modal', {
          offeringId: offering.id,
          directEntityIds: Array.from(directEntityIds),
          groupSessionIds: Array.from(groupSessionIds),
          actorIds: Array.from(actorIdSet),
        });
      }
    };
    void loadLinkedBookings();
    return () => {
      cancelled = true;
    };
  }, [actorIdSet, offering, visible]);
  const linkedBookingAthleteIdSet = useMemo(
    () => new Set(linkedBookingAthleteIds),
    [linkedBookingAthleteIds],
  );
  const primaryLinkedBooking = linkedBookings[0] ?? null;
  const primaryLinkedBookingId = primaryLinkedBooking?.id ?? null;
  const linkedBookingSessionEnd = getSessionEndFromBooking(primaryLinkedBooking);
  const canLeaveReview = primaryLinkedBooking?.status === 'COMPLETED';
  const canOpenBookingDetail = Boolean(primaryLinkedBookingId);
  const isSessionInPast = (() => {
    const effectiveSessionEnd = linkedBookingSessionEnd ?? offeringSessionEnd;
    if (effectiveSessionEnd) {
      return effectiveSessionEnd.getTime() <= nowMs;
    }
    if (!nextBookableSessionStart) {
      return true;
    }
    return nextBookableSessionStart.getTime() <= nowMs;
  })();
  const postSessionMessage = (() => {
    if (!isSessionInPast) return null;
    if (canLeaveReview) {
      return 'This booking is complete. You can leave a review below.';
    }
    if (primaryLinkedBookingId) {
      return 'This session has finished. Reviews unlock once the coach marks the booking as completed.';
    }
    return 'This session has already started or finished, so family changes are closed.';
  })();
  const confirmedActorRegistrations = useMemo(
    () =>
      offering?.registrations.filter(
        (registration) =>
          registration.status === 'confirmed' && actorIdSet.has(registration.userId),
      ) ?? [],
    [actorIdSet, offering?.registrations],
  );
  const registeredChildIdSet = useMemo(() => {
    const childIds = new Set<string>();
    for (const child of children) {
      const isRegisteredForChild =
        confirmedActorRegistrations.some(
          (registration) =>
            registration.userId === child.id ||
            registration.userId === child.referenceId ||
            registration.userId === child.profileId,
        ) ||
        linkedBookingAthleteIdSet.has(child.id) ||
        linkedBookingAthleteIdSet.has(child.referenceId) ||
        (child.profileId ? linkedBookingAthleteIdSet.has(child.profileId) : false);
      if (isRegisteredForChild) {
        childIds.add(child.id);
      }
    }
    return childIds;
  }, [children, confirmedActorRegistrations, linkedBookingAthleteIdSet]);
  const isRegistered =
    confirmedActorRegistrations.length > 0 ||
    linkedBookingAthleteIds.some((athleteId) => actorIdSet.has(athleteId));
  const bookableChildren = useMemo(() => {
    if (children.length === 0) {
      return [];
    }
    if (!isRegistered) {
      return children;
    }
    return children.filter((child) => !registeredChildIdSet.has(child.id));
  }, [children, isRegistered, registeredChildIdSet]);
  const canAddAnotherChild =
    isRegistered && bookableChildren.length > 0 && !isFull && !isSessionInPast;
  const hasMultipleKids = children.length > 1;
  useEffect(() => {
    if (!visible || !offering) return;
    const confirmedRegistrationsForLog = offering.registrations.filter(
      (registration) => registration.status === 'confirmed' && actorIdSet.has(registration.userId),
    );
    logger.debug('Booking CTA decision snapshot', {
      offeringId: offering.id,
      offeringStatus: offering.status,
      isRegistered,
      isFull,
      isSessionInPast,
      linkedBookingSessionEnd: linkedBookingSessionEnd?.toISOString() ?? null,
      offeringSessionEnd: offeringSessionEnd?.toISOString() ?? null,
      nextBookableSessionStart: nextBookableSessionStart?.toISOString() ?? null,
      canAddAnotherChild,
      hasMultipleKids,
      childCount: children.length,
      bookableChildIds: bookableChildren.map((child) => child.id),
      selectedChildIds,
      confirmedRegistrationCount: confirmedRegistrationsForLog.length,
      confirmedRegistrationUserIds: confirmedRegistrationsForLog.map(
        (registration) => registration.userId,
      ),
      linkedBookingAthleteIds,
      registeredChildIds: Array.from(registeredChildIdSet),
      actorIds: Array.from(actorIdSet),
    });
  }, [
    actorIdSet,
    bookableChildren,
    canAddAnotherChild,
    children.length,
    hasMultipleKids,
    isFull,
    isSessionInPast,
    isRegistered,
    linkedBookingAthleteIds,
    linkedBookingSessionEnd,
    nextBookableSessionStart,
    offeringSessionEnd,
    offering,
    registeredChildIdSet,
    selectedChildIds,
    visible,
  ]);
  useEffect(() => {
    if (!visible || !offering) {
      startTransition(() => {
        setSelectedChildIds((previous) => (previous.length === 0 ? previous : []));
      });
      return;
    }
    startTransition(() => {
      setSelectedChildIds((previous) => {
        const normalized = previous.filter((childId) =>
          bookableChildren.some((child) => child.id === childId),
        );
        if (normalized.length > 0) {
          return normalized;
        }
        if (bookableChildren.length === 1) {
          return [bookableChildren[0].id];
        }
        return previous.length === 0 ? previous : [];
      });
    });
  }, [bookableChildren, offering, visible]);
  const toggleSelectedChildId = (childId: string) => {
    logger.debug('Toggle child selection in session modal', {
      offeringId: offering?.id,
      childId,
      beforeSelectedChildIds: selectedChildIds,
      hasMultipleKids,
    });
    setSelectedChildIds((previous) => {
      if (!hasMultipleKids) {
        return [childId];
      }
      if (previous.includes(childId)) {
        return previous.filter((id) => id !== childId);
      }
      return [...previous, childId];
    });
  };
  const ownershipTimeline = (() => {
    if (!offering) return [];
    const events = Array.from(offering.ownershipAuditTrail ?? []).toSorted(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const formatAction = (event: SessionOwnershipAuditEvent): SessionOwnershipTimelineEntry => {
      const actorLabel =
        event.actorName ||
        (event.actorUserId ? userNameMap[event.actorUserId] || event.actorUserId : 'Unknown');
      const roleLabel = event.actorRole ? event.actorRole.replace('_', ' ') : undefined;
      const toCoach = event.toCoachId ? userNameMap[event.toCoachId] || event.toCoachId : undefined;
      if (event.action === 'CREATED') {
        return {
          id: event.id,
          title: `Created by ${actorLabel}`,
          meta: roleLabel || event.note,
          timestampLabel: formatTimelineTimestamp(event.timestamp),
        };
      }
      if (event.action === 'ASSIGNED' || event.action === 'REASSIGNED') {
        return {
          id: event.id,
          title: `Assigned to ${toCoach || 'Unassigned'}`,
          meta: event.note || roleLabel,
          timestampLabel: formatTimelineTimestamp(event.timestamp),
        };
      }
      return {
        id: event.id,
        title: `Edited by ${actorLabel}`,
        meta: event.note || roleLabel,
        timestampLabel: formatTimelineTimestamp(event.timestamp),
      };
    };
    if (events.length > 0) {
      return events.map(formatAction);
    }
    const fallback: SessionOwnershipTimelineEntry[] = [
      {
        id: `fallback_created_${offering.id}`,
        title: `Created by ${offering.createdByName || (offering.createdByUserId ? userNameMap[offering.createdByUserId] || offering.createdByUserId : 'Unknown')}`,
        meta: offering.createdByRole ? offering.createdByRole.replace('_', ' ') : undefined,
        timestampLabel: formatTimelineTimestamp(offering.createdAt),
      },
    ];
    if (ownerCoachId) {
      fallback.push({
        id: `fallback_assigned_${offering.id}`,
        title: `Assigned to ${userNameMap[ownerCoachId] || ownerCoachId}`,
        meta: offering.actingAs === 'club' ? 'Club assignment' : 'Self assignment',
        timestampLabel: formatTimelineTimestamp(offering.createdAt),
      });
    }
    if (offering.updatedAt) {
      fallback.push({
        id: `fallback_updated_${offering.id}`,
        title: `Edited by ${offering.updatedByUserId ? userNameMap[offering.updatedByUserId] || offering.updatedByUserId : 'System'}`,
        meta: offering.updatedByRole ? offering.updatedByRole.replace('_', ' ') : 'Last update',
        timestampLabel: formatTimelineTimestamp(offering.updatedAt),
      });
    }
    return fallback;
  })();
  const handleCancelInstance = async (instanceDate: Date) => {
    if (!offering) return;
    const dateStr = toDateStr(instanceDate);
    const sessionId = getSessionOfferingGroupSessionId(offering);
    if (!sessionId) {
      uiFeedback.showToast('Only group sessions can cancel recurring instances.', 'error');
      return;
    }
    const result = await groupSessionService.cancelInstance(sessionId, dateStr);
    if (!result.success) {
      uiFeedback.showToast(result.error.message, 'error');
      return;
    }
    uiFeedback.showToast('Session instance cancelled.', 'success');
    onUpdate?.();
  };
  const handleCancelBooking = async () => {
    logger.action('CancelBookingAttempt', {
      offeringId: offering?.id,
      currentUserId: currentUser?.id,
      selectedChildIds,
      confirmedActorRegistrations: confirmedActorRegistrations.map((registration) => ({
        registrationId: registration.id,
        userId: registration.userId,
        status: registration.status,
      })),
    });
    if (!offering || !currentUser) return;
    const offeringStartTime = new Date(offering.scheduledAt).getTime();
    if (!Number.isFinite(offeringStartTime) || offeringStartTime <= Date.now()) {
      logger.debug('Cancel booking blocked - session already started or completed', {
        offeringId: offering.id,
        scheduledAt: offering.scheduledAt,
      });
      uiFeedback.showToast(
        'Only upcoming bookings can be cancelled. This session has already started or finished.',
      );
      return;
    }
    if (confirmedActorRegistrations.length === 0) {
      logger.debug('Cancel booking blocked - no confirmed registrations for actor scope', {
        offeringId: offering.id,
        actorIds: Array.from(actorIdSet),
      });
      uiFeedback.showToast('We could not find a confirmed booking to cancel.');
      return;
    }
    const selectedChildId = selectedChildIds[0];
    const selectedChild = selectedChildId
      ? children.find((child) => child.id === selectedChildId)
      : undefined;
    const myRegistration =
      (selectedChildId
        ? confirmedActorRegistrations.find(
            (registration) =>
              registration.userId === selectedChild?.id ||
              registration.userId === selectedChild?.referenceId ||
              registration.userId === selectedChild?.profileId,
          )
        : undefined) ?? confirmedActorRegistrations[0];
    try {
      const bookings = await bookingService.list();
      const groupSessionId = getSessionOfferingGroupSessionId(offering);
      const linkedBooking = bookings.find((booking) => {
        if (booking.status === 'CANCELLED') return false;
        if (!groupSessionId || booking.groupSessionId !== groupSessionId) return false;
        if (booking.groupRegistrationId && booking.groupRegistrationId === myRegistration.id)
          return true;
        const athleteIds = new Set<string>();
        if (booking.athleteId) athleteIds.add(booking.athleteId);
        for (const athleteId of booking.athleteIds ?? []) {
          athleteIds.add(athleteId);
        }
        return athleteIds.has(myRegistration.userId);
      });
      if (linkedBooking) {
        logger.debug('Cancel booking routed to booking cancel flow', {
          offeringId: offering.id,
          linkedBookingId: linkedBooking.id,
          linkedGroupRegistrationId: linkedBooking.groupRegistrationId,
          registrationId: myRegistration.id,
          registrationUserId: myRegistration.userId,
        });
        onClose();
        router.push(Routes.bookingCancel(linkedBooking.id, 'parent'));
        return;
      }
      logger.debug('No linked booking found; falling back to registration-level cancellation', {
        offeringId: offering.id,
        registrationId: myRegistration.id,
        registrationUserId: myRegistration.userId,
      });
    } catch {
      logger.warn('Booking lookup failed during cancellation; using registration fallback', {
        offeringId: offering.id,
      });
      // Fall through to registration-level cancellation when booking lookup is unavailable.
    }
    uiFeedback.alert(
      'Cancel Booking',
      `Are you sure you want to cancel your booking for "${offering.title}"? The coach will be notified.`,
      [
        {
          text: 'Keep Booking',
          style: 'cancel',
        },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await groupSessionService.cancelRegistration(myRegistration.id);
              if (!result.success) {
                uiFeedback.showToast(result.error.message, 'error');
                return;
              }
              logger.debug('Registration-level cancellation persisted', {
                offeringId: offering.id,
                registrationId: myRegistration.id,
                registrationUserId: myRegistration.userId,
              });
              uiFeedback.showToast(
                'Your booking has been cancelled. The coach has been notified.',
                'success',
              );
              onUpdate?.();
              onClose();
            } catch {
              uiFeedback.showToast('Failed to cancel booking. Please try again.', 'error');
            }
          },
        },
      ],
    );
  };
  const handleEndSeries = async () => {
    if (!offering) return;
    uiFeedback.alert(
      'End Recurring Series',
      'This will cancel all future sessions. Athletes will be notified. Are you sure?',
      [
        {
          text: 'Keep Sessions',
          style: 'cancel',
        },
        {
          text: 'End Series',
          style: 'destructive',
          onPress: async () => {
            const sessionId = getSessionOfferingGroupSessionId(offering);
            if (!sessionId) {
              uiFeedback.showToast('Only group sessions can end recurring series.', 'error');
              return;
            }
            const result = await groupSessionService.endSeries(sessionId, toDateStr(new Date()));
            if (!result.success) {
              uiFeedback.showToast(result.error.message, 'error');
              return;
            }
            uiFeedback.showToast('Recurring series ended.', 'success');
            onUpdate?.();
          },
        },
      ],
    );
  };
  const handleReassignOwnership = async () => {
    if (!offering || !currentUser || !selectedAssigneeId) return;
    if (!canReassignOwnership) return;
    const previousOwnerId = offering.assigneeCoachId || offering.ownerCoachId || offering.coachId;
    if (previousOwnerId === selectedAssigneeId) {
      uiFeedback.showToast('This session is already assigned to that coach.');
      return;
    }
    setReassigningOwnership(true);
    await runAsyncTryCatchFinally(
      async () => {
        const selectedAssigneeLabel =
          assigneeOptions.find((option) => option.id === selectedAssigneeId)?.label ||
          selectedAssigneeId;
        const assignmentId = getSessionOfferingGroupSessionId(offering);
        if (!offering.clubId || !assignmentId) {
          uiFeedback.showToast('Only club group sessions can be reassigned here.', 'error');
          return;
        }
        const result = await orgStaffingService.assignOffering({
          clubId: offering.clubId,
          offeringId: assignmentId,
          assigneeCoachId: selectedAssigneeId,
          actorUserId: currentUser.id,
        });
        if (!result.success) {
          uiFeedback.showToast(result.error.message, 'error');
          return;
        }
        uiFeedback.showToast(`Session reassigned to ${selectedAssigneeLabel}`, 'success');
        onUpdate?.();
      },
      async (error) => {
        logger.error('Failed to reassign session owner', {
          offeringId: offering.id,
          error,
        });
        uiFeedback.showToast('Failed to reassign session owner. Please try again.', 'error');
      },
      () => {
        setReassigningOwnership(false);
      },
    );
  };
  const handleAdjustOffPlatform = (delta: number) => {
    setDraftOffPlatformParticipants((previous) => {
      const next = Math.max(0, previous + delta);
      logger.debug('Adjusted off-platform draft participant count', {
        offeringId: offering?.id,
        delta,
        previousDraftOffPlatformParticipants: previous,
        nextDraftOffPlatformParticipants: next,
      });
      return next;
    });
  };
  const handleSaveOffPlatformParticipants = async () => {
    logger.action('SaveOffPlatformParticipantsAttempt', {
      offeringId: offering?.id,
      currentUserId: currentUser?.id,
      canManageOffering,
      draftOffPlatformParticipants,
      currentPersistedOffPlatformParticipants: offering
        ? getSessionOfferingOffPlatformCount(offering)
        : undefined,
    });
    if (!offering || !currentUser || !canManageOffering) return;
    const normalizedCount = Math.max(0, Math.floor(draftOffPlatformParticipants || 0));
    const currentCount = getSessionOfferingOffPlatformCount(offering);
    if (normalizedCount === currentCount) return;
    setSavingOffPlatform(true);
    await runAsyncTryCatchFinally(
      async () => {
        const sessionId = getSessionOfferingGroupSessionId(offering);
        if (!sessionId) {
          uiFeedback.showToast('Only group sessions can update off-platform attendees.', 'error');
          return;
        }
        const result = await groupSessionService.updateOffPlatformParticipants(
          sessionId,
          normalizedCount,
        );
        if (!result.success) {
          uiFeedback.showToast(result.error.message, 'error');
          return;
        }
        uiFeedback.showToast('Off-platform attendees updated.', 'success');
        onUpdate?.();
      },
      async (error) => {
        uiFeedback.showToast('Failed to update off-platform attendees. Please try again.', 'error');
      },
      () => {
        setSavingOffPlatform(false);
      },
    );
  };
  const handleBook = async () => {
    logger.action('SessionDetailContinueBookingPressed', {
      offeringId: offering?.id,
      currentUserId: currentUser?.id,
      currentUserRole: currentUser?.role,
      isFull,
      isRegistered,
      canAddAnotherChild,
      hasMultipleKids,
      selectedChildIds,
      bookableChildIds: bookableChildren.map((child) => child.id),
      linkedBookingAthleteIds,
      actorIds: Array.from(actorIdSet),
    });
    if (!offering || !currentUser) return;
    if (isSessionInPast) {
      logger.debug('Handle book blocked - session already started or completed', {
        offeringId: offering.id,
        nextBookableSessionStart: nextBookableSessionStart?.toISOString() ?? null,
        linkedBookingSessionEnd: linkedBookingSessionEnd?.toISOString() ?? null,
      });
      uiFeedback.showToast(
        'This session has already started or finished, so family changes are closed.',
      );
      return;
    }
    if (isFull) {
      logger.debug('Handle book blocked - session is full', {
        offeringId: offering.id,
      });
      uiFeedback.showToast('This session is currently full.');
      return;
    }
    if (bookableChildren.length > 0 && selectedChildIds.length === 0) {
      logger.debug('Handle book blocked - no child selected', {
        offeringId: offering.id,
        bookableChildIds: bookableChildren.map((child) => child.id),
      });
      uiFeedback.showToast(
        isRegistered
          ? 'Select at least one additional child to book.'
          : 'Please select at least one child to book for.',
      );
      return;
    }
    const selectedIds = (
      bookableChildren.length > 0 ? selectedChildIds : currentUser?.id ? [currentUser.id] : []
    ).filter((id, index, source) => source.indexOf(id) === index);
    const prefillChildren = selectedIds.map((childId) =>
      resolveBookingTarget({ targetId: childId, currentUser, children }),
    );
    const prefillChild =
      prefillChildren[0] ?? resolveDefaultBookingTarget({ currentUser, children });
    const groupSessionId = getSessionOfferingGroupSessionId(offering);
    if (groupSessionId) {
      const registrationTargets =
        prefillChildren.length > 0 ? prefillChildren : prefillChild ? [prefillChild] : [];
      if (registrationTargets.length === 0) {
        uiFeedback.showToast('Choose who is attending before registering.', 'warning');
        return;
      }

      const results = await Promise.all(
        registrationTargets.map((child) =>
          groupSessionService.register(groupSessionId, child.id, currentUser.id),
        ),
      );
      const failed = results.find((result) => !result.success);
      if (failed && !failed.success) {
        uiFeedback.showToast(failed.error.message || 'Registration failed.', 'error');
        return;
      }

      uiFeedback.showToast(
        registrationTargets.length > 1
          ? `${registrationTargets.length} family members registered.`
          : registrationTargets[0].name
            ? `${registrationTargets[0].name} is registered.`
            : 'Registration complete.',
        'success',
      );
      onUpdate?.();
      onClose();
      return;
    }

    updateDraft({
      ...buildBookingDraftPatchFromOffering({
        coachId: offering.coachId,
        offering,
        child: prefillChild,
        entrySource: 'session_detail_modal',
      }),
      childId: prefillChild?.id,
      childIds: prefillChildren.length > 0 ? prefillChildren.map((child) => child.id) : undefined,
      athleteName:
        prefillChildren.length > 1 ? `${prefillChildren.length} athletes` : prefillChild?.name,
    });
    logger.debug('Booking draft updated from session detail modal', {
      offeringId: offering.id,
      coachId: offering.coachId,
      prefillChildId: prefillChild?.id,
      prefillChildName: prefillChild?.name,
      prefillChildIds: prefillChildren.map((child) => child.id),
      weeksToBook: offering.isRecurring ? weeksToBook : undefined,
    });
    onClose();
    logger.debug('Navigating to booking flow from session detail modal', {
      offeringId: offering.id,
      coachId: offering.coachId,
      childId: prefillChild?.id,
      weeks: offering.isRecurring ? String(weeksToBook) : undefined,
    });
    router.push(
      Routes.bookCoach(offering.coachId, {
        offeringId: offering.id,
        source: 'session_detail_modal',
        childId: prefillChild?.id,
        weeks: offering.isRecurring ? String(weeksToBook) : undefined,
      }),
    );
  };
  const handleOpenReview = () => {
    if (!primaryLinkedBookingId) {
      uiFeedback.showToast('We could not find the completed booking for this session.', 'warning');
      return;
    }
    onClose();
    router.push(Routes.review(primaryLinkedBookingId));
  };
  const handleOpenBookingDetail = () => {
    if (!primaryLinkedBookingId) {
      uiFeedback.showToast('We could not find the booking for this session.', 'warning');
      return;
    }
    onClose();
    router.push(
      Routes.booking(primaryLinkedBookingId, {
        returnTo: Routes.BOOKINGS as string,
      }),
    );
  };
  const handleMessageCoach = () => {
    if (!offering?.coachId) {
      uiFeedback.showToast('We could not find the coach for this session.', 'warning');
      return;
    }
    onClose();
    router.push(
      Routes.messagesWith({
        coachId: offering.coachId,
      }),
    );
  };
  const handleReportProblem = () => {
    if (!primaryLinkedBookingId) {
      uiFeedback.showToast(
        'Open the booking first once it is linked, then report the issue there.',
        'warning',
      );
      return;
    }
    onClose();
    router.push(
      Routes.bookingsReportProblem({
        bookingId: primaryLinkedBookingId,
      }),
    );
  };
  const handleBookAgain = () => {
    if (!offering?.coachId) return;
    onClose();
    router.push(
      Routes.bookCoach(offering.coachId, {
        source: 'session_detail_modal',
        offeringId: offering.isRecurring ? offering.id : undefined,
      }),
    );
  };
  const formatSchedule = () => {
    if (!offering) return '';
    if (offering.isRecurring && offering.dayOfWeek !== undefined && offering.timeOfDay) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Every ${days[offering.dayOfWeek]} at ${offering.timeOfDay}`;
    }
    const date = new Date(offering.scheduledAt);
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  return {
    currentUser,
    clubLabel,
    ownerCoachName,
    selectedChildIds,
    toggleSelectedChildId,
    weeksToBook,
    setWeeksToBook,
    sessionAwards,
    userNameMap,
    showInstanceManagement,
    setShowInstanceManagement,
    upcomingInstances,
    canManageRecurringInstances,
    isCoach,
    isMyOffering,
    canManageOffering,
    canReassignOwnership,
    assigneeOptions,
    selectedAssigneeId,
    setSelectedAssigneeId,
    reassigningOwnership,
    ownershipTimeline,
    registeredCount,
    offPlatformParticipants,
    totalParticipants,
    draftOffPlatformParticipants,
    savingOffPlatform,
    isFull,
    isRegistered,
    isSessionInPast,
    canAddAnotherChild,
    canLeaveReview,
    canOpenBookingDetail,
    postSessionMessage,
    primaryLinkedBookingId,
    children,
    bookableChildren,
    hasMultipleKids,
    handleCancelInstance,
    handleCancelBooking,
    handleOpenReview,
    handleOpenBookingDetail,
    handleMessageCoach,
    handleReportProblem,
    handleBookAgain,
    handleEndSeries,
    handleReassignOwnership,
    handleAdjustOffPlatform,
    handleSaveOffPlatformParticipants,
    handleBook,
    formatSchedule,
  };
}
