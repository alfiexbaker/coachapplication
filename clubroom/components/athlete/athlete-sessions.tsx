/**
 * AthleteSessions — Sessions tab for the athlete profile.
 *
 * Shows upcoming sessions list + past sessions list with notes preview.
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Clickable } from '@/components/primitives/clickable';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
import { bookingService } from '@/services/booking-service';
import { ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import type { RosterEntry } from '@/constants/types';
import type { Booking } from '@/constants/app-types';
import { getRosterAthleteName } from '@/utils/roster-display';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';

import { SessionItem, SessionItemSkeleton } from './athlete-sessions-sections';

const logger = createLogger('AthleteSessions');

// ============================================================================
// TYPES
// ============================================================================

interface AthleteSessionsProps {
  athlete: RosterEntry;
  coachId: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AthleteSessionsInner({ athlete, coachId }: AthleteSessionsProps) {
  const { colors } = useTheme();
  const athleteName = getRosterAthleteName(athlete);
  const {
    data: sessionsData,
    status,
    error,
    retry,
    showLoadingState,
    showSectionSkeleton,
  } = useScreen<Booking[]>({
    load: async (): Promise<Result<Booking[], ServiceError>> => {
      try {
        const allBookings = await bookingService.getBookingsForUser(coachId, 'coach');
        return ok(allBookings.filter((booking) => booking.athleteId === athlete.athleteId));
      } catch (loadError) {
        logger.error('Failed to load sessions for athlete', loadError);
        return err(serviceError('UNKNOWN', 'Failed to load sessions.', loadError));
      }
    },
    deps: [coachId, athlete.athleteId],
    events: [ServiceEvents.BOOKING_CREATED, ServiceEvents.BOOKING_CANCELLED],
    isEmpty: (value) => value.length === 0,
    loadingStrategy: 'section-skeleton',
    dataKey: athlete.athleteId,
  });
  const sessions = sessionsData ?? [];

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: Booking[] = [];
    const pa: Booking[] = [];

    sessions.forEach((s) => {
      if (new Date(s.scheduledAt).getTime() > now) {
        up.push(s);
      } else {
        pa.push(s);
      }
    });

    up.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    pa.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    return { upcoming: up, past: pa };
  }, [sessions]);

  const renderSectionSkeleton = useCallback(
    (variant: 'upcoming' | 'past') => (
      <Column gap="sm" style={styles.container}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {variant === 'upcoming' ? 'Upcoming' : 'Past'}
        </ThemedText>
        <SessionItemSkeleton showNeedsNotesBadge={variant === 'past'} />
        <SessionItemSkeleton showNeedsNotesBadge={variant === 'past'} />
      </Column>
    ),
    [],
  );

  if (showLoadingState) {
    return (
      <Column gap="lg" style={styles.container}>
        {renderSectionSkeleton('upcoming')}
        {renderSectionSkeleton('past')}
      </Column>
    );
  }

  if (status === 'error') {
    return (
      <ErrorState
        message={error?.message ?? 'Failed to load sessions.'}
        onRetry={retry}
      />
    );
  }

  if (status === 'empty' || sessions.length === 0) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="No sessions yet"
        message={`Book ${athleteName}'s first session to start tracking progress`}
        actionLabel="Book Session"
        onPressAction={() => router.push(Routes.rosterAthleteAddToSession(athlete.athleteId, athleteName))}
      />
    );
  }

  return (
    <Column gap="lg" style={styles.container}>
      {showSectionSkeleton && upcoming.length === 0 ? renderSectionSkeleton('upcoming') : null}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Animated.View entering={FadeInDown.springify()}>
          <Column gap="sm">
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Upcoming ({upcoming.length})
            </ThemedText>
            {upcoming.map((session) => (
              <SessionItem key={session.id} session={session} isPast={false} />
            ))}
          </Column>
        </Animated.View>
      )}

      {showSectionSkeleton && past.length === 0 ? renderSectionSkeleton('past') : null}

      {/* Past */}
      {past.length > 0 && (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Column gap="sm">
            <Row gap="xs" align="center" justify="between">
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Past ({past.length})
              </ThemedText>
              {past.some((s) => !s.notes) && (
                <View
                  style={[styles.countBadge, { backgroundColor: withAlpha(colors.warning, 0.09) }]}
                >
                  <ThemedText style={[styles.countText, { color: colors.warning }]}>
                    {past.filter((s) => !s.notes).length} need notes
                  </ThemedText>
                </View>
              )}
            </Row>
            {past.slice(0, 20).map((session) => (
              <SessionItem key={session.id} session={session} isPast />
            ))}
            {past.length > 20 && (
              <Column gap="xs">
                <ThemedText style={[styles.moreText, { color: colors.muted }]}>
                  + {past.length - 20} older sessions
                </ThemedText>
                <Clickable
                  onPress={() =>
                    router.push(Routes.developmentSessionHistory({ athleteId: athlete.athleteId }))
                  }
                  style={[styles.viewAllButton, { borderColor: colors.border }]}
                  accessibilityLabel={`View all sessions for ${athleteName}`}
                >
                  <ThemedText style={[styles.viewAllText, { color: colors.tint }]}>
                    View All Sessions
                  </ThemedText>
                </Clickable>
              </Column>
            )}
          </Column>
        </Animated.View>
      )}
    </Column>
  );
}

export const AthleteSessions = React.memo(AthleteSessionsInner);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  sectionTitle: {
    paddingLeft: Spacing.xxs,
  },
  countBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  countText: {
    ...Typography.caption,
  },
  moreText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  viewAllButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  viewAllText: {
    ...Typography.bodySmallSemiBold,
  },
});
