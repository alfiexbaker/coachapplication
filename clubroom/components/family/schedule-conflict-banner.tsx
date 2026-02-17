/**
 * ScheduleConflictBanner — Amber dismissible banner shown when children have
 * overlapping sessions with different coaches.
 *
 * Warnings only — never blocks navigation, booking, or RSVP.
 * "Got it" dismisses for the current day (session-scoped).
 *
 * Phase 5, Multi-Child Sprint.
 */

import { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, Borders, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ScheduleConflict } from '@/constants/family-types';
import type { ChildInfo } from '@/types/child-context';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ScheduleConflictBannerProps {
  /** Conflicts for the currently selected day */
  conflicts: ScheduleConflict[];
  /** Resolve child name from childId */
  getChildById: (childId: string) => ChildInfo | undefined;
  /** Called when user taps "Got it" */
  onDismiss: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const ScheduleConflictBanner = memo(function ScheduleConflictBanner({
  conflicts,
  getChildById,
  onDismiss,
}: ScheduleConflictBannerProps) {
  const { colors: palette } = useTheme();

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  if (conflicts.length === 0) return null;

  const bannerBg = withAlpha(palette.warning, 0.08);
  const bannerBorder = withAlpha(palette.warning, 0.2);

  return (
    <Animated.View entering={FadeInDown.duration(200).springify()}>
      <Row
        style={[styles.banner, { backgroundColor: bannerBg, borderColor: bannerBorder }]}
        gap="sm"
        align="flex-start"
      >
        <Ionicons
          name="warning"
          size={20}
          color={palette.warning}
          style={styles.icon}
        />
        <Column style={styles.content} gap="xxs">
          <ThemedText style={Typography.bodySmallSemiBold}>
            {conflicts.length} schedule {conflicts.length === 1 ? 'overlap' : 'overlaps'} today
          </ThemedText>
          {conflicts.map((conflict) => {
            const childA = getChildById(conflict.eventA.childId);
            const childB = getChildById(conflict.eventB.childId);
            const nameA = childA?.name ?? 'Child';
            const nameB = childB?.name ?? 'Child';
            return (
              <ThemedText
                key={`${conflict.eventA.id}-${conflict.eventB.id}`}
                style={[Typography.small, { color: palette.muted }]}
              >
                {nameA}&apos;s {conflict.eventA.title} overlaps with {nameB}&apos;s{' '}
                {conflict.eventB.title}
              </ThemedText>
            );
          })}
        </Column>
        <Clickable
          onPress={handleDismiss}
          style={styles.dismissButton}
          accessibilityLabel="Dismiss schedule conflicts"
        >
          <ThemedText style={[Typography.smallSemiBold, { color: palette.warning }]}>
            Got it
          </ThemedText>
        </Clickable>
      </Row>
    </Animated.View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: Borders.width.thin,
  },
  icon: { marginTop: Spacing.micro },
  content: { flex: 1 },
  dismissButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.xs },
});
