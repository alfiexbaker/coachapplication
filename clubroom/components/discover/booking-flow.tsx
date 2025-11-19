import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { CoachProfile } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  formatFullDate,
  formatMonthDay,
  formatTime,
  formatTimeRange,
  formatWeekday,
} from '@/utils/format';

interface BookingFlowPreviewProps {
  coach?: CoachProfile;
}

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
  skill_lab: {
    id: 'skill_lab',
    title: 'Striker lab',
    focus: 'First-touch + finishing gauntlet',
    startHour: 7,
    startMinute: 30,
    durationMinutes: 75,
    tag: 'GPS capture on',
  },
  partnership_sync: {
    id: 'partnership_sync',
    title: 'Coach/parent sync',
    focus: 'Session plan walkthrough',
    startHour: 16,
    startMinute: 0,
    durationMinutes: 45,
    tag: 'Session notes drop',
  },
  intensity_block: {
    id: 'intensity_block',
    title: 'High-load conditioning',
    focus: 'Speed gates + change of pace',
    startHour: 10,
    startMinute: 15,
    durationMinutes: 60,
    tag: 'Wearable data sync',
  },
  video_room: {
    id: 'video_room',
    title: 'Match film breakdown',
    focus: 'Pattern ID + decision tree',
    startHour: 18,
    startMinute: 0,
    durationMinutes: 50,
    tag: 'Virtual room',
  },
  keeper_lab: {
    id: 'keeper_lab',
    title: 'Keeper command session',
    focus: 'Reaction wall + distribution',
    startHour: 9,
    startMinute: 15,
    durationMinutes: 65,
    tag: 'Ball machine',
  },
};

const WEEK_BLUEPRINT: (keyof typeof SLOT_LIBRARY)[][] = [
  ['skill_lab', 'intensity_block'],
  ['keeper_lab', 'video_room'],
  [],
  ['skill_lab', 'partnership_sync'],
  ['intensity_block'],
  ['skill_lab', 'keeper_lab'],
  ['partnership_sync', 'video_room'],
];

