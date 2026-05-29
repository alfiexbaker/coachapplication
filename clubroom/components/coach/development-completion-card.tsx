import { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives';
import { withAlpha } from '@/constants/theme';
import { Routes } from '@/navigation/routes';
import type { Booking } from '@/constants/app-types';
import { useTheme } from '@/hooks/useTheme';
import { getBookingAthleteName } from '@/utils/booking-display';
import { styles } from './development-section-styles';

function cleanAthleteLabel(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) {
    return null;
  }
  if (/^(user[_-]?\d+|athlete[_-]?\d+|parent[_-]?\d+)$/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function getCompletionRoute(booking: Booking): Href {
  const linkedGroupSessionId = booking.groupSessionId?.trim();
  if (linkedGroupSessionId) {
    return Routes.sessionComplete(linkedGroupSessionId);
  }

  return Routes.sessionFeedback({
    bookingId: booking.id,
    athleteId: booking.athleteId || booking.athleteIds?.[0],
    athleteName: getBookingAthleteName(booking),
    athleteObjectives: JSON.stringify(booking.objectives || []),
  });
}

export function CompletionCard({ bookings }: { bookings: Booking[] }) {
  const { colors: palette } = useTheme();
  const [today] = useState(() => new Date());
  if (bookings.length === 0) return null;

  return (
    <SurfaceCard
      style={[styles.sectionCard, styles.completionCard, { borderLeftColor: palette.warning }]}
    >
      <Row style={styles.completionHeader}>
        <View
          style={[styles.completionIcon, { backgroundColor: withAlpha(palette.warning, 0.09) }]}
        >
          <Ionicons name="clipboard-outline" size={20} color={palette.warning} />
        </View>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {bookings.length} session{bookings.length !== 1 ? 's' : ''} need completing
        </ThemedText>
      </Row>
      {bookings.slice(0, 3).map((booking) => {
        const sessionDate = new Date(booking.scheduledAt);
        const isToday = sessionDate.toDateString() === today.toDateString();
        const timeStr = sessionDate.toLocaleTimeString('en-GB', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        const dateStr = isToday
          ? `Today ${timeStr}`
          : `${sessionDate.toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })} ${timeStr}`;
        const athleteName = cleanAthleteLabel(getBookingAthleteName(booking));
        return (
          <Clickable
            key={booking.id}
            style={[styles.completionRow, { borderColor: palette.border }]}
            onPress={() => router.push(getCompletionRoute(booking))}
          >
            <View style={styles.completionRowContent}>
              <ThemedText
                type="defaultSemiBold"
                style={styles.completionRowTitle}
                numberOfLines={1}
              >
                {booking.service || 'Session'} {athleteName ? `with ${athleteName}` : ''}
              </ThemedText>
              <ThemedText style={[styles.completionRowMeta, { color: palette.muted }]}>
                {dateStr}
              </ThemedText>
            </View>
            <View
              style={[
                styles.completionActionChip,
                { backgroundColor: withAlpha(palette.tint, 0.1) },
              ]}
            >
              <ThemedText style={[styles.completionActionText, { color: palette.tint }]}>
                Complete
              </ThemedText>
            </View>
          </Clickable>
        );
      })}
      <ThemedText style={[styles.completionHint, { color: palette.muted }]}>
        Tap to complete notes, attendance, and media
      </ThemedText>
    </SurfaceCard>
  );
}
