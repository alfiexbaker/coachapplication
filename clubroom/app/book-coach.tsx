import { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getUserById, getCoachProfile, formatGBP } from '@/constants/mock-data';
import { FootballObjective } from '@/constants/types';

const FOOTBALL_OBJECTIVES: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Defending',
  'Finishing',
  'Goalkeeping',
  'Conditioning',
];

interface ServiceType {
  id: string;
  title: string;
  description: string;
  price: number;
  capacity?: number; // For group sessions
  spotsLeft?: number; // For group sessions
  icon: keyof typeof Ionicons.glyphMap;
}

interface SlotTemplate {
  id: string;
  title: string;
  focus: string;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  tag: string;
  serviceType: string; // Links to ServiceType id
}

interface SlotInstance {
  id: string;
  templateId: string;
  title: string;
  focus: string;
  start: Date;
  durationMinutes: number;
  tag: string;
  serviceType: string;
}

interface DayAvailability {
  id: string;
  date: Date;
  slots: SlotInstance[];
}

const SERVICES: ServiceType[] = [
  {
    id: '1-on-1',
    title: '1-on-1 Training',
    description: 'Personalized coaching session',
    price: 50,
    icon: 'person',
  },
  {
    id: 'small-group',
    title: 'Small Group',
    description: 'Train with others (max 8)',
    price: 30,
    capacity: 8,
    spotsLeft: 5, // Mock data
    icon: 'people',
  },
  {
    id: 'team',
    title: 'Team Session',
    description: 'Full pitch team training',
    price: 150,
    icon: 'football',
  },
];

const SLOT_LIBRARY: Record<string, SlotTemplate> = {
  morning_1on1: {
    id: 'morning_1on1',
    title: '1-on-1 Training',
    focus: 'Personalized skill development',
    startHour: 9,
    startMinute: 0,
    durationMinutes: 60,
    tag: 'Popular',
    serviceType: '1-on-1',
  },
  morning_group: {
    id: 'morning_group',
    title: 'Small Group Training',
    focus: 'Ball control & passing',
    startHour: 10,
    startMinute: 30,
    durationMinutes: 90,
    tag: '5/8 spots',
    serviceType: 'small-group',
  },
  afternoon_1on1: {
    id: 'afternoon_1on1',
    title: '1-on-1 Training',
    focus: 'Technical skills',
    startHour: 14,
    startMinute: 0,
    durationMinutes: 90,
    tag: 'Extended',
    serviceType: '1-on-1',
  },
  evening_1on1: {
    id: 'evening_1on1',
    title: '1-on-1 Training',
    focus: 'Match preparation',
    startHour: 18,
    startMinute: 0,
    durationMinutes: 60,
    tag: 'Match Prep',
    serviceType: '1-on-1',
  },
  evening_group: {
    id: 'evening_group',
    title: 'Group Session',
    focus: 'Passing & positioning drills',
    startHour: 19,
    startMinute: 0,
    durationMinutes: 60,
    tag: '3/8 spots',
    serviceType: 'small-group',
  },
};

const WEEK_BLUEPRINT: (keyof typeof SLOT_LIBRARY)[][] = [
  ['morning_1on1', 'afternoon_1on1'],
  ['morning_1on1', 'morning_group', 'evening_1on1'],
  ['afternoon_1on1'],
  ['morning_1on1', 'afternoon_1on1', 'evening_group'],
  ['morning_1on1', 'evening_1on1'],
  ['afternoon_1on1', 'evening_group'],
  ['morning_group'],
];

function buildAvailability(): DayAvailability[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return WEEK_BLUEPRINT.map((templates, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const iso = date.toISOString();

    const slots = templates.map((templateId, slotIndex) => {
      const template = SLOT_LIBRARY[templateId];
      const start = new Date(date);
      start.setHours(template.startHour, template.startMinute, 0, 0);

      return {
        id: `${iso}-${slotIndex}`,
        templateId,
        title: template.title,
        focus: template.focus,
        start,
        durationMinutes: template.durationMinutes,
        tag: template.tag,
        serviceType: template.serviceType,
      } satisfies SlotInstance;
    });

    return { id: iso, date, slots } satisfies DayAvailability;
  });
}

