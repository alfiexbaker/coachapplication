/**
 * useSessionDetailModal — State, handlers, and computed values for SessionDetailModal.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { router } from 'expo-router';

import { apiClient } from '@/services/api-client';
import { toDateStr } from '@/utils/format';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { academyService } from '@/services/academy-service';
import { badgeService } from '@/services/badge-service';
import { bookingService } from '@/services/booking-service';
import { notificationService } from '@/services/notification-service';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { User } from '@/constants/app-types';
import type {
  AcademyMembership,
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
import { extractGroupSessionIdFromOfferingId } from '@/utils/session-offering-projections';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('useSessionDetailModal');

const STAFF_ROLE_ORDER: Record<AcademyMembership['role'], number> = {
  OWNER: 0,
  ADMIN: 1,
  HEAD_COACH: 2,
  COACH: 3,
  ASSISTANT: 4,
  MEMBER: 5,
};

interface OwnershipAssigneeOption {
  id: string;
  label: string;
  role: AcademyMembership['role'];
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
  const [weeksToBook, setWeeksToBook] = useState(1);
  const [sessionAwards, setSessionAwards] = useState<BadgeAward[]>([]);
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});
  const [showInstanceManagement, setShowInstanceManagement] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState<OwnershipAssigneeOption[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [canManageClubOwnership, setCanManageClubOwnership] = useState(false);
  const [reassigningOwnership, setReassigningOwnership] = useState(false);
  const [draftOffPlatformParticipants, setDraftOffPlatformParticipants] = useState(0);
  const [savingOffPlatform, setSavingOffPlatform] = useState(false);
  const [clubNameById, setClubNameById] = useState<Record<string, string>>({});

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
      childProfileIds: contextChildren.map((child) => child.profileId).filter(Boolean),
    });
    setShowInstanceManagement(false);
    setSelectedChildIds([]);
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

    apiClient
      .get<User[]>(STORAGE_KEYS.USERS, [])
      .then((users) => {
        if (cancelled) return;
        const nextMap = users.reduce<Record<string, string>>((acc, user) => {
          const candidate = user as User & { fullName?: string; username?: string };
          const resolvedName = candidate.fullName || candidate.name || candidate.username;
          if (resolvedName) {
            acc[user.id] = resolvedName;
          }
          return acc;
        }, {});
        setUserNameMap(nextMap);
        logger.debug('Loaded user name map for session modal', {
          offeringId: offering.id,
          mapSize: Object.keys(nextMap).length,
        });
      })
      .catch(() => {
        if (!cancelled) setUserNameMap({});
      });

    return () => {
      cancelled = true;
      logger.debug('Session detail modal open cycle cleanup', { offeringId: offering.id });
    };
  }, [contextChildren, currentUser?.id, currentUser?.role, offering, visible]);

  useEffect(() => {
    if (!visible || !offering) {
      setDraftOffPlatformParticipants(0);
      return;
    }
    setDraftOffPlatformParticipants(getSessionOfferingOffPlatformCount(offering));
  }, [offering, visible]);

  useEffect(() => {
    if (!visible || !offering || !currentUser?.id) {
      setAssigneeOptions([]);
      setSelectedAssigneeId(null);
      setCanManageClubOwnership(false);
      return;
    }

    if (offering.actingAs !== 'club' || !offering.clubId) {
      setAssigneeOptions([]);
      setSelectedAssigneeId(offering.assigneeCoachId || offering.ownerCoachId || offering.coachId);
      setCanManageClubOwnership(false);
      return;
    }

    let cancelled = false;

    const loadOwnershipContext = async () => {
      try {
        const [academiesResult, staffResult, users] = await Promise.all([
          academyService.getUserAcademies(currentUser.id),
          academyService.getStaff(offering.clubId as string),
          apiClient.get<User[]>(STORAGE_KEYS.USERS, []),
        ]);
        if (cancelled) return;

        const nameById = new Map<string, string>();
        users.forEach((user) => {
          const resolved = user.name?.trim() || user.id;
          nameById.set(user.id, resolved);
        });

        if (academiesResult.success) {
          const names = academiesResult.data.reduce<Record<string, string>>((acc, academy) => {
            acc[academy.id] = academy.name;
            return acc;
          }, {});
          setClubNameById(names);

          const membership = academiesResult.data.find((academy) => academy.id === offering.clubId)?.membership;
          const canManageByPermission = Boolean(
            membership?.permissions.includes('CREATE_SESSIONS') ||
              membership?.permissions.includes('POST_AS_ACADEMY'),
          );
          setCanManageClubOwnership(canManageByPermission);
        } else {
          setCanManageClubOwnership(false);
          setClubNameById({});
        }

        if (!staffResult.success) {
          setAssigneeOptions([]);
          return;
        }

        const options = staffResult.data
          .filter((member) => member.status === 'ACTIVE')
          .map((member) => ({
            id: member.userId,
            label: nameById.get(member.userId) || member.userId,
            role: member.role,
          }))
          .sort((a, b) => STAFF_ROLE_ORDER[a.role] - STAFF_ROLE_ORDER[b.role]);

        setAssigneeOptions(options);
        setSelectedAssigneeId((previous) => {
          if (previous && options.some((option) => option.id === previous)) {
            return previous;
          }
          const existingOwner = offering.assigneeCoachId || offering.ownerCoachId || offering.coachId;
          if (existingOwner && options.some((option) => option.id === existingOwner)) {
            return existingOwner;
          }
          return options[0]?.id ?? null;
        });
      } catch (error) {
        if (cancelled) return;
        logger.warn('Failed to load session ownership context', { offeringId: offering.id, error });
        setAssigneeOptions([]);
        setCanManageClubOwnership(false);
      }
    };

    void loadOwnershipContext();

    return () => {
      cancelled = true;
    };
  }, [
    currentUser?.id,
    offering,
    visible,
  ]);

  const upcomingInstances = useMemo(() => {
    if (!offering) return [];
    return getUpcomingInstances(offering, 8);
  }, [offering]);

  const isCoach = currentUser?.role === 'COACH';
  const isMyOffering = offering?.coachId === currentUser?.id;
  const canManageOffering = Boolean(
    offering &&
      currentUser &&
      (offering.coachId === currentUser.id ||
        (offering.actingAs === 'club' &&
          (canManageClubOwnership || offering.createdByUserId === currentUser.id))),
  );
  const canReassignOwnership = Boolean(
    offering &&
      offering.actingAs === 'club' &&
      offering.clubId &&
      assigneeOptions.length > 0 &&
      (canManageClubOwnership || offering.createdByUserId === currentUser?.id),
  );
  const ownerCoachId = offering?.assigneeCoachId || offering?.ownerCoachId || offering?.coachId;
  const ownerCoachName = ownerCoachId ? userNameMap[ownerCoachId] || ownerCoachId : 'Unassigned';
  const clubLabel = offering?.clubId ? clubNameById[offering.clubId] || offering.clubId : undefined;
  const registeredCount = offering ? getSessionOfferingRegisteredCount(offering) : 0;
  const offPlatformParticipants = offering ? getSessionOfferingOffPlatformCount(offering) : 0;
  const totalParticipants = offering ? getSessionOfferingHeadcount(offering) : 0;
  const isFull = offering ? isSessionOfferingFull(offering) : false;

  const children = useMemo(
    () =>
      contextChildren.map((child) => ({
        id: child.id,
        name: child.name,
        fullName: child.fullName,
        referenceId: child.referenceId,
        profileId: child.profileId,
      })),
    [contextChildren],
  );
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
      setLinkedBookingAthleteIds([]);
      return;
    }

    let cancelled = false;
    const directEntityIds = new Set<string>();
    directEntityIds.add(offering.id);
    if (offering.sourceEntityId) {
      directEntityIds.add(offering.sourceEntityId);
    }

    const groupSessionIds = new Set<string>();
    const inferredGroupSessionId = extractGroupSessionIdFromOfferingId(offering.id);
    if (inferredGroupSessionId) {
      groupSessionIds.add(inferredGroupSessionId);
    }
    if (offering.source === 'group' && offering.sourceEntityId) {
      groupSessionIds.add(offering.sourceEntityId);
    }

    const loadLinkedBookings = async () => {
      try {
        const bookings = await bookingService.list();
        if (cancelled) return;

        const matchedAthleteIds = new Set<string>();
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
          setLinkedBookingAthleteIds([]);
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
  const confirmedActorRegistrations = useMemo(
    () =>
      offering?.registrations.filter(
        (registration) => registration.status === 'confirmed' && actorIdSet.has(registration.userId),
      ) ?? [],
    [actorIdSet, offering?.registrations],
  );
  const registeredChildIdSet = useMemo(() => {
    const childIds = new Set<string>();
    for (const child of children) {
      const isRegisteredForChild = confirmedActorRegistrations.some(
        (registration) =>
          registration.userId === child.id ||
          registration.userId === child.referenceId ||
          registration.userId === child.profileId,
      ) || linkedBookingAthleteIdSet.has(child.id) ||
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
  const canAddAnotherChild = isRegistered && bookableChildren.length > 0 && !isFull;
  const hasMultipleKids = children.length > 1;
  useEffect(() => {
    if (!visible || !offering) return;
    logger.debug('Booking CTA decision snapshot', {
      offeringId: offering.id,
      offeringStatus: offering.status,
      isRegistered,
      isFull,
      canAddAnotherChild,
      hasMultipleKids,
      childCount: children.length,
      bookableChildIds: bookableChildren.map((child) => child.id),
      selectedChildIds,
      confirmedRegistrationCount: confirmedActorRegistrations.length,
      confirmedRegistrationUserIds: confirmedActorRegistrations.map((registration) => registration.userId),
      linkedBookingAthleteIds,
      registeredChildIds: Array.from(registeredChildIdSet),
      actorIds: Array.from(actorIdSet),
    });
  }, [
    actorIdSet,
    bookableChildren,
    canAddAnotherChild,
    children.length,
    confirmedActorRegistrations,
    hasMultipleKids,
    isFull,
    isRegistered,
    linkedBookingAthleteIds,
    offering,
    registeredChildIdSet,
    selectedChildIds,
    visible,
  ]);

  useEffect(() => {
    if (!visible || !offering) {
      setSelectedChildIds([]);
      return;
    }
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
      return [];
    });
  }, [bookableChildren, offering, visible]);

  const toggleSelectedChildId = useCallback(
    (childId: string) => {
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
    },
    [hasMultipleKids, offering?.id, selectedChildIds],
  );

  const ownershipTimeline = useMemo<SessionOwnershipTimelineEntry[]>(() => {
    if (!offering) return [];

    const events = [...(offering.ownershipAuditTrail ?? [])]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

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
        title: `Edited by ${
          offering.updatedByUserId
            ? userNameMap[offering.updatedByUserId] || offering.updatedByUserId
            : 'System'
        }`,
        meta: offering.updatedByRole ? offering.updatedByRole.replace('_', ' ') : 'Last update',
        timestampLabel: formatTimelineTimestamp(offering.updatedAt),
      });
    }

    return fallback;
  }, [offering, ownerCoachId, userNameMap]);

  const handleCancelInstance = useCallback(
    async (instanceDate: Date) => {
      if (!offering) return;
      const dateStr = toDateStr(instanceDate);
      const formattedDate = instanceDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      uiFeedback.alert(
        'Cancel Session',
        `Cancel the session on ${formattedDate}? Athletes will be notified.`,
        [
          { text: 'Keep Session', style: 'cancel' },
          {
            text: 'Cancel Session',
            style: 'destructive',
            onPress: async () => {
              try {
                const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
                const updatedOfferings = offerings.map((o) => {
                  if (o.id === offering.id) {
                    return { ...o, cancelledInstances: [...(o.cancelledInstances || []), dateStr] };
                  }
                  return o;
                });
                await apiClient.set('session_offerings', updatedOfferings);
                const registeredParticipants = offering.registrations.filter(
                  (registration) => registration.status === 'confirmed',
                );

                const notificationResults = await Promise.allSettled(
                  registeredParticipants.map((registration) =>
                    notificationService.create({
                      id: `notif_session_instance_cancel_${offering.id}_${registration.userId}_${Date.now()}`,
                      type: 'booking',
                      title: 'Session Cancelled',
                      body: `${offering.title} on ${formattedDate} has been cancelled by the coach.`,
                      recipientId: registration.userId,
                      timeLabel: 'Just now',
                      read: false,
                    }),
                  ),
                );
                const failedNotifications = notificationResults.filter(
                  (result) =>
                    result.status === 'rejected' ||
                    (result.status === 'fulfilled' && !result.value.success),
                ).length;

                if (failedNotifications > 0) {
                  logger.warn('Partial notification failure for recurring instance cancel', {
                    offeringId: offering.id,
                    date: dateStr,
                    failedNotifications,
                    totalParticipants: registeredParticipants.length,
                  });
                }

                const notifiedCount = Math.max(0, registeredParticipants.length - failedNotifications);
                uiFeedback.showToast(registeredParticipants.length > 0
                    ? failedNotifications > 0
                      ? `Session on ${formattedDate} has been cancelled. ${notifiedCount} of ${registeredParticipants.length} athletes were notified.`
                      : `Session on ${formattedDate} has been cancelled. All ${registeredParticipants.length} athletes were notified.`
                    : `Session on ${formattedDate} has been cancelled.`, 'success');
                onUpdate?.();
              } catch {
                uiFeedback.showToast('Failed to cancel session. Please try again.', 'error');
              }
            },
          },
        ],
      );
    },
    [offering, onUpdate],
  );

  const handleCancelBooking = useCallback(async () => {
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
      uiFeedback.showToast('Only upcoming bookings can be cancelled. This session has already started or finished.');
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
      const linkedBooking = bookings.find((booking) => {
        if (booking.status === 'CANCELLED') return false;
        if (booking.groupSessionId !== offering.id) return false;
        if (booking.groupRegistrationId && booking.groupRegistrationId === myRegistration.id) return true;

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
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
              const updatedOfferings = offerings.map((o) => {
                if (o.id === offering.id) {
                  const updatedRegistrations = o.registrations.map((reg) =>
                    reg.id === myRegistration.id ? { ...reg, status: 'cancelled' as const } : reg,
                  );
                  const nextRegisteredCount =
                    updatedRegistrations.filter((reg) => reg.status === 'confirmed').length;
                  const nextHeadcount =
                    nextRegisteredCount + getSessionOfferingOffPlatformCount(o);
                  return {
                    ...o,
                    registrations: updatedRegistrations,
                    status:
                      o.status === 'full'
                        ? (nextHeadcount >= o.maxParticipants ? 'full' : 'active')
                        : o.status,
                  };
                }
                return o;
              });
              await apiClient.set('session_offerings', updatedOfferings);
              logger.debug('Registration-level cancellation persisted', {
                offeringId: offering.id,
                registrationId: myRegistration.id,
                registrationUserId: myRegistration.userId,
              });
              uiFeedback.showToast('Your booking has been cancelled. The coach has been notified.', 'success');
              onUpdate?.();
              onClose();
            } catch {
              uiFeedback.showToast('Failed to cancel booking. Please try again.', 'error');
            }
          },
        },
      ],
    );
  }, [actorIdSet, children, confirmedActorRegistrations, currentUser, offering, onClose, onUpdate, selectedChildIds]);

  const handleEndSeries = useCallback(async () => {
    if (!offering) return;
    uiFeedback.alert(
      'End Recurring Series',
      'This will cancel all future sessions. Athletes will be notified. Are you sure?',
      [
        { text: 'Keep Sessions', style: 'cancel' },
        {
          text: 'End Series',
          style: 'destructive',
          onPress: async () => {
            try {
              const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
              const updatedOfferings = offerings.map((o) => {
                if (o.id === offering.id) {
                  return { ...o, endDate: toDateStr(new Date()), status: 'cancelled' as const };
                }
                return o;
              });
              await apiClient.set('session_offerings', updatedOfferings);
              uiFeedback.showToast('All future sessions have been cancelled.');
              onUpdate?.();
              onClose();
            } catch {
              uiFeedback.showToast('Failed to end series. Please try again.', 'error');
            }
          },
        },
      ],
    );
  }, [offering, onUpdate, onClose]);

  const handleReassignOwnership = useCallback(async () => {
    if (!offering || !currentUser || !selectedAssigneeId) return;
    if (!canReassignOwnership) return;

    const previousOwnerId = offering.assigneeCoachId || offering.ownerCoachId || offering.coachId;
    if (previousOwnerId === selectedAssigneeId) {
      uiFeedback.showToast('This session is already assigned to that coach.');
      return;
    }

    setReassigningOwnership(true);
    try {
      const offerings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
      const nowIso = new Date().toISOString();
      const actorName = currentUser.fullName || currentUser.name || currentUser.id;
      const selectedAssigneeLabel =
        assigneeOptions.find((option) => option.id === selectedAssigneeId)?.label || selectedAssigneeId;

      const updated = offerings.map((entry) => {
        if (entry.id !== offering.id) return entry;

        const nextAuditTrail: SessionOwnershipAuditEvent[] = [
          ...(entry.ownershipAuditTrail ?? []),
          {
            id: `ownership_${Date.now()}_${selectedAssigneeId}`,
            action: previousOwnerId ? 'REASSIGNED' : 'ASSIGNED',
            timestamp: nowIso,
            actorUserId: currentUser.id,
            actorName,
            actorRole: currentUser.role,
            fromCoachId: previousOwnerId,
            toCoachId: selectedAssigneeId,
            note: `Session owner changed to ${selectedAssigneeLabel}`,
          },
          {
            id: `ownership_${Date.now()}_updated`,
            action: 'UPDATED',
            timestamp: nowIso,
            actorUserId: currentUser.id,
            actorName,
            actorRole: currentUser.role,
            toCoachId: selectedAssigneeId,
            note: 'Ownership edited in session detail',
          },
        ];

        return {
          ...entry,
          coachId: selectedAssigneeId,
          ownerCoachId: selectedAssigneeId,
          assigneeCoachId: selectedAssigneeId,
          updatedAt: nowIso,
          updatedByUserId: currentUser.id,
          updatedByRole: currentUser.role,
          ownershipAuditTrail: nextAuditTrail,
        };
      });

      await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, updated);
      uiFeedback.showToast(`Session reassigned to ${selectedAssigneeLabel}.`, 'success');
      onUpdate?.();
    } catch (error) {
      logger.error('Failed to reassign session owner', { offeringId: offering.id, error });
      uiFeedback.showToast('Failed to reassign session owner. Please try again.', 'error');
    } finally {
      setReassigningOwnership(false);
    }
  }, [
    assigneeOptions,
    canReassignOwnership,
    currentUser,
    offering,
    onUpdate,
    selectedAssigneeId,
  ]);

  const handleAdjustOffPlatform = useCallback((delta: number) => {
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
  }, [offering?.id]);

  const handleSaveOffPlatformParticipants = useCallback(async () => {
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
    try {
      const offerings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
      const nowIso = new Date().toISOString();
      const updatedOfferings = offerings.map((entry) => {
        if (entry.id !== offering.id) return entry;

        const nextHeadcount = getSessionOfferingRegisteredCount(entry) + normalizedCount;
        const shouldTrackCapacityStatus = entry.status === 'active' || entry.status === 'full';
        return {
          ...entry,
          offPlatformParticipants: normalizedCount,
          status: shouldTrackCapacityStatus
            ? (nextHeadcount >= entry.maxParticipants ? 'full' : 'active')
            : entry.status,
          updatedAt: nowIso,
          updatedByUserId: currentUser.id,
          updatedByRole: currentUser.role,
        };
      });

      await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, updatedOfferings);
      setDraftOffPlatformParticipants(normalizedCount);
      logger.debug('Saved off-platform participants', {
        offeringId: offering.id,
        previousCount: currentCount,
        nextCount: normalizedCount,
      });
      emitTyped(ServiceEvents.SESSION_UPDATED, {
        sessionId: offering.id,
        changes: { offPlatformParticipants: normalizedCount },
      });
      onUpdate?.();
      uiFeedback.showToast('Off-platform attendees updated.', 'success');
    } catch {
      uiFeedback.showToast('Failed to update off-platform attendees. Please try again.', 'error');
    } finally {
      setSavingOffPlatform(false);
    }
  }, [canManageOffering, currentUser, draftOffPlatformParticipants, offering, onUpdate]);

  const handleBook = useCallback(async () => {
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
    if (isFull) {
      logger.debug('Handle book blocked - session is full', { offeringId: offering.id });
      uiFeedback.showToast('This session is currently full.');
      return;
    }
    if (bookableChildren.length > 0 && selectedChildIds.length === 0) {
      logger.debug('Handle book blocked - no child selected', {
        offeringId: offering.id,
        bookableChildIds: bookableChildren.map((child) => child.id),
      });
      uiFeedback.showToast(isRegistered
          ? 'Select at least one additional child to book.'
          : 'Please select at least one child to book for.');
      return;
    }

    const selectedIds = (
      bookableChildren.length > 0
        ? selectedChildIds
        : currentUser?.id
          ? [currentUser.id]
          : []
    ).filter((id, index, source) => source.indexOf(id) === index);

    const prefillChildren = selectedIds
      .map((childId) => {
        if (currentUser?.id && childId === currentUser.id) {
          return {
            id: currentUser.id,
            name: currentUser.name || currentUser.fullName || 'Athlete',
          };
        }
        const matchedChild = children.find((child) => child.id === childId);
        return matchedChild ? { id: matchedChild.id, name: matchedChild.name } : null;
      })
      .filter((child): child is { id: string; name: string } => child !== null);

    const prefillChild = prefillChildren[0]
      ? (() => {
          return prefillChildren[0];
        })()
      : children.length === 0
        ? {
            id: currentUser.id,
            name: currentUser.name || currentUser.fullName || 'Athlete',
          }
        : null;

    updateDraft(
      {
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
      },
    );
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
  }, [
    bookableChildren,
    children,
    currentUser,
    actorIdSet,
    canAddAnotherChild,
    hasMultipleKids,
    isRegistered,
    isFull,
    linkedBookingAthleteIds,
    offering,
    onClose,
    selectedChildIds,
    updateDraft,
    weeksToBook,
  ]);

  const formatSchedule = useCallback(() => {
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
  }, [offering]);

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
    canAddAnotherChild,
    children,
    bookableChildren,
    hasMultipleKids,
    handleCancelInstance,
    handleCancelBooking,
    handleEndSeries,
    handleReassignOwnership,
    handleAdjustOffPlatform,
    handleSaveOffPlatformParticipants,
    handleBook,
    formatSchedule,
  };
}
