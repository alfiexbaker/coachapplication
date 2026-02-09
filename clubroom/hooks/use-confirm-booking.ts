/**
 * Hook for the Confirm Booking screen.
 * Manages params parsing, athlete info, payment form, and booking submission.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { formatGBP, getChildrenForParent } from '@/constants/mock-data';
import { bookingService } from '@/services/booking-service';
import { notificationService } from '@/services/notification-service';
import { hasChildren } from '@/utils/user-helpers';

export function useConfirmBooking() {
  const { currentUser } = useAuth();
  const params = useLocalSearchParams();

  const coachId = params.coachId as string;
  const coachName = params.coachName as string;
  const slotTitle = params.slotTitle as string;
  const slotFocus = params.slotFocus as string;
  const slotStart = params.slotStart as string;
  const slotDuration = parseInt(params.slotDuration as string);
  const price = parseFloat(params.price as string);
  const serviceType = params.serviceType as string;
  const objectivesParam = params.objectives as string;
  const objectives = useMemo(() => objectivesParam ? JSON.parse(objectivesParam) : [], [objectivesParam]);
  const athleteIdsParam = params.athleteIds as string;
  const athleteIds = useMemo(() => athleteIdsParam ? JSON.parse(athleteIdsParam) : [], [athleteIdsParam]);

  const isGroupSession = serviceType === 'Small Group';
  const groupParticipants = isGroupSession
    ? [{ id: '1', name: 'Emma W.' }, { id: '2', name: 'Jack T.' }, { id: '3', name: 'Sarah M.' }, { id: '4', name: 'Liam P.' }, { id: '5', name: 'Olivia K.' }]
    : [];

  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [athletesInfo, setAthletesInfo] = useState<{ id: string; name: string; avatar?: string }[]>([]);

  const slotDate = new Date(slotStart);
  const formattedDate = slotDate.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  const formattedTime = slotDate.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

  useEffect(() => {
    if (!currentUser || athleteIds.length === 0) return;
    if (hasChildren(currentUser)) {
      const userChildren = getChildrenForParent(currentUser.id);
      const selected = userChildren.filter((c) => athleteIds.includes(c.id));
      setAthletesInfo(selected.map((c) => ({ id: c.id, name: c.name, avatar: c.avatar })));
    } else {
      setAthletesInfo([{ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }]);
    }
  }, [currentUser, athleteIds]);

  const handleCardNumberChange = useCallback((value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    setCardNumber(formatted.substring(0, 19));
  }, []);

  const handleExpiryChange = useCallback((value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setExpiryDate(cleaned.length >= 2 ? `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}` : cleaned);
  }, []);

  const handleCvvChange = useCallback((value: string) => {
    setCvv(value.replace(/\D/g, '').substring(0, 3));
  }, []);

  const handleConfirmBooking = useCallback(async () => {
    if (athletesInfo.length === 0) { Alert.alert('Error', 'Unable to determine athlete information.'); return; }
    if (!cardNumber || !expiryDate || !cvv) { Alert.alert('Error', 'Please fill in all payment details'); return; }
    if (cardNumber.replace(/\s/g, '').length !== 16) { Alert.alert('Error', 'Please enter a valid card number'); return; }
    if (!expiryDate.match(/^\d{2}\/\d{2}$/)) { Alert.alert('Error', 'Please enter a valid expiry date (MM/YY)'); return; }
    if (cvv.length !== 3) { Alert.alert('Error', 'Please enter a valid CVV'); return; }

    setIsProcessing(true);
    try {
      const result = await bookingService.createBooking({
        coachId, coachName, athleteIds: athletesInfo.map((a) => a.id), athleteNames: athletesInfo.map((a) => a.name),
        bookedById: currentUser?.id || 'unknown', bookedByName: currentUser?.name || currentUser?.fullName || 'Parent',
        scheduledAt: slotStart, duration: slotDuration, location: 'Training Ground',
        service: slotTitle, serviceType, objectives, price,
      });
      if (!result.success) { setIsProcessing(false); Alert.alert('Booking Issue', result.error?.message || 'Booking could not be completed.'); return; }

      const athleteNames = athletesInfo.map((a) => a.name).join(' & ');
      await notificationService.notifyCoachNewBooking({ coachId, parentName: currentUser?.name || currentUser?.fullName || 'Parent', childName: athleteNames, date: formattedDate, bookingId: result.data?.id || 'new' });
      await notificationService.notifyParentBookingConfirmed({ parentId: currentUser?.id || 'parent', coachName, date: `${formattedDate} at ${formattedTime}`, bookingId: result.data?.id || 'new' });

      setIsProcessing(false);
      const message = athletesInfo.length === 1
        ? `Your session with ${coachName} has been booked for ${formattedDate} at ${formattedTime}`
        : `Shared session booked for ${athleteNames} with ${coachName} on ${formattedDate} at ${formattedTime}`;
      Alert.alert('Booking Confirmed', message, [
        { text: 'View Bookings', onPress: () => router.replace(Routes.BOOKINGS) },
        { text: 'Find More Coaches', onPress: () => router.replace(Routes.HOME) },
      ]);
    } catch {
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to process booking. Please try again.');
    }
  }, [athletesInfo, cardNumber, expiryDate, cvv, coachId, coachName, currentUser, slotStart, slotDuration, slotTitle, serviceType, objectives, price, formattedDate, formattedTime]);

  const totalPrice = price * athletesInfo.length;

  return {
    coachName, slotTitle, slotFocus, slotDuration, price, serviceType,
    objectives, isGroupSession, groupParticipants,
    cardNumber, expiryDate, cvv, isProcessing, athletesInfo,
    formattedDate, formattedTime, totalPrice,
    handleCardNumberChange, handleExpiryChange, handleCvvChange, handleConfirmBooking,
  };
}

export { formatGBP };
