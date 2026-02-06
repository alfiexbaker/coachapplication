import { useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii , withAlpha } from '@/constants/theme';
import type { ClubEvent, EventAttendance, CheckInInput } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLogger } from '@/utils/logger';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';

const logger = createLogger('CheckInButton');

// Location types for optional location functionality
interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface CheckInButtonProps {
  event: ClubEvent;
  userId: string;
  userName: string;
  userRole: 'COACH' | 'PARENT' | 'ATHLETE';
  userPhotoUrl?: string;
  currentAttendance?: EventAttendance | null;
  onCheckIn: (input: CheckInInput) => Promise<void>;
  onUndoCheckIn?: () => Promise<void>;
  requireLocation?: boolean;
  disabled?: boolean;
  /** Optional: Provide current location from parent component */
  currentLocation?: LocationCoords | null;
}

export function CheckInButton({
  event,
  userId,
  userName,
  userRole,
  userPhotoUrl,
  currentAttendance,
  onCheckIn,
  onUndoCheckIn,
  requireLocation = false,
  disabled = false,
  currentLocation,
}: CheckInButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [loading, setLoading] = useState(false);

  const isCheckedIn = !!currentAttendance;
  const checkInAvailable = eventService.isCheckInAvailable(event);

  const handleCheckIn = async () => {
    if (loading || disabled) return;

    setLoading(true);
    try {
      // If location is required but not provided, show alert
      if (requireLocation && !currentLocation) {
        Alert.alert(
          'Location Required',
          'Please enable location access to check in to this event.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const checkInInput: CheckInInput = {
        eventId: event.id,
        userId,
        userName,
        userPhotoUrl,
        userRole,
        checkedInBy: userId,
        checkedInByName: userName,
        checkInMethod: 'SELF',
        location: currentLocation
          ? {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              accuracy: currentLocation.accuracy,
            }
          : undefined,
      };

      await onCheckIn(checkInInput);
    } catch (error) {
      logger.error('Check-in failed', error);
      Alert.alert('Check-in Failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUndoCheckIn = async () => {
    if (!onUndoCheckIn || loading) return;

    Alert.alert(
      'Undo Check-in',
      'Are you sure you want to undo your check-in?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await onUndoCheckIn();
            } catch (error) {
              logger.error('Undo check-in failed', error);
              Alert.alert('Failed', 'Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Event not available for check-in
  if (!checkInAvailable && !isCheckedIn) {
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    const isPast = eventDate < today;
    const isFuture = eventDate > today;

    return (
      <View style={[styles.statusContainer, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
        <Ionicons
          name={isPast ? 'time-outline' : 'calendar-outline'}
          size={20}
          color={palette.muted}
        />
        <ThemedText style={[styles.statusText, { color: palette.muted }]}>
          {isPast
            ? 'Check-in closed'
            : isFuture
            ? `Check-in opens on ${eventService.formatEventDate(event.date)}`
            : 'Check-in not available'}
        </ThemedText>
      </View>
    );
  }

  // Already checked in
  if (isCheckedIn && currentAttendance) {
    return (
      <View style={styles.checkedInContainer}>
        <View style={[styles.checkedInBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <View style={[styles.checkedInIcon, { backgroundColor: palette.success }]}>
            <Ionicons name="checkmark" size={20} color={palette.onSuccess} />
          </View>
          <View style={styles.checkedInInfo}>
            <ThemedText style={[styles.checkedInTitle, { color: palette.success }]}>
              Checked In
            </ThemedText>
            <ThemedText style={[styles.checkedInTime, { color: palette.muted }]}>
              {eventService.formatTimeAgo(currentAttendance.checkedInAt)}
              {currentAttendance.locationValidated && ' (Location verified)'}
            </ThemedText>
          </View>
          {currentAttendance.guestsCheckedIn > 0 && (
            <View style={[styles.guestsBadge, { backgroundColor: palette.success }]}>
              <Ionicons name="people" size={14} color={palette.onSuccess} />
              <ThemedText style={styles.guestsBadgeText}>
                +{currentAttendance.guestsCheckedIn}
              </ThemedText>
            </View>
          )}
        </View>

        {onUndoCheckIn && (
          <Clickable
            onPress={handleUndoCheckIn}
            disabled={loading}
            style={styles.undoButton}
          >
            {loading ? (
              <ActivityIndicator size="small" color={palette.muted} />
            ) : (
              <ThemedText style={[styles.undoButtonText, { color: palette.muted }]}>
                Undo check-in
              </ThemedText>
            )}
          </Clickable>
        )}
      </View>
    );
  }

  // Check-in button
  return (
    <View style={styles.container}>
      <Button
        onPress={handleCheckIn}
        disabled={disabled || loading}
        style={[styles.checkInButton, { backgroundColor: palette.success }]}
      >
        <View style={styles.buttonContent}>
          {loading ? (
            <ActivityIndicator size="small" color={palette.onSuccess} />
          ) : (
            <>
              <Ionicons name="log-in" size={20} color={palette.onSuccess} />
              <ThemedText style={styles.buttonText}>Check In</ThemedText>
            </>
          )}
        </View>
      </Button>

      {requireLocation && !currentLocation && (
        <View style={styles.locationWarning}>
          <Ionicons name="location-outline" size={14} color={palette.warning} />
          <ThemedText style={[styles.locationWarningText, { color: palette.warning }]}>
            Location required for check-in
          </ThemedText>
        </View>
      )}

      {currentLocation && (
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={14} color={palette.success} />
          <ThemedText style={[styles.locationInfoText, { color: palette.muted }]}>
            Location will be verified
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  statusText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    flex: 1,
  },
  checkedInContainer: {
    gap: Spacing.xs,
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  checkedInIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedInInfo: {
    flex: 1,
  },
  checkedInTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  checkedInTime: {
    fontSize: scaleFont(12),
  },
  guestsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  guestsBadgeText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: Colors.light.onSuccess,
  },
  undoButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xxs,
    paddingHorizontal: 8,
  },
  undoButtonText: {
    fontSize: scaleFont(13),
    textDecorationLine: 'underline',
  },
  checkInButton: {
    paddingVertical: 14,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: Colors.light.onSuccess,
  },
  locationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xxs,
  },
  locationWarningText: {
    fontSize: scaleFont(12),
    flex: 1,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xxs,
  },
  locationInfoText: {
    fontSize: scaleFont(12),
  },
});
