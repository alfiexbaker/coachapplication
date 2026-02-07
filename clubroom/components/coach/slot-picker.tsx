/**
 * Slot Picker
 *
 * Week-based grid that shows a coach's real availability slots.
 * Slots are colour-coded: open (tappable), booked, held, blocked.
 * Coach taps open slots to select them for an invite (max 3).
 */

import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { availabilityService } from '@/services/availability-service';
import { toDateStr } from '@/utils/format';
import type { AvailabilitySlot, TimeSlot } from '@/constants/types';

const MAX_SELECTIONS = 3;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface SlotPickerProps {
  coachId: string;
  sessionTemplateId?: string;
  /** Pre-selected slots (e.g. entering from schedule tap) */
  preSelectedSlots?: TimeSlot[];
  /** Called when selection changes */
  onSelectionChange: (slots: AvailabilitySlot[]) => void;
  /** Default location to show */
  defaultLocation?: string;
}

function getWeekRange(offset: number): { start: string; end: string; label: string } {
  const now = new Date();
  // Start from Monday of current week
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startStr = toDateStr(monday);
  const endStr = toDateStr(sunday);

  const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', day: 'numeric' });
  const label = `${monthFmt.format(monday)} – ${monthFmt.format(sunday)}`;

  return { start: startStr, end: endStr, label };
}

function formatSlotTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${m.toString().padStart(2, '0')}${suffix}`;
}

function formatDayHeader(dateStr: string): { day: string; date: string; isPast: boolean } {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    day: DAY_LABELS[d.getDay()],
    date: String(d.getDate()),
    isPast: d < today,
  };
}

export function SlotPicker({
  coachId,
  sessionTemplateId,
  preSelectedSlots,
  onSelectionChange,
}: SlotPickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allSlots, setAllSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const week = getWeekRange(weekOffset);

  const slotKey = (slot: { date: string; startTime: string }) =>
    `${slot.date}_${slot.startTime}`;

  // Load slots for current week
  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      // Get invitable slots (available + not held)
      const invitable = await availabilityService.getInvitableSlots(
        coachId,
        week.start,
        week.end,
        sessionTemplateId
      );
      // Also get ALL slots (including booked) for display
      const duration = 60; // Will be overridden by session template in getInvitableSlots
      const all = await availabilityService.getAvailableSlots(
        coachId,
        week.start,
        week.end,
        duration
      );

      // Mark invitable slots
      const invitableKeys = new Set(invitable.map(slotKey));
      const enriched = all.map((slot) => ({
        ...slot,
        isAvailable: invitableKeys.has(slotKey(slot)),
      }));

      setAllSlots(enriched);
    } catch (error) {
      setAllSlots([]);
    } finally {
      setLoading(false);
    }
  }, [coachId, week.start, week.end, sessionTemplateId]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Pre-select slots on mount
  useEffect(() => {
    if (preSelectedSlots && preSelectedSlots.length > 0) {
      const keys = new Set(preSelectedSlots.map(slotKey));
      setSelectedKeys(keys);
    }
  }, [preSelectedSlots]);

  const toggleSlot = (slot: AvailabilitySlot) => {
    if (!slot.isAvailable) return;

    const key = slotKey(slot);
    const next = new Set(selectedKeys);

    if (next.has(key)) {
      next.delete(key);
    } else if (next.size < MAX_SELECTIONS) {
      next.add(key);
    }

    setSelectedKeys(next);

    // Report selected slots back
    const selected = allSlots.filter((s) => next.has(slotKey(s)));
    onSelectionChange(selected);
  };

  // Group slots by date
  const slotsByDate = new Map<string, AvailabilitySlot[]>();
  for (const slot of allSlots) {
    const existing = slotsByDate.get(slot.date) || [];
    existing.push(slot);
    slotsByDate.set(slot.date, existing);
  }

  // Build all 7 days of the week
  const weekDays: string[] = [];
  const d = new Date(week.start + 'T00:00:00');
  for (let i = 0; i < 7; i++) {
    weekDays.push(toDateStr(d));
    d.setDate(d.getDate() + 1);
  }

  return (
    <View style={styles.container}>
      {/* Week Navigator */}
      <View style={styles.weekNav}>
        <Clickable
          onPress={() => setWeekOffset(Math.max(0, weekOffset - 1))}
          disabled={weekOffset === 0}
          style={[styles.navBtn, { opacity: weekOffset === 0 ? 0.3 : 1 }]}
        >
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </Clickable>
        <ThemedText type="defaultSemiBold">{week.label}</ThemedText>
        <Clickable
          onPress={() => setWeekOffset(weekOffset + 1)}
          disabled={weekOffset >= 4}
          style={[styles.navBtn, { opacity: weekOffset >= 4 ? 0.3 : 1 }]}
        >
          <Ionicons name="chevron-forward" size={20} color={palette.text} />
        </Clickable>
      </View>

      {/* Selection counter */}
      <View style={[styles.counterRow, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
        <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
        <ThemedText style={[styles.counterText, { color: palette.tint }]}>
          {selectedKeys.size} of {MAX_SELECTIONS} slots selected
        </ThemedText>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading availability...
          </ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.grid} showsVerticalScrollIndicator={false}>
          {weekDays.map((dateStr) => {
            const { day, date, isPast } = formatDayHeader(dateStr);
            const daySlots = slotsByDate.get(dateStr) || [];

            return (
              <Animated.View
                key={dateStr}
                entering={FadeIn.duration(200)}
                style={[styles.dayColumn, { borderBottomColor: palette.border }]}
              >
                {/* Day header */}
                <View style={[styles.dayHeader, isPast && { opacity: 0.4 }]}>
                  <ThemedText style={[styles.dayLabel, { color: palette.muted }]}>{day}</ThemedText>
                  <ThemedText type="defaultSemiBold" style={styles.dayDate}>{date}</ThemedText>
                </View>

                {/* Slots */}
                <View style={styles.slotsRow}>
                  {daySlots.length === 0 ? (
                    <ThemedText style={[styles.noSlots, { color: palette.muted }]}>—</ThemedText>
                  ) : (
                    daySlots.map((slot) => {
                      const key = slotKey(slot);
                      const isSelected = selectedKeys.has(key);
                      const isOpen = slot.isAvailable && !isPast;

                      let bgColor = palette.surface;
                      let borderColor = palette.border;
                      let textColor = palette.muted;

                      if (isSelected) {
                        bgColor = withAlpha(palette.tint, 0.12);
                        borderColor = palette.tint;
                        textColor = palette.tint;
                      } else if (isOpen) {
                        bgColor = withAlpha(palette.success, 0.06);
                        borderColor = withAlpha(palette.success, 0.3);
                        textColor = palette.text;
                      } else {
                        bgColor = withAlpha(palette.muted, 0.06);
                        borderColor = withAlpha(palette.muted, 0.15);
                        textColor = palette.muted;
                      }

                      return (
                        <Clickable
                          key={key}
                          onPress={() => toggleSlot(slot)}
                          disabled={!isOpen}
                          style={[
                            styles.slotChip,
                            {
                              backgroundColor: bgColor,
                              borderColor,
                              opacity: isPast ? 0.4 : 1,
                            },
                          ]}
                        >
                          <View style={styles.slotContent}>
                            <ThemedText style={[styles.slotTime, { color: textColor }]}>
                              {formatSlotTime(slot.startTime)} – {formatSlotTime(slot.endTime)}
                            </ThemedText>
                            {slot.location && (
                              <View style={styles.slotLocationRow}>
                                <Ionicons name="location-outline" size={12} color={palette.tint} />
                                <ThemedText style={[styles.slotLocation, { color: palette.tint }]} numberOfLines={1}>
                                  {slot.location}
                                </ThemedText>
                              </View>
                            )}
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={18} color={palette.tint} />
                          )}
                          {!isOpen && !isPast && (
                            <ThemedText style={[styles.slotBadge, { color: palette.muted }]}>
                              {slot.bookedCount > 0 ? 'Booked' : 'Held'}
                            </ThemedText>
                          )}
                        </Clickable>
                      );
                    })
                  )}
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  navBtn: {
    padding: Spacing.xs,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  counterText: {
    ...Typography.smallSemiBold,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.small,
  },
  grid: {
    maxHeight: 400,
  },
  dayColumn: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  dayHeader: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.micro,
  },
  dayLabel: {
    ...Typography.micro,
    textTransform: 'uppercase',
  },
  dayDate: {
    fontSize: 18,
  },
  slotsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  noSlots: {
    ...Typography.small,
    paddingVertical: Spacing.xs,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  slotContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  slotLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
  },
  slotTime: {
    ...Typography.smallSemiBold,
  },
  slotLocation: {
    ...Typography.micro,
  },
  slotBadge: {
    ...Typography.micro,
    fontWeight: '600',
  },
});
