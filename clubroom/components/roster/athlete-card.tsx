import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { RosterEntry } from '@/constants/types';
import type { Booking } from '@/constants/app-types';
import { useTheme } from '@/hooks/useTheme';
import { getRosterAthleteName } from '@/utils/roster-display';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function formatRelativeDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function formatUpcomingDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return date.toLocaleDateString('en-GB', { weekday: 'short' });
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AthleteCardProps {
  athlete: RosterEntry;
  upcomingSession?: Booking;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AthleteCardInner({ athlete, upcomingSession }: AthleteCardProps) {
  const { colors: palette } = useTheme();
  const athleteName = getRosterAthleteName(athlete);

  return (
    <SurfaceCard
      style={styles.athleteCard}
      tactile
      onPress={() => router.push(Routes.rosterAthlete(athlete.athleteId))}
    >
      <Row align="center" gap="md">
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
            {getInitials(athleteName)}
          </ThemedText>
        </View>

        {/* Info */}
        <View style={styles.athleteInfo}>
          <Row align="center" gap="sm">
            <ThemedText type="defaultSemiBold" style={styles.athleteName}>
              {athleteName}
            </ThemedText>
            {athlete.status !== 'ACTIVE' && (
              <View style={[styles.statusBadge, { backgroundColor: withAlpha(palette.muted, 0.12) }]}>
                <ThemedText style={[styles.statusText, { color: palette.muted }]}>
                  {athlete.status.toLowerCase()}
                </ThemedText>
              </View>
            )}
          </Row>

          <Row align="center" gap="xxs">
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {athlete.totalSessions} sessions
            </ThemedText>
            <ThemedText style={[styles.metaDot, { color: palette.muted }]}>•</ThemedText>
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              Last: {formatRelativeDate(athlete.lastSessionDate)}
            </ThemedText>
          </Row>

          {upcomingSession ? (
            <Row align="center" gap="xxs" style={[styles.upcomingBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <Ionicons name="calendar" size={12} color={palette.success} />
              <ThemedText style={[styles.upcomingText, { color: palette.success }]}>
                Next: {formatUpcomingDate(upcomingSession.scheduledAt)}
              </ThemedText>
            </Row>
          ) : (
            <ThemedText style={[styles.noUpcomingText, { color: palette.muted }]}>
              No upcoming session
            </ThemedText>
          )}
        </View>

        {/* Actions */}
        <Row align="center" gap="sm">
          <Clickable
            style={[styles.actionButton, { backgroundColor: palette.tint }]}
            onPress={(event) => {
              event.stopPropagation();
              router.push(Routes.rosterAthleteAddToSession(athlete.athleteId, athleteName));
            }}
          >
            <Ionicons name="add" size={18} color={palette.onPrimary} />
          </Clickable>
          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </Row>
      </Row>
    </SurfaceCard>
  );
}

export const AthleteCard = React.memo(AthleteCardInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  athleteCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    ...Typography.heading,
  },
  athleteInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  athleteName: {
    ...Typography.subheading,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
  statusText: {
    ...Typography.micro,
    textTransform: 'capitalize',
  },
  metaText: {
    ...Typography.small,
  },
  metaDot: {
    ...Typography.small,
  },
  upcomingBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xxs,
  },
  upcomingText: {
    ...Typography.caption,
  },
  noUpcomingText: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
