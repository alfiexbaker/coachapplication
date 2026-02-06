/**
 * AddToCalendar - Calendar Integration Button
 *
 * Requests calendar permission, finds the default calendar, and creates
 * an event with title, time, location, and a 1-hour reminder.
 * Shows a success toast after creation.
 *
 * Usage:
 *   <AddToCalendar
 *     booking={{
 *       coachName: 'Marcus Thompson',
 *       scheduledAt: '2026-02-10T16:00:00Z',
 *       duration: 60,
 *       location: 'Hackney Marshes',
 *       sessionType: '1:1 Training',
 *       price: 50,
 *     }}
 *   />
 */

import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Calendar from 'expo-calendar';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Components , Typography , withAlpha } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddToCalendarProps {
  booking: {
    coachName: string;
    scheduledAt: string;
    duration: number;
    location?: string;
    sessionType?: string;
    price?: number;
  };
  /** Optional: called after event is successfully created */
  onSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getDefaultCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

  // Try to find the default calendar
  const defaultCalendar = calendars.find((cal) => cal.isPrimary);
  if (defaultCalendar) return defaultCalendar.id;

  // Fallback: find a writable local calendar
  const writable = calendars.find(
    (cal) =>
      cal.allowsModifications &&
      (cal.source?.type === 'local' ||
        cal.source?.type === 'LOCAL' ||
        cal.type === 'local'),
  );
  if (writable) return writable.id;

  // Last resort: create a new calendar on iOS
  if (Platform.OS === 'ios') {
    const defaultSource = calendars.find(
      (cal) => cal.source?.name === 'iCloud' || cal.source?.name === 'Default',
    )?.source;

    if (defaultSource) {
      const newCalendarId = await Calendar.createCalendarAsync({
        title: 'Clubroom Sessions',
        color: Colors.light.tint,
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultSource.id,
        source: defaultSource,
        name: 'clubroom',
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
      return newCalendarId;
    }
  }

  // Android: use the first writable calendar
  if (Platform.OS === 'android') {
    const writableCalendar = calendars.find((cal) => cal.allowsModifications);
    if (writableCalendar) return writableCalendar.id;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddToCalendar({ booking, onSuccess }: AddToCalendarProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCalendar = async () => {
    if (loading || added) return;
    setLoading(true);

    try {
      // Request permission
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Calendar access is needed to add this session. Please enable it in Settings.',
        );
        setLoading(false);
        return;
      }

      // Find or create calendar
      const calendarId = await getDefaultCalendarId();
      if (!calendarId) {
        Alert.alert('Error', 'Could not find a calendar to add the event to.');
        setLoading(false);
        return;
      }

      // Build event details
      const startDate = new Date(booking.scheduledAt);
      const endDate = new Date(startDate.getTime() + booking.duration * 60 * 1000);

      const title = booking.sessionType
        ? `${booking.sessionType} with ${booking.coachName}`
        : `Session with ${booking.coachName}`;

      const notes = [
        booking.sessionType && `Type: ${booking.sessionType}`,
        booking.price != null && `Price: \u00A3${booking.price}`,
        'Booked via Clubroom',
      ]
        .filter(Boolean)
        .join('\n');

      // Create the event
      await Calendar.createEventAsync(calendarId, {
        title,
        startDate,
        endDate,
        location: booking.location || undefined,
        notes,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        alarms: [{ relativeOffset: -60 }], // 1 hour before
      });

      setAdded(true);

      // Show success toast
      Alert.alert(
        'Added to Calendar',
        `"${title}" has been added to your calendar with a 1-hour reminder.`,
      );

      onSuccess?.();
    } catch {
      Alert.alert('Error', 'Failed to add event to calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        added ? styles.buttonAdded : undefined,
        pressed && !added ? styles.buttonPressed : undefined,
      ]}
      onPress={handleAddToCalendar}
      disabled={loading || added}
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.light.tint} />
      ) : (
        <>
          <Ionicons
            name={added ? 'checkmark-circle' : 'calendar-outline'}
            size={20}
            color={added ? Colors.light.success : Colors.light.tint}
          />
          <ThemedText style={[styles.buttonText, added ? styles.buttonTextAdded : undefined]}>
            {added ? 'Added to Calendar' : 'Add to Calendar'}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.md,
  },
  buttonPressed: {
    opacity: 0.8,
    backgroundColor: withAlpha(Colors.light.tint, 0.03),
  },
  buttonAdded: {
    borderColor: Colors.light.success,
    backgroundColor: withAlpha(Colors.light.success, 0.06),
  },
  buttonText: { ...Typography.bodySemiBold, color: Colors.light.tint },
  buttonTextAdded: {
    color: Colors.light.success,
  },
});

export default AddToCalendar;
