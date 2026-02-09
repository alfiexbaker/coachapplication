/**
 * useSessionDetailModal — State, handlers, and computed values for SessionDetailModal.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';

import { apiClient } from '@/services/api-client';
import { toDateStr } from '@/utils/format';
import { useAuth } from '@/hooks/use-auth';
import { getChildrenForParent } from '@/constants/mock-data';
import { hasChildren } from '@/utils/user-helpers';
import { badgeService } from '@/services/badge-service';
import type { SessionOffering, BadgeAward } from '@/constants/types';

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
  const [showInstanceManagement, setShowInstanceManagement] = useState(false);

  useEffect(() => {
    if (visible && offering) {
      badgeService.listAwardsForSession(offering.id).then(setSessionAwards);
      setShowInstanceManagement(false);
    }
  }, [offering, visible]);

  const upcomingInstances = useMemo(() => {
    if (!offering) return [];
    return getUpcomingInstances(offering, 8);
  }, [offering]);

  const isCoach = currentUser?.role === 'COACH';
  const isMyOffering = offering?.coachId === currentUser?.id;
  const registeredCount = offering?.registrations.filter(r => r.status === 'confirmed').length ?? 0;
  const isFull = registeredCount >= (offering?.maxParticipants ?? 0);
  const isRegistered = offering?.registrations.some(
    r => r.userId === currentUser?.id && r.status === 'confirmed'
  ) ?? false;

  const children = currentUser && hasChildren(currentUser) ? getChildrenForParent(currentUser.id) : [];
  const hasMultipleKids = children.length > 1;

  const handleCancelInstance = useCallback(async (instanceDate: Date) => {
    if (!offering) return;
    const dateStr = toDateStr(instanceDate);
    const formattedDate = instanceDate.toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
    });

    Alert.alert('Cancel Session', `Cancel the session on ${formattedDate}? Athletes will be notified.`, [
      { text: 'Keep Session', style: 'cancel' },
      {
        text: 'Cancel Session',
        style: 'destructive',
        onPress: async () => {
          try {
            const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
            const updatedOfferings = offerings.map(o => {
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
    ]);
  }, [offering, onUpdate]);

  const handleCancelBooking = useCallback(async () => {
    if (!offering || !currentUser) return;
    const myRegistration = offering.registrations.find(
      r => r.userId === currentUser.id && r.status === 'confirmed'
    );
    if (!myRegistration) return;

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
              const updatedOfferings = offerings.map(o => {
                if (o.id === offering.id) {
                  const updatedRegistrations = o.registrations.map(reg =>
                    reg.id === myRegistration.id ? { ...reg, status: 'cancelled' as const } : reg
                  );
                  return {
                    ...o,
                    registrations: updatedRegistrations,
                    status: o.status === 'full' ? 'active' as const : o.status,
                  };
                }
                return o;
              });
              await apiClient.set('session_offerings', updatedOfferings);
              Alert.alert('Booking Cancelled', 'Your booking has been cancelled. The coach has been notified.');
              onUpdate?.();
              onClose();
            } catch {
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          },
        },
      ]
    );
  }, [offering, currentUser, onUpdate, onClose]);

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
              const updatedOfferings = offerings.map(o => {
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
      ]
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
      const userId = hasMultipleKids ? selectedChildId : (currentUser.id || '');
      const userName = hasMultipleKids
        ? children.find(c => c.id === selectedChildId)?.name || 'Unknown'
        : currentUser.fullName || 'Unknown';

      const newRegistration = {
        id: `reg_${Date.now()}`,
        userId,
        userName,
        bookedAt: new Date().toISOString(),
        status: 'confirmed' as const,
      };

      const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
      const updatedOfferings = offerings.map(o => {
        if (o.id === offering.id) {
          const updatedRegistrations = [...o.registrations, newRegistration];
          return {
            ...o,
            registrations: updatedRegistrations,
            status: updatedRegistrations.length >= o.maxParticipants ? 'full' as const : o.status,
          };
        }
        return o;
      });
      await apiClient.set('session_offerings', updatedOfferings);

      Alert.alert('Success', offering.isRecurring
        ? `Booked for the next ${weeksToBook} week${weeksToBook > 1 ? 's' : ''}`
        : 'Session booked'
      );
      onUpdate?.();
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to book session. Please try again.');
    }
  }, [offering, currentUser, isFull, hasMultipleKids, selectedChildId, children, weeksToBook, onUpdate, onClose]);

  const formatSchedule = useCallback(() => {
    if (!offering) return '';
    if (offering.isRecurring && offering.dayOfWeek !== undefined && offering.timeOfDay) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Every ${days[offering.dayOfWeek]} at ${offering.timeOfDay}`;
    }
    const date = new Date(offering.scheduledAt);
    return date.toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  }, [offering]);

  return {
    currentUser,
    selectedChildId,
    setSelectedChildId,
    weeksToBook,
    setWeeksToBook,
    sessionAwards,
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
