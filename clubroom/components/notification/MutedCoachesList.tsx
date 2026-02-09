/**
 * MutedCoachesList Component
 *
 * Displays a list of coaches that the user has muted and allows
 * unmuting them.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { MutedCoach } from '@/constants/types';

// Re-export extracted components for backward compat
export { formatMutedDate, MutedCoachRow } from './muted-coaches-list-sections';
export type { MutedCoachRowProps } from './muted-coaches-list-sections';

import { MutedCoachRow } from './muted-coaches-list-sections';

export interface MutedCoachesListProps {
  mutedCoaches: MutedCoach[];
  onUnmute: (coachId: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function MutedCoachesList({
  mutedCoaches,
  onUnmute,
  disabled = false,
  loading = false,
}: MutedCoachesListProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
          <Ionicons name="volume-mute" size={22} color={palette.muted} />
        </View>
        <View style={styles.headerContent}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Muted Coaches
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            You won&apos;t receive notifications from these coaches
          </ThemedText>
        </View>
        {mutedCoaches.length > 0 && (
          <View style={[styles.badge, { backgroundColor: palette.muted }]}>
            <ThemedText style={[styles.badgeText, { color: palette.onPrimary }]}>{mutedCoaches.length}</ThemedText>
          </View>
        )}
      </View>

      {/* List or Empty State */}
      {mutedCoaches.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={40} color={palette.success} />
          <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
            No Muted Coaches
          </ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: palette.muted }]}>
            You&apos;re receiving notifications from all your coaches
          </ThemedText>
        </View>
      ) : (
        <View style={[styles.list, { borderTopColor: palette.border }]}>
          {mutedCoaches.map((coach, index) => (
            <MutedCoachRow
              key={coach.coachId}
              coach={coach}
              onUnmute={onUnmute}
              disabled={disabled}
              loading={loading}
              isLast={index === mutedCoaches.length - 1}
              palette={palette}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    borderWidth: 0.75,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  title: { ...Typography.subheading },
  subtitle: { ...Typography.small, lineHeight: 18 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: { ...Typography.caption },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: { ...Typography.subheading, marginTop: Spacing.xs },
  emptySubtitle: { ...Typography.small, textAlign: 'center', lineHeight: 18 },
});

export default MutedCoachesList;
