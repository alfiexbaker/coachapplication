/**
 * BookingFlowPreview -- Composing parent for the booking flow preview.
 * Manages availability state and selected day/slot, delegates rendering
 * to BookingFlowStepper, BookingFlowScheduler, and BookingFlowSummary.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { buildAvailability, type BookingFlowPreviewProps } from './booking-flow-types';
import { BookingFlowStepper } from './booking-flow-stepper';
import { BookingFlowScheduler } from './booking-flow-scheduler';
import { BookingFlowSummary } from './booking-flow-summary';

export function BookingFlowPreview({ coach }: BookingFlowPreviewProps) {
  const availability = useMemo(() => buildAvailability(), []);
  const [selectedDayId, setSelectedDayId] = useState(availability[0]?.id);
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(
    availability[0]?.slots[0]?.id,
  );

  useEffect(() => {
    const day = availability.find((entry) => entry.id === selectedDayId);
    if (!day) return;
    if (!day.slots.length) {
      setSelectedSlotId(undefined);
      return;
    }
    const hasSelected = day.slots.some((s) => s.id === selectedSlotId);
    if (!hasSelected) setSelectedSlotId(day.slots[0].id);
  }, [availability, selectedDayId, selectedSlotId]);

  const handleSelectDay = useCallback((id: string) => setSelectedDayId(id), []);
  const handleSelectSlot = useCallback((id: string) => setSelectedSlotId(id), []);

  const selectedDay = availability.find((d) => d.id === selectedDayId);
  const selectedSlot = selectedDay?.slots.find((s) => s.id === selectedSlotId);

  return (
    <View style={styles.column}>
      <BookingFlowStepper coach={coach} />
      <BookingFlowScheduler
        availability={availability}
        selectedDayId={selectedDayId}
        selectedSlotId={selectedSlotId}
        onSelectDay={handleSelectDay}
        onSelectSlot={handleSelectSlot}
      />
      <BookingFlowSummary coach={coach} selectedDay={selectedDay} selectedSlot={selectedSlot} />
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1, gap: Spacing.md },
});
