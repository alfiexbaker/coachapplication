/**
 * AthleteSessions — Sessions tab for the athlete profile.
 *
 * Shows upcoming sessions list + past sessions list with notes preview.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
import { bookingService } from '@/services/booking-service';
import { createLogger } from '@/utils/logger';
import type { RosterEntry } from '@/constants/types';
import type { Booking } from '@/constants/app-types';
import { getRosterAthleteName } from '@/utils/roster-display';

import { SessionItem } from './athlete-sessions-sections';

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
  const [sessions, setSessions] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const allBookings = await bookingService.getBookingsForUser(coachId, 'coach');
        const athleteSessions = allBookings.filter((b) => b.athleteId === athlete.athleteId);
        setSessions(athleteSessions);
      } catch (loadError) {
        logger.error('Failed to load sessions for athlete', loadError);
        setError('Failed to load sessions');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [coachId, athlete.athleteId]);

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

  if (loading) {
    return (
      <Column gap="sm" style={styles.container}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.skeleton, { backgroundColor: colors.surfaceSecondary }]} />
        ))}
      </Column>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setLoading(true);
          setError(null);
          void (async () => {
            try {
              const allBookings = await bookingService.getBookingsForUser(coachId, 'coach');
              setSessions(allBookings.filter((b) => b.athleteId === athlete.athleteId));
            } catch (retryError) {
              logger.error('Retry failed', retryError);
              setError('Failed to load sessions');
            } finally {
              setLoading(false);
            }
          })();
        }}
      />
    );
  }

  if (sessions.length === 0) {
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
              <ThemedText style={[styles.moreText, { color: colors.muted }]}>
                + {past.length - 20} older sessions
              </ThemedText>
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
  skeleton: {
    height: 72,
    borderRadius: Radii.md,
  },
});
