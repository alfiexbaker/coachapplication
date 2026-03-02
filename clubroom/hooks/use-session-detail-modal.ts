/**
 * useSessionDetailModal — State, handlers, and computed values for SessionDetailModal.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
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
import {
  getSessionOfferingHeadcount,
  getSessionOfferingOffPlatformCount,
  getSessionOfferingRegisteredCount,
  isSessionOfferingFull,
} from '@/utils/session-offering-capacity';

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
  const {
    children: contextChildren,
    familyAthleteIds,
    isMultiChild,
  } = useChildContext();
  const [selectedChildId, setSelectedChildId] = useState('');
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
    setShowInstanceManagement(false);
    setSelectedChildId('');

    badgeService.listAwardsForSession(offering.id).then((awards) => {
      if (!cancelled) setSessionAwards(awards);
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
      })
      .catch(() => {
        if (!cancelled) setUserNameMap({});
      });

    return () => {
      cancelled = true;
    };
  }, [offering, visible]);

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
    () => contextChildren.map((c) => ({ id: c.id, name: c.name })),
    [contextChildren],
  );
  const actorIds = useMemo(() => Array.from(familyAthleteIds), [familyAthleteIds]);
  const isRegistered =
    offering?.registrations.some(
      (registration) =>
        registration.status === 'confirmed' && actorIds.includes(registration.userId),
    ) ?? false;
  const hasMultipleKids = isMultiChild;

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

      Alert.alert(
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
                Alert.alert(
                  'Cancelled',
                  registeredParticipants.length > 0
                    ? failedNotifications > 0
                      ? `Session on ${formattedDate} has been cancelled. ${notifiedCount} of ${registeredParticipants.length} athletes were notified.`
                      : `Session on ${formattedDate} has been cancelled. All ${registeredParticipants.length} athletes were notified.`
                    : `Session on ${formattedDate} has been cancelled.`,
                );
                onUpdate?.();
              } catch {
                Alert.alert('Error', 'Failed to cancel session. Please try again.');
              }
            },
          },
        ],
      );
    },
    [offering, onUpdate],
  );

  const handleCancelBooking = useCallback(async () => {
    if (!offering || !currentUser) return;
    const offeringStartTime = new Date(offering.scheduledAt).getTime();
    if (!Number.isFinite(offeringStartTime) || offeringStartTime <= Date.now()) {
      Alert.alert(
        'Cancellation unavailable',
        'Only upcoming bookings can be cancelled. This session has already started or finished.',
      );
      return;
    }

    const confirmedActorRegistrations = offering.registrations.filter(
      (registration) =>
        registration.status === 'confirmed' && actorIds.includes(registration.userId),
    );

    if (confirmedActorRegistrations.length === 0) {
      Alert.alert('No active booking', 'We could not find a confirmed booking to cancel.');
      return;
    }

    const myRegistration =
      (selectedChildId
        ? confirmedActorRegistrations.find((registration) => registration.userId === selectedChildId)
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
        onClose();
        router.push(Routes.bookingCancel(linkedBooking.id, 'parent'));
        return;
      }
    } catch {
      // Fall through to registration-level cancellation when booking lookup is unavailable.
    }

    Alert.alert(
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
              Alert.alert(
                'Booking Cancelled',
                'Your booking has been cancelled. The coach has been notified.',
              );
              onUpdate?.();
              onClose();
            } catch {
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          },
        },
      ],
    );
  }, [offering, currentUser, selectedChildId, actorIds, onUpdate, onClose]);

  const handleEndSeries = useCallback(async () => {
    if (!offering) return;
    Alert.alert(
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
              Alert.alert('Series Ended', 'All future sessions have been cancelled.');
              onUpdate?.();
              onClose();
            } catch {
              Alert.alert('Error', 'Failed to end series. Please try again.');
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
      Alert.alert('No change', 'This session is already assigned to that coach.');
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
      Alert.alert('Updated', `Session reassigned to ${selectedAssigneeLabel}.`);
      onUpdate?.();
    } catch (error) {
      logger.error('Failed to reassign session owner', { offeringId: offering.id, error });
      Alert.alert('Error', 'Failed to reassign session owner. Please try again.');
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
    setDraftOffPlatformParticipants((previous) => Math.max(0, previous + delta));
  }, []);

  const handleSaveOffPlatformParticipants = useCallback(async () => {
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
      emitTyped(ServiceEvents.SESSION_UPDATED, {
        sessionId: offering.id,
        changes: { offPlatformParticipants: normalizedCount },
      });
      onUpdate?.();
      Alert.alert('Saved', 'Off-platform attendees updated.');
    } catch {
      Alert.alert('Error', 'Failed to update off-platform attendees. Please try again.');
    } finally {
      setSavingOffPlatform(false);
    }
  }, [canManageOffering, currentUser, draftOffPlatformParticipants, offering, onUpdate]);

  const handleBook = useCallback(async () => {
    if (!offering || !currentUser) return;
    if (isFull) {
      Alert.alert('Session Full', 'This session is currently full.');
      return;
    }
    if (hasMultipleKids && !selectedChildId) {
      Alert.alert('Select Child', 'Please select which child to book for.');
      return;
    }

    try {
      const userId = hasMultipleKids ? selectedChildId : currentUser.id || '';
      const userName = hasMultipleKids
        ? children.find((c) => c.id === selectedChildId)?.name || 'Unknown'
        : currentUser.fullName || 'Unknown';

      const newRegistration = {
        id: `reg_${Date.now()}`,
        userId,
        userName,
        bookedAt: new Date().toISOString(),
        status: 'confirmed' as const,
      };

      const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
      const updatedOfferings = offerings.map((o) => {
        if (o.id === offering.id) {
          const updatedRegistrations = [...o.registrations, newRegistration];
          const nextHeadcount =
            updatedRegistrations.filter((registration) => registration.status === 'confirmed').length +
            getSessionOfferingOffPlatformCount(o);
          return {
            ...o,
            registrations: updatedRegistrations,
            status: nextHeadcount >= o.maxParticipants ? ('full' as const) : o.status,
          };
        }
        return o;
      });
      await apiClient.set('session_offerings', updatedOfferings);

      Alert.alert(
        'Success',
        offering.isRecurring
          ? `Booked for the next ${weeksToBook} week${weeksToBook > 1 ? 's' : ''}`
          : 'Session booked',
      );
      onUpdate?.();
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to book session. Please try again.');
    }
  }, [
    offering,
    currentUser,
    isFull,
    hasMultipleKids,
    selectedChildId,
    children,
    weeksToBook,
    onUpdate,
    onClose,
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
    selectedChildId,
    setSelectedChildId,
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
    children,
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
