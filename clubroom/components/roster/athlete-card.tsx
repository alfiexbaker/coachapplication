import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { RosterEntry } from '@/constants/types';
import type { Booking } from '@/constants/app-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const needsAttention =
    !athlete.lastSessionDate ||
    Math.floor(
      (Date.now() - new Date(athlete.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)
    ) > 14;

  return (
    <Clickable
      onPress={() =>
        router.push(Routes.rosterAthlete(athlete.athleteId))
      }
    >
      <SurfaceCard style={styles.athleteCard}>
        <View style={styles.athleteRow}>
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            {athlete.athletePhotoUrl ? (
              <Image source={{ uri: athlete.athletePhotoUrl }} style={styles.avatarImage} />
            ) : (
              <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                {getInitials(athlete.athleteName)}
              </ThemedText>
            )}
            {needsAttention && (
              <View style={[styles.attentionDot, { backgroundColor: palette.warning }]} />
            )}
          </View>

          {/* Info */}
          <View style={styles.athleteInfo}>
            <View style={styles.nameRow}>
              <ThemedText type="defaultSemiBold" style={styles.athleteName}>
                {athlete.athleteName}
              </ThemedText>
              {athlete.status !== 'ACTIVE' && (
                <View style={[styles.statusBadge, { backgroundColor: withAlpha(palette.muted, 0.12) }]}>
                  <ThemedText style={[styles.statusText, { color: palette.muted }]}>
                    {athlete.status.toLowerCase()}
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.metaRow}>
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {athlete.totalSessions} sessions
              </ThemedText>
              <ThemedText style={[styles.metaDot, { color: palette.muted }]}>•</ThemedText>
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                Last: {formatRelativeDate(athlete.lastSessionDate)}
              </ThemedText>
            </View>

            {upcomingSession ? (
              <View style={[styles.upcomingBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                <Ionicons name="calendar" size={12} color={palette.success} />
                <ThemedText style={[styles.upcomingText, { color: palette.success }]}>
                  Next: {formatUpcomingDate(upcomingSession.scheduledAt)}
                </ThemedText>
              </View>
            ) : needsAttention ? (
              <View style={[styles.upcomingBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                <Ionicons name="alert-circle" size={12} color={palette.warning} />
                <ThemedText style={[styles.upcomingText, { color: palette.warning }]}>
                  No upcoming session
                </ThemedText>
              </View>
            ) : null}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Clickable
              style={[styles.actionButton, { backgroundColor: palette.tint }]}
              onPress={() =>
                router.push(Routes.rosterAthleteAddToSession(athlete.athleteId))
              }
            >
              <Ionicons name="add" size={18} color={Colors.light.onPrimary} />
            </Clickable>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>
        </View>
      </SurfaceCard>
    </Clickable>
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
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
  },
  avatarText: {
    ...Typography.heading,
  },
  attentionDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: Radii.sm,
    borderWidth: 2,
    borderColor: Colors.light.surface,
  },
  athleteInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  metaText: {
    ...Typography.small,
  },
  metaDot: {
    ...Typography.small,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xxs,
  },
  upcomingText: {
    ...Typography.caption,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
