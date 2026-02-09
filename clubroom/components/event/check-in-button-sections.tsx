/**
 * Extracted sub-components for CheckInButton.
 *
 * CheckInUnavailable — status banner when check-in is closed/not yet open.
 * CheckedInBadge — confirmation badge with time, location, guests, undo.
 * CheckInAction — primary check-in CTA with location warnings.
 */

import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { EventAttendance } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';

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
          ? `Check-in opens on ${eventService.formatEventDate(eventDate)}`
          : 'Check-in not available'}
      </ThemedText>
    </View>
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
      <View style={[styles.checkedInBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
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
          <View style={[styles.guestsBadge, { backgroundColor: palette.success }]}>
            <Ionicons name="people" size={14} color={palette.onSuccess} />
            <ThemedText style={[styles.guestsBadgeText, { color: palette.onSuccess }]}>
              +{attendance.guestsCheckedIn}
            </ThemedText>
          </View>
        )}
      </View>

      {onUndoCheckIn && (
        <Clickable
          onPress={onUndoCheckIn}
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
        <View style={styles.buttonContent}>
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
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
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
