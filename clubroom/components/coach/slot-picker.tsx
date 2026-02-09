/**
 * Slot Picker
 *
 * Week-based grid that shows a coach's real availability slots.
 * Slots are colour-coded: open (tappable), booked, held, blocked.
 * Coach taps open slots to select them for an invite (max 3).
 */

import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

import { availabilityService } from '@/services/availability-service';
import { toDateStr } from '@/utils/format';
import type { AvailabilitySlot, TimeSlot } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';
import {
  MAX_SELECTIONS,
  getWeekRange,
  WeekNavigator,
  SelectionCounter,
  SlotPickerLoading,
  DayRow,
} from './slot-picker-sections';

interface SlotPickerProps {
  coachId: string;
  sessionTemplateId?: string;
  preSelectedSlots?: TimeSlot[];
  onSelectionChange: (slots: AvailabilitySlot[]) => void;
  defaultLocation?: string;
}

export function SlotPicker({
  coachId,
  sessionTemplateId,
  preSelectedSlots,
  onSelectionChange,
}: SlotPickerProps) {
  const { colors: palette } = useTheme();

  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allSlots, setAllSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const week = getWeekRange(weekOffset);

  const slotKey = (slot: { date: string; startTime: string }) =>
    `${slot.date}_${slot.startTime}`;

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const invitable = await availabilityService.getInvitableSlots(
        coachId,
        week.start,
        week.end,
        sessionTemplateId
      );
      const duration = 60;
      const all = await availabilityService.getAvailableSlots(
        coachId,
        week.start,
        week.end,
        duration
      );

      const invitableKeys = new Set(invitable.map(slotKey));
      const enriched = all.map((slot) => ({
        ...slot,
        isAvailable: invitableKeys.has(slotKey(slot)),
      }));

      setAllSlots(enriched);
    } catch {
      setAllSlots([]);
    } finally {
      setLoading(false);
    }
  }, [coachId, week.start, week.end, sessionTemplateId]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    if (preSelectedSlots && preSelectedSlots.length > 0) {
      const keys = new Set(preSelectedSlots.map(slotKey));
      setSelectedKeys(keys);
    }
  }, [preSelectedSlots]);

  const toggleSlot = useCallback(
    (slot: AvailabilitySlot) => {
      if (!slot.isAvailable) return;

      const key = slotKey(slot);
      const next = new Set(selectedKeys);

      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < MAX_SELECTIONS) {
        next.add(key);
      }

      setSelectedKeys(next);
      const selected = allSlots.filter((s) => next.has(slotKey(s)));
      onSelectionChange(selected);
    },
    [selectedKeys, allSlots, onSelectionChange]
  );

  const handlePrevWeek = useCallback(
    () => setWeekOffset(Math.max(0, weekOffset - 1)),
    [weekOffset]
  );

  const handleNextWeek = useCallback(
    () => setWeekOffset(weekOffset + 1),
    [weekOffset]
  );

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
      <WeekNavigator
        weekLabel={week.label}
        weekOffset={weekOffset}
        onPrev={handlePrevWeek}
        onNext={handleNextWeek}
        palette={palette}
      />

      <SelectionCounter count={selectedKeys.size} palette={palette} />

      {loading ? (
        <SlotPickerLoading palette={palette} />
      ) : (
        <ScrollView style={styles.grid} showsVerticalScrollIndicator={false}>
          {weekDays.map((dateStr) => (
            <DayRow
              key={dateStr}
              dateStr={dateStr}
              slots={slotsByDate.get(dateStr) || []}
              selectedKeys={selectedKeys}
              slotKey={slotKey}
              onToggleSlot={toggleSlot}
              palette={palette}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  grid: { maxHeight: 400 },
});
