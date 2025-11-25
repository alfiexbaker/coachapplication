import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { AvailabilityPicker } from '@/components/booking/book-coach/availability-picker';
import { BookingStepper } from '@/components/booking/book-coach/booking-stepper';
import { ChildSelectionGrid } from '@/components/booking/book-coach/child-selection-grid';
import { CoachSummaryCard } from '@/components/booking/book-coach/coach-summary-card';
import { ObjectiveSelector } from '@/components/booking/book-coach/objective-selector';
import { ServiceSelectionList } from '@/components/booking/book-coach/service-selection-list';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import {
  FOOTBALL_OBJECTIVES,
  SERVICES,
  buildAvailability,
  formatServicePrice,
  resolveCoachAndProfile,
} from '@/constants/booking-types';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBookingPersona } from '@/hooks/use-booking-persona';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getChildrenForParent } from '@/constants/mock-data';
import type { DayAvailability } from '@/constants/booking-types';
import type { FootballObjective } from '@/constants/types';
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
  const availability = useMemo(() => buildAvailability(), []);

  // TODO: replace mock availability generation with live schedule data so parents and athletes stay in sync once APIs land.
  const [children, setChildren] = useState<User[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [step, setStep] = useState(isParent ? 0 : 1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();
  const [selectedDayId, setSelectedDayId] = useState<string | undefined>(availability[0]?.id);
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>();
  const [selectedObjectives, setSelectedObjectives] = useState<FootballObjective[]>([]);

  useEffect(() => {
    if (persona === 'parent' && userId) {
      setChildren(getChildrenForParent(userId));
    }
  }, [persona, userId]);

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

  const toggleChild = (childId: string) => {
    if (selectedChildIds.includes(childId)) {
      setSelectedChildIds(selectedChildIds.filter((id) => id !== childId));
    } else {
      setSelectedChildIds([...selectedChildIds, childId]);
    }
  };

  const handleContinue = () => {
    if (step === 0) {
      if (selectedChildIds.length === 0) {
        Alert.alert('Select children', 'Please select at least one child');
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
    const minStep = isParent ? 0 : 1;
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

    const athleteIds = isParent && selectedChildIds.length > 0 ? selectedChildIds : userId ? [userId] : [];

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
    (step === 0 && selectedChildIds.length === 0) ||
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
          {step === 0 && isParent
            ? 'Select Children'
            : step === 1
              ? 'Choose Service'
              : step === 2
                ? 'Select Time'
                : 'Set Objectives'}
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <BookingStepper step={step} totalSteps={TOTAL_STEPS[isParent ? 'parent' : 'athlete']} isParent={isParent} />

      <ScrollView contentContainerStyle={styles.content}>
        <CoachSummaryCard coach={coach} coachProfile={coachProfile} />

        {step === 0 && isParent && (
          <ChildSelectionGrid childrenOptions={children} selectedChildIds={selectedChildIds} onToggle={toggleChild} />
        )}

        {step === 1 && (
          <ServiceSelectionList services={serviceList} selectedServiceId={selectedServiceId} onSelect={setSelectedServiceId} />
        )}

        {step === 2 && (
          <AvailabilityPicker
            availability={filteredAvailability}
            selectedDayId={selectedDayId}
            selectedSlotId={selectedSlotId}
            selectedService={selectedService}
            onSelectDay={setSelectedDayId as (dayId: string) => void}
            onSelectSlot={setSelectedSlotId as (slotId: string) => void}
          />
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
});
