/**
 * Extracted sub-components for AthleteSessions.
 *
 * SessionItem — single session row with date block, title, notes preview.
 * SessionSkeleton — loading skeleton placeholders.
 * NeedsNotesBadge — warning badge for missing notes count.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Skeleton, SkeletonPill, SkeletonText } from '@/components/ui/skeleton';
import { Routes } from '@/navigation/routes';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Booking } from '@/constants/app-types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionItemProps {
  session: Booking;
  isPast: boolean;
}

// ─── SessionItem ──────────────────────────────────────────────────────────────

export const SessionItem = function SessionItem({ session, isPast }: SessionItemProps) {
  const { colors } = useTheme();
  const date = new Date(session.scheduledAt);

  const handlePress = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const returnTo = Routes.ATHLETES as string;
    router.push(Routes.booking(session.id, { returnTo }));
  };

  const needsNotes = isPast && !session.notes;

  return (
    <Clickable onPress={handlePress}>
      <SurfaceCard style={styles.sessionCard}>
        <Row gap="sm" align="center">
          <View
            style={[
              styles.dateBlock,
              {
                backgroundColor: isPast ? colors.surfaceSecondary : withAlpha(colors.tint, 0.09),
              },
            ]}
          >
            <ThemedText style={[styles.dateDay, { color: isPast ? colors.muted : colors.tint }]}>
              {date.getDate()}
            </ThemedText>
            <ThemedText style={[styles.dateMonth, { color: isPast ? colors.muted : colors.tint }]}>
              {date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
            </ThemedText>
          </View>

          <Column gap="micro" style={styles.flex1}>
            <Row gap="xs" align="center">
              <ThemedText type="defaultSemiBold">
                {session.service || 'Training Session'}
              </ThemedText>
              {needsNotes && (
                <View
                  style={[
                    styles.needsNotesBadge,
                    { backgroundColor: withAlpha(colors.warning, 0.09) },
                  ]}
                >
                  <ThemedText style={[styles.needsNotesText, { color: colors.warning }]}>
                    Needs notes
                  </ThemedText>
                </View>
              )}
            </Row>

            <ThemedText style={[styles.timeText, { color: colors.muted }]}>
              {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              {session.duration ? ` · ${session.duration} min` : ''}
            </ThemedText>

            {isPast && session.notes && (
              <ThemedText style={[styles.notesPreview, { color: colors.muted }]} numberOfLines={1}>
                {session.notes}
              </ThemedText>
            )}
          </Column>

          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Row>
      </SurfaceCard>
    </Clickable>
  );
};

export const SessionItemSkeleton = function SessionItemSkeleton({
  showNeedsNotesBadge = false,
}: {
  showNeedsNotesBadge?: boolean;
}) {
  return (
    <SurfaceCard style={styles.sessionCard}>
      <Row gap="sm" align="center">
        <Skeleton width={48} height={48} radius={Radii.md} accessibilityLabel="Loading session date" />

        <Column gap="micro" style={styles.flex1}>
          <Row gap="xs" align="center">
            <Skeleton width="42%" height={16} accessibilityLabel="Loading session title" />
            {showNeedsNotesBadge ? (
              <SkeletonPill width={72} height={18} accessibilityLabel="Loading session badge" />
            ) : null}
          </Row>
          <Skeleton width="34%" height={12} accessibilityLabel="Loading session time" />
          <SkeletonText
            lines={1}
            widths={['68%']}
            lineHeight={12}
            accessibilityLabel="Loading session note preview"
          />
        </Column>

        <Skeleton width={18} height={18} radius={Radii.xs} accessibilityLabel="Loading session action" />
      </Row>
    </SurfaceCard>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

// react-doctor-disable-next-line react-doctor/only-export-components -- public non-component export is intentional in this module boundary.
const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  flex1: { flex: 1 },
  sectionTitle: {
    paddingLeft: Spacing.xxs,
  },
  sessionCard: {
    padding: Spacing.md,
  },
  dateBlock: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    ...Typography.heading,
    lineHeight: Typography.body.lineHeight,
  },
  dateMonth: {
    ...Typography.micro,
  },
  timeText: {
    ...Typography.bodySmall,
  },
  notesPreview: {
    ...Typography.small,
    fontStyle: 'italic',
  },
  needsNotesBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
  needsNotesText: {
    ...Typography.micro,
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
