/**
 * Extracted sub-components for UpcomingSessionsList.
 *
 * formatSessionDate / formatTime / getStatusBadge / isToday — helpers.
 * SessionCard — single session row (memo).
 */

import React, { memo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { FamilyCalendarEvent } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { styles } from './upcoming-sessions-styles';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }

  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) {
    return date.toLocaleDateString('en-GB', { weekday: 'long' });
  }

  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusBadge(
  status: FamilyCalendarEvent['status'],
  palette: ThemeColors
): { label: string; color: string } {
  switch (status) {
    case 'CONFIRMED':
      return { label: 'Confirmed', color: palette.success };
    case 'PENDING':
      return { label: 'Pending', color: palette.warning };
    case 'CANCELLED':
      return { label: 'Cancelled', color: palette.error };
    default:
      return { label: status, color: palette.muted };
  }
}

export function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

// ─── SessionCard ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: FamilyCalendarEvent;
  onPress?: () => void;
  palette: ThemeColors;
}

export const SessionCard = memo(function SessionCard({
  session,
  onPress,
  palette,
}: SessionCardProps) {
  const statusBadge = getStatusBadge(session.status, palette);
  const today = isToday(session.start);

  return (
    <Clickable onPress={onPress}>
      <SurfaceCard
        style={[
          styles.sessionCard,
          today ? { borderColor: session.colorCode, borderWidth: 1 } : undefined,
        ]}
      >
        <View style={[styles.colorBar, { backgroundColor: session.colorCode }]} />

        <View style={styles.sessionContent}>
          <Row style={styles.sessionHeader}>
            <Row style={styles.dateTime}>
              <ThemedText type="defaultSemiBold" style={styles.dateText}>
                {formatSessionDate(session.start)}
              </ThemedText>
              <ThemedText style={[styles.timeText, { color: palette.muted }]}>
                {formatTime(session.start)}
              </ThemedText>
            </Row>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: withAlpha(statusBadge.color, 0.09) },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: statusBadge.color }]} />
              <ThemedText style={[styles.statusText, { color: statusBadge.color }]}>
                {statusBadge.label}
              </ThemedText>
            </View>
          </Row>

          <View style={styles.sessionInfo}>
            <ThemedText type="defaultSemiBold" style={styles.sessionTitle}>
              {session.title}
            </ThemedText>
            {session.description && (
              <ThemedText
                style={[styles.sessionDescription, { color: palette.muted }]}
                numberOfLines={1}
              >
                {session.description}
              </ThemedText>
            )}
          </View>

          <Row style={styles.metaRow}>
            <Row style={styles.metaItem}>
              <View style={[styles.childDot, { backgroundColor: session.colorCode }]} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {session.childId}
              </ThemedText>
            </Row>
            {session.coachId && (
              <Row style={styles.metaItem}>
                <Ionicons name="person" size={12} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {session.coachId}
                </ThemedText>
              </Row>
            )}
            {session.location && (
              <Row style={styles.metaItem}>
                <Ionicons name="location" size={12} color={palette.muted} />
                <ThemedText
                  style={[styles.metaText, { color: palette.muted }]}
                  numberOfLines={1}
                >
                  {session.location}
                </ThemedText>
              </Row>
            )}
          </Row>

          {session.price !== undefined && (
            <Row style={styles.priceRow}>
              <ThemedText type="defaultSemiBold" style={styles.priceText}>
                {'\u00A3'}{session.price.toFixed(2)}
              </ThemedText>
            </Row>
          )}
        </View>

        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </View>
      </SurfaceCard>
    </Clickable>
  );
});

export { styles };
