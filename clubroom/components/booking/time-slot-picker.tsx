import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Clickable } from '@/components/primitives/clickable';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilitySlot } from '@/constants/types';

export interface TimeSlotPickerProps {
  coachId: string;
  selectedDate: Date;
  sessionDuration?: number; // minutes, defaults to 60
  onSelect: (slot: string) => void;
  selectedSlot?: string;
}

interface EnrichedSlot extends AvailabilitySlot {
  label: string;
  isPopular?: boolean;
  isLastOne?: boolean;
  unavailableReason?: string;
}

/**
 * TimeSlotPicker - Displays available time slots for a coach on a specific date.
 *
 * This component fetches real availability data from the availabilityService,
 * checking against:
 * - Coach's availability template for the day of week
 * - Date-specific overrides (blocked dates, custom hours)
 * - Existing bookings on that date
 * - maxConcurrent setting and buffer time between sessions
 */
export function TimeSlotPicker({
  coachId,
  selectedDate,
  sessionDuration = 60,
  onSelect,
  selectedSlot,
}: TimeSlotPickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [slots, setSlots] = useState<EnrichedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tappedUnavailable, setTappedUnavailable] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    if (!coachId || !selectedDate) {
      setSlots([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Fetch slots for the selected date only
      const availableSlots = await availabilityService.getAvailableSlots(
        coachId,
        dateStr,
        dateStr,
        sessionDuration
      );

      // Enrich slots with labels and status indicators
      const enrichedSlots: EnrichedSlot[] = availableSlots.map((slot) => {
        const enriched: EnrichedSlot = {
          ...slot,
          label: slot.startTime,
        };

        if (!slot.isAvailable) {
          enriched.unavailableReason = 'Already booked';
        } else if (slot.maxBookings > 1) {
          const remaining = slot.maxBookings - slot.bookedCount;
          if (remaining === 1) {
            enriched.isLastOne = true;
          } else if (slot.bookedCount > 0) {
            // Slot is popular if there are some bookings but not full
            enriched.isPopular = true;
          }
        }

        return enriched;
      });

      // Sort by time
      enrichedSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

      setSlots(enrichedSlots);
    } catch (err) {
      console.error('[TimeSlotPicker] Failed to fetch slots:', err);
      setError('Unable to load available times. Please try again.');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [coachId, selectedDate, sessionDuration]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Handle tapping an unavailable slot - show reason briefly
  const handleSlotPress = (slot: EnrichedSlot) => {
    if (slot.isAvailable) {
      onSelect(slot.startTime);
      setTappedUnavailable(null);
    } else {
      // Show unavailable reason
      setTappedUnavailable(slot.startTime);
      setTimeout(() => setTappedUnavailable(null), 2000);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="small" color={palette.tint} />
        <ThemedText style={[styles.stateText, { color: palette.muted }]}>
          Loading available times...
        </ThemedText>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.stateContainer}>
        <Ionicons name="alert-circle-outline" size={24} color={palette.error || '#dc3545'} />
        <ThemedText style={[styles.stateText, { color: palette.error || '#dc3545' }]}>
          {error}
        </ThemedText>
        <Clickable onPress={fetchSlots} style={[styles.retryButton, { borderColor: palette.tint }]}>
          <ThemedText style={{ color: palette.tint }}>Retry</ThemedText>
        </Clickable>
      </View>
    );
  }

  // Empty state - no slots available
  if (slots.length === 0) {
    return (
      <View style={styles.stateContainer}>
        <Ionicons name="calendar-outline" size={32} color={palette.muted} />
        <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.sm }}>
          No available slots
        </ThemedText>
        <ThemedText style={[styles.stateText, { color: palette.muted }]}>
          The coach has no available times on this date.
          {'\n'}Try selecting a different day.
        </ThemedText>
      </View>
    );
  }

  // Check if all slots are booked
  const availableCount = slots.filter(s => s.isAvailable).length;
  if (availableCount === 0) {
    return (
      <View style={styles.stateContainer}>
        <Ionicons name="time-outline" size={32} color={palette.muted} />
        <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.sm }}>
          Fully booked
        </ThemedText>
        <ThemedText style={[styles.stateText, { color: palette.muted }]}>
          All time slots are booked for this date.
          {'\n'}Try selecting a different day.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.wrap}>
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot.startTime;
          const isUnavailable = !slot.isAvailable;
          const showingReason = tappedUnavailable === slot.startTime;

          return (
            <View key={slot.startTime} style={styles.slotWrapper}>
              <Clickable
                style={[
                  styles.slot,
                  {
                    backgroundColor: isUnavailable
                      ? `${palette.muted}20`
                      : isSelected
                        ? `${palette.tint}15`
                        : palette.surface,
                    borderColor: isUnavailable
                      ? `${palette.muted}40`
                      : isSelected
                        ? palette.tint
                        : palette.border,
                    opacity: isUnavailable ? 0.6 : 1,
                  },
                ]}
                onPress={() => handleSlotPress(slot)}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={[
                    isUnavailable && { color: palette.muted, textDecorationLine: 'line-through' },
                  ]}
                >
                  {slot.label}
                </ThemedText>

                {/* Status indicators */}
                {slot.isLastOne && (
                  <View style={[styles.badge, { backgroundColor: '#ffc107' }]}>
                    <ThemedText style={styles.badgeText}>Last one!</ThemedText>
                  </View>
                )}
                {slot.isPopular && !slot.isLastOne && (
                  <View style={[styles.badge, { backgroundColor: palette.tint }]}>
                    <ThemedText style={styles.badgeText}>Popular</ThemedText>
                  </View>
                )}
                {isUnavailable && (
                  <View style={styles.unavailableIcon}>
                    <Ionicons name="close-circle" size={14} color={palette.muted} />
                  </View>
                )}
              </Clickable>

              {/* Show unavailable reason tooltip */}
              {showingReason && slot.unavailableReason && (
                <View style={[styles.tooltip, { backgroundColor: palette.text }]}>
                  <ThemedText style={[styles.tooltipText, { color: palette.background }]}>
                    {slot.unavailableReason}
                  </ThemedText>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.surface, borderColor: palette.border }]} />
          <ThemedText style={[styles.legendText, { color: palette.muted }]}>Available</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: `${palette.muted}20`, borderColor: `${palette.muted}40` }]} />
          <ThemedText style={[styles.legendText, { color: palette.muted }]}>Unavailable</ThemedText>
        </View>
      </View>
    </View>
  );
}

