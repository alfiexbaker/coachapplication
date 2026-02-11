/**
 * Extracted sub-components for CheckInButton.
 *
 * CheckInUnavailable — status banner when check-in is closed/not yet open.
 * CheckedInBadge — confirmation badge with time, location, guests, undo.
 * CheckInAction — primary check-in CTA with location warnings.
 */

import React, { memo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { EventAttendance } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { eventService } from '@/services/event-service';
import { Row } from '@/components/primitives';
import { styles } from './check-in-button-styles';

// ─── CheckInUnavailable ──────────────────────────────────────────────────────

interface CheckInUnavailableProps {
  eventDate: string;
  palette: ThemeColors;
}

export const CheckInUnavailable = memo(function CheckInUnavailable({
  eventDate,
  palette,
}: CheckInUnavailableProps) {
  const date = new Date(eventDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const isPast = date < today;
  const isFuture = date > today;

  return (
    <Row style={[styles.statusContainer, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
      <Ionicons
        name={isPast ? 'time-outline' : 'calendar-outline'}
        size={20}
        color={palette.muted}
      />
      <ThemedText style={[styles.statusText, { color: palette.muted }]}>
        {isPast
          ? 'Check-in closed'
          : isFuture
            ? `Check-in opens on ${eventService.formatEventDate(eventDate)}`
            : 'Check-in not available'}
      </ThemedText>
    </Row>
  );
});

// ─── CheckedInBadge ──────────────────────────────────────────────────────────

interface CheckedInBadgeProps {
  attendance: EventAttendance;
  loading: boolean;
  onUndoCheckIn?: () => void;
  palette: ThemeColors;
}

export const CheckedInBadge = memo(function CheckedInBadge({
  attendance,
  loading,
  onUndoCheckIn,
  palette,
}: CheckedInBadgeProps) {
  return (
    <View style={styles.checkedInContainer}>
      <Row style={[styles.checkedInBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
        <View style={[styles.checkedInIcon, { backgroundColor: palette.success }]}>
          <Ionicons name="checkmark" size={20} color={palette.onSuccess} />
        </View>
        <View style={styles.checkedInInfo}>
          <ThemedText style={[styles.checkedInTitle, { color: palette.success }]}>
            Checked In
          </ThemedText>
          <ThemedText style={[styles.checkedInTime, { color: palette.muted }]}>
            {eventService.formatTimeAgo(attendance.checkedInAt)}
            {attendance.locationValidated && ' (Location verified)'}
          </ThemedText>
        </View>
        {attendance.guestsCheckedIn > 0 && (
          <Row style={[styles.guestsBadge, { backgroundColor: palette.success }]}>
            <Ionicons name="people" size={14} color={palette.onSuccess} />
            <ThemedText style={[styles.guestsBadgeText, { color: palette.onSuccess }]}>
              +{attendance.guestsCheckedIn}
            </ThemedText>
          </Row>
        )}
      </Row>

      {onUndoCheckIn && (
        <Clickable onPress={onUndoCheckIn} disabled={loading} style={styles.undoButton}>
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
});

// ─── CheckInAction ───────────────────────────────────────────────────────────

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface CheckInActionProps {
  loading: boolean;
  disabled: boolean;
  requireLocation: boolean;
  currentLocation?: LocationCoords | null;
  onCheckIn: () => void;
  palette: ThemeColors;
}

export const CheckInAction = memo(function CheckInAction({
  loading,
  disabled,
  requireLocation,
  currentLocation,
  onCheckIn,
  palette,
}: CheckInActionProps) {
  return (
    <View style={styles.container}>
      <Button
        onPress={onCheckIn}
        disabled={disabled || loading}
        style={[styles.checkInButton, { backgroundColor: palette.success }]}
      >
        <Row style={styles.buttonContent}>
          {loading ? (
            <ActivityIndicator size="small" color={palette.onSuccess} />
          ) : (
            <>
              <Ionicons name="log-in" size={20} color={palette.onSuccess} />
              <ThemedText style={[styles.buttonText, { color: palette.onSuccess }]}>
                Check In
              </ThemedText>
            </>
          )}
        </Row>
      </Button>

      {requireLocation && !currentLocation && (
        <Row style={styles.locationWarning}>
          <Ionicons name="location-outline" size={14} color={palette.warning} />
          <ThemedText style={[styles.locationWarningText, { color: palette.warning }]}>
            Location required for check-in
          </ThemedText>
        </Row>
      )}

      {currentLocation && (
        <Row style={styles.locationInfo}>
          <Ionicons name="location" size={14} color={palette.success} />
          <ThemedText style={[styles.locationInfoText, { color: palette.muted }]}>
            Location will be verified
          </ThemedText>
        </Row>
      )}
    </View>
  );
});

export { styles };
