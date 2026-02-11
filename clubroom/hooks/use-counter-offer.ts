/**
 * Hook for the Counter Offer screen.
 * Manages booking loading and counter-offer proposal submission.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { counterOfferService } from '@/services/counter-offer-service';
import { bookingService } from '@/services/booking-service';
import { toDateStr } from '@/utils/format';
import { createLogger } from '@/utils/logger';
import type { TimeSlot, CounterOfferProposerRole } from '@/constants/types';

const logger = createLogger('CounterOffer');

export interface BookingData {
  id: string;
  coachName: string;
  athleteName: string;
  scheduledAt: string;
  location: string;
  service: string;
}

export function useCounterOffer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const userRole: CounterOfferProposerRole = currentUser?.role === 'COACH' ? 'COACH' : 'PARENT';

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBooking = useCallback(async () => {
    if (!id) { setError('Booking ID not provided'); setIsLoading(false); return; }
    try {
      setIsLoading(true);
      setError(null);
      const bookingData = await bookingService.getById(id);
      if (bookingData) {
        setBooking({
          id: bookingData.id, coachName: bookingData.coachName || 'Coach',
          athleteName: bookingData.athleteId || bookingData.athleteIds?.[0] || 'Athlete',
          scheduledAt: bookingData.scheduledAt || new Date().toISOString(),
          location: bookingData.location || bookingData.locationLabel || 'Location TBD',
          service: bookingData.service || 'Session',
        });
      } else {
        setBooking({ id, coachName: 'Marcus Thompson', athleteName: 'Tom Baker',
          scheduledAt: '2026-01-15T16:00:00Z', location: 'Hackney Marshes', service: '1:1 Coaching' });
      }
    } catch (err) {
      logger.error('Failed to load booking', err);
      setError('Failed to load booking details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadBooking(); }, [loadBooking]);

  const getOriginalTime = useCallback((): TimeSlot => {
    if (!booking) return { date: toDateStr(new Date()), startTime: '10:00', endTime: '11:00', location: 'TBD' };
    const scheduledDate = new Date(booking.scheduledAt);
    const date = toDateStr(scheduledDate);
    const startTime = scheduledDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const endDate = new Date(scheduledDate);
    endDate.setHours(endDate.getHours() + 1);
    const endTime = endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    return { date, startTime, endTime, location: booking.location };
  }, [booking]);

  const handleSubmit = useCallback(async (proposedTime: TimeSlot, message?: string) => {
    if (!booking) return;
    try {
      setIsSubmitting(true);
      const createResult = await counterOfferService.createCounterOffer({
        bookingId: booking.id, proposedBy: userRole,
        proposerId: currentUser?.id || '',
        proposerName: currentUser?.name || currentUser?.fullName || 'User',
        originalTime: getOriginalTime(), proposedTime, message,
      });
      if (!createResult.success) {
        Alert.alert('Error', createResult.error.message || 'Failed to send your proposal. Please try again.');
        return;
      }
      Alert.alert('Proposal Sent',
        `Your time change request has been sent to ${booking.coachName}. They will be notified and can accept, decline, or propose an alternative.`,
        [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      logger.error('Failed to create counter-offer', err);
      Alert.alert('Error', 'Failed to send your proposal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [booking, userRole, currentUser, getOriginalTime]);

  const handleCancel = useCallback(() => {
    Alert.alert('Discard Changes?', 'Are you sure you want to cancel? Your proposal will not be saved.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }, []);

  const goBack = useCallback(() => router.back(), []);

  return {
    booking, isLoading, isSubmitting, error,
    getOriginalTime, handleSubmit, handleCancel, goBack, loadBooking,
  };
}
