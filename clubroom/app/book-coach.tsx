import { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getUserById, formatGBP } from '@/constants/mock-data';

interface SlotTemplate {
  id: string;
  title: string;
  focus: string;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  tag: string;
}

interface SlotInstance {
  id: string;
  templateId: string;
  title: string;
  focus: string;
  start: Date;
  durationMinutes: number;
  tag: string;
}

interface DayAvailability {
  id: string;
  date: Date;
  slots: SlotInstance[];
}

const SLOT_LIBRARY: Record<string, SlotTemplate> = {
  morning_session: {
    id: 'morning_session',
    title: '1-on-1 Training',
    focus: 'Personalized skill development',
    startHour: 9,
    startMinute: 0,
    durationMinutes: 60,
    tag: 'Popular',
  },
  afternoon_session: {
    id: 'afternoon_session',
    title: 'Technical Training',
    focus: 'Ball control & passing',
    startHour: 14,
    startMinute: 0,
    durationMinutes: 90,
    tag: 'Extended',
  },
  evening_session: {
    id: 'evening_session',
    title: 'Match Prep',
    focus: 'Game strategy & tactics',
    startHour: 18,
    startMinute: 0,
    durationMinutes: 60,
    tag: 'Match Day',
  },
};

const WEEK_BLUEPRINT: (keyof typeof SLOT_LIBRARY)[][] = [
  ['morning_session', 'afternoon_session'],
  ['morning_session', 'evening_session'],
  ['afternoon_session'],
  ['morning_session', 'afternoon_session', 'evening_session'],
  ['morning_session', 'evening_session'],
  ['afternoon_session', 'evening_session'],
  ['morning_session'],
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
  const availability = useMemo(() => buildAvailability(), []);
  const [selectedDayId, setSelectedDayId] = useState(availability[0]?.id);
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(
    availability[0]?.slots[0]?.id
  );

  useEffect(() => {
    const day = availability.find((entry) => entry.id === selectedDayId);
    if (!day) {
      return;
    }

    if (!day.slots.length) {
      setSelectedSlotId(undefined);
      return;
    }

    const hasSelected = day.slots.some((slot) => slot.id === selectedSlotId);
    if (!hasSelected) {
      setSelectedSlotId(day.slots[0]?.id);
    }
  }, [availability, selectedDayId, selectedSlotId]);

  const selectedDay = availability.find((entry) => entry.id === selectedDayId);
  const selectedSlot = selectedDay?.slots.find((slot) => slot.id === selectedSlotId);

  const handleBooking = async () => {
    if (!selectedSlot || !coach || !currentUser) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }

    // Navigate to payment confirmation
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
        price: coach.profile.sessionRate.toString(),
      },
    });
  };

  if (!coach) {
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
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="subtitle">Book Session</ThemedText>
          <View style={{ width: 24 }} />
        </View>

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
                  {coach.profile.rating.toFixed(1)} ({coach.profile.totalReviews} reviews)
                </ThemedText>
              </View>
            </View>
            <ThemedText type="defaultSemiBold" style={[styles.price, { color: palette.tint }]}>
              {formatGBP(coach.profile.sessionRate)}
            </ThemedText>
          </View>
        </SurfaceCard>

        {/* Date Selection */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Select Date
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
            {availability.map((day) => {
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
              <ThemedText style={{ color: palette.muted }}>No available slots for this date</ThemedText>
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
      </ScrollView>

      {/* Book Button */}
      <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Clickable
          onPress={handleBooking}
          disabled={!selectedSlot}
          style={({ pressed }) => [
            styles.bookButton,
            {
              backgroundColor: selectedSlot ? palette.tint : palette.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <ThemedText style={styles.bookButtonText}>
            Continue to Payment
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
  price: {
    fontSize: 18,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
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
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  bookButton: {
    paddingVertical: Spacing.md + 4,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
