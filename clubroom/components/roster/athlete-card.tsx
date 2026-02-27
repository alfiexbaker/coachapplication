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
import { rosterService } from '@/services/roster-service';

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
    <SurfaceCard style={styles.athleteCard}>
      <Row align="center" gap="md">
        <Clickable
          style={styles.detailsTap}
          accessibilityLabel={`Open ${athleteName} details`}
          onPress={() => router.push(Routes.rosterAthlete(athlete.athleteId))}
        >
          <Row align="center" gap="md" style={styles.detailsRow}>
            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                {getInitials(athleteName)}
              </ThemedText>
            </View>

            {/* Info */}
            <View style={styles.athleteInfo}>
              <Row align="center" gap="xs" style={styles.nameRow}>
                <ThemedText type="defaultSemiBold" style={styles.athleteName} numberOfLines={1}>
                  {athleteName}
                </ThemedText>
                {athlete.status !== 'ACTIVE' && (
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: withAlpha(
                          rosterService.getStatusColor(athlete.status),
                          0.12,
                        ),
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.statusPillText,
                        { color: rosterService.getStatusColor(athlete.status) },
                      ]}
                    >
                      {athlete.status.replace('_', ' ')}
                    </ThemedText>
                  </View>
                )}
              </Row>

              <Row align="center" gap="xxs" style={styles.metaRow}>
                <ThemedText style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                  {athlete.totalSessions} sessions
                </ThemedText>
                <ThemedText style={[styles.metaDot, { color: palette.muted }]}>•</ThemedText>
                <ThemedText
                  style={[styles.metaText, { color: palette.muted, flexShrink: 1 }]}
                  numberOfLines={1}
                >
                  Last: {formatRelativeDate(athlete.lastSessionDate)}
                </ThemedText>
              </Row>

              {upcomingSession ? (
                <Row
                  align="center"
                  gap="xxs"
                  style={[styles.upcomingBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}
                >
                  <Ionicons name="calendar" size={12} color={palette.success} />
                  <ThemedText
                    style={[styles.upcomingText, { color: palette.success }]}
                    numberOfLines={1}
                  >
                    Next session: {formatUpcomingDate(upcomingSession.scheduledAt)}
                  </ThemedText>
                </Row>
              ) : (
                <View
                  style={[
                    styles.noUpcomingBadge,
                    { backgroundColor: withAlpha(palette.muted, 0.08) },
                  ]}
                >
                  <ThemedText style={[styles.noUpcomingText, { color: palette.muted }]}>
                    No upcoming session
                  </ThemedText>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={withAlpha(palette.muted, 0.7)} />
          </Row>
        </Clickable>

        {/* Actions */}
        <Clickable
          style={[
            styles.actionButton,
            {
              backgroundColor: palette.surface,
              borderColor: withAlpha(palette.tint, 0.24),
            },
          ]}
          accessibilityLabel={`Add ${athleteName} to session`}
          onPress={() => {
            router.push(Routes.rosterAthleteAddToSession(athlete.athleteId, athleteName));
          }}
        >
          <Ionicons name="add" size={18} color={palette.tint} />
        </Clickable>
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
    borderRadius: Radii.xl,
  },
  detailsTap: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  detailsRow: {
    minHeight: 44,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: Radii.xl + 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.bodySmallSemiBold,
  },
  athleteInfo: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xxs,
  },
  nameRow: {
    minHeight: 24,
    alignItems: 'center',
  },
  athleteName: {
    ...Typography.subheading,
    flexShrink: 1,
  },
  statusPill: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    flexShrink: 0,
  },
  statusPillText: {
    ...Typography.micro,
    fontWeight: '700',
  },
  metaRow: {
    minHeight: 20,
    flexWrap: 'nowrap',
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
    maxWidth: '100%',
  },
  upcomingText: {
    ...Typography.caption,
  },
  noUpcomingBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xxs,
  },
  noUpcomingText: {
    ...Typography.caption,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginLeft: Spacing.xs,
  },
});
