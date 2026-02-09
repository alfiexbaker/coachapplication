import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

import type { ClubEvent, EventAttendance, CheckInInput } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';
import { eventService } from '@/services/event-service';

import {
  CheckInUnavailable,
  CheckedInBadge,
  CheckInAction,
} from './check-in-button-sections';

const logger = createLogger('CheckInButton');

// ─── Types ──────────────────────────────────────────────────────

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
  currentLocation?: LocationCoords | null;
}

// ─── Component ──────────────────────────────────────────────────

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
  const { colors: palette } = useTheme();
  const [loading, setLoading] = useState(false);

  const isCheckedIn = !!currentAttendance;
  const checkInAvailable = eventService.isCheckInAvailable(event);

  const handleCheckIn = useCallback(async () => {
    if (loading || disabled) return;

    setLoading(true);
    try {
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
  }, [loading, disabled, requireLocation, currentLocation, event.id, userId, userName, userPhotoUrl, userRole, onCheckIn]);

  const handleUndoCheckIn = useCallback(async () => {
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
  }, [onUndoCheckIn, loading]);

  // Event not available for check-in
  if (!checkInAvailable && !isCheckedIn) {
    return <CheckInUnavailable eventDate={event.date} palette={palette} />;
  }

  // Already checked in
  if (isCheckedIn && currentAttendance) {
    return (
      <CheckedInBadge
        attendance={currentAttendance}
        loading={loading}
        onUndoCheckIn={onUndoCheckIn ? handleUndoCheckIn : undefined}
        palette={palette}
      />
    );
  }

  // Check-in button
  return (
    <CheckInAction
      loading={loading}
      disabled={disabled}
      requireLocation={requireLocation}
      currentLocation={currentLocation}
      onCheckIn={handleCheckIn}
      palette={palette}
    />
  );
}
