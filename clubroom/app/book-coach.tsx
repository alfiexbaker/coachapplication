import { useEffect, useMemo, useState, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { AthletePicker } from '@/components/booking/AthletePicker';
import { AvailabilityPicker } from '@/components/booking/book-coach/availability-picker';
import { BookingStepper } from '@/components/booking/book-coach/booking-stepper';
import { CoachSummaryCard } from '@/components/booking/book-coach/coach-summary-card';
import { ObjectiveSelector } from '@/components/booking/book-coach/objective-selector';
import { ServiceSelectionList } from '@/components/booking/book-coach/service-selection-list';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import {
  FOOTBALL_OBJECTIVES,
  SERVICES,
  formatServicePrice,
  resolveCoachAndProfile,
} from '@/constants/booking-types';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBookingPersona } from '@/hooks/use-booking-persona';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hasChildren, isAthlete } from '@/utils/user-helpers';
import { availabilityService } from '@/services/availability-service';
import type { DayAvailability, SlotInstance } from '@/constants/booking-types';
import type { FootballObjective, AvailabilitySlot } from '@/constants/types';
import type { User } from '@/constants/app-types';

const TOTAL_STEPS = { parent: 4, athlete: 3 } as const;

export default function BookCoachScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const params = useLocalSearchParams();
  const coachId = params.coachId as string;
  const { currentUser } = useAuth();
  const { persona, isParent, userId } = useBookingPersona();

  const { coach, coachProfile } = resolveCoachAndProfile(coachId);

  // Check if user has children to determine flow
  const userHasChildren = hasChildren(currentUser);
  const userIsAthlete = isAthlete(currentUser);

  // Real availability from coach's schedule
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [step, setStep] = useState(userHasChildren ? 0 : 1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();
  const [selectedDayId, setSelectedDayId] = useState<string | undefined>();
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>();
  const [selectedObjectives, setSelectedObjectives] = useState<FootballObjective[]>([]);

  // Fetch real availability from coach's schedule
  const fetchAvailability = useCallback(async () => {
    if (!coachId) return;

    setLoadingAvailability(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = today.toISOString().split('T')[0];

      // Get 14 days of availability
      const endDateObj = new Date(today);
      endDateObj.setDate(endDateObj.getDate() + 14);
      const endDate = endDateObj.toISOString().split('T')[0];

      // Get duration from selected service or default to 60 min
      const duration = selectedServiceId
        ? SERVICES.find(s => s.id === selectedServiceId)?.id === 'small-group' ? 90 : 60
        : 60;

      const slots = await availabilityService.getAvailableSlots(coachId, startDate, endDate, duration);

      // Convert AvailabilitySlot[] to DayAvailability[]
      const dayMap = new Map<string, SlotInstance[]>();

      for (const slot of slots) {
        if (!slot.isAvailable) continue; // Only show available slots

        const slotDate = new Date(slot.date);
        const [hours, minutes] = slot.startTime.split(':').map(Number);
        slotDate.setHours(hours, minutes, 0, 0);

        // Calculate duration from start and end time
        const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
        const durationMinutes = (endHours * 60 + endMinutes) - (hours * 60 + minutes);

        // Determine service type based on location or use default
        const serviceType = selectedServiceId || '1-on-1';

        const slotInstance: SlotInstance = {
          id: `${slot.date}-${slot.startTime}`,
          templateId: 'real',
          title: selectedServiceId === 'small-group' ? 'Small Group Training' : '1-on-1 Training',
          focus: 'Personalized coaching session',
          start: slotDate,
          durationMinutes,
          tag: slot.bookedCount > 0 ? `${slot.maxBookings - slot.bookedCount} left` : 'Available',
          serviceType,
        };

        const dayKey = slot.date;
        if (!dayMap.has(dayKey)) {
          dayMap.set(dayKey, []);
        }
        dayMap.get(dayKey)!.push(slotInstance);
      }

      // Convert map to array
      const availabilityDays: DayAvailability[] = Array.from(dayMap.entries())
        .map(([dateStr, daySlots]) => ({
          id: dateStr,
          date: new Date(dateStr),
          slots: daySlots,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      setAvailability(availabilityDays);

      // Set default selected day
      if (availabilityDays.length > 0 && !selectedDayId) {
        setSelectedDayId(availabilityDays[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      setAvailability([]);
    } finally {
      setLoadingAvailability(false);
    }
  }, [coachId, selectedServiceId]);

  // Fetch availability on mount and when service changes
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const filteredAvailability: DayAvailability[] = useMemo(() => {
    if (!selectedServiceId) return availability;
    return availability.map((day) => ({
      ...day,
      slots: day.slots.filter((slot) => slot.serviceType === selectedServiceId),
    }));
  }, [availability, selectedServiceId]);

  useEffect(() => {
    const day = filteredAvailability.find((entry) => entry.id === selectedDayId);
    if (!day) return;

    if (!day.slots.length) {
      setSelectedSlotId(undefined);
      return;
    }

    const hasSelected = day.slots.some((slot) => slot.id === selectedSlotId);
    if (!hasSelected) {
      setSelectedSlotId(day.slots[0]?.id);
    }
  }, [filteredAvailability, selectedDayId, selectedSlotId]);

  const selectedService = SERVICES.find((s) => s.id === selectedServiceId);
  const selectedDay = filteredAvailability.find((entry) => entry.id === selectedDayId);
  const selectedSlot = selectedDay?.slots.find((slot) => slot.id === selectedSlotId);

  const toggleObjective = (objective: FootballObjective) => {
    if (selectedObjectives.includes(objective)) {
      setSelectedObjectives(selectedObjectives.filter((o) => o !== objective));
    } else {
      if (selectedObjectives.length >= 3) {
        Alert.alert('Maximum 3 objectives', 'Please select up to 3 focus areas');
        return;
      }
      setSelectedObjectives([...selectedObjectives, objective]);
    }
  };

  const handleContinue = () => {
    if (step === 0) {
      if (selectedAthleteIds.length === 0) {
        Alert.alert('Select athletes', 'Please select at least one athlete');
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (!selectedServiceId) {
        Alert.alert('Select a service', 'Please choose a session type');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedSlot) {
        Alert.alert('Select a time', 'Please choose a time slot');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (selectedObjectives.length === 0) {
        Alert.alert('Select objectives', 'Please choose at least 1 focus area');
        return;
      }
      handleBooking();
    }
  };

  const handleBack = () => {
    const minStep = userHasChildren ? 0 : 1;
    if (step > minStep) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot || !coach || !coachProfile || !currentUser || !selectedService) {
      return;
    }

    // Use selected athletes if user has children, otherwise auto-select themselves
    const athleteIds = userHasChildren && selectedAthleteIds.length > 0
      ? selectedAthleteIds
      : userId ? [userId] : [];

    router.push({
      pathname: '/confirm-booking',
      params: {
        coachId: coach.id,
        coachName: coach.name,
        slotId: selectedSlot.id,
        slotTitle: selectedSlot.title,
        slotFocus: selectedSlot.focus,
        slotStart: selectedSlot.start.toISOString(),
        slotDuration: selectedSlot.durationMinutes.toString(),
        price: selectedService.price.toString(),
        serviceType: selectedService.title,
        objectives: JSON.stringify(selectedObjectives),
        athleteIds: JSON.stringify(athleteIds),
      },
    });
  };

  if (!coach || !coachProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
        </View>
        <View style={styles.errorContainer}>
          <ThemedText>Coach not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const serviceList = SERVICES.map((service) => ({
    id: service.id,
    title: service.title,
    description: service.description,
    price: formatServicePrice(service),
    capacity: service.capacity && service.spotsLeft !== undefined ? `${service.spotsLeft}/${service.capacity} spots left` : undefined,
    iconName: service.icon,
  }));

  const continueDisabled =
    (step === 0 && selectedAthleteIds.length === 0) ||
    (step === 1 && !selectedServiceId) ||
    (step === 2 && !selectedSlot) ||
    (step === 3 && selectedObjectives.length === 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={handleBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="subtitle">
          {step === 0 && userHasChildren
            ? 'Select Athletes'
            : step === 1
              ? 'Choose Service'
              : step === 2
                ? 'Select Time'
                : 'Set Objectives'}
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <BookingStepper step={step} totalSteps={TOTAL_STEPS[userHasChildren ? 'parent' : 'athlete']} isParent={userHasChildren} />

      <ScrollView contentContainerStyle={styles.content}>
        <CoachSummaryCard coach={coach} coachProfile={coachProfile} />

        {step === 0 && userHasChildren && (
          <View style={{ paddingHorizontal: Spacing.lg }}>
            <AthletePicker
              athletes={(currentUser?.children ?? []).map((child) => ({
                id: child.childId,
                name: child.childName,
              }))}
              selectedIds={selectedAthleteIds}
              onSelectionChange={setSelectedAthleteIds}
              includeSelf={userIsAthlete}
              selfId={currentUser?.id}
              selfName="Myself"
            />
          </View>
        )}

        {step === 1 && (
          <ServiceSelectionList services={serviceList} selectedServiceId={selectedServiceId} onSelect={setSelectedServiceId} />
        )}

        {step === 2 && (
          loadingAvailability ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={palette.tint} />
              <ThemedText style={{ color: palette.muted, marginTop: Spacing.md }}>
                Loading available times...
              </ThemedText>
            </View>
          ) : filteredAvailability.length === 0 ? (
            <View style={styles.emptyAvailability}>
              <Ionicons name="calendar-outline" size={48} color={palette.muted} />
              <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.md }}>
                No available slots
              </ThemedText>
              <ThemedText style={{ color: palette.muted, textAlign: 'center', marginTop: Spacing.xs }}>
                This coach has no available times in the next 2 weeks.
                Try a different service type or check back later.
              </ThemedText>
            </View>
          ) : (
            <AvailabilityPicker
              availability={filteredAvailability}
              selectedDayId={selectedDayId}
              selectedSlotId={selectedSlotId}
              selectedService={selectedService}
              onSelectDay={setSelectedDayId as (dayId: string) => void}
              onSelectSlot={setSelectedSlotId as (slotId: string) => void}
            />
          )
        )}

        {step === 3 && (
          <ObjectiveSelector
            objectives={FOOTBALL_OBJECTIVES}
            selectedObjectives={selectedObjectives}
            onToggle={toggleObjective}
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Clickable
          onPress={handleContinue}
          disabled={continueDisabled}
          style={({ pressed }) => [
            styles.continueButton,
            {
              backgroundColor: continueDisabled ? palette.border : palette.tint,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <ThemedText style={styles.continueButtonText}>
            {step === 3 ? 'Review Booking' : 'Continue'}
          </ThemedText>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: Spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  continueButton: {
    paddingVertical: Spacing.md,
    borderRadius: Spacing.md,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyAvailability: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
});
