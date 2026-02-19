/**
 * CreateReviewStep — Step 3 of session creation wizard.
 *
 * Shows a summary card with all session details for final review.
 */

import React, { memo, useMemo } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row, Column } from '@/components/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { FootballObjective, SessionInviteType } from '@/constants/types';
import type { CampDailyTime } from '@/hooks/use-create-session';
import { openLocationInMaps } from '@/utils/map-links';
import { getDisplayLocationLabel } from '@/utils/location-display';
import {
  type CampLength,
  type SessionType,
  type RecurrenceType,
  SESSION_TYPES,
  RECURRENCE_OPTIONS,
} from './create-session-types';

interface CreateReviewStepProps {
  colors: ThemeColors;
  sessionType: SessionType;
  title: string;
  description: string;
  selectedDate: string;
  campLength: CampLength;
  campEndDate: string;
  selectedTime: string;
  selectedEndTime: string;
  campDatesPreview: string[];
  useCampDailyTimes: boolean;
  campDailyTimes: Record<string, CampDailyTime>;
  recurrence: RecurrenceType;
  location: string;
  venueName: string;
  locationCoordinates?: { latitude: number; longitude: number } | null;
  price: string;
  focusAreas: FootballObjective[];
  maxParticipants: string;
  inviteType: SessionInviteType;
  defaultMaxParticipants: number;
}