export default function BookCoachScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const params = useLocalSearchParams();
  const coachId = params.coachId as string;

  const coach = getUserById(coachId);
  const coachProfile = coach ? getCoachProfile(coach.id) : null;
  const availability = useMemo(() => buildAvailability(), []);

  // Wizard steps: 1 = Service, 2 = Date/Time, 3 = Objectives
  const [step, setStep] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();
  const [selectedDayId, setSelectedDayId] = useState(availability[0]?.id);
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>();
  const [selectedObjectives, setSelectedObjectives] = useState<FootballObjective[]>([]);

  // Filter slots by selected service type
  const filteredAvailability = useMemo(() => {
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
    if (step === 1) {
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
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot || !coach || !coachProfile || !currentUser || !selectedService) {
      return;
    }

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={handleBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="subtitle">
          {step === 1 ? 'Choose Service' : step === 2 ? 'Select Time' : 'Set Objectives'}
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {[1, 2, 3].map((num) => (
            <View
              key={num}
              style={[
                styles.progressDot,
                {
                  backgroundColor: num <= step ? palette.tint : palette.border,
                },
              ]}
            />
          ))}
        </View>
        <ThemedText style={[styles.progressText, { color: palette.muted }]}>
          Step {step} of 3
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Coach Info */}
        <SurfaceCard style={styles.coachCard}>
          <View style={styles.coachHeader}>
            <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
              <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                {coach.avatar || coach.name.charAt(0)}
              </ThemedText>
            </View>
            <View style={styles.coachInfo}>
              <ThemedText type="defaultSemiBold" style={styles.coachName}>
                {coach.name}
              </ThemedText>
              <View style={styles.coachMeta}>
                <Ionicons name="star" size={14} color="#fbbf24" />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {coachProfile.rating.toFixed(1)} ({coachProfile.totalReviews} reviews)
                </ThemedText>
              </View>
            </View>
          </View>
        </SurfaceCard>

        {/* STEP 1: Service Type Selection */}
        {step === 1 && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Select Session Type
            </ThemedText>
            <View style={styles.serviceList}>
              {SERVICES.map((service) => {
                const isSelected = service.id === selectedServiceId;
                return (
                  <Clickable
                    key={service.id}
                    onPress={() => setSelectedServiceId(service.id)}
                    style={({ pressed }) => [
                      styles.serviceCard,
                      {
                        backgroundColor: isSelected ? palette.tint + '15' : palette.surface,
                        borderColor: isSelected ? palette.tint : palette.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View style={styles.serviceContent}>
                      <View style={[styles.serviceIcon, { backgroundColor: palette.tint + '20' }]}>
                        <Ionicons name={service.icon} size={28} color={palette.tint} />
                      </View>
                      <View style={styles.serviceInfo}>
                        <ThemedText type="defaultSemiBold" style={styles.serviceTitle}>
                          {service.title}
                        </ThemedText>
                        <ThemedText style={[styles.serviceDescription, { color: palette.muted }]}>
                          {service.description}
                        </ThemedText>
                        {service.capacity && service.spotsLeft !== undefined && (
                          <View style={styles.capacityRow}>
                            <Ionicons name="people-outline" size={14} color={palette.muted} />
                            <ThemedText style={[styles.capacityText, { color: palette.muted }]}>
                              {service.spotsLeft}/{service.capacity} spots left
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText type="defaultSemiBold" style={[styles.servicePrice, { color: palette.tint }]}>
                        {formatGBP(service.price)}
                        {service.id !== 'team' && <ThemedText style={styles.priceUnit}>/hr</ThemedText>}
                      </ThemedText>
                    </View>
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color={palette.tint} />
                      </View>
                    )}
                  </Clickable>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 2: Date & Time Selection */}
        {step === 2 && (
          <>
            {/* Date Selection */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Select Date
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
                {filteredAvailability.map((day) => {
                  const isSelected = day.id === selectedDayId;
                  const dateObj = new Date(day.date);
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = dateObj.getDate();
                  const month = dateObj.toLocaleDateString('en-US', { month: 'short' });

                  return (
                    <Clickable
                      key={day.id}
                      onPress={() => setSelectedDayId(day.id)}
                      style={({ pressed }) => [
                        styles.dateCard,
                        {
                          backgroundColor: isSelected ? palette.tint : palette.surface,
                          borderColor: isSelected ? palette.tint : palette.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.dayName,
                          { color: isSelected ? '#fff' : palette.text },
                        ]}
                      >
                        {dayName}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.dayNum,
                          { color: isSelected ? '#fff' : palette.text },
                        ]}
                      >
                        {dayNum}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.monthText,
                          { color: isSelected ? '#fff' : palette.muted },
                        ]}
                      >
                        {month}
                      </ThemedText>
                    </Clickable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Time Slot Selection */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Available Times
              </ThemedText>
              {selectedDay?.slots.length === 0 ? (
                <View style={styles.noSlotsContainer}>
                  <ThemedText style={{ color: palette.muted }}>
                    No {selectedService?.title} slots available for this date
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.slotList}>
                  {selectedDay?.slots.map((slot) => {
                    const isSelected = slot.id === selectedSlotId;
                    const timeString = slot.start.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    });

                    return (
                      <Clickable
                        key={slot.id}
                        onPress={() => setSelectedSlotId(slot.id)}
                        style={({ pressed }) => [
                          styles.slotCard,
                          {
                            backgroundColor: isSelected ? palette.tint + '15' : palette.surface,
                            borderColor: isSelected ? palette.tint : palette.border,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <View style={styles.slotContent}>
                          <View style={styles.slotLeft}>
                            <ThemedText type="defaultSemiBold" style={styles.slotTitle}>
                              {slot.title}
                            </ThemedText>
                            <ThemedText style={[styles.slotFocus, { color: palette.muted }]}>
                              {slot.focus}
                            </ThemedText>
                            <View style={styles.slotMeta}>
                              <Ionicons name="time-outline" size={14} color={palette.muted} />
                              <ThemedText style={[styles.slotTime, { color: palette.muted }]}>
                                {timeString} · {slot.durationMinutes} min
                              </ThemedText>
                            </View>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={24} color={palette.tint} />
                          )}
                        </View>
                      </Clickable>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}

        {/* STEP 3: Objectives Selection */}
        {step === 3 && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              What do you want to work on?
            </ThemedText>
            <ThemedText style={[styles.helperText, { color: palette.muted }]}>
              Select up to 3 focus areas
            </ThemedText>
            <View style={styles.objectivesGrid}>
              {FOOTBALL_OBJECTIVES.map((objective) => {
                const isSelected = selectedObjectives.includes(objective);
                return (
                  <Pressable
                    key={objective}
                    onPress={() => toggleObjective(objective)}
                    style={[
                      styles.objectiveChip,
                      {
                        backgroundColor: isSelected ? palette.tint : palette.surface,
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'radio-button-off-outline'}
                      size={20}
                      color={isSelected ? '#fff' : palette.muted}
                    />
                    <ThemedText
                      style={[
                        styles.objectiveText,
                        { color: isSelected ? '#fff' : palette.text },
                      ]}
                    >
                      {objective}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Clickable
          onPress={handleContinue}
          disabled={
            (step === 1 && !selectedServiceId) ||
            (step === 2 && !selectedSlot) ||
            (step === 3 && selectedObjectives.length === 0)
          }
          style={({ pressed }) => [
            styles.continueButton,
            {
              backgroundColor:
                (step === 1 && selectedServiceId) ||
                (step === 2 && selectedSlot) ||
                (step === 3 && selectedObjectives.length > 0)
                  ? palette.tint
                  : palette.border,
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
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  progressBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
  },
  coachInfo: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  coachName: {
    fontSize: 17,
  },
  coachMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  metaText: {
    fontSize: 13,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  helperText: {
    fontSize: 13,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  serviceList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  serviceCard: {
    padding: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 2,
  },
  serviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  serviceTitle: {
    fontSize: 16,
  },
  serviceDescription: {
    fontSize: 14,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    marginTop: Spacing.xs / 2,
  },
  capacityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  servicePrice: {
    fontSize: 20,
  },
  priceUnit: {
    fontSize: 14,
  },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  dateList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  dateCard: {
    width: 80,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dayNum: {
    fontSize: 24,
    fontWeight: '700',
  },
  monthText: {
    fontSize: 12,
  },
  noSlotsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  slotList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  slotCard: {
    padding: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 2,
  },
  slotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  slotTitle: {
    fontSize: 16,
  },
  slotFocus: {
    fontSize: 14,
  },
  slotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  slotTime: {
    fontSize: 13,
  },
  objectivesGrid: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  objectiveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 2,
  },
  objectiveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  continueButton: {
    paddingVertical: Spacing.md + 4,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
