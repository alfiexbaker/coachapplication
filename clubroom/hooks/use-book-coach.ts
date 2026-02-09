/**
 * Hook for the Book Coach screen.
 * Manages multi-step booking flow: athletes → service → time → objectives.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { toDateStr } from '@/utils/format';
import { useAuth } from '@/hooks/use-auth';
import { useBookingPersona } from '@/hooks/use-booking-persona';
import { hasChildren, isAthlete } from '@/utils/user-helpers';
import { availabilityService } from '@/services/availability-service';
import { FOOTBALL_OBJECTIVES, SERVICES, formatServicePrice, resolveCoachAndProfile } from '@/constants/booking-types';
import { createLogger } from '@/utils/logger';
import type { DayAvailability, SlotInstance } from '@/constants/booking-types';
import type { FootballObjective } from '@/constants/types';

const logger = createLogger('BookCoachScreen');

export const TOTAL_STEPS = { parent: 4, athlete: 3 } as const;

export function useBookCoach() {
  const params = useLocalSearchParams();
  const coachId = params.coachId as string;
  const { currentUser } = useAuth();
  const { userId } = useBookingPersona();

  const { coach, coachProfile } = resolveCoachAndProfile(coachId);
  const userHasChildren = hasChildren(currentUser);
  const userIsAthlete = isAthlete(currentUser);

  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [step, setStep] = useState(userHasChildren ? 0 : 1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();
  const [selectedDayId, setSelectedDayId] = useState<string | undefined>();
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>();
  const [selectedObjectives, setSelectedObjectives] = useState<FootballObjective[]>([]);

  const fetchAvailability = useCallback(async () => {
    if (!coachId) return;
    setLoadingAvailability(true);
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const endDateObj = new Date(today); endDateObj.setDate(endDateObj.getDate() + 14);
      const duration = selectedServiceId ? (SERVICES.find(s => s.id === selectedServiceId)?.id === 'small-group' ? 90 : 60) : 60;
      const slots = await availabilityService.getAvailableSlots(coachId, toDateStr(today), toDateStr(endDateObj), duration);

      const dayMap = new Map<string, SlotInstance[]>();
      for (const slot of slots) {
        if (!slot.isAvailable) continue;
        const slotDate = new Date(slot.date);
        const [hours, minutes] = slot.startTime.split(':').map(Number);
        slotDate.setHours(hours, minutes, 0, 0);
        const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
        const durationMinutes = (endHours * 60 + endMinutes) - (hours * 60 + minutes);
        const serviceType = selectedServiceId || '1-on-1';
        const slotInstance: SlotInstance = {
          id: `${slot.date}-${slot.startTime}`, templateId: 'real',
          title: selectedServiceId === 'small-group' ? 'Small Group Training' : '1-on-1 Training',
          focus: 'Personalized coaching session', start: slotDate, durationMinutes,
          tag: slot.bookedCount > 0 ? `${slot.maxBookings - slot.bookedCount} left` : 'Available', serviceType,
        };
        if (!dayMap.has(slot.date)) dayMap.set(slot.date, []);
        dayMap.get(slot.date)!.push(slotInstance);
      }

      const days: DayAvailability[] = Array.from(dayMap.entries())
        .map(([dateStr, daySlots]) => ({ id: dateStr, date: new Date(dateStr), slots: daySlots }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      setAvailability(days);
      if (days.length > 0 && !selectedDayId) setSelectedDayId(days[0].id);
    } catch (error) {
      logger.error('Failed to fetch availability:', error);
      setAvailability([]);
    } finally { setLoadingAvailability(false); }
  }, [coachId, selectedServiceId, selectedDayId]);

  useEffect(() => { fetchAvailability(); }, [fetchAvailability]);

  const filteredAvailability = useMemo(() => {
    if (!selectedServiceId) return availability;
    return availability.map((day) => ({ ...day, slots: day.slots.filter((slot) => slot.serviceType === selectedServiceId) }));
  }, [availability, selectedServiceId]);

  useEffect(() => {
    const day = filteredAvailability.find((entry) => entry.id === selectedDayId);
    if (!day) return;
    if (!day.slots.length) { setSelectedSlotId(undefined); return; }
    const hasSelected = day.slots.some((slot) => slot.id === selectedSlotId);
    if (!hasSelected) setSelectedSlotId(day.slots[0]?.id);
  }, [filteredAvailability, selectedDayId, selectedSlotId]);

  const selectedService = SERVICES.find((s) => s.id === selectedServiceId);
  const selectedDay = filteredAvailability.find((entry) => entry.id === selectedDayId);
  const selectedSlot = selectedDay?.slots.find((slot) => slot.id === selectedSlotId);

  const toggleObjective = useCallback((objective: FootballObjective) => {
    setSelectedObjectives((prev) => {
      if (prev.includes(objective)) return prev.filter((o) => o !== objective);
      if (prev.length >= 3) { Alert.alert('Maximum 3 objectives', 'Please select up to 3 focus areas'); return prev; }
      return [...prev, objective];
    });
  }, []);

  const handleContinue = useCallback(() => {
    if (step === 0) { if (selectedAthleteIds.length === 0) { Alert.alert('Select athletes', 'Please select at least one athlete'); return; } setStep(1); }
    else if (step === 1) { if (!selectedServiceId) { Alert.alert('Select a service', 'Please choose a session type'); return; } setStep(2); }
    else if (step === 2) { if (!selectedSlot) { Alert.alert('Select a time', 'Please choose a time slot'); return; } setStep(3); }
    else if (step === 3) {
      if (selectedObjectives.length === 0) { Alert.alert('Select objectives', 'Please choose at least 1 focus area'); return; }
      if (!selectedSlot || !coach || !coachProfile || !currentUser || !selectedService) return;
      const athleteIds = userHasChildren && selectedAthleteIds.length > 0 ? selectedAthleteIds : userId ? [userId] : [];
      router.push(Routes.confirmBookingWith({
        coachId: coach.id, coachName: coach.name, slotId: selectedSlot.id, slotTitle: selectedSlot.title,
        slotFocus: selectedSlot.focus, slotStart: selectedSlot.start.toISOString(),
        slotDuration: selectedSlot.durationMinutes.toString(), price: selectedService.price.toString(),
        serviceType: selectedService.title, objectives: JSON.stringify(selectedObjectives), athleteIds: JSON.stringify(athleteIds),
      }));
    }
  }, [step, selectedAthleteIds, selectedServiceId, selectedSlot, selectedObjectives, coach, coachProfile, currentUser, selectedService, userHasChildren, userId]);

  const handleBack = useCallback(() => {
    const minStep = userHasChildren ? 0 : 1;
    if (step > minStep) setStep(step - 1); else router.back();
  }, [step, userHasChildren]);

  const serviceList = SERVICES.map((service) => ({
    id: service.id, title: service.title, description: service.description, price: formatServicePrice(service),
    capacity: service.capacity && service.spotsLeft !== undefined ? `${service.spotsLeft}/${service.capacity} spots left` : undefined,
    iconName: service.icon,
  }));

  const continueDisabled = (step === 0 && selectedAthleteIds.length === 0) || (step === 1 && !selectedServiceId)
    || (step === 2 && !selectedSlot) || (step === 3 && selectedObjectives.length === 0);

  const stepTitle = step === 0 && userHasChildren ? 'Select Athletes' : step === 1 ? 'Choose Service' : step === 2 ? 'Select Time' : 'Set Objectives';

  return {
    coach, coachProfile, userHasChildren, userIsAthlete, currentUser,
    loadingAvailability, filteredAvailability, step, selectedAthleteIds,
    selectedServiceId, selectedDayId, selectedSlotId, selectedObjectives, selectedService,
    serviceList, continueDisabled, stepTitle,
    setSelectedAthleteIds, setSelectedServiceId, setSelectedDayId, setSelectedSlotId,
    toggleObjective, handleContinue, handleBack,
    footballObjectives: FOOTBALL_OBJECTIVES,
  };
}