function parseTimeToMinutes(time: string): number | null {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = parseInt(hoursRaw, 10);
  const minutes = parseInt(minutesRaw, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

function durationBetween(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) return 0;
  return end - start;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours <= 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

export const CreateReviewStep = memo(function CreateReviewStep({
  colors,
  sessionType,
  title,
  description,
  selectedDate,
  campLength,
  campEndDate,
  selectedTime,
  selectedEndTime,
  campDatesPreview,
  useCampDailyTimes,
  campDailyTimes,
  recurrence,
  location,
  venueName,
  locationCoordinates,
  price,
  focusAreas,
  maxParticipants,
  inviteType,
  defaultMaxParticipants,
}: CreateReviewStepProps) {
  const typeConfig = useMemo(() => SESSION_TYPES.find((t) => t.key === sessionType), [sessionType]);
  const recurrenceLabel = useMemo(
    () => RECURRENCE_OPTIONS.find((r) => r.key === recurrence)?.label || 'One-time',
    [recurrence],
  );
  const isCamp = sessionType === 'camp';
  const participants = maxParticipants || defaultMaxParticipants;
  const displayLocation = useMemo(() => {
    const resolvedLocation = getDisplayLocationLabel(location, locationCoordinates);
    const normalizedVenue = venueName.trim();
    if (!normalizedVenue) {
      return resolvedLocation;
    }
    return resolvedLocation ? `${normalizedVenue} · ${resolvedLocation}` : normalizedVenue;
  }, [location, locationCoordinates, venueName]);
  const mainDurationMinutes = useMemo(
    () => durationBetween(selectedTime, selectedEndTime),
    [selectedTime, selectedEndTime],
  );
  const durationLabel =
    mainDurationMinutes > 0 ? formatDuration(mainDurationMinutes) : 'Check start/end time';
  const scheduleLabel = useMemo(() => {
    if (!isCamp) return `${selectedDate} at ${selectedTime} - ${selectedEndTime}`;
    if (campLength === 'multi_day' && campEndDate) {
      return `${selectedDate} to ${campEndDate}`;
    }
    return `${selectedDate} at ${selectedTime} - ${selectedEndTime}`;
  }, [campEndDate, campLength, isCamp, selectedDate, selectedTime, selectedEndTime]);

  const scheduleSubLabel = useMemo(() => {
    if (!isCamp) return recurrenceLabel;
    if (campLength === 'multi_day' && useCampDailyTimes) {
      return `Different times by day (${campDatesPreview.length} days)`;
    }
    if (campLength === 'multi_day') {
      return `${selectedTime} - ${selectedEndTime} daily`;
    }
    return 'Single-day camp';
  }, [
    campDatesPreview.length,
    campLength,
    isCamp,
    recurrenceLabel,
    selectedEndTime,
    selectedTime,
    useCampDailyTimes,
  ]);

  const perDaySummary = useMemo(() => {
    if (!isCamp || campLength !== 'multi_day' || !useCampDailyTimes) return [];
    return campDatesPreview.slice(0, 3).map((date) => {
      const dayTime = campDailyTimes[date];
      return {
        date,
        label: dayTime ? `${dayTime.startTime}-${dayTime.endTime}` : 'Using default times',
      };
    });
  }, [campDailyTimes, campDatesPreview, campLength, isCamp, useCampDailyTimes]);

  const visibilityNote = useMemo(() => {
    switch (inviteType) {
      case 'OPEN':
        return 'Your session will be visible to all athletes once published.';
      case 'CLOSED':
        return 'Only invited athletes can see this session. You can add more later from Bookings.';
      case 'SQUAD_ONLY':
        return 'Only squad members will be able to see this session.';
    }
  }, [inviteType]);
  const handleOpenMap = () => {
    void openLocationInMaps({ location, coordinates: locationCoordinates }).then((opened) => {
      if (!opened) {
        Alert.alert('Error', 'Could not open maps application.');
      }
    });
  };

  return (
    <Animated.View entering={FadeInRight.springify()}>
      <Column gap="md">
        <SurfaceCard style={styles.reviewCard}>
          <Row align="flex-start" justify="between" gap="md">
            <ThemedText type="title" style={styles.reviewTitle}>
              {title || 'Untitled Session'}
            </ThemedText>
            <Row
              align="center"
              gap="xxs"
              style={[styles.typeBadge, { backgroundColor: withAlpha(colors.tint, 0.09) }]}
            >
              <Ionicons name={typeConfig?.icon || 'fitness'} size={14} color={colors.tint} />
              <ThemedText style={[styles.typeBadgeText, { color: colors.tint }]}>
                {typeConfig?.label}
              </ThemedText>
            </Row>
          </Row>

          {description ? (
            <ThemedText style={[styles.reviewDescription, { color: colors.muted }]}>
              {description}
            </ThemedText>
          ) : null}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Column gap="md">
            <Row align="flex-start" gap="sm">
              <Ionicons name="time-outline" size={18} color={colors.muted} />
              <Column>
                <ThemedText style={[styles.itemLabel, { color: colors.muted }]}>
                  Session Length
                </ThemedText>
                <ThemedText type="defaultSemiBold">{durationLabel}</ThemedText>
              </Column>
            </Row>

            <Row align="flex-start" gap="sm">
              <Ionicons name="calendar-outline" size={18} color={colors.muted} />
              <Column>
                <ThemedText style={[styles.itemLabel, { color: colors.muted }]}>
                  {isCamp ? 'Camp Schedule' : 'Schedule'}
                </ThemedText>
                <ThemedText type="defaultSemiBold">{scheduleLabel}</ThemedText>
                <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
                  {scheduleSubLabel}
                </ThemedText>
              </Column>
            </Row>

            {perDaySummary.length > 0 && (
              <Column gap="xxs">
                {perDaySummary.map((entry) => (
                  <Row key={`review-day-${entry.date}`} align="center" justify="space-between">
                    <ThemedText style={[styles.itemLabel, { color: colors.muted }]}>
                      {entry.date}
                    </ThemedText>
                    <ThemedText style={{ color: colors.text, ...Typography.caption }}>
                      {entry.label}
                    </ThemedText>
                  </Row>
                ))}
                {campDatesPreview.length > 3 && (
                  <ThemedText style={[styles.itemLabel, { color: colors.muted }]}>
                    +{campDatesPreview.length - 3} more day(s)
                  </ThemedText>
                )}
              </Column>
            )}

            <Clickable
              onPress={handleOpenMap}
              accessibilityLabel="Open training location in maps"
              style={styles.locationClickable}
            >
              <Row align="flex-start" gap="sm">
                <Ionicons name="location-outline" size={18} color={colors.muted} />
                <Column style={styles.flex}>
                  <ThemedText style={[styles.itemLabel, { color: colors.muted }]}>
                    Location
                  </ThemedText>
                  <ThemedText type="defaultSemiBold" numberOfLines={2}>
                    {displayLocation}
                  </ThemedText>
                </Column>
                <Ionicons name="navigate-outline" size={16} color={colors.tint} />
              </Row>
            </Clickable>

            <Row align="flex-start" gap="sm">
              <Ionicons name="people-outline" size={18} color={colors.muted} />
              <Column>
                <ThemedText style={[styles.itemLabel, { color: colors.muted }]}>
                  Capacity
                </ThemedText>
                <ThemedText type="defaultSemiBold">
                  {participants} {sessionType === '1on1' ? 'athlete' : 'athletes'}
                </ThemedText>
              </Column>
            </Row>
          </Column>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Row align="center" justify="between">
            <ThemedText style={{ color: colors.muted }}>
              {isCamp ? 'Price per athlete' : 'Price per session'}
            </ThemedText>
            <ThemedText type="title" style={{ color: colors.tint }}>
              {price && parseFloat(price) > 0 ? `£${parseFloat(price).toFixed(2)}` : 'Free'}
            </ThemedText>
          </Row>

          {focusAreas.length > 0 && (
            <Column gap="xs">
              <ThemedText style={[styles.itemLabel, { color: colors.muted }]}>
                Focus Areas
              </ThemedText>
              <Row wrap gap="xs">
                {focusAreas.map((area) => (
                  <View
                    key={area}
                    style={[styles.focusTag, { backgroundColor: withAlpha(colors.success, 0.09) }]}
                  >
                    <ThemedText style={[styles.focusTagText, { color: colors.success }]}>
                      {area}
                    </ThemedText>
                  </View>
                ))}
              </Row>
            </Column>
          )}
        </SurfaceCard>

        <ThemedText style={[styles.reviewNote, { color: colors.muted }]}>
          {visibilityNote}
        </ThemedText>
      </Column>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  reviewCard: {
    gap: Spacing.md,
  },
  reviewTitle: {
    flex: 1,
    ...Typography.title,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  typeBadgeText: {
    ...Typography.caption,
  },
  reviewDescription: {
    ...Typography.bodySmall,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  itemLabel: {
    ...Typography.caption,
    marginBottom: Spacing.micro,
  },
  flex: {
    flex: 1,
  },
  locationClickable: {
    minHeight: 44,
    justifyContent: 'center',
  },
  focusTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  focusTagText: {
    ...Typography.caption,
  },
  reviewNote: {
    textAlign: 'center',
    ...Typography.small,
    marginTop: Spacing.md,
  },
});
