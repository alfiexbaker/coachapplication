/**
 * useSessionDetailModal — State, handlers, and computed values for SessionDetailModal.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { apiClient } from '@/services/api-client';
import { toDateStr } from '@/utils/format';
import { useAuth } from '@/hooks/use-auth';
import { hasChildren } from '@/utils/user-helpers';
import { badgeService } from '@/services/badge-service';
import { bookingService } from '@/services/booking-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { User } from '@/constants/app-types';
import type { SessionOffering, BadgeAward } from '@/constants/types';
import { Routes } from '@/navigation/routes';

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
  const [selectedChildId, setSelectedChildId] = useState('');
  const [weeksToBook, setWeeksToBook] = useState(1);
  const [sessionAwards, setSessionAwards] = useState<BadgeAward[]>([]);
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});
  const [showInstanceManagement, setShowInstanceManagement] = useState(false);

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

  const upcomingInstances = useMemo(() => {
    if (!offering) return [];
    return getUpcomingInstances(offering, 8);
  }, [offering]);

  const isCoach = currentUser?.role === 'COACH';
  const isMyOffering = offering?.coachId === currentUser?.id;
  const registeredCount =
    offering?.registrations.filter((r) => r.status === 'confirmed').length ?? 0;
  const isFull = registeredCount >= (offering?.maxParticipants ?? 0);

  const children = useMemo(
    () =>
      currentUser && hasChildren(currentUser)
        ? (currentUser.children || []).map((child) => ({
            id: child.childId,
            name: child.childName || 'Child',
          }))
        : [],
    [currentUser],
  );
  const actorIds = useMemo(() => {
    const ids = new Set<string>();
    if (currentUser?.id) {
      ids.add(currentUser.id);
    }
    for (const child of children) {
      ids.add(child.id);
    }
    return Array.from(ids);
  }, [children, currentUser?.id]);
  const isRegistered =
    offering?.registrations.some(
      (registration) =>
        registration.status === 'confirmed' && actorIds.includes(registration.userId),
    ) ?? false;
  const hasMultipleKids = children.length > 1;

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
                Alert.alert('Cancelled', `Session on ${formattedDate} has been cancelled.`);
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
                  return {
                    ...o,
                    registrations: updatedRegistrations,
                    status: o.status === 'full' ? ('active' as const) : o.status,
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
          return {
            ...o,
            registrations: updatedRegistrations,
            status: updatedRegistrations.length >= o.maxParticipants ? ('full' as const) : o.status,
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
    registeredCount,
    isFull,
    isRegistered,
    children,
    hasMultipleKids,
    handleCancelInstance,
    handleCancelBooking,
    handleEndSeries,
    handleBook,
    formatSchedule,
  };
}