/**
 * Legacy TimeSlotPicker props for backward compatibility
 * @deprecated Use TimeSlotPickerProps with coachId and selectedDate
 */
export interface LegacyTimeSlotPickerProps {
  selectedSlot?: string;
  onSelect: (slot: string) => void;
}

/**
 * Legacy TimeSlotPicker that shows hardcoded slots
 * @deprecated Use the new TimeSlotPicker with coachId and selectedDate props
 */
export function LegacyTimeSlotPicker({ selectedSlot, onSelect }: LegacyTimeSlotPickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // WARNING: These are hardcoded slots that don't check actual availability
  // This component is deprecated - use TimeSlotPicker with coachId and selectedDate
  const HARDCODED_SLOTS = ['09:00', '10:00', '11:00', '13:00', '15:00', '17:00', '18:00'];

  console.warn('[LegacyTimeSlotPicker] Using deprecated component with hardcoded slots. Please use TimeSlotPicker with coachId and selectedDate props.');

  return (
    <View style={styles.wrap}>
      {HARDCODED_SLOTS.map((slot) => {
        const active = selectedSlot === slot;
        return (
          <Clickable
            key={slot}
            style={[
              styles.slot,
              {
                backgroundColor: active ? `${palette.tint}15` : palette.surface,
                borderColor: active ? palette.tint : palette.border,
              },
            ]}
            onPress={() => onSelect(slot)}
          >
            <ThemedText type="defaultSemiBold">{slot}</ThemedText>
          </Clickable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  slotWrapper: {
    position: 'relative',
  },
  slot: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minWidth: 80,
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  unavailableIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: [{ translateX: -50 }],
    marginBottom: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    zIndex: 10,
  },
  tooltipText: {
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  stateText: {
    textAlign: 'center',
    marginTop: Spacing.xs,
    fontSize: 14,
  },
  retryButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radii.sm,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 12,
  },
});