function buildAvailability(): DayAvailability[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

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

const athleteProfile = {
  name: 'Eli Torres · 14U winger',
  readiness: 'Pre-ECNL',
  needs: 'Confidence in the final third',
  cadence: 'Weekly 1:1 + async film',
};

const bookingSteps = [
  {
    id: 'context',
    title: 'Plan',
    description: 'Parents drop goals, footage, and preferred cadence.',
    status: 'complete' as const,
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'Live availability stays in sync with the coach calendar.',
    status: 'current' as const,
  },
  {
    id: 'confirm',
    title: 'Confirm',
    description: 'Secure session + payment, unlock chat + map later.',
    status: 'upcoming' as const,
  },
];

export function BookingFlowPreview({ coach }: BookingFlowPreviewProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const availability = useMemo(() => buildAvailability(), []);
  const [selectedDayId, setSelectedDayId] = useState(availability[0]?.id);
  const [selectedSlotId, setSelectedSlotId] = useState(availability[0]?.slots[0]?.id);

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
      setSelectedSlotId(day.slots[0].id);
    }
  }, [availability, selectedDayId, selectedSlotId]);

  const selectedDay = availability.find((entry) => entry.id === selectedDayId);
  const selectedSlot = selectedDay?.slots.find((slot) => slot.id === selectedSlotId);

  return (
    <View style={styles.column}>
      <SurfaceCard style={styles.flowCard}>
        <View style={styles.flowHeader}>
          <ThemedText type="eyebrow">Booking flow</ThemedText>
          <View style={[styles.liveBadge, { backgroundColor: `${palette.tint}12` }]}>
            <Ionicons name="sparkles-outline" size={16} color={palette.tint} />
            <ThemedText style={[styles.badgeLabel, { color: palette.tint }]}>Coach-led</ThemedText>
          </View>
        </View>
        <ThemedText type="title" style={styles.flowTitle}>
          A coaching-first journey
        </ThemedText>
        <ThemedText style={styles.flowSubtitle}>
          Instead of generic sports marketplaces, families move through a bespoke coaching intake—context,
          schedule, and confirmation—so every rep has purpose.
        </ThemedText>
        <View style={styles.stepper}>
          {bookingSteps.map((step, index) => (
            <View key={step.id} style={styles.stepItem}>
              <View
                style={[
                  styles.stepIcon,
                  step.status === 'complete' && { backgroundColor: palette.tint },
                  step.status === 'current' && { borderColor: palette.tint },
                  step.status === 'upcoming' && { borderColor: palette.border },
                ]}>
                {step.status === 'complete' ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <ThemedText
                    style={[
                      styles.stepCount,
                      step.status === 'current' && { color: palette.tint },
                      step.status === 'upcoming' && { color: palette.muted },
                    ]}>
                    {index + 1}
                  </ThemedText>
                )}
              </View>
              <ThemedText type="defaultSemiBold">{step.title}</ThemedText>
              <ThemedText style={styles.stepDescription}>{step.description}</ThemedText>
            </View>
          ))}
        </View>
        <View style={styles.contextRow}>
          <View style={[styles.contextCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <ThemedText type="defaultSemiBold">Selected coach</ThemedText>
            <ThemedText style={styles.contextPrimary}>{coach?.fullName ?? 'Tap a coach to preview'}</ThemedText>
            <ThemedText style={styles.contextMeta}>
              {coach ? coach.footballFocuses.slice(0, 2).join(' · ') : 'Focus areas appear here'}
            </ThemedText>
          </View>
          <View style={[styles.contextCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <ThemedText type="defaultSemiBold">Athlete lane</ThemedText>
            <ThemedText style={styles.contextPrimary}>{athleteProfile.name}</ThemedText>
            <ThemedText style={styles.contextMeta}>
              {athleteProfile.readiness} · {athleteProfile.cadence}
            </ThemedText>
          </View>
        </View>
        <View style={styles.callout}>
          <Ionicons name="document-text-outline" size={20} color={palette.secondary} />
          <View style={styles.calloutCopy}>
            <ThemedText type="defaultSemiBold">Session blueprint ready</ThemedText>
            <ThemedText style={styles.flowSubtitle}>
              Once the slot is locked, Clubroom auto-generates prep docs, checklists, and shareable recaps.
            </ThemedText>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.schedulerCard}>
        <View style={styles.schedulerHeader}>
          <View>
            <ThemedText type="subtitle">2 · Schedule a session</ThemedText>
            <ThemedText style={styles.schedulerSubtitle}>
              Pick a day that works—live calendar sync keeps cancellations low.
            </ThemedText>
          </View>
          <View style={[styles.liveBadge, { backgroundColor: `${palette.secondary}15` }]}>
            <Ionicons name="time-outline" size={16} color={palette.secondary} />
            <ThemedText style={[styles.badgeLabel, { color: palette.secondary }]}>Live sync</ThemedText>
          </View>
        </View>
        <View style={styles.calendarGrid}>
          {availability.map((day) => {
            const isSelected = day.id === selectedDayId;
            const hasSlots = day.slots.length > 0;
            return (
              <Pressable
                key={day.id}
                style={({ pressed }) => [
                  styles.calendarDay,
                  {
                    borderColor: isSelected ? palette.tint : palette.border,
                    backgroundColor: isSelected ? `${palette.tint}12` : palette.surface,
                    opacity: pressed ? 0.85 : 1,
                  },
                  !hasSlots && { borderStyle: 'dashed', opacity: 0.55 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select ${formatFullDate(day.date)}`}
                onPress={() => setSelectedDayId(day.id)}>
                <ThemedText style={styles.calendarWeekday}>{formatWeekday(day.date)}</ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.calendarDate}>
                  {formatMonthDay(day.date)}
                </ThemedText>
                <ThemedText style={styles.calendarMeta}>
                  {hasSlots ? `${day.slots.length} slots` : 'Coach travel'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.slotList}>
          {selectedDay && selectedDay.slots.length === 0 ? (
            <View style={[styles.emptySlots, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <Ionicons name="airplane-outline" size={20} color={palette.icon} />
              <ThemedText type="defaultSemiBold">Coach on the road</ThemedText>
              <ThemedText style={styles.schedulerSubtitle}>
                Pick a different day—travel days block scheduling.
              </ThemedText>
            </View>
          ) : null}
          {selectedDay?.slots.map((slot) => {
            const isSelected = slot.id === selectedSlotId;
            return (
              <Pressable
                key={slot.id}
                style={({ pressed }) => [
                  styles.slotCard,
                  {
                    borderColor: isSelected ? palette.tint : palette.border,
                    backgroundColor: isSelected ? `${palette.tint}12` : palette.surface,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                accessibilityRole="button"
                onPress={() => setSelectedSlotId(slot.id)}>
                <View style={styles.slotHeader}>
                  <ThemedText type="defaultSemiBold">{slot.title}</ThemedText>
                  <ThemedText style={styles.slotTime}>{formatTimeRange(slot.start, slot.durationMinutes)}</ThemedText>
                </View>
                <ThemedText style={styles.slotFocus}>{slot.focus}</ThemedText>
                <View style={styles.slotTag}>
                  <Ionicons name="radio-outline" size={14} color={palette.secondary} />
                  <ThemedText style={[styles.badgeLabel, { color: palette.secondary }]}>{slot.tag}</ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.summaryCard}>
        <ThemedText type="subtitle">3 · Review & confirm</ThemedText>
        <ThemedText style={styles.summaryIntro}>
          This is where payment + safety locks in. Once confirmed, messaging + maps unlock automatically.
        </ThemedText>
        <View style={styles.summaryGrid}>
          <SummaryRow label="Coach" value={coach?.fullName ?? 'Select a coach above'} />
          <SummaryRow label="Athlete" value={athleteProfile.name} />
          <SummaryRow
            label="Focus"
            value={coach ? coach.footballFocuses.slice(0, 3).join(' · ') : athleteProfile.needs}
          />
          <SummaryRow
            label="Session"
            value={
              selectedDay && selectedSlot
                ? `${formatFullDate(selectedDay.date)} · ${formatTime(selectedSlot.start)}`
                : 'Select a time to continue'
            }
          />
          <SummaryRow label="Venue" value="Austin Sports Academy · Pitch 2" />
          <SummaryRow label="Investment" value={coach ? `$${coach.priceRange.minUsd}+ / session` : '$120 / session'} />
        </View>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: selectedSlot ? palette.tint : palette.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          disabled={!selectedSlot}>
          <ThemedText style={styles.ctaLabel} lightColor="#fff" darkColor="#fff">
            {selectedSlot ? 'Continue to payment' : 'Pick a slot to continue'}
          </ThemedText>
        </Pressable>
      </SurfaceCard>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    gap: Spacing.lg,
  },
  flowCard: {
    gap: Spacing.md,
  },
  flowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flowTitle: {
    lineHeight: 32,
  },
  flowSubtitle: {
    opacity: 0.8,
  },
  stepper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  stepItem: {
    flex: 1,
    minWidth: 140,
    gap: Spacing.xs,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: {
    fontWeight: '600',
  },
  stepDescription: {
    opacity: 0.8,
  },
  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  contextCard: {
    flex: 1,
    minWidth: 180,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  contextPrimary: {
    ...Typography.lg,
    fontWeight: '600',
  },
  contextMeta: {
    opacity: 0.75,
  },
  callout: {
    flexDirection: 'row',
    gap: Spacing.md,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    alignItems: 'center',
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
  },
  calloutCopy: {
    flex: 1,
    gap: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  badgeLabel: {
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  schedulerCard: {
    gap: Spacing.lg,
  },
  schedulerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  schedulerSubtitle: {
    opacity: 0.75,
    marginTop: 2,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  calendarDay: {
    flex: 1,
    minWidth: 90,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: 2,
  },
  calendarWeekday: {
    fontWeight: '600',
    opacity: 0.75,
  },
  calendarDate: {
    fontSize: 18,
  },
  calendarMeta: {
    opacity: 0.7,
  },
  slotList: {
    gap: Spacing.sm,
  },
  slotCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotTime: {
    opacity: 0.7,
  },
  slotFocus: {
    opacity: 0.85,
  },
  slotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptySlots: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  summaryCard: {
    gap: Spacing.md,
  },
  summaryIntro: {
    opacity: 0.75,
  },
  summaryGrid: {
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    opacity: 0.7,
  },
  cta: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  ctaLabel: {
    fontWeight: '600',
  },
});
