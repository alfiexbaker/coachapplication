/**
 * BookingNotesCard + BookingFollowUpsCard — Session notes and follow-up checklist.
 *
 * Displays coach notes with loading/error/empty states and a follow-up actions checklist.
 */

import React, { memo, useCallback } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { SessionNotesView } from '@/components/session/session-notes-view';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionNoteRecord } from '@/services/progress-service';

// ============================================================================
// SESSION NOTES CARD
// ============================================================================

interface BookingNotesCardProps {
  bookingId: string;
  sessionNote: SessionNoteRecord | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}

export const BookingNotesCard = memo(function BookingNotesCard({
  bookingId,
  sessionNote,
  loading,
  error,
  onRefresh,
}: BookingNotesCardProps) {
  const { colors: palette } = useTheme();

  const handleNavigateToNotes = useCallback(() => {
    router.push(Routes.sessionNotes(bookingId));
  }, [bookingId]);

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center" justify="between">
        <ThemedText type="defaultSemiBold">Session notes & development</ThemedText>
        <Clickable
          style={[styles.linkPill, { backgroundColor: palette.background }]}
          onPress={handleNavigateToNotes}
          accessibilityLabel={sessionNote ? 'View and edit session notes' : 'Add session notes'}
        >
          <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>
            {sessionNote ? 'View & edit' : 'Add notes'}
          </ThemedText>
        </Clickable>
      </Row>

      {loading && !sessionNote ? (
        <Row gap="sm" align="center">
          <ActivityIndicator color={palette.tint} />
          <ThemedText style={{ color: palette.muted }}>Loading coach notes...</ThemedText>
        </Row>
      ) : null}

      {error ? (
        <Clickable
          onPress={onRefresh}
          style={[styles.errorPill, { backgroundColor: withAlpha(palette.error, 0.06) }]}
          accessibilityLabel="Retry loading notes"
        >
          <Ionicons name="refresh" size={16} color={palette.error} />
          <ThemedText style={{ color: palette.error, fontWeight: '700' }}>
            Retry loading notes
          </ThemedText>
        </Clickable>
      ) : null}

      {sessionNote ? (
        <Column gap="sm">
          <SessionNotesView {...sessionNote} />
        </Column>
      ) : !loading ? (
        <Column gap="xs">
          <ThemedText style={{ color: palette.muted }}>
            Capture what was covered, effort and homework so parents can track the session.
          </ThemedText>
          <Clickable
            onPress={handleNavigateToNotes}
            style={[
              styles.ctaButton,
              {
                backgroundColor: withAlpha(palette.tint, 0.07),
                borderColor: withAlpha(palette.border, 0.25),
              },
            ]}
            accessibilityLabel="Add coach notes"
          >
            <Ionicons name="create" size={16} color={palette.tint} />
            <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>
              Add coach notes
            </ThemedText>
          </Clickable>
        </Column>
      ) : null}
    </SurfaceCard>
  );
});

// ============================================================================
// FOLLOW-UPS CARD
// ============================================================================

interface BookingFollowUpsCardProps {
  sessionNote: SessionNoteRecord | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export const BookingFollowUpsCard = memo(function BookingFollowUpsCard({
  sessionNote,
  loading,
  onRefresh,
}: BookingFollowUpsCardProps) {
  const { colors: palette } = useTheme();

  const followUps = [
    { label: 'Share homework reminder', completed: Boolean(sessionNote?.homework) },
    { label: 'Confirm attendance', completed: Boolean(sessionNote?.attendance) },
    {
      label: 'Log effort & focus',
      completed: Boolean(sessionNote?.effort && sessionNote?.focus?.length),
    },
  ];

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center" justify="between">
        <ThemedText type="defaultSemiBold">Follow-ups parents will see</ThemedText>
        <Clickable
          style={[styles.linkPill, { backgroundColor: palette.background }]}
          onPress={onRefresh}
          accessibilityLabel={loading ? 'Refreshing notes' : 'Sync notes now'}
        >
          <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>
            {loading ? 'Refreshing...' : 'Sync now'}
          </ThemedText>
        </Clickable>
      </Row>
      <Column gap="sm">
        {followUps.map((action) => (
          <Row key={action.label} gap="xs" align="center">
            <Ionicons
              name={action.completed ? 'checkmark-circle' : 'radio-button-off'}
              size={18}
              color={action.completed ? palette.tint : palette.icon}
            />
            <ThemedText style={{ color: action.completed ? palette.tint : palette.muted }}>
              {action.label}
            </ThemedText>
          </Row>
        ))}
      </Column>
    </SurfaceCard>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: { padding: Spacing.lg, gap: Spacing.md },
  linkPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
  },
  errorPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ctaButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
  },
});
