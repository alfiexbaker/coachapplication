import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
  { id: 'coach', title: 'Coach' },
  { id: 'day', title: 'Day' },
  { id: 'slot', title: 'Slot' },
  { id: 'confirm', title: 'Confirm' },
];

export function BookingFlowPreview({ coach }: BookingFlowPreviewProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const availability = useMemo(() => buildAvailability(), []);
  const [selectedDayId, setSelectedDayId] = useState(availability[0]?.id);
  const [selectedSlotId, setSelectedSlotId] = useState(availability[0]?.slots[0]?.id);
  const [stage, setStage] = useState<(typeof bookingSteps)[number]['id']>('coach');

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

  const handleAdvance = () => {
    const currentIndex = bookingSteps.findIndex((step) => step.id === stage);
    if (currentIndex === -1) return;

    const next = bookingSteps[currentIndex + 1];
    if (next) {
      setStage(next.id);
    }
  };

  const canContinue = () => {
    if (stage === 'coach') return Boolean(coach);
    if (stage === 'day') return Boolean(selectedDay);
    if (stage === 'slot') return Boolean(selectedSlot);
    return false;
  };

  const ctaLabel = stage === 'confirm' ? 'Confirm booking' : 'Continue';

  return (
    <View style={styles.column}>
      <SurfaceCard style={styles.flowCard}>
        <View style={styles.flowHeader}>
          <ThemedText type="eyebrow">Booking</ThemedText>
          <View style={[styles.liveBadge, { borderColor: palette.border }]}>
            <ThemedText style={[styles.badgeLabel, { color: palette.muted }]}>4 steps</ThemedText>
          </View>
        </View>

        <View style={styles.stepper}>
          {bookingSteps.map((step) => {
            const isActive = step.id === stage;
            return (
              <Pressable
                key={step.id}
                style={({ pressed }) => [
                  styles.stepItem,
                  {
                    borderColor: isActive ? palette.tint : palette.border,
                    backgroundColor: isActive ? `${palette.tint}10` : palette.surface,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                accessibilityRole="button"
                onPress={() => setStage(step.id)}>
                <ThemedText type="defaultSemiBold">{step.title}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        {stage === 'coach' ? (
          <View style={styles.contextGroup}>
            <ThemedText type="title" style={styles.flowTitle}>
              Tap a coach to preview
            </ThemedText>
            <View style={styles.contextRow}>
              <View style={[styles.contextCard, { borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold">Coach</ThemedText>
                <ThemedText style={styles.contextPrimary}>{coach?.fullName ?? 'Not selected'}</ThemedText>
                <ThemedText style={styles.contextMeta}>
                  {coach ? coach.footballFocuses.slice(0, 2).join(' · ') : 'Pick from the list on the left'}
                </ThemedText>
              </View>
              <View style={[styles.contextCard, { borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold">Athlete</ThemedText>
                <ThemedText style={styles.contextPrimary}>{athleteProfile.name}</ThemedText>
                <ThemedText style={styles.contextMeta}>{athleteProfile.readiness}</ThemedText>
              </View>
            </View>
          </View>
        ) : null}

        {stage === 'day' ? (
          <View style={styles.schedulerSection}>
            <ThemedText type="title" style={styles.flowTitle}>
              Choose a day
            </ThemedText>
            <ThemedText style={styles.flowSubtitle}>Live calendar sync; travel days dimmed.</ThemedText>
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
                      {hasSlots ? `${day.slots.length} slots` : 'Travel'}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {stage === 'slot' ? (
          <View style={styles.schedulerSection}>
            <ThemedText type="title" style={styles.flowTitle}>
              Pick a slot
            </ThemedText>
            <ThemedText style={styles.flowSubtitle}>
              Times update automatically; tags stay monochrome.
            </ThemedText>
            <View style={styles.slotList}>
              {selectedDay && selectedDay.slots.length === 0 ? (
                <View style={[styles.emptySlots, { borderColor: palette.border }]}>
                  <ThemedText type="defaultSemiBold">Coach unavailable</ThemedText>
                  <ThemedText style={styles.schedulerSubtitle}>Select a different day.</ThemedText>
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
                        backgroundColor: isSelected ? `${palette.tint}10` : palette.surface,
                        opacity: pressed ? 0.92 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    onPress={() => setSelectedSlotId(slot.id)}>
                    <View style={styles.slotHeader}>
                      <ThemedText type="defaultSemiBold">{slot.title}</ThemedText>
                      <ThemedText style={styles.slotTime}>{formatTimeRange(slot.start, slot.durationMinutes)}</ThemedText>
                    </View>
                    <ThemedText style={styles.slotFocus}>{slot.focus}</ThemedText>
                    <View style={[styles.slotTag, { borderColor: palette.border }]}>
                      <ThemedText style={[styles.badgeLabel, { color: palette.muted }]}>{slot.tag}</ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {stage === 'confirm' ? (
          <View style={styles.summaryCard}>
            <ThemedText type="title" style={styles.flowTitle}>
              Review
            </ThemedText>
            <ThemedText style={styles.summaryIntro}>Minimal summary before payment.</ThemedText>
            <View style={styles.summaryGrid}>
              <SummaryRow label="Coach" value={coach?.fullName ?? 'Pick a coach'} />
              <SummaryRow label="Athlete" value={athleteProfile.name} />
              <SummaryRow
                label="Focus"
                value={coach ? coach.footballFocuses.slice(0, 2).join(' · ') : athleteProfile.needs}
              />
              <SummaryRow
                label="Session"
                value={
                  selectedDay && selectedSlot
                    ? `${formatFullDate(selectedDay.date)} · ${formatTime(selectedSlot.start)}`
                    : 'Choose a day and slot'
                }
              />
              <SummaryRow label="Venue" value="Austin Sports Academy" />
              <SummaryRow
                label="Investment"
                value={coach ? `$${coach.priceRange.minUsd}+ / session` : '$120 / session'}
              />
            </View>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: stage === 'confirm' ? palette.tint : palette.surface,
              borderColor: palette.tint,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          disabled={!canContinue() && stage !== 'confirm'}
          onPress={stage === 'confirm' ? undefined : handleAdvance}>
          <ThemedText
            style={[styles.ctaLabel, { color: stage === 'confirm' ? '#fff' : palette.tint }]}
            lightColor={stage === 'confirm' ? '#fff' : undefined}
            darkColor={stage === 'confirm' ? '#fff' : undefined}>
            {ctaLabel}
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
    gap: Spacing.md,
  },
  flowCard: {
    gap: Spacing.md,
    padding: Spacing.md,
  },
  flowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flowTitle: {
    lineHeight: 28,
  },
  flowSubtitle: {
    opacity: 0.8,
  },
  stepper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stepItem: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
  },
  badgeLabel: {
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  contextGroup: {
    gap: Spacing.sm,
  },
  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  contextCard: {
    flex: 1,
    minWidth: 170,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  contextPrimary: {
    ...Typography.lg,
    fontWeight: '600',
  },
  contextMeta: {
    opacity: 0.75,
  },
  schedulerSection: {
    gap: Spacing.sm,
  },
  schedulerSubtitle: {
    opacity: 0.7,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  calendarDay: {
    flex: 1,
    minWidth: 90,
    borderWidth: 1,
    borderRadius: Radii.sm,
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
    gap: Spacing.xs,
  },
  slotCard: {
    borderWidth: 1,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
    gap: 6,
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
    marginTop: 4,
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  emptySlots: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  summaryCard: {
    gap: Spacing.sm,
  },
  summaryIntro: {
    opacity: 0.75,
  },
  summaryGrid: {
    gap: Spacing.xs,
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
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  ctaLabel: {
    fontWeight: '600',
  },
});
